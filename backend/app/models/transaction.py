from datetime import date
from uuid import UUID

from sqlalchemy import Date, Enum, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base
from .base import BaseModelMixin, uuid7
from .enums import TransactionType


class PaymentTransaction(Base, BaseModelMixin):
    __tablename__ = "payment_transactions"

    id: Mapped[UUID] = mapped_column(primary_key=True, index=True, default=uuid7)
    party_id: Mapped[UUID] = mapped_column(ForeignKey("parties.id"), nullable=False, index=True)
    
    date: Mapped[date] = mapped_column(Date, nullable=False)
    
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType), nullable=False)
    
    cash_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    upi_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    bank_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)

    party = relationship("Party", back_populates="transactions")
