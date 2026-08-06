"""Add opening_applied to PaymentTransaction

Revision ID: b2c4e6f8a1d3
Revises: 18b5316a08e0
Create Date: 2026-08-05 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c4e6f8a1d3'
down_revision: Union[str, Sequence[str], None] = '18b5316a08e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'payment_transactions',
        sa.Column('opening_applied', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False),
    )


def downgrade() -> None:
    op.drop_column('payment_transactions', 'opening_applied')
