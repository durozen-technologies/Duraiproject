from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from pydantic import BaseModel, UUID4, Field
from datetime import datetime

from app.api import deps
from app.models.expense import ExpenseCategory, Expense

router = APIRouter()

# --- Schemas ---

class ExpenseCategoryBase(BaseModel):
    name: str
    sort_order: int = 0
    is_active: bool = True

class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategoryUpdate(ExpenseCategoryBase):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: UUID4

    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    category_id: UUID4
    expense_name: str
    cash_amount: float = 0.0
    upi_amount: float = 0.0
    note: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: UUID4
    spent_at: datetime
    total_amount: float

    class Config:
        from_attributes = True

# --- Routes for Categories ---

@router.get("/categories", response_model=List[ExpenseCategoryResponse])
async def get_expense_categories(active_only: bool = True, db: AsyncSession = Depends(deps.get_db)):
    query = select(ExpenseCategory)
    if active_only:
        query = query.where(ExpenseCategory.is_active == True)
    query = query.order_by(ExpenseCategory.sort_order.asc(), ExpenseCategory.name.asc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/categories", response_model=ExpenseCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_expense_category(category: ExpenseCategoryCreate, db: AsyncSession = Depends(deps.get_db)):
    db_category = ExpenseCategory(
        name=category.name,
        sort_order=category.sort_order,
        is_active=category.is_active
    )
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)
    return db_category

@router.put("/categories/{category_id}", response_model=ExpenseCategoryResponse)
async def update_expense_category(category_id: UUID4, category_update: ExpenseCategoryUpdate, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(ExpenseCategory).where(ExpenseCategory.id == category_id))
    db_category = result.scalar_one_or_none()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = category_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_category, key, value)
        
    await db.commit()
    await db.refresh(db_category)
    return db_category

# --- Routes for Expenses ---

@router.get("/", response_model=List[ExpenseResponse])
async def get_expenses(limit: int = 50, db: AsyncSession = Depends(deps.get_db)):
    query = select(Expense).order_by(desc(Expense.spent_at)).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(expense: ExpenseCreate, db: AsyncSession = Depends(deps.get_db)):
    # Verify category exists
    result = await db.execute(select(ExpenseCategory).where(ExpenseCategory.id == expense.category_id))
    db_category = result.scalar_one_or_none()
    if not db_category:
        raise HTTPException(status_code=400, detail="Invalid category_id")
        
    total = expense.cash_amount + expense.upi_amount
    if total <= 0:
        raise HTTPException(status_code=400, detail="Total amount must be greater than zero")

    db_expense = Expense(
        category_id=expense.category_id,
        expense_name=expense.expense_name,
        cash_amount=expense.cash_amount,
        upi_amount=expense.upi_amount,
        total_amount=total,
        note=expense.note
    )
    db.add(db_expense)
    await db.commit()
    await db.refresh(db_expense)
    return db_expense

@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(expense_id: UUID4, expense_update: ExpenseUpdate, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    db_expense = result.scalar_one_or_none()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    result = await db.execute(select(ExpenseCategory).where(ExpenseCategory.id == expense_update.category_id))
    db_category = result.scalar_one_or_none()
    if not db_category:
        raise HTTPException(status_code=400, detail="Invalid category_id")

    total = expense_update.cash_amount + expense_update.upi_amount
    if total <= 0:
        raise HTTPException(status_code=400, detail="Total amount must be greater than zero")

    db_expense.category_id = expense_update.category_id
    db_expense.expense_name = expense_update.expense_name
    db_expense.cash_amount = expense_update.cash_amount
    db_expense.upi_amount = expense_update.upi_amount
    db_expense.total_amount = total
    db_expense.note = expense_update.note

    await db.commit()
    await db.refresh(db_expense)
    return db_expense

@router.delete("/{expense_id}", status_code=204)
async def delete_expense(expense_id: UUID4, db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    db_expense = result.scalar_one_or_none()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    await db.delete(db_expense)
    await db.commit()
    return None
