from uuid import UUID
from sqlalchemy import Enum, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base
from .base import BaseModelMixin, uuid7
from .enums import PartyType


class Party(Base, BaseModelMixin):
    __tablename__ = "parties"

    id: Mapped[UUID] = mapped_column(primary_key=True, index=True, default=uuid7)
    type: Mapped[PartyType] = mapped_column(Enum(PartyType), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    mobile: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    
    opening_balance: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    unpaid_opening_balance: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    current_balance: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    
    # Relationships
    purchases = relationship("Purchase", back_populates="party")
    sales = relationship("Sale", back_populates="party")
    transactions = relationship("PaymentTransaction", back_populates="party")
