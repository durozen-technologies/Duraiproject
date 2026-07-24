from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.api import deps
from app.models.purchase import Purchase
from app.models.sale import Sale
from app.models.expense import Expense

router = APIRouter()

class DashboardStats(BaseModel):
    total_sales: float
    total_purchases: float
    total_expenses: float
    net_profit: float
    birds_sold: int
    birds_purchased: int
    avg_weight_sold: float

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: AsyncSession = Depends(deps.get_db)):
    # Calculate Total Sales
    sales_result = await db.execute(select(Sale))
    sales = sales_result.scalars().all()
    
    total_sales = sum(s.total_invoice_amount for s in sales)
    birds_sold = sum(s.boxes * 10 for s in sales)
    total_weight_sold = sum(s.weight for s in sales)
    avg_weight_sold = total_weight_sold / birds_sold if birds_sold > 0 else 0.0

    # Calculate Total Purchases
    purchases_result = await db.execute(select(Purchase))
    purchases = purchases_result.scalars().all()
    
    total_purchases = sum(p.purchase_amount for p in purchases)
    birds_purchased = sum(p.actual_birds for p in purchases)

    # Calculate Total Expenses
    expenses_result = await db.execute(select(Expense))
    expenses = expenses_result.scalars().all()
    
    total_expenses = sum(e.total_amount for e in expenses)

    # Net Profit
    net_profit = total_sales - total_purchases - total_expenses

    return DashboardStats(
        total_sales=total_sales,
        total_purchases=total_purchases,
        total_expenses=total_expenses,
        net_profit=net_profit,
        birds_sold=birds_sold,
        birds_purchased=birds_purchased,
        avg_weight_sold=avg_weight_sold
    )
