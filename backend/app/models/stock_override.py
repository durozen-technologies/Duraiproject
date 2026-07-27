import uuid
from sqlalchemy import Column, Integer, Float, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

from app.db.database import Base
from app.models.base import BaseModelMixin, uuid7

class StockOverride(Base, BaseModelMixin):
    __tablename__ = "stock_overrides"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, index=True, default=uuid7)
    date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    new_total_birds: Mapped[int] = mapped_column(Integer, nullable=False)
    new_total_weight: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
