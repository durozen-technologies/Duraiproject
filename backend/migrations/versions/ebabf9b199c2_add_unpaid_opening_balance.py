"""add unpaid_opening_balance

Revision ID: ebabf9b199c2
Revises: 3f360fbe558c
Create Date: 2026-07-25 11:32:57.621136

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ebabf9b199c2'
down_revision: Union[str, Sequence[str], None] = '3f360fbe558c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('parties', sa.Column('unpaid_opening_balance', sa.Numeric(precision=12, scale=2), server_default='0.0', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('parties', 'unpaid_opening_balance')
