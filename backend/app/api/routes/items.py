from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel, UUID4

from app.api import deps
from app.models.item import Item

router = APIRouter()

class ItemBase(BaseModel):
    name: str
    is_active: bool = True

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class ItemResponse(ItemBase):
    id: UUID4

    class Config:
        from_attributes = True

@router.get("/", response_model=List[ItemResponse])
async def read_items(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
):
    query = select(Item).order_by(Item.name).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=ItemResponse)
async def create_item(
    item: ItemCreate,
    db: AsyncSession = Depends(deps.get_db)
):
    # Check if item with name exists
    query = select(Item).filter(Item.name == item.name)
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Item with this name already exists")
    
    db_item = Item(
        name=item.name,
        is_active=item.is_active
    )
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: UUID4,
    item_update: ItemUpdate,
    db: AsyncSession = Depends(deps.get_db)
):
    query = select(Item).filter(Item.id == item_id)
    result = await db.execute(query)
    db_item = result.scalars().first()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    update_data = item_update.model_dump(exclude_unset=True)
    
    if "name" in update_data and update_data["name"] != db_item.name:
        # Check uniqueness
        check_query = select(Item).filter(Item.name == update_data["name"], Item.id != item_id)
        check_result = await db.execute(check_query)
        if check_result.scalars().first():
            raise HTTPException(status_code=400, detail="Item with this name already exists")
            
    for key, value in update_data.items():
        setattr(db_item, key, value)
        
    await db.commit()
    await db.refresh(db_item)
    return db_item
