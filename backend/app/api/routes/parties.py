from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel, UUID4
from datetime import datetime

from app.api import deps
from app.models.party import Party
from app.models.enums import PartyType

router = APIRouter()

class PartyBase(BaseModel):
    name: str
    nickname: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    type: str # 'supplier' or 'customer'
    opening_balance: float = 0.0
    is_active: bool = True

class PartyUpdate(BaseModel):
    name: Optional[str] = None
    nickname: Optional[str] = None
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

    class Config:
        from_attributes = True

from sqlalchemy import func

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
    
    for party in parties:
        party.total_pending_invoice_amount = pur_totals.get(party.id, 0.0) + sal_totals.get(party.id, 0.0)
        
    return parties

@router.get("/{party_id}", response_model=PartyResponse)
async def get_party(party_id: UUID4, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Party).where(Party.id == party_id))
    db_party = result.scalar_one_or_none()
    if not db_party:
        raise HTTPException(status_code=404, detail="Party not found")
    return db_party

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
    return db_party

@router.put("/{party_id}", response_model=PartyResponse)
async def update_party(party_id: UUID4, party_update: PartyUpdate, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Party).where(Party.id == party_id))
    db_party = result.scalar_one_or_none()
    
    if not db_party:
        raise HTTPException(status_code=404, detail="Party not found")
        
    update_data = party_update.model_dump(exclude_unset=True)
    
    if 'opening_balance' in update_data:
        diff = update_data['opening_balance'] - float(db_party.opening_balance)
        db_party.current_balance = float(db_party.current_balance) + diff
        # Keep unpaid opening in sync when opening is edited (pre-transaction)
        db_party.unpaid_opening_balance = float(db_party.unpaid_opening_balance or 0) + diff

    for key, value in update_data.items():
        setattr(db_party, key, value)
        
    await db.commit()
    await db.refresh(db_party)
    return db_party

