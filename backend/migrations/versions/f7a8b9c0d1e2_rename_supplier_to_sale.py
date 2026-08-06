"""rename partytype SUPPLIER to SALE

Revision ID: f7a8b9c0d1e2
Revises: e1a2b3c4d5f6
Create Date: 2026-08-06 20:25:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "e1a2b3c4d5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL enum rename (requires autocommit outside a transaction block on some versions)
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE partytype RENAME VALUE 'SUPPLIER' TO 'SALE'")


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE partytype RENAME VALUE 'SALE' TO 'SUPPLIER'")
