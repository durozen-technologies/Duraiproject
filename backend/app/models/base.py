from datetime import datetime
import uuid
from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

def uuid7() -> uuid.UUID:
    # A simple fallback for UUID generation.
    # In production, use a true uuid7 library if needed.
    return uuid.uuid4()

class BaseModelMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
