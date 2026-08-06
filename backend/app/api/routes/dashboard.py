from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel

from app.api import deps
from app.models.purchase import Purchase
from app.models.sale import Sale
from app.models.expense import Expense
from app.models.stock_override import StockOverride
from app.models.party import Party
from datetime import datetime
from typing import List
from pydantic import UUID4

router = APIRouter()

class DashboardStats(BaseModel):
    total_sales: float
    total_purchases: float
    total_expenses: float
    net_profit: float
    birds_sold: int
    birds_purchased: int
    avg_weight_sold: float
    weight_sold: float
    weight_purchased: float
    purchaser_dues: float
    supplier_payables: float

class StockOverrideCreate(BaseModel):
    new_total_birds: int
    new_total_weight: float
    notes: str = None

class StockOverrideResponse(BaseModel):
    id: UUID4
    date: datetime
    new_total_birds: int
    new_total_weight: float
    notes: str = None

    class Config:
        from_attributes = True

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(deps.get_db),
    start_date: str = Query(None),
    end_date: str = Query(None)
):
    # Parse dates if provided
    parsed_start_naive = None
    parsed_end_naive = None
    parsed_start_aware = None
    parsed_end_aware = None
    
    if start_date:
        parsed_start_aware = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        parsed_start_naive = parsed_start_aware.replace(tzinfo=None)
    if end_date:
        parsed_end_aware = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        parsed_end_naive = parsed_end_aware.replace(tzinfo=None)

    # Calculate Total Sales
    sales_query = select(Sale)
    if parsed_start_naive:
        sales_query = sales_query.where(Sale.date >= parsed_start_naive)
    if parsed_end_naive:
        sales_query = sales_query.where(Sale.date <= parsed_end_naive)
        
    sales_result = await db.execute(sales_query)
    sales = sales_result.scalars().all()
    
    total_sales = sum(s.total_invoice_amount for s in sales)
    birds_sold = sum(s.boxes * 10 for s in sales)
    total_weight_sold = sum(s.weight for s in sales)
    avg_weight_sold = total_weight_sold / birds_sold if birds_sold > 0 else 0.0

    # Calculate Total Purchases
    purchases_query = select(Purchase)
    if parsed_start_naive:
        purchases_query = purchases_query.where(Purchase.date >= parsed_start_naive)
    if parsed_end_naive:
        purchases_query = purchases_query.where(Purchase.date <= parsed_end_naive)
        
    purchases_result = await db.execute(purchases_query)
    purchases = purchases_result.scalars().all()
    
    total_purchases = sum(p.purchase_amount for p in purchases)
    birds_purchased = sum(p.actual_birds for p in purchases)
    weight_purchased = sum(p.net_weight for p in purchases)

    # Check for Stock Override
    override_query = select(StockOverride)
    if parsed_end_naive:
        override_query = override_query.where(StockOverride.date <= parsed_end_naive)
        
    override_result = await db.execute(override_query.order_by(StockOverride.date.desc()).limit(1))
    latest_override = override_result.scalar_one_or_none()
    
    if latest_override:
        birds_purchased = latest_override.new_total_birds
        weight_purchased = latest_override.new_total_weight

    # Calculate Total Expenses
    expenses_query = select(Expense)
    if parsed_start_aware:
        expenses_query = expenses_query.where(Expense.spent_at >= parsed_start_aware)
    if parsed_end_aware:
        expenses_query = expenses_query.where(Expense.spent_at <= parsed_end_aware)
        
    expenses_result = await db.execute(expenses_query)
    expenses = expenses_result.scalars().all()
    
    total_expenses = sum(e.total_amount for e in expenses)

    # Net Profit
    net_profit = total_sales - total_purchases - total_expenses

    # Calculate Outstanding Balances
    parties_result = await db.execute(select(Party))
    parties = parties_result.scalars().all()
    
    # Signed ledger: positive = To Pay (CR), negative = To Receive (DR)
    purchaser_dues = sum(abs(float(p.current_balance)) for p in parties if float(p.current_balance) < 0)
    supplier_payables = sum(float(p.current_balance) for p in parties if float(p.current_balance) > 0)

    return DashboardStats(
        total_sales=total_sales,
        total_purchases=total_purchases,
        total_expenses=total_expenses,
        net_profit=net_profit,
        birds_sold=birds_sold,
        birds_purchased=birds_purchased,
        avg_weight_sold=avg_weight_sold,
        weight_sold=total_weight_sold,
        weight_purchased=weight_purchased,
        purchaser_dues=purchaser_dues,
        supplier_payables=supplier_payables
    )

@router.post("/stock/override", response_model=StockOverrideResponse)
async def create_stock_override(override_in: StockOverrideCreate, db: AsyncSession = Depends(deps.get_db)):
    new_override = StockOverride(
        new_total_birds=override_in.new_total_birds,
        new_total_weight=override_in.new_total_weight,
        notes=override_in.notes
    )
    db.add(new_override)
    await db.commit()
    await db.refresh(new_override)
    return new_override

@router.get("/stock/override/history", response_model=List[StockOverrideResponse])
async def get_stock_override_history(db: AsyncSession = Depends(deps.get_db)):
    result = await db.execute(select(StockOverride).order_by(StockOverride.date.desc()))
    return result.scalars().all()
