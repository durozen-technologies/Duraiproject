from datetime import date
from uuid import UUID

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base
from .base import BaseModelMixin, uuid7


class DayBill(Base, BaseModelMixin):
    __tablename__ = "day_bills"

    id: Mapped[UUID] = mapped_column(primary_key=True, index=True, default=uuid7)
    bill_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    empty_bird_weight_g: Mapped[float] = mapped_column(Numeric(10, 2), default=40.0)

    purchase_net_kg: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    purchase_count: Mapped[int] = mapped_column(Integer, default=0)  # total birds
    purchase_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    purchase_to_pay: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)

    sale_net_kg: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    sale_count: Mapped[int] = mapped_column(Integer, default=0)  # total birds
    sale_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    sale_pending: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)

    expense_total: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)

    purchases = relationship("Purchase", back_populates="day_bill")
    sales = relationship("Sale", back_populates="day_bill")
    expenses = relationship("Expense", back_populates="day_bill")
