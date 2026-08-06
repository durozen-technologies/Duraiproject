from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel, UUID4
from datetime import datetime, date as datetime_date

from app.api import deps
from app.models.purchase import Purchase
from app.models.party import Party
from app.models.transaction import PaymentTransaction
from app.models.enums import TransactionType

router = APIRouter()

class PurchaseBase(BaseModel):
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
    balance_amount: float = 0.0
    remarks: Optional[str] = None
    is_locked: bool = False

class PurchaseCreate(PurchaseBase):
    date: Optional[datetime_date] = None

class PurchaseResponse(PurchaseBase):
    id: UUID4
    date: datetime_date
    bill_number: Optional[str] = None
    day_bill_id: Optional[UUID4] = None
    day_bill_number: Optional[str] = None

    class Config:
        from_attributes = True

class PurchaseUpdate(PurchaseCreate):
    pass

@router.post("/", response_model=PurchaseResponse)
async def create_purchase(purchase_in: PurchaseCreate, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Party).where(Party.id == purchase_in.party_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Party not found")
        
    purchase_date = purchase_in.date or datetime_date.today()

    db_purchase = Purchase(
        party_id=purchase_in.party_id,
        date=purchase_date,
        bill_number=None,
        vehicle_number=purchase_in.vehicle_number,
        driver_name=purchase_in.driver_name,
        driver_id=purchase_in.driver_id,
        total_boxes=purchase_in.total_boxes,
        birds_per_box=purchase_in.birds_per_box,
        actual_birds=purchase_in.actual_birds,
        weighbridge_weight=purchase_in.weighbridge_weight,
        net_weight=purchase_in.net_weight,
        purchase_rate=purchase_in.purchase_rate,
        purchase_amount=purchase_in.purchase_amount,
        cash_payment=purchase_in.cash_payment,
        upi_payment=purchase_in.upi_payment,
        bank_payment=purchase_in.bank_payment,
        balance_amount=purchase_in.purchase_amount - (purchase_in.cash_payment + purchase_in.upi_payment + purchase_in.bank_payment),
        remarks=purchase_in.remarks,
        is_locked=purchase_in.is_locked
    )
    db.add(db_purchase)
    await db.flush()

    total_paid = purchase_in.cash_payment + purchase_in.upi_payment + purchase_in.bank_payment
    if total_paid > 0:
        txn = PaymentTransaction(
            party_id=purchase_in.party_id,
            date=datetime.now().date(),
            type=TransactionType.PAID,
            cash_amount=purchase_in.cash_payment,
            upi_amount=purchase_in.upi_payment,
            bank_amount=purchase_in.bank_payment,
            total_amount=total_paid
        )
        db.add(txn)
    
    supplier.current_balance = float(supplier.current_balance) + purchase_in.purchase_amount
    supplier.current_balance = float(supplier.current_balance) - total_paid
    await db.commit()
    await db.refresh(db_purchase)

    return db_purchase

@router.get("/", response_model=List[PurchaseResponse])
async def get_purchases(
    driver_id: Optional[UUID4] = None,
    party_id: Optional[UUID4] = None,
    from_date: Optional[datetime_date] = Query(default=None),
    to_date: Optional[datetime_date] = Query(default=None),
    db: AsyncSession = Depends(deps.get_db),
):
    query = select(Purchase).options(selectinload(Purchase.day_bill)).order_by(Purchase.date.desc())
    if driver_id:
        query = query.where(Purchase.driver_id == driver_id)
    if party_id:
        query = query.where(Purchase.party_id == party_id)
    if from_date:
        query = query.where(Purchase.date >= from_date)
    if to_date:
        query = query.where(Purchase.date <= to_date)
    result = await db.execute(query)
    rows = result.scalars().all()
    payload = []
    for row in rows:
        data = PurchaseResponse.model_validate(row).model_dump()
        data["day_bill_number"] = row.day_bill.bill_number if row.day_bill else None
        payload.append(data)
    return payload

@router.put("/{purchase_id}", response_model=PurchaseResponse)
async def update_purchase(purchase_id: UUID4, purchase_in: PurchaseUpdate, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Purchase).where(Purchase.id == purchase_id))
    db_purchase = result.scalar_one_or_none()
    if not db_purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
        
    result_party = await db.execute(select(Party).where(Party.id == db_purchase.party_id))
    old_supplier = result_party.scalar_one_or_none()

    # Revert financial impact
    old_paid = db_purchase.cash_payment + db_purchase.upi_payment + db_purchase.bank_payment
    old_supplier.current_balance = float(old_supplier.current_balance) - float(db_purchase.purchase_amount)
    old_supplier.current_balance = float(old_supplier.current_balance) + float(old_paid)

    if old_paid > 0:
        txn_result = await db.execute(
            select(PaymentTransaction)
            .where(PaymentTransaction.party_id == db_purchase.party_id)
            .where(PaymentTransaction.date == db_purchase.date)
            .where(PaymentTransaction.total_amount == old_paid)
            .where(PaymentTransaction.type == TransactionType.PAID)
            .limit(1)
        )
        old_txn = txn_result.scalar_one_or_none()
        if old_txn:
            await db.delete(old_txn)

    # Handle party change
    if purchase_in.party_id != db_purchase.party_id:
        result_new = await db.execute(select(Party).where(Party.id == purchase_in.party_id))
        new_supplier = result_new.scalar_one_or_none()
        if not new_supplier:
            raise HTTPException(status_code=404, detail="New supplier not found")
        target_supplier = new_supplier
    else:
        target_supplier = old_supplier

    # Update purchase fields
    db_purchase.party_id = purchase_in.party_id
    db_purchase.date = purchase_in.date or db_purchase.date
    db_purchase.vehicle_number = purchase_in.vehicle_number
    db_purchase.driver_name = purchase_in.driver_name
    db_purchase.driver_id = purchase_in.driver_id
    db_purchase.total_boxes = purchase_in.total_boxes
    db_purchase.birds_per_box = purchase_in.birds_per_box
    db_purchase.actual_birds = purchase_in.actual_birds
    db_purchase.weighbridge_weight = purchase_in.weighbridge_weight
    db_purchase.net_weight = purchase_in.net_weight
    db_purchase.purchase_rate = purchase_in.purchase_rate
    db_purchase.purchase_amount = purchase_in.purchase_amount
    db_purchase.cash_payment = purchase_in.cash_payment
    db_purchase.upi_payment = purchase_in.upi_payment
    db_purchase.bank_payment = purchase_in.bank_payment
    db_purchase.balance_amount = purchase_in.purchase_amount - (purchase_in.cash_payment + purchase_in.upi_payment + purchase_in.bank_payment)
    db_purchase.remarks = purchase_in.remarks
    db_purchase.is_locked = purchase_in.is_locked

    # Create new transaction if paid
    new_paid = purchase_in.cash_payment + purchase_in.upi_payment + purchase_in.bank_payment
    if new_paid > 0:
        new_txn = PaymentTransaction(
            party_id=purchase_in.party_id,
            date=db_purchase.date,
            type=TransactionType.PAID,
            cash_amount=purchase_in.cash_payment,
            upi_amount=purchase_in.upi_payment,
            bank_amount=purchase_in.bank_payment,
            total_amount=new_paid
        )
        db.add(new_txn)

    # Apply new financial impact
    target_supplier.current_balance = float(target_supplier.current_balance) + float(purchase_in.purchase_amount)
    target_supplier.current_balance = float(target_supplier.current_balance) - float(new_paid)

    await db.commit()
    await db.refresh(db_purchase)
    return db_purchase

@router.delete("/{purchase_id}", status_code=204)
async def delete_purchase(purchase_id: UUID4, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Purchase).where(Purchase.id == purchase_id))
    db_purchase = result.scalar_one_or_none()
    if not db_purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    result_party = await db.execute(select(Party).where(Party.id == db_purchase.party_id))
    supplier = result_party.scalar_one_or_none()

    old_paid = db_purchase.cash_payment + db_purchase.upi_payment + db_purchase.bank_payment
    if supplier:
        supplier.current_balance = float(supplier.current_balance) - float(db_purchase.purchase_amount)
        supplier.current_balance = float(supplier.current_balance) + float(old_paid)

    if old_paid > 0:
        txn_result = await db.execute(
            select(PaymentTransaction)
            .where(PaymentTransaction.party_id == db_purchase.party_id)
            .where(PaymentTransaction.date == db_purchase.date)
            .where(PaymentTransaction.total_amount == old_paid)
            .where(PaymentTransaction.type == TransactionType.PAID)
            .limit(1)
        )
        old_txn = txn_result.scalar_one_or_none()
        if old_txn:
            await db.delete(old_txn)

    await db.delete(db_purchase)
    await db.commit()
    return None
