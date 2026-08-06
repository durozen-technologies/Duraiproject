"""make purchase and sale bill_number non-unique

Revision ID: d9f1c4a7b2e3
Revises: b2c4e6f8a1d3
Create Date: 2026-08-06 15:15:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "d9f1c4a7b2e3"
down_revision: Union[str, Sequence[str], None] = "b2c4e6f8a1d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("ix_purchases_bill_number", table_name="purchases")
    op.drop_index("ix_sales_bill_number", table_name="sales")
    op.create_index("ix_purchases_bill_number", "purchases", ["bill_number"], unique=False)
    op.create_index("ix_sales_bill_number", "sales", ["bill_number"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_purchases_bill_number", table_name="purchases")
    op.drop_index("ix_sales_bill_number", table_name="sales")
    op.create_index("ix_purchases_bill_number", "purchases", ["bill_number"], unique=True)
    op.create_index("ix_sales_bill_number", "sales", ["bill_number"], unique=True)
