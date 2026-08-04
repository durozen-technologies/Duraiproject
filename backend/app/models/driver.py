from uuid import UUID
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base
from .base import BaseModelMixin, uuid7


class Driver(Base, BaseModelMixin):
    __tablename__ = "drivers"

    id: Mapped[UUID] = mapped_column(primary_key=True, index=True, default=uuid7)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    nickname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mobile: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    
    # Relationships
    purchases = relationship("Purchase", back_populates="driver")
    sales = relationship("Sale", back_populates="driver")
