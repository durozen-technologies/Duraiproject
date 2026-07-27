from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel, UUID4
from datetime import date
from decimal import Decimal

from app.api import deps
from app.models.party import Party
from app.models.enums import PartyType, TransactionType
from app.models.transaction import PaymentTransaction
from app.models.payment_allocation import PaymentAllocation
from app.models.purchase import Purchase
from app.models.sale import Sale

router = APIRouter()

class CollectionPaymentRequest(BaseModel):
    party_id: UUID4
    cash_amount: float
    upi_amount: float
    date: date

class CollectionPaymentResponse(BaseModel):
    message: str
    transaction_id: UUID4
    party_id: UUID4
    new_balance: float

@router.post("/collection", response_model=CollectionPaymentResponse)
async def process_collection_payment(
    request: CollectionPaymentRequest,
    db: AsyncSession = Depends(deps.get_db)
):
    # Fetch party
    result = await db.execute(select(Party).where(Party.id == request.party_id))
    party = result.scalar_one_or_none()

    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    total_payment = request.cash_amount + request.upi_amount
    
    if total_payment <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    # Strict Validation: Cannot exceed current balance
    if total_payment > float(party.current_balance):
        raise HTTPException(
            status_code=400, 
            detail=f"Payment amount ({total_payment}) exceeds party's current balance ({party.current_balance})"
        )

    transaction_type = TransactionType.PAID if party.type == PartyType.SUPPLIER else TransactionType.RECEIVED

    # Create transaction record
    new_transaction = PaymentTransaction(
        party_id=party.id,
        date=request.date,
        type=transaction_type,
        cash_amount=request.cash_amount,
        upi_amount=request.upi_amount,
        total_amount=total_payment
    )
    db.add(new_transaction)
    await db.flush() # Get transaction ID

    remaining_payment = total_payment

    # Fetch unpaid purchases and sales to handle edge cases where a party has both or incorrect types
    purchase_result = await db.execute(
        select(Purchase).where(Purchase.party_id == party.id, Purchase.balance_amount > 0)
    )
    sale_result = await db.execute(
        select(Sale).where(Sale.party_id == party.id, Sale.balance_amount > 0)
    )
    
    unpaid_bills = purchase_result.scalars().all() + sale_result.scalars().all()
    # Sort combined bills by date ASC, then created_at ASC (FIFO)
    unpaid_bills.sort(key=lambda b: (b.date, b.created_at))

    unpaid_opening_balance = float(party.unpaid_opening_balance)
    
    cash_pool = request.cash_amount
    upi_pool = request.upi_amount

    # 1. Apply payment to unpaid opening balance first
    if unpaid_opening_balance > 0 and remaining_payment > 0:
        paid_to_opening = min(unpaid_opening_balance, remaining_payment)
        remaining_payment -= paid_to_opening
        
        cash_for_opening = min(paid_to_opening, cash_pool)
        cash_pool -= cash_for_opening
        upi_pool -= (paid_to_opening - cash_for_opening)
        
        # Update party unpaid opening balance
        party.unpaid_opening_balance = float(party.unpaid_opening_balance) - paid_to_opening
        
        # Record allocation for opening balance
        allocation = PaymentAllocation(
            transaction_id=new_transaction.id,
            purchase_id=None,
            sale_id=None,
            allocated_cash=cash_for_opening,
            allocated_upi=paid_to_opening - cash_for_opening
        )
        db.add(allocation)

    # 2. FIFO Bill adjustment
    for bill in unpaid_bills:
        if remaining_payment <= 0:
            break

        bill_balance = float(bill.balance_amount)
        
        # Calculate how much to pay for this bill
        paid_for_this_bill = min(bill_balance, remaining_payment)
        
        # Distribute cash and upi to this bill
        cash_for_this_bill = min(paid_for_this_bill, cash_pool)
        cash_pool -= cash_for_this_bill
        
        upi_for_this_bill = paid_for_this_bill - cash_for_this_bill
        upi_pool -= upi_for_this_bill

        # Update bill amounts
        bill.cash_payment = float(bill.cash_payment) + cash_for_this_bill
        bill.upi_payment = float(bill.upi_payment) + upi_for_this_bill
        bill.balance_amount = bill_balance - paid_for_this_bill
        
        # Lock bill because a payment was applied
        bill.is_locked = True
        
        # Record allocation
        allocation = PaymentAllocation(
            transaction_id=new_transaction.id,
            purchase_id=bill.id if isinstance(bill, Purchase) else None,
            sale_id=bill.id if isinstance(bill, Sale) else None,
            allocated_cash=cash_for_this_bill,
            allocated_upi=upi_for_this_bill
        )
        db.add(allocation)
        
        remaining_payment -= paid_for_this_bill

    # Update party balance
    party.current_balance = float(party.current_balance) - total_payment

    await db.commit()
    await db.refresh(new_transaction)
    await db.refresh(party)

    return CollectionPaymentResponse(
        message="Collection payment processed successfully",
        transaction_id=new_transaction.id,
        party_id=party.id,
        new_balance=float(party.current_balance)
    )

class AllocationDetail(BaseModel):
    type: str  # 'OPENING_BALANCE' | 'BILL'
    bill_number: Optional[str] = None
    amount: float

class PaymentHistoryItem(BaseModel):
    id: UUID4
    party_id: UUID4
    party_name: str
    date: date
    type: str
    cash_amount: float
    upi_amount: float
    total_amount: float
    allocations: List[AllocationDetail] = []

@router.get("/collection/history", response_model=List[PaymentHistoryItem])
async def get_payment_history(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: AsyncSession = Depends(deps.get_db)
):
    query = select(PaymentTransaction, Party).join(Party)
    if from_date:
        query = query.where(PaymentTransaction.date >= from_date)
    if to_date:
        query = query.where(PaymentTransaction.date <= to_date)
    
    query = query.order_by(PaymentTransaction.date.desc())
    result = await db.execute(query)
    transactions = result.all()
    
    txn_ids = [txn.id for txn, _ in transactions]
    allocs = []
    if txn_ids:
        alloc_query = (
            select(PaymentAllocation, Purchase.bill_number.label("pur_bill"), Sale.bill_number.label("sal_bill"))
            .outerjoin(Purchase, PaymentAllocation.purchase_id == Purchase.id)
            .outerjoin(Sale, PaymentAllocation.sale_id == Sale.id)
            .where(PaymentAllocation.transaction_id.in_(txn_ids))
        )
        alloc_result = await db.execute(alloc_query)
        allocs = alloc_result.all()

    txn_allocations = {}
    for alloc, pur_bill, sal_bill in allocs:
        txn_id = alloc.transaction_id
        if txn_id not in txn_allocations:
            txn_allocations[txn_id] = []
            
        total_amount = float(alloc.allocated_cash) + float(alloc.allocated_upi)
        if total_amount > 0:
            if alloc.purchase_id is None and alloc.sale_id is None:
                txn_allocations[txn_id].append({
                    "type": "OPENING_BALANCE",
                    "bill_number": None,
                    "amount": total_amount
                })
            else:
                bill_no = pur_bill if pur_bill else sal_bill
                txn_allocations[txn_id].append({
                    "type": "BILL",
                    "bill_number": bill_no,
                    "amount": total_amount
                })
    
    items = []
    for txn, party in transactions:
        items.append({
            "id": txn.id,
            "party_id": party.id,
            "party_name": party.name,
            "date": txn.date,
            "type": txn.type.value,
            "cash_amount": float(txn.cash_amount),
            "upi_amount": float(txn.upi_amount),
            "total_amount": float(txn.total_amount),
            "allocations": txn_allocations.get(txn.id, [])
        })
    return items

@router.delete("/collection/{transaction_id}", status_code=204)
async def delete_collection_payment(
    transaction_id: UUID4,
    db: AsyncSession = Depends(deps.get_db)
):
    # Fetch transaction
    result = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.id == transaction_id)
    )
    txn = result.scalar_one_or_none()
    
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Fetch party
    party_res = await db.execute(select(Party).where(Party.id == txn.party_id))
    party = party_res.scalar_one()

    # Revert party balance
    party.current_balance = float(party.current_balance) + float(txn.total_amount)

    # Fetch allocations
    alloc_res = await db.execute(
        select(PaymentAllocation).where(PaymentAllocation.transaction_id == transaction_id)
    )
    allocations = alloc_res.scalars().all()

    for alloc in allocations:
        total_alloc = float(alloc.allocated_cash) + float(alloc.allocated_upi)
        if alloc.purchase_id:
            # Revert Purchase
            p_res = await db.execute(select(Purchase).where(Purchase.id == alloc.purchase_id))
            purchase = p_res.scalar_one()
            purchase.cash_payment = float(purchase.cash_payment) - float(alloc.allocated_cash)
            purchase.upi_payment = float(purchase.upi_payment) - float(alloc.allocated_upi)
            purchase.balance_amount = float(purchase.balance_amount) + total_alloc
            
            # Unlock if no other allocations exist
            remaining = await db.execute(
                select(PaymentAllocation)
                .where(PaymentAllocation.purchase_id == purchase.id)
                .where(PaymentAllocation.id != alloc.id)
            )
            if not remaining.scalars().first():
                purchase.is_locked = False
                
        elif alloc.sale_id:
            # Revert Sale
            s_res = await db.execute(select(Sale).where(Sale.id == alloc.sale_id))
            sale = s_res.scalar_one()
            sale.cash_payment = float(sale.cash_payment) - float(alloc.allocated_cash)
            sale.upi_payment = float(sale.upi_payment) - float(alloc.allocated_upi)
            sale.balance_amount = float(sale.balance_amount) + total_alloc
            
            # Unlock if no other allocations exist
            remaining = await db.execute(
                select(PaymentAllocation)
                .where(PaymentAllocation.sale_id == sale.id)
                .where(PaymentAllocation.id != alloc.id)
            )
            if not remaining.scalars().first():
                sale.is_locked = False
                
        else:
            # Revert Opening Balance
            party.unpaid_opening_balance = float(party.unpaid_opening_balance) + total_alloc

    # Delete transaction (allocations cascade deleted)
    await db.delete(txn)
    await db.commit()


@router.put("/collection/{transaction_id}", response_model=CollectionPaymentResponse)
async def update_collection_payment(
    transaction_id: UUID4,
    request: CollectionPaymentRequest,
    db: AsyncSession = Depends(deps.get_db)
):
    # Safely fetch the existing transaction
    result = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.id == transaction_id)
    )
    txn = result.scalar_one_or_none()
    
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Fetch party
    party_res = await db.execute(select(Party).where(Party.id == txn.party_id))
    party = party_res.scalar_one()

    # Revert party balance
    party.current_balance = float(party.current_balance) + float(txn.total_amount)

    # Fetch allocations
    alloc_res = await db.execute(
        select(PaymentAllocation).where(PaymentAllocation.transaction_id == transaction_id)
    )
    allocations = alloc_res.scalars().all()

    for alloc in allocations:
        total_alloc = float(alloc.allocated_cash) + float(alloc.allocated_upi)
        if alloc.purchase_id:
            p_res = await db.execute(select(Purchase).where(Purchase.id == alloc.purchase_id))
            purchase = p_res.scalar_one()
            purchase.cash_payment = float(purchase.cash_payment) - float(alloc.allocated_cash)
            purchase.upi_payment = float(purchase.upi_payment) - float(alloc.allocated_upi)
            purchase.balance_amount = float(purchase.balance_amount) + total_alloc
            
            remaining = await db.execute(
                select(PaymentAllocation)
                .where(PaymentAllocation.purchase_id == purchase.id)
                .where(PaymentAllocation.id != alloc.id)
            )
            if not remaining.scalars().first():
                purchase.is_locked = False
                
        elif alloc.sale_id:
            s_res = await db.execute(select(Sale).where(Sale.id == alloc.sale_id))
            sale = s_res.scalar_one()
            sale.cash_payment = float(sale.cash_payment) - float(alloc.allocated_cash)
            sale.upi_payment = float(sale.upi_payment) - float(alloc.allocated_upi)
            sale.balance_amount = float(sale.balance_amount) + total_alloc
            
            remaining = await db.execute(
                select(PaymentAllocation)
                .where(PaymentAllocation.sale_id == sale.id)
                .where(PaymentAllocation.id != alloc.id)
            )
            if not remaining.scalars().first():
                sale.is_locked = False
                
        else:
            party.unpaid_opening_balance = float(party.unpaid_opening_balance) + total_alloc

        # Delete the old allocation
        await db.delete(alloc)
    
    # We must flush so that the DB knows about the reverted balances for subsequent queries
    await db.flush()

    total_payment = request.cash_amount + request.upi_amount
    if total_payment <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    if total_payment > float(party.current_balance):
        raise HTTPException(
            status_code=400, 
            detail=f"Payment amount ({total_payment}) exceeds party's current balance ({party.current_balance})"
        )

    # Update existing transaction fields (do not create a new one)
    txn.cash_amount = request.cash_amount
    txn.upi_amount = request.upi_amount
    txn.total_amount = total_payment
    txn.date = request.date

    remaining_payment = total_payment

    purchase_result = await db.execute(
        select(Purchase).where(Purchase.party_id == party.id, Purchase.balance_amount > 0)
    )
    sale_result = await db.execute(
        select(Sale).where(Sale.party_id == party.id, Sale.balance_amount > 0)
    )
    
    unpaid_bills = purchase_result.scalars().all() + sale_result.scalars().all()
    unpaid_bills.sort(key=lambda b: (b.date, b.created_at))

    unpaid_opening_balance = float(party.unpaid_opening_balance)
    
    cash_pool = request.cash_amount
    upi_pool = request.upi_amount

    if unpaid_opening_balance > 0 and remaining_payment > 0:
        paid_to_opening = min(unpaid_opening_balance, remaining_payment)
        remaining_payment -= paid_to_opening
        
        cash_for_opening = min(paid_to_opening, cash_pool)
        cash_pool -= cash_for_opening
        upi_pool -= (paid_to_opening - cash_for_opening)
        
        party.unpaid_opening_balance = float(party.unpaid_opening_balance) - paid_to_opening
        
        allocation = PaymentAllocation(
            transaction_id=txn.id,
            purchase_id=None,
            sale_id=None,
            allocated_cash=cash_for_opening,
            allocated_upi=paid_to_opening - cash_for_opening
        )
        db.add(allocation)

    for bill in unpaid_bills:
        if remaining_payment <= 0:
            break

        bill_balance = float(bill.balance_amount)
        paid_for_this_bill = min(bill_balance, remaining_payment)
        
        cash_for_this_bill = min(paid_for_this_bill, cash_pool)
        cash_pool -= cash_for_this_bill
        upi_for_this_bill = paid_for_this_bill - cash_for_this_bill
        upi_pool -= upi_for_this_bill

        bill.cash_payment = float(bill.cash_payment) + cash_for_this_bill
        bill.upi_payment = float(bill.upi_payment) + upi_for_this_bill
        bill.balance_amount = bill_balance - paid_for_this_bill
        
        bill.is_locked = True
        
        allocation = PaymentAllocation(
            transaction_id=txn.id,
            purchase_id=bill.id if isinstance(bill, Purchase) else None,
            sale_id=bill.id if isinstance(bill, Sale) else None,
            allocated_cash=cash_for_this_bill,
            allocated_upi=upi_for_this_bill
        )
        db.add(allocation)
        
        remaining_payment -= paid_for_this_bill

    party.current_balance = float(party.current_balance) - total_payment

    await db.commit()
    await db.refresh(txn)
    await db.refresh(party)

    return CollectionPaymentResponse(
        message="Collection payment updated successfully",
        transaction_id=txn.id,
        party_id=party.id,
        new_balance=float(party.current_balance)
    )
