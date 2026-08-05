from fastapi import APIRouter
from app.api.routes import parties, purchases, sales, dashboard, expenses, payments, reports, settings, auth, drivers, items, day_bills

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(parties.router, prefix="/parties", tags=["parties"])
api_router.include_router(purchases.router, prefix="/purchases", tags=["purchases"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(day_bills.router, prefix="/day-bills", tags=["day-bills"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(reports.router)
api_router.include_router(drivers.router, prefix="/drivers", tags=["drivers"])
api_router.include_router(items.router, prefix="/items", tags=["items"])
