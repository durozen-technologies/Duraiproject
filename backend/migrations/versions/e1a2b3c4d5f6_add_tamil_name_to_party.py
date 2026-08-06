"""add tamil_name to party

Revision ID: e1a2b3c4d5f6
Revises: d9f1c4a7b2e3
Create Date: 2026-08-06 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1a2b3c4d5f6"
down_revision: Union[str, Sequence[str], None] = "d9f1c4a7b2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("parties", sa.Column("tamil_name", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("parties", "tamil_name")
