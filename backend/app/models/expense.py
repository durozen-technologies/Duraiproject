from datetime import datetime, date, UTC
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Integer, Boolean, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base
from .base import BaseModelMixin, uuid7


class ExpenseCategory(Base, BaseModelMixin):
    __tablename__ = "expense_categories"

    id: Mapped[UUID] = mapped_column(primary_key=True, index=True, default=uuid7)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"), nullable=False)
    
    expenses = relationship("Expense", back_populates="category")


class Expense(Base, BaseModelMixin):
    __tablename__ = "expenses"

    id: Mapped[UUID] = mapped_column(primary_key=True, index=True, default=uuid7)
    category_id: Mapped[UUID] = mapped_column(ForeignKey("expense_categories.id"), nullable=False, index=True)
    
    spent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    expense_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    cash_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0.0)
    upi_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0.0)
    total_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0.0)
    
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    day_bill_id: Mapped[UUID | None] = mapped_column(ForeignKey("day_bills.id"), nullable=True, index=True)

    category = relationship("ExpenseCategory", back_populates="expenses")
    day_bill = relationship("DayBill", back_populates="expenses")
