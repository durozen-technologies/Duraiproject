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
    mobile: Optional[str] = None
    address: Optional[str] = None
    type: str # 'supplier' or 'customer'
    opening_balance: float = 0.0

class PartyCreate(PartyBase):
    pass

class PartyResponse(PartyBase):
    id: UUID4
    current_balance: float
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

@router.get("/", response_model=List[PartyResponse])
async def get_parties(party_type: Optional[str] = None, db: AsyncSession = Depends(deps.get_db)):
    query = select(Party)
    if party_type:
        query = query.where(Party.type == PartyType(party_type))
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=PartyResponse)
async def create_party(party: PartyCreate, db: AsyncSession = Depends(deps.get_db)):
    db_party = Party(
        name=party.name,
        mobile=party.mobile,
        address=party.address,
        type=PartyType(party.type),
        opening_balance=party.opening_balance,
        current_balance=party.opening_balance
    )
    db.add(db_party)
    await db.commit()
    await db.refresh(db_party)
    return db_party
