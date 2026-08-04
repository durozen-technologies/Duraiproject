from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel, UUID4

from app.api import deps
from app.models.driver import Driver

router = APIRouter()

class DriverBase(BaseModel):
    name: str
    nickname: Optional[str] = None
    mobile: Optional[str] = None
    is_active: bool = True

class DriverCreate(DriverBase):
    pass

class DriverResponse(DriverBase):
    id: UUID4

    class Config:
        from_attributes = True

class DriverUpdate(DriverBase):
    pass

@router.post("/", response_model=DriverResponse)
async def create_driver(driver_in: DriverCreate, db: AsyncSession = Depends(deps.get_db)):
    db_driver = Driver(
        name=driver_in.name,
        nickname=driver_in.nickname,
        mobile=driver_in.mobile,
        is_active=driver_in.is_active
    )
    db.add(db_driver)
    await db.commit()
    await db.refresh(db_driver)
    return db_driver

@router.get("/", response_model=List[DriverResponse])
async def get_drivers(db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Driver).order_by(Driver.name))
    return result.scalars().all()

@router.put("/{driver_id}", response_model=DriverResponse)
async def update_driver(driver_id: UUID4, driver_in: DriverUpdate, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    db_driver = result.scalar_one_or_none()
    if not db_driver:
        raise HTTPException(status_code=404, detail="Driver not found")
        
    db_driver.name = driver_in.name
    db_driver.nickname = driver_in.nickname
    db_driver.mobile = driver_in.mobile
    db_driver.is_active = driver_in.is_active

    await db.commit()
    await db.refresh(db_driver)
    return db_driver

@router.delete("/{driver_id}", status_code=204)
async def delete_driver(driver_id: UUID4, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    db_driver = result.scalar_one_or_none()
    if not db_driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    await db.delete(db_driver)
    await db.commit()
    return None
