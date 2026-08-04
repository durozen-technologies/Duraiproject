"""Add BOTH to PartyType

Revision ID: a5fd83877857
Revises: c52cf3256c3a
Create Date: 2026-08-03 09:52:34.123594

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a5fd83877857'
down_revision: Union[str, Sequence[str], None] = 'c52cf3256c3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE partytype ADD VALUE IF NOT EXISTS 'BOTH'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
