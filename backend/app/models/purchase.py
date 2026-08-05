from datetime import date
from uuid import UUID

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base
from .base import BaseModelMixin, uuid7


class Purchase(Base, BaseModelMixin):
    __tablename__ = "purchases"

    id: Mapped[UUID] = mapped_column(primary_key=True, index=True, default=uuid7)
    party_id: Mapped[UUID] = mapped_column(ForeignKey("parties.id"), nullable=False, index=True)
    driver_id: Mapped[UUID | None] = mapped_column(ForeignKey("drivers.id"), nullable=True, index=True)
    item_id: Mapped[UUID | None] = mapped_column(ForeignKey("items.id"), nullable=True, index=True)
    
    date: Mapped[date] = mapped_column(Date, nullable=False)
    bill_number: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)
    vehicle_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    driver_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    total_boxes: Mapped[int] = mapped_column(Integer, default=0)
    birds_per_box: Mapped[int] = mapped_column(Integer, default=0)
    actual_birds: Mapped[int] = mapped_column(Integer, default=0)
    
    weighbridge_weight: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    net_weight: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    average_weight: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    
    purchase_rate: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    purchase_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    
    cash_payment: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    upi_payment: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    bank_payment: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    balance_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    day_bill_id: Mapped[UUID | None] = mapped_column(ForeignKey("day_bills.id"), nullable=True, index=True)

    party = relationship("Party", back_populates="purchases")
    driver = relationship("Driver", back_populates="purchases")
    item = relationship("Item", back_populates="purchases")
    day_bill = relationship("DayBill", back_populates="purchases")
