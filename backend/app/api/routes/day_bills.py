from datetime import datetime, date as datetime_date, UTC
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, UUID4, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.day_bill import DayBill
from app.models.purchase import Purchase
from app.models.sale import Sale
from app.models.expense import Expense, ExpenseCategory
from app.models.party import Party
from app.models.transaction import PaymentTransaction
from app.models.enums import TransactionType

router = APIRouter()


# ---------- Schemas ----------

class DayBillPurchaseIn(BaseModel):
    party_id: UUID4
    item_id: Optional[UUID4] = None
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    driver_id: Optional[UUID4] = None
    total_boxes: int = 0
    birds_per_box: int = 0
    actual_birds: int = 0
    weighbridge_weight: float = 0.0
    net_weight: float = 0.0
    purchase_rate: float = 0.0
    purchase_amount: float = 0.0
    cash_payment: float = 0.0
    upi_payment: float = 0.0
    bank_payment: float = 0.0
    remarks: Optional[str] = None


class DayBillSaleIn(BaseModel):
    party_id: UUID4
    item_id: Optional[UUID4] = None
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    driver_id: Optional[UUID4] = None
    weighbridge_weight: float = 0.0
    weight: float = 0.0
    weight_rate: float = 0.0
    weight_amount: float = 0.0
    boxes: int = 0
    birds_per_box: int = 0
    actual_birds: int = 0
    box_rate: float = 0.0
    box_amount: float = 0.0
    total_invoice_amount: float = 0.0
    cash_payment: float = 0.0
    upi_payment: float = 0.0
    bank_payment: float = 0.0


class DayBillExpenseIn(BaseModel):
    category_id: UUID4
    expense_name: str
    cash_amount: float = 0.0
    upi_amount: float = 0.0
    note: Optional[str] = None


class DayBillCreate(BaseModel):
    date: Optional[datetime_date] = None
    empty_bird_weight_g: float = 40.0
    purchases: List[DayBillPurchaseIn] = Field(default_factory=list)
    sales: List[DayBillSaleIn] = Field(default_factory=list)
    expenses: List[DayBillExpenseIn] = Field(default_factory=list)


class DayBillListItem(BaseModel):
    id: UUID4
    bill_number: str
    date: datetime_date
    empty_bird_weight_g: float = 40.0
    purchase_names: List[str] = Field(default_factory=list)
    purchase_item_names: List[str] = Field(default_factory=list)
    purchase_entries: int = 0  # number of purchase lines
    purchase_net_kg: float = 0.0
    purchase_count: int = 0  # total birds
    purchase_amount: float = 0.0
    purchase_to_pay: float = 0.0
    sale_names: List[str] = Field(default_factory=list)
    sale_item_names: List[str] = Field(default_factory=list)
    sale_entries: int = 0  # number of sale lines
    sale_net_kg: float = 0.0
    sale_count: int = 0  # total birds
    sale_amount: float = 0.0
    sale_pending: float = 0.0
    expense_total: float = 0.0

    class Config:
        from_attributes = True


class DayBillDetail(DayBillListItem):
    purchases: list = Field(default_factory=list)
    sales: list = Field(default_factory=list)
    expenses: list = Field(default_factory=list)


# ---------- Helpers ----------

def _fy_year(d: datetime_date) -> int:
    return d.year if d.month >= 4 else d.year - 1


async def _next_bill_number(db: AsyncSession, model, prefix: str) -> str:
    bill_query = await db.execute(
        select(model.bill_number)
        .where(model.bill_number.like(f"{prefix}%"))
        .order_by(model.bill_number.desc())
        .limit(1)
    )
    last_bill = bill_query.scalar_one_or_none()
    if last_bill:
        try:
            seq = int(str(last_bill).split("-")[-1]) + 1
        except ValueError:
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:06d}"


async def _revert_and_clear_day_bill_children(db: AsyncSession, day_bill: DayBill) -> None:
    """Revert party balances / on-bill payment txns and delete linked rows."""
    for p in list(day_bill.purchases or []):
        party_res = await db.execute(select(Party).where(Party.id == p.party_id))
        party = party_res.scalar_one_or_none()
        old_paid = float(p.cash_payment or 0) + float(p.upi_payment or 0) + float(p.bank_payment or 0)
        if party:
            party.current_balance = float(party.current_balance) - float(p.purchase_amount or 0) + old_paid
        if old_paid > 0:
            txn_result = await db.execute(
                select(PaymentTransaction)
                .where(PaymentTransaction.party_id == p.party_id)
                .where(PaymentTransaction.date == p.date)
                .where(PaymentTransaction.total_amount == old_paid)
                .where(PaymentTransaction.type == TransactionType.PAID)
                .limit(1)
            )
            old_txn = txn_result.scalar_one_or_none()
            if old_txn:
                await db.delete(old_txn)
        await db.delete(p)

    for s in list(day_bill.sales or []):
        party_res = await db.execute(select(Party).where(Party.id == s.party_id))
        party = party_res.scalar_one_or_none()
        old_collected = float(s.cash_payment or 0) + float(s.upi_payment or 0) + float(s.bank_payment or 0)
        if party:
            # Undo sale unpaid (sale decreased balance)
            party.current_balance = float(party.current_balance) + float(s.total_invoice_amount or 0) - old_collected
        if old_collected > 0:
            txn_result = await db.execute(
                select(PaymentTransaction)
                .where(PaymentTransaction.party_id == s.party_id)
                .where(PaymentTransaction.date == s.date)
                .where(PaymentTransaction.total_amount == old_collected)
                .where(PaymentTransaction.type == TransactionType.RECEIVED)
                .limit(1)
            )
            old_txn = txn_result.scalar_one_or_none()
            if old_txn:
                await db.delete(old_txn)
        await db.delete(s)

    for e in list(day_bill.expenses or []):
        await db.delete(e)

    await db.flush()
    day_bill.purchases = []
    day_bill.sales = []
    day_bill.expenses = []


async def _apply_day_bill_lines(
    db: AsyncSession,
    day_bill: DayBill,
    payload: DayBillCreate,
    bill_date: datetime_date,
) -> dict:
    """Create purchase/sale/expense rows for a day bill and update party balances."""
    purchase_net = 0.0
    purchase_birds = 0
    purchase_amount = 0.0
    purchase_to_pay = 0.0

    for p_in in payload.purchases:
        result = await db.execute(select(Party).where(Party.id == p_in.party_id))
        party = result.scalar_one_or_none()
        if not party:
            raise HTTPException(status_code=404, detail=f"Purchase party not found: {p_in.party_id}")

        balance = p_in.purchase_amount - (p_in.cash_payment + p_in.upi_payment + p_in.bank_payment)
        db_purchase = Purchase(
            party_id=p_in.party_id,
            item_id=p_in.item_id,
            date=bill_date,
            bill_number=day_bill.bill_number,
            vehicle_number=p_in.vehicle_number,
            driver_name=p_in.driver_name,
            driver_id=p_in.driver_id,
            total_boxes=p_in.total_boxes,
            birds_per_box=p_in.birds_per_box,
            actual_birds=p_in.actual_birds,
            weighbridge_weight=p_in.weighbridge_weight,
            net_weight=p_in.net_weight,
            purchase_rate=p_in.purchase_rate,
            purchase_amount=p_in.purchase_amount,
            cash_payment=p_in.cash_payment,
            upi_payment=p_in.upi_payment,
            bank_payment=p_in.bank_payment,
            balance_amount=balance,
            remarks=p_in.remarks,
            day_bill_id=day_bill.id,
        )
        db.add(db_purchase)
        await db.flush()

        total_paid = p_in.cash_payment + p_in.upi_payment + p_in.bank_payment
        if total_paid > 0:
            db.add(
                PaymentTransaction(
                    party_id=p_in.party_id,
                    date=bill_date,
                    type=TransactionType.PAID,
                    cash_amount=p_in.cash_payment,
                    upi_amount=p_in.upi_payment,
                    bank_amount=p_in.bank_payment,
                    total_amount=total_paid,
                )
            )
        party.current_balance = float(party.current_balance) + p_in.purchase_amount - total_paid

        purchase_net += float(p_in.net_weight or 0)
        purchase_birds += int(p_in.actual_birds or 0)
        purchase_amount += float(p_in.purchase_amount or 0)
        purchase_to_pay += float(balance)

    sale_net = 0.0
    sale_birds = 0
    sale_amount = 0.0
    sale_pending = 0.0

    for s_in in payload.sales:
        result = await db.execute(select(Party).where(Party.id == s_in.party_id))
        party = result.scalar_one_or_none()
        if not party:
            raise HTTPException(status_code=404, detail=f"Sale party not found: {s_in.party_id}")

        balance = s_in.total_invoice_amount - (s_in.cash_payment + s_in.upi_payment + s_in.bank_payment)
        db_sale = Sale(
            party_id=s_in.party_id,
            item_id=s_in.item_id,
            date=bill_date,
            bill_number=day_bill.bill_number,
            vehicle_number=s_in.vehicle_number,
            driver_name=s_in.driver_name,
            driver_id=s_in.driver_id,
            weighbridge_weight=s_in.weighbridge_weight,
            weight=s_in.weight,
            weight_rate=s_in.weight_rate,
            weight_amount=s_in.weight_amount,
            boxes=s_in.boxes,
            birds_per_box=s_in.birds_per_box,
            actual_birds=s_in.actual_birds,
            box_rate=s_in.box_rate,
            box_amount=s_in.box_amount,
            total_invoice_amount=s_in.total_invoice_amount,
            cash_payment=s_in.cash_payment,
            upi_payment=s_in.upi_payment,
            bank_payment=s_in.bank_payment,
            balance_amount=balance,
            day_bill_id=day_bill.id,
        )
        db.add(db_sale)
        await db.flush()

        total_collected = s_in.cash_payment + s_in.upi_payment + s_in.bank_payment
        if total_collected > 0:
            db.add(
                PaymentTransaction(
                    party_id=s_in.party_id,
                    date=bill_date,
                    type=TransactionType.RECEIVED,
                    cash_amount=s_in.cash_payment,
                    upi_amount=s_in.upi_payment,
                    bank_amount=s_in.bank_payment,
                    total_amount=total_collected,
                )
            )
        # Sale unpaid increases To Receive (negative balance)
        party.current_balance = float(party.current_balance) - s_in.total_invoice_amount + total_collected

        sale_net += float(s_in.weight or 0)
        sale_birds += int(s_in.actual_birds or 0)
        sale_amount += float(s_in.total_invoice_amount or 0)
        sale_pending += float(balance)

    expense_total = 0.0
    for e_in in payload.expenses:
        result = await db.execute(select(ExpenseCategory).where(ExpenseCategory.id == e_in.category_id))
        cat = result.scalar_one_or_none()
        if not cat:
            raise HTTPException(status_code=400, detail=f"Invalid category_id: {e_in.category_id}")
        total = float(e_in.cash_amount or 0) + float(e_in.upi_amount or 0)
        if total <= 0:
            raise HTTPException(status_code=400, detail="Expense total must be greater than zero")
        db.add(
            Expense(
                category_id=e_in.category_id,
                spent_at=datetime.combine(bill_date, datetime.min.time()).replace(tzinfo=UTC),
                expense_name=e_in.expense_name,
                cash_amount=e_in.cash_amount,
                upi_amount=e_in.upi_amount,
                total_amount=total,
                note=e_in.note,
                day_bill_id=day_bill.id,
            )
        )
        expense_total += total

    return {
        "purchase_net": purchase_net,
        "purchase_birds": purchase_birds,
        "purchase_amount": purchase_amount,
        "purchase_to_pay": purchase_to_pay,
        "sale_net": sale_net,
        "sale_birds": sale_birds,
        "sale_amount": sale_amount,
        "sale_pending": sale_pending,
        "expense_total": expense_total,
    }


def _day_bill_detail_response(day_bill: DayBill) -> DayBillDetail:
    item = _to_list_item(day_bill)
    return DayBillDetail(
        **item.model_dump(),
        purchases=[
            {
                "id": str(p.id),
                "bill_number": p.bill_number,
                "party_id": str(p.party_id) if p.party_id else None,
                "item_id": str(p.item_id) if p.item_id else None,
                "driver_id": str(p.driver_id) if p.driver_id else None,
                "party_name": p.party.name if p.party else "",
                "item_name": p.item.name if p.item else "",
                "driver_name": p.driver_name or (p.driver.name if getattr(p, "driver", None) else ""),
                "driver_mobile": p.driver.mobile if getattr(p, "driver", None) else "",
                "vehicle_number": p.vehicle_number or "",
                "total_boxes": int(p.total_boxes or 0),
                "birds_per_box": int(p.birds_per_box or 0),
                "actual_birds": int(p.actual_birds or 0),
                "weighbridge_weight": float(p.weighbridge_weight or 0),
                "net_weight": float(p.net_weight or 0),
                "purchase_rate": float(p.purchase_rate or 0),
                "purchase_amount": float(p.purchase_amount or 0),
                "cash_payment": float(p.cash_payment or 0),
                "upi_payment": float(p.upi_payment or 0),
                "bank_payment": float(p.bank_payment or 0),
                "balance_amount": float(p.balance_amount or 0),
                "remarks": p.remarks or "",
            }
            for p in day_bill.purchases or []
        ],
        sales=[
            {
                "id": str(s.id),
                "bill_number": s.bill_number,
                "party_id": str(s.party_id) if s.party_id else None,
                "item_id": str(s.item_id) if s.item_id else None,
                "driver_id": str(s.driver_id) if s.driver_id else None,
                "party_name": s.party.name if s.party else "",
                "item_name": s.item.name if s.item else "",
                "driver_name": s.driver_name or (s.driver.name if getattr(s, "driver", None) else ""),
                "driver_mobile": s.driver.mobile if getattr(s, "driver", None) else "",
                "vehicle_number": s.vehicle_number or "",
                "boxes": int(s.boxes or 0),
                "birds_per_box": int(s.birds_per_box or 0),
                "actual_birds": int(s.actual_birds or 0),
                "weighbridge_weight": float(s.weighbridge_weight or 0),
                "net_weight": float(s.weight or 0),
                "weight": float(s.weight or 0),
                "weight_rate": float(s.weight_rate or 0),
                "weight_amount": float(s.weight_amount or 0),
                "box_rate": float(s.box_rate or 0),
                "box_amount": float(s.box_amount or 0),
                "total_invoice_amount": float(s.total_invoice_amount or 0),
                "cash_payment": float(s.cash_payment or 0),
                "upi_payment": float(s.upi_payment or 0),
                "bank_payment": float(s.bank_payment or 0),
                "balance_amount": float(s.balance_amount or 0),
            }
            for s in day_bill.sales or []
        ],
        expenses=[
            {
                "id": str(e.id),
                "category_id": str(e.category_id) if e.category_id else None,
                "category_name": e.category.name if getattr(e, "category", None) else "",
                "expense_name": e.expense_name,
                "cash_amount": float(e.cash_amount or 0),
                "upi_amount": float(e.upi_amount or 0),
                "total_amount": float(e.total_amount or 0),
                "note": e.note or "",
            }
            for e in day_bill.expenses or []
        ],
    )


async def _load_day_bill(db: AsyncSession, day_bill_id) -> DayBill:
    result = await db.execute(
        select(DayBill)
        .where(DayBill.id == day_bill_id)
        .options(
            selectinload(DayBill.purchases).selectinload(Purchase.party),
            selectinload(DayBill.purchases).selectinload(Purchase.item),
            selectinload(DayBill.purchases).selectinload(Purchase.driver),
            selectinload(DayBill.sales).selectinload(Sale.party),
            selectinload(DayBill.sales).selectinload(Sale.item),
            selectinload(DayBill.sales).selectinload(Sale.driver),
            selectinload(DayBill.expenses).selectinload(Expense.category),
        )
    )
    day_bill = result.scalar_one_or_none()
    if not day_bill:
        raise HTTPException(status_code=404, detail="Day bill not found")
    return day_bill


def _to_list_item(day_bill: DayBill) -> DayBillListItem:
    purchases = list(day_bill.purchases or [])
    sales = list(day_bill.sales or [])

    purchase_names: list[str] = []
    purchase_item_names: list[str] = []
    for p in purchases:
        name = p.party.name if p.party else ""
        if name and name not in purchase_names:
            purchase_names.append(name)
        item_name = p.item.name if getattr(p, "item", None) else ""
        if item_name and item_name not in purchase_item_names:
            purchase_item_names.append(item_name)

    sale_names: list[str] = []
    sale_item_names: list[str] = []
    for s in sales:
        name = s.party.name if s.party else ""
        if name and name not in sale_names:
            sale_names.append(name)
        item_name = s.item.name if getattr(s, "item", None) else ""
        if item_name and item_name not in sale_item_names:
            sale_item_names.append(item_name)

    return DayBillListItem(
        id=day_bill.id,
        bill_number=day_bill.bill_number,
        date=day_bill.date,
        empty_bird_weight_g=float(day_bill.empty_bird_weight_g or 40),
        purchase_names=purchase_names,
        purchase_item_names=purchase_item_names,
        purchase_entries=len(purchases),
        purchase_net_kg=float(day_bill.purchase_net_kg or 0),
        purchase_count=int(day_bill.purchase_count or 0),
        purchase_amount=float(day_bill.purchase_amount or 0),
        purchase_to_pay=float(day_bill.purchase_to_pay or 0),
        sale_names=sale_names,
        sale_item_names=sale_item_names,
        sale_entries=len(sales),
        sale_net_kg=float(day_bill.sale_net_kg or 0),
        sale_count=int(day_bill.sale_count or 0),
        sale_amount=float(day_bill.sale_amount or 0),
        sale_pending=float(day_bill.sale_pending or 0),
        expense_total=float(day_bill.expense_total or 0),
    )


# ---------- Routes ----------

@router.post("/", response_model=DayBillListItem, status_code=201)
async def create_day_bill(payload: DayBillCreate, db: AsyncSession = Depends(deps.get_db)):
    if not payload.purchases and not payload.sales and not payload.expenses:
        raise HTTPException(status_code=400, detail="Add at least one purchase, sale, or expense")

    bill_date = payload.date or datetime_date.today()
    fy = _fy_year(bill_date)
    dps_number = await _next_bill_number(db, DayBill, f"DPS-{fy}-")

    day_bill = DayBill(
        bill_number=dps_number,
        date=bill_date,
        empty_bird_weight_g=payload.empty_bird_weight_g or 40.0,
    )
    db.add(day_bill)
    await db.flush()

    totals = await _apply_day_bill_lines(db, day_bill, payload, bill_date)
    day_bill.purchase_net_kg = totals["purchase_net"]
    day_bill.purchase_count = totals["purchase_birds"]
    day_bill.purchase_amount = totals["purchase_amount"]
    day_bill.purchase_to_pay = totals["purchase_to_pay"]
    day_bill.sale_net_kg = totals["sale_net"]
    day_bill.sale_count = totals["sale_birds"]
    day_bill.sale_amount = totals["sale_amount"]
    day_bill.sale_pending = totals["sale_pending"]
    day_bill.expense_total = totals["expense_total"]

    await db.commit()

    result = await db.execute(
        select(DayBill)
        .where(DayBill.id == day_bill.id)
        .options(
            selectinload(DayBill.purchases).selectinload(Purchase.party),
            selectinload(DayBill.purchases).selectinload(Purchase.item),
            selectinload(DayBill.sales).selectinload(Sale.party),
            selectinload(DayBill.sales).selectinload(Sale.item),
        )
    )
    day_bill = result.scalar_one()
    return _to_list_item(day_bill)


@router.get("/", response_model=List[DayBillListItem])
async def list_day_bills(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
):
    query = (
        select(DayBill)
        .options(
            selectinload(DayBill.purchases).selectinload(Purchase.party),
            selectinload(DayBill.purchases).selectinload(Purchase.item),
            selectinload(DayBill.sales).selectinload(Sale.party),
            selectinload(DayBill.sales).selectinload(Sale.item),
        )
        .order_by(DayBill.date.desc(), DayBill.created_at.desc())
    )
    if start_date:
        query = query.where(DayBill.date >= start_date.date())
    if end_date:
        query = query.where(DayBill.date <= end_date.date())

    result = await db.execute(query)
    return [_to_list_item(b) for b in result.scalars().all()]


@router.get("/{day_bill_id}", response_model=DayBillDetail)
async def get_day_bill(day_bill_id: UUID4, db: AsyncSession = Depends(deps.get_db)):
    day_bill = await _load_day_bill(db, day_bill_id)
    return _day_bill_detail_response(day_bill)


@router.put("/{day_bill_id}", response_model=DayBillListItem)
async def update_day_bill(
    day_bill_id: UUID4,
    payload: DayBillCreate,
    db: AsyncSession = Depends(deps.get_db),
):
    if not payload.purchases and not payload.sales and not payload.expenses:
        raise HTTPException(status_code=400, detail="Add at least one purchase, sale, or expense")

    day_bill = await _load_day_bill(db, day_bill_id)
    await _revert_and_clear_day_bill_children(db, day_bill)

    bill_date = payload.date or day_bill.date
    day_bill.date = bill_date
    day_bill.empty_bird_weight_g = payload.empty_bird_weight_g or 40.0

    totals = await _apply_day_bill_lines(db, day_bill, payload, bill_date)
    day_bill.purchase_net_kg = totals["purchase_net"]
    day_bill.purchase_count = totals["purchase_birds"]
    day_bill.purchase_amount = totals["purchase_amount"]
    day_bill.purchase_to_pay = totals["purchase_to_pay"]
    day_bill.sale_net_kg = totals["sale_net"]
    day_bill.sale_count = totals["sale_birds"]
    day_bill.sale_amount = totals["sale_amount"]
    day_bill.sale_pending = totals["sale_pending"]
    day_bill.expense_total = totals["expense_total"]

    await db.commit()

    result = await db.execute(
        select(DayBill)
        .where(DayBill.id == day_bill.id)
        .options(
            selectinload(DayBill.purchases).selectinload(Purchase.party),
            selectinload(DayBill.purchases).selectinload(Purchase.item),
            selectinload(DayBill.sales).selectinload(Sale.party),
            selectinload(DayBill.sales).selectinload(Sale.item),
        )
    )
    day_bill = result.scalar_one()
    return _to_list_item(day_bill)


@router.delete("/{day_bill_id}", status_code=204)
async def delete_day_bill(day_bill_id: UUID4, db: AsyncSession = Depends(deps.get_db)):
    day_bill = await _load_day_bill(db, day_bill_id)
    await _revert_and_clear_day_bill_children(db, day_bill)
    await db.delete(day_bill)
    await db.commit()
