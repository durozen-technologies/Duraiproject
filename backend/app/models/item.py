from uuid import UUID
from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base
from .base import BaseModelMixin, uuid7


class Item(Base, BaseModelMixin):
    __tablename__ = "items"

    id: Mapped[UUID] = mapped_column(primary_key=True, index=True, default=uuid7)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    purchases = relationship("Purchase", back_populates="item")
    sales = relationship("Sale", back_populates="item")
