from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel, UUID4
from datetime import datetime
from uuid import UUID

from app.api import deps
from app.models.party import Party
from app.models.enums import PartyType
from app.models.transaction import PaymentTransaction

router = APIRouter()

class PartyBase(BaseModel):
    name: str
    nickname: Optional[str] = None
    tamil_name: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    type: str # 'SALE', 'PURCHASER', or 'BOTH'
    opening_balance: float = 0.0
    is_active: bool = True

class PartyUpdate(BaseModel):
    name: Optional[str] = None
    nickname: Optional[str] = None
    tamil_name: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None
    opening_balance: Optional[float] = None

class PartyCreate(PartyBase):
    pass

class PartyResponse(PartyBase):
    id: UUID4
    current_balance: float
    unpaid_opening_balance: float
    created_at: datetime
    updated_at: datetime
    total_pending_invoice_amount: float = 0.0
    # Absolute ₹ of opening already cleared by collection payments (paid floor)
    opening_settled: float = 0.0

    class Config:
        from_attributes = True


async def _opening_settled_abs(db: AsyncSession, party_id: UUID) -> float:
    result = await db.execute(
        select(func.coalesce(func.sum(PaymentTransaction.opening_applied), 0)).where(
            PaymentTransaction.party_id == party_id
        )
    )
    return round(float(result.scalar() or 0), 2)


def _sync_unpaid_opening(party: Party, settled_abs: float) -> bool:
    """Align unpaid_opening with opening − settled collections. Returns True if changed."""
    opening = round(float(party.opening_balance or 0), 2)
    settled_abs = round(float(settled_abs or 0), 2)
    signed_paid = -settled_abs if opening < 0 else settled_abs
    new_unpaid = round(opening - signed_paid, 2)
    old_unpaid = round(float(party.unpaid_opening_balance or 0), 2)
    if old_unpaid != new_unpaid:
        party.unpaid_opening_balance = new_unpaid
        return True
    return False


def _party_to_response(party: Party, settled_abs: float = 0.0, pending: float = 0.0) -> dict:
    return {
        "id": party.id,
        "name": party.name,
        "nickname": party.nickname,
        "tamil_name": party.tamil_name,
        "mobile": party.mobile,
        "address": party.address,
        "type": party.type.value if hasattr(party.type, "value") else party.type,
        "opening_balance": float(party.opening_balance or 0),
        "is_active": party.is_active,
        "current_balance": float(party.current_balance or 0),
        "unpaid_opening_balance": float(party.unpaid_opening_balance or 0),
        "created_at": party.created_at,
        "updated_at": party.updated_at,
        "total_pending_invoice_amount": pending,
        "opening_settled": round(float(settled_abs or 0), 2),
    }

@router.get("/", response_model=List[PartyResponse])
async def get_parties(party_type: Optional[str] = None, db: AsyncSession = Depends(deps.get_db)):
    from app.models.purchase import Purchase
    from app.models.sale import Sale
    query = select(Party)
    if party_type:
        query = query.where(Party.type.in_([PartyType(party_type), PartyType.BOTH]))
    result = await db.execute(query)
    parties = result.scalars().all()
    
    pur_query = select(Purchase.party_id, func.sum(Purchase.purchase_amount)).where(Purchase.balance_amount > 0).group_by(Purchase.party_id)
    sal_query = select(Sale.party_id, func.sum(Sale.total_invoice_amount)).where(Sale.balance_amount > 0).group_by(Sale.party_id)
    
    pur_totals = {row[0]: float(row[1]) for row in (await db.execute(pur_query)).all()}
    sal_totals = {row[0]: float(row[1]) for row in (await db.execute(sal_query)).all()}

    settled_rows = await db.execute(
        select(
            PaymentTransaction.party_id,
            func.coalesce(func.sum(PaymentTransaction.opening_applied), 0),
        ).group_by(PaymentTransaction.party_id)
    )
    settled_map = {row[0]: round(float(row[1] or 0), 2) for row in settled_rows.all()}

    changed = False
    responses = []
    for party in parties:
        pending = pur_totals.get(party.id, 0.0) + sal_totals.get(party.id, 0.0)
        settled = settled_map.get(party.id, 0.0)
        if _sync_unpaid_opening(party, settled):
            changed = True
        responses.append(_party_to_response(party, settled_abs=settled, pending=pending))
    if changed:
        await db.commit()
        
    return responses

@router.get("/{party_id}", response_model=PartyResponse)
async def get_party(party_id: UUID4, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Party).where(Party.id == party_id))
    db_party = result.scalar_one_or_none()
    if not db_party:
        raise HTTPException(status_code=404, detail="Party not found")
    settled = await _opening_settled_abs(db, party_id)
    if _sync_unpaid_opening(db_party, settled):
        await db.commit()
        await db.refresh(db_party)
    return _party_to_response(db_party, settled_abs=settled, pending=0.0)

from app.models.purchase import Purchase
from app.models.sale import Sale
from datetime import date as datetime_date

class PendingBill(BaseModel):
    id: Optional[UUID4] = None
    bill_number: Optional[str] = None
    date: Optional[datetime_date] = None
    total_amount: float
    balance_amount: float
    boxes: Optional[int] = None
    birds: Optional[int] = None
    net_weight: Optional[float] = None
    is_opening_balance: bool = False

@router.get("/{party_id}/pending-bills", response_model=List[PendingBill])
async def get_party_pending_bills(party_id: UUID4, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Party).where(Party.id == party_id))
    party = result.scalar_one_or_none()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
        
    pending = []
    
    if float(party.unpaid_opening_balance) != 0:
        pending.append(PendingBill(
            total_amount=abs(float(party.opening_balance)),
            balance_amount=abs(float(party.unpaid_opening_balance)),
            is_opening_balance=True
        ))
        
    purchase_result = await db.execute(
        select(Purchase).where(Purchase.party_id == party_id, Purchase.balance_amount > 0).order_by(Purchase.date.asc())
    )
    for p in purchase_result.scalars().all():
        pending.append(PendingBill(
            id=p.id,
            bill_number=p.bill_number,
            date=p.date,
            total_amount=float(p.purchase_amount),
            balance_amount=float(p.balance_amount),
            boxes=p.total_boxes,
            birds=p.actual_birds,
            net_weight=float(p.net_weight),
            is_opening_balance=False
        ))
        
    sale_result = await db.execute(
        select(Sale).where(Sale.party_id == party_id, Sale.balance_amount > 0).order_by(Sale.date.asc())
    )
    for s in sale_result.scalars().all():
        pending.append(PendingBill(
            id=s.id,
            bill_number=s.bill_number,
            date=s.date,
            total_amount=float(s.total_invoice_amount),
            balance_amount=float(s.balance_amount),
            boxes=s.boxes,
            birds=s.actual_birds,
            net_weight=float(s.weight),
            is_opening_balance=False
        ))
        
    return pending

@router.post("/", response_model=PartyResponse)
async def create_party(party: PartyCreate, db: AsyncSession = Depends(deps.get_db)):
    db_party = Party(
        name=party.name,
        nickname=party.nickname,
        tamil_name=party.tamil_name,
        mobile=party.mobile,
        address=party.address,
        type=PartyType(party.type),
        opening_balance=party.opening_balance,
        unpaid_opening_balance=party.opening_balance,
        current_balance=party.opening_balance,
        is_active=party.is_active
    )
    db.add(db_party)
    await db.commit()
    await db.refresh(db_party)
    return _party_to_response(db_party, settled_abs=0.0, pending=0.0)

@router.put("/{party_id}", response_model=PartyResponse)
async def update_party(party_id: UUID4, party_update: PartyUpdate, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Party).where(Party.id == party_id))
    db_party = result.scalar_one_or_none()
    
    if not db_party:
        raise HTTPException(status_code=404, detail="Party not found")
        
    update_data = party_update.model_dump(exclude_unset=True)
    
    if 'opening_balance' in update_data:
        old_opening = round(float(db_party.opening_balance or 0), 2)
        new_opening = round(float(update_data['opening_balance'] or 0), 2)

        # Paid floor from remaining collection rows (source of truth after delete)
        paid_abs = await _opening_settled_abs(db, party_id)
        paid = -paid_abs if old_opening < 0 else paid_abs

        # Cannot flip CR/DR while collection has already settled part of opening
        if paid_abs != 0 and (
            (old_opening > 0 > new_opening) or (old_opening < 0 < new_opening)
        ):
            raise HTTPException(
                status_code=400,
                detail="Cannot change opening To Pay/To Receive direction after collection has been applied to opening",
            )

        # Cannot set opening below what collection already paid against opening
        if paid > 0 and new_opening < paid:
            raise HTTPException(
                status_code=400,
                detail=f"Opening cannot be below ₹{paid:.2f} already settled by collection",
            )
        if paid < 0 and new_opening > paid:
            raise HTTPException(
                status_code=400,
                detail=f"Opening cannot be below ₹{abs(paid):.2f} already settled by collection",
            )

        # New direction for signed paid when opening was 0 but paid exists (use new sign)
        if old_opening == 0 and new_opening < 0:
            paid = -paid_abs
        elif old_opening == 0 and new_opening >= 0:
            paid = paid_abs

        db_party.unpaid_opening_balance = round(new_opening - paid, 2)
        db_party.current_balance = round(float(db_party.current_balance or 0) + (new_opening - old_opening), 2)
        update_data['opening_balance'] = new_opening

    for key, value in update_data.items():
        setattr(db_party, key, value)
        
    await db.commit()
    await db.refresh(db_party)
    settled = await _opening_settled_abs(db, party_id)
    return _party_to_response(db_party, settled_abs=settled, pending=0.0)

