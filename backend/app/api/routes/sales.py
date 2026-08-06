from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel, UUID4
from datetime import datetime, date as datetime_date

from app.api import deps
from app.models.sale import Sale
from app.models.party import Party
from app.models.transaction import PaymentTransaction
from app.models.enums import TransactionType

router = APIRouter()

class SaleBase(BaseModel):
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
    balance_amount: float = 0.0
    is_locked: bool = False

class SaleCreate(SaleBase):
    date: Optional[datetime_date] = None

class SaleResponse(SaleBase):
    id: UUID4
    date: datetime_date
    bill_number: Optional[str] = None
    day_bill_id: Optional[UUID4] = None
    day_bill_number: Optional[str] = None

    class Config:
        from_attributes = True

class SaleUpdate(SaleCreate):
    pass

@router.post("/", response_model=SaleResponse)
async def create_sale(sale_in: SaleCreate, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Party).where(Party.id == sale_in.party_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    sale_date = sale_in.date or datetime_date.today()

    db_sale = Sale(
        party_id=sale_in.party_id,
        date=sale_date,
        bill_number=None,
        vehicle_number=sale_in.vehicle_number,
        driver_name=sale_in.driver_name,
        driver_id=sale_in.driver_id,
        item_id=sale_in.item_id,
        weighbridge_weight=sale_in.weighbridge_weight,
        weight=sale_in.weight,
        weight_rate=sale_in.weight_rate,
        weight_amount=sale_in.weight_amount,
        boxes=sale_in.boxes,
        birds_per_box=sale_in.birds_per_box,
        actual_birds=sale_in.actual_birds,
        box_rate=sale_in.box_rate,
        box_amount=sale_in.box_amount,
        total_invoice_amount=sale_in.total_invoice_amount,
        cash_payment=sale_in.cash_payment,
        upi_payment=sale_in.upi_payment,
        bank_payment=sale_in.bank_payment,
        balance_amount=sale_in.total_invoice_amount - (sale_in.cash_payment + sale_in.upi_payment + sale_in.bank_payment),
        is_locked=sale_in.is_locked
    )
    db.add(db_sale)
    await db.flush()

    total_collected = sale_in.cash_payment + sale_in.upi_payment + sale_in.bank_payment
    if total_collected > 0:
        txn = PaymentTransaction(
            party_id=sale_in.party_id,
            date=datetime.now().date(),
            type=TransactionType.RECEIVED,
            cash_amount=sale_in.cash_payment,
            upi_amount=sale_in.upi_payment,
            bank_amount=sale_in.bank_payment,
            total_amount=total_collected
        )
        db.add(txn)
    
    # Sale unpaid increases To Receive (negative balance)
    customer.current_balance = float(customer.current_balance) - sale_in.total_invoice_amount
    customer.current_balance = float(customer.current_balance) + total_collected
    await db.commit()
    await db.refresh(db_sale)

    return db_sale

@router.get("/", response_model=List[SaleResponse])
async def get_sales(
    driver_id: Optional[UUID4] = None,
    party_id: Optional[UUID4] = None,
    from_date: Optional[datetime_date] = Query(default=None),
    to_date: Optional[datetime_date] = Query(default=None),
    db: AsyncSession = Depends(deps.get_db),
):
    query = select(Sale).options(selectinload(Sale.day_bill)).order_by(Sale.date.desc())
    if driver_id:
        query = query.where(Sale.driver_id == driver_id)
    if party_id:
        query = query.where(Sale.party_id == party_id)
    if from_date:
        query = query.where(Sale.date >= from_date)
    if to_date:
        query = query.where(Sale.date <= to_date)
    result = await db.execute(query)
    rows = result.scalars().all()
    payload = []
    for row in rows:
        data = SaleResponse.model_validate(row).model_dump()
        data["day_bill_number"] = row.day_bill.bill_number if row.day_bill else None
        payload.append(data)
    return payload

@router.put("/{sale_id}", response_model=SaleResponse)
async def update_sale(sale_id: UUID4, sale_in: SaleUpdate, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    db_sale = result.scalar_one_or_none()
    if not db_sale:
        raise HTTPException(status_code=404, detail="Sale not found")
        
    result_party = await db.execute(select(Party).where(Party.id == db_sale.party_id))
    old_customer = result_party.scalar_one_or_none()

    # Revert financial impact (undo sale unpaid which decreased balance)
    old_collected = db_sale.cash_payment + db_sale.upi_payment + db_sale.bank_payment
    old_customer.current_balance = float(old_customer.current_balance) + float(db_sale.total_invoice_amount)
    old_customer.current_balance = float(old_customer.current_balance) - float(old_collected)

    if old_collected > 0:
        txn_result = await db.execute(
            select(PaymentTransaction)
            .where(PaymentTransaction.party_id == db_sale.party_id)
            .where(PaymentTransaction.date == db_sale.date)
            .where(PaymentTransaction.total_amount == old_collected)
            .where(PaymentTransaction.type == TransactionType.RECEIVED)
            .limit(1)
        )
        old_txn = txn_result.scalar_one_or_none()
        if old_txn:
            await db.delete(old_txn)

    # Handle party change
    if sale_in.party_id != db_sale.party_id:
        result_new = await db.execute(select(Party).where(Party.id == sale_in.party_id))
        new_customer = result_new.scalar_one_or_none()
        if not new_customer:
            raise HTTPException(status_code=404, detail="New customer not found")
        target_customer = new_customer
    else:
        target_customer = old_customer

    # Update sale fields
    db_sale.party_id = sale_in.party_id
    db_sale.date = sale_in.date or db_sale.date
    db_sale.vehicle_number = sale_in.vehicle_number
    db_sale.driver_name = sale_in.driver_name
    db_sale.driver_id = sale_in.driver_id
    db_sale.item_id = sale_in.item_id
    db_sale.weighbridge_weight = sale_in.weighbridge_weight
    db_sale.weight = sale_in.weight
    db_sale.weight_rate = sale_in.weight_rate
    db_sale.weight_amount = sale_in.weight_amount
    db_sale.boxes = sale_in.boxes
    db_sale.birds_per_box = sale_in.birds_per_box
    db_sale.actual_birds = sale_in.actual_birds
    db_sale.box_rate = sale_in.box_rate
    db_sale.box_amount = sale_in.box_amount
    db_sale.total_invoice_amount = sale_in.total_invoice_amount
    db_sale.cash_payment = sale_in.cash_payment
    db_sale.upi_payment = sale_in.upi_payment
    db_sale.bank_payment = sale_in.bank_payment
    db_sale.balance_amount = sale_in.total_invoice_amount - (sale_in.cash_payment + sale_in.upi_payment + sale_in.bank_payment)
    db_sale.is_locked = sale_in.is_locked

    # Create new transaction if paid
    new_collected = sale_in.cash_payment + sale_in.upi_payment + sale_in.bank_payment
    if new_collected > 0:
        new_txn = PaymentTransaction(
            party_id=sale_in.party_id,
            date=db_sale.date,
            type=TransactionType.RECEIVED,
            cash_amount=sale_in.cash_payment,
            upi_amount=sale_in.upi_payment,
            bank_amount=sale_in.bank_payment,
            total_amount=new_collected
        )
        db.add(new_txn)

    # Apply new financial impact (sale unpaid → more To Receive)
    target_customer.current_balance = float(target_customer.current_balance) - float(sale_in.total_invoice_amount)
    target_customer.current_balance = float(target_customer.current_balance) + float(new_collected)

    await db.commit()
    await db.refresh(db_sale)
    return db_sale

@router.delete("/{sale_id}", status_code=204)
async def delete_sale(sale_id: UUID4, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Sale).where(Sale.id == sale_id))
    db_sale = result.scalar_one_or_none()
    if not db_sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    result_party = await db.execute(select(Party).where(Party.id == db_sale.party_id))
    customer = result_party.scalar_one_or_none()

    old_collected = db_sale.cash_payment + db_sale.upi_payment + db_sale.bank_payment
    if customer:
        customer.current_balance = float(customer.current_balance) + float(db_sale.total_invoice_amount)
        customer.current_balance = float(customer.current_balance) - float(old_collected)

    if old_collected > 0:
        txn_result = await db.execute(
            select(PaymentTransaction)
            .where(PaymentTransaction.party_id == db_sale.party_id)
            .where(PaymentTransaction.date == db_sale.date)
            .where(PaymentTransaction.total_amount == old_collected)
            .where(PaymentTransaction.type == TransactionType.RECEIVED)
            .limit(1)
        )
        old_txn = txn_result.scalar_one_or_none()
        if old_txn:
            await db.delete(old_txn)

    await db.delete(db_sale)
    await db.commit()
    return None
