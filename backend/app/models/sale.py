from datetime import date
from uuid import UUID

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base
from .base import BaseModelMixin, uuid7


class Sale(Base, BaseModelMixin):
    __tablename__ = "sales"

    id: Mapped[UUID] = mapped_column(primary_key=True, index=True, default=uuid7)
    party_id: Mapped[UUID] = mapped_column(ForeignKey("parties.id"), nullable=False, index=True)
    
    date: Mapped[date] = mapped_column(Date, nullable=False)
    bill_number: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)
    vehicle_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    driver_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    weight: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    weight_rate: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    weight_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    
    boxes: Mapped[int] = mapped_column(Integer, default=0)
    birds_per_box: Mapped[int] = mapped_column(Integer, default=0)
    actual_birds: Mapped[int] = mapped_column(Integer, default=0)
    box_rate: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    box_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    
    total_invoice_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    
    cash_payment: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    upi_payment: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    balance_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)

    party = relationship("Party", back_populates="sales")
