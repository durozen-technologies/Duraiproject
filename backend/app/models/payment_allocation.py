from uuid import UUID
from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base
from .base import BaseModelMixin, uuid7

class PaymentAllocation(Base, BaseModelMixin):
    __tablename__ = "payment_allocations"

    id: Mapped[UUID] = mapped_column(primary_key=True, index=True, default=uuid7)
    transaction_id: Mapped[UUID] = mapped_column(ForeignKey("payment_transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Nullable FKs to support both purchases and sales
    purchase_id: Mapped[UUID | None] = mapped_column(ForeignKey("purchases.id", ondelete="SET NULL"), nullable=True, index=True)
    sale_id: Mapped[UUID | None] = mapped_column(ForeignKey("sales.id", ondelete="SET NULL"), nullable=True, index=True)
    
    allocated_cash: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    allocated_upi: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
