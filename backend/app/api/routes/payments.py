from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel, UUID4
from datetime import date, datetime
from uuid import UUID

from app.api import deps
from app.models.party import Party
from app.models.enums import TransactionType
from app.models.transaction import PaymentTransaction

router = APIRouter()


class CollectionPaymentRequest(BaseModel):
    party_id: UUID4
    cash_amount: float = 0.0
    upi_amount: float = 0.0
    bank_amount: float = 0.0
    date: date


class CollectionPaymentResponse(BaseModel):
    message: str
    transaction_id: UUID4
    party_id: UUID4
    new_balance: float


class PaymentHistoryItem(BaseModel):
    id: UUID4
    party_id: UUID4
    party_name: str
    party_nickname: Optional[str] = None
    date: date
    type: str
    cash_amount: float
    upi_amount: float
    bank_amount: float
    total_amount: float
    opening_applied: float = 0.0
    created_at: Optional[datetime] = None


async def _opening_applied_total(db: AsyncSession, party_id: UUID) -> float:
    """Sum of collection amounts still applied to this party's opening."""
    result = await db.execute(
        select(func.coalesce(func.sum(PaymentTransaction.opening_applied), 0)).where(
            PaymentTransaction.party_id == party_id
        )
    )
    return round(float(result.scalar() or 0), 2)


def _reconcile_unpaid_opening(party: Party, paid_abs: float) -> None:
    """Set unpaid_opening = opening − remaining collection applied to opening."""
    opening = round(float(party.opening_balance or 0), 2)
    paid_abs = round(float(paid_abs or 0), 2)
    signed_paid = -paid_abs if opening < 0 else paid_abs
    party.unpaid_opening_balance = round(opening - signed_paid, 2)


def _apply_collection_to_party(party: Party, total: float) -> tuple[TransactionType, float]:
    """Move party.current_balance toward zero by total. Returns (txn_type, opening_applied)."""
    balance = float(party.current_balance)
    outstanding = abs(balance)

    if balance == 0:
        raise HTTPException(status_code=400, detail="Party has no outstanding balance")

    if total > outstanding:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount ({total}) exceeds party's outstanding balance ({outstanding})",
        )

    unpaid = float(party.unpaid_opening_balance or 0)
    opening_applied = 0.0

    if balance > 0:
        # To Pay (CR)
        txn_type = TransactionType.PAID
        party.current_balance = balance - total
        if unpaid > 0:
            opening_applied = min(total, unpaid)
            party.unpaid_opening_balance = unpaid - opening_applied
    else:
        # To Receive (DR)
        txn_type = TransactionType.RECEIVED
        party.current_balance = balance + total
        if unpaid < 0:
            opening_applied = min(total, abs(unpaid))
            party.unpaid_opening_balance = unpaid + opening_applied

    return txn_type, opening_applied


def _revert_collection_from_party(party: Party, txn: PaymentTransaction) -> None:
    total = float(txn.total_amount)
    opening_applied = float(txn.opening_applied or 0)

    if txn.type == TransactionType.PAID:
        party.current_balance = float(party.current_balance) + total
        party.unpaid_opening_balance = float(party.unpaid_opening_balance or 0) + opening_applied
    else:
        party.current_balance = float(party.current_balance) - total
        party.unpaid_opening_balance = float(party.unpaid_opening_balance or 0) - opening_applied


@router.post("/collection", response_model=CollectionPaymentResponse)
async def process_collection_payment(
    request: CollectionPaymentRequest,
    db: AsyncSession = Depends(deps.get_db),
):
    result = await db.execute(select(Party).where(Party.id == request.party_id))
    party = result.scalar_one_or_none()

    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    total_payment = float(request.cash_amount or 0) + float(request.upi_amount or 0) + float(request.bank_amount or 0)

    if total_payment <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    txn_type, opening_applied = _apply_collection_to_party(party, total_payment)

    new_transaction = PaymentTransaction(
        party_id=party.id,
        date=request.date,
        type=txn_type,
        cash_amount=request.cash_amount or 0,
        upi_amount=request.upi_amount or 0,
        bank_amount=request.bank_amount or 0,
        total_amount=total_payment,
        opening_applied=opening_applied,
    )
    db.add(new_transaction)
    await db.commit()
    await db.refresh(new_transaction)
    await db.refresh(party)

    return CollectionPaymentResponse(
        message="Collection payment processed successfully",
        transaction_id=new_transaction.id,
        party_id=party.id,
        new_balance=float(party.current_balance),
    )


@router.get("/collection/history", response_model=List[PaymentHistoryItem])
async def get_payment_history(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: AsyncSession = Depends(deps.get_db),
):
    query = select(PaymentTransaction, Party).join(Party)
    if from_date:
        query = query.where(PaymentTransaction.date >= from_date)
    if to_date:
        query = query.where(PaymentTransaction.date <= to_date)

    query = query.order_by(
        PaymentTransaction.date.desc(),
        PaymentTransaction.created_at.desc(),
    )
    result = await db.execute(query)
    transactions = result.all()

    items = []
    for txn, party in transactions:
        items.append({
            "id": txn.id,
            "party_id": party.id,
            "party_name": party.name,
            "party_nickname": party.nickname,
            "date": txn.date,
            "type": txn.type.value,
            "cash_amount": float(txn.cash_amount or 0),
            "upi_amount": float(txn.upi_amount or 0),
            "bank_amount": float(txn.bank_amount or 0),
            "total_amount": float(txn.total_amount or 0),
            "opening_applied": float(txn.opening_applied or 0),
            "created_at": txn.created_at,
        })
    return items


@router.delete("/collection/{transaction_id}", status_code=204)
async def delete_collection_payment(
    transaction_id: UUID4,
    db: AsyncSession = Depends(deps.get_db),
):
    result = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.id == transaction_id)
    )
    txn = result.scalar_one_or_none()

    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    party_res = await db.execute(select(Party).where(Party.id == txn.party_id))
    party = party_res.scalar_one()

    _revert_collection_from_party(party, txn)

    await db.delete(txn)
    await db.flush()
    # After delete, rebuild unpaid opening from remaining payments (fixes floor after delete)
    paid_abs = await _opening_applied_total(db, party.id)
    _reconcile_unpaid_opening(party, paid_abs)

    await db.commit()


@router.put("/collection/{transaction_id}", response_model=CollectionPaymentResponse)
async def update_collection_payment(
    transaction_id: UUID4,
    request: CollectionPaymentRequest,
    db: AsyncSession = Depends(deps.get_db),
):
    result = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.id == transaction_id)
    )
    txn = result.scalar_one_or_none()

    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    party_res = await db.execute(select(Party).where(Party.id == txn.party_id))
    party = party_res.scalar_one()

    # Revert old payment, then apply new amounts against restored balance
    _revert_collection_from_party(party, txn)
    await db.flush()

    total_payment = float(request.cash_amount or 0) + float(request.upi_amount or 0) + float(request.bank_amount or 0)
    if total_payment <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    txn_type, opening_applied = _apply_collection_to_party(party, total_payment)

    txn.cash_amount = request.cash_amount or 0
    txn.upi_amount = request.upi_amount or 0
    txn.bank_amount = request.bank_amount or 0
    txn.total_amount = total_payment
    txn.date = request.date
    txn.type = txn_type
    txn.opening_applied = opening_applied

    await db.flush()
    paid_abs = await _opening_applied_total(db, party.id)
    _reconcile_unpaid_opening(party, paid_abs)

    await db.commit()
    await db.refresh(txn)
    await db.refresh(party)

    return CollectionPaymentResponse(
        message="Collection payment updated successfully",
        transaction_id=txn.id,
        party_id=party.id,
        new_balance=float(party.current_balance),
    )
