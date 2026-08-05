"""add_day_bill_model

Revision ID: d4e8b1a92c01
Revises: 1bf32afc0d72
Create Date: 2026-08-04 20:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e8b1a92c01"
down_revision: Union[str, Sequence[str], None] = "1bf32afc0d72"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "day_bills",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("bill_number", sa.String(length=50), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("empty_bird_weight_g", sa.Numeric(precision=10, scale=2), nullable=False, server_default="40"),
        sa.Column("purchase_net_kg", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("purchase_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("purchase_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("purchase_to_pay", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("sale_net_kg", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("sale_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sale_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("sale_pending", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("expense_total", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_day_bills_id"), "day_bills", ["id"], unique=False)
    op.create_index(op.f("ix_day_bills_bill_number"), "day_bills", ["bill_number"], unique=True)
    op.create_index(op.f("ix_day_bills_date"), "day_bills", ["date"], unique=False)

    op.add_column("purchases", sa.Column("day_bill_id", sa.Uuid(), nullable=True))
    op.create_index(op.f("ix_purchases_day_bill_id"), "purchases", ["day_bill_id"], unique=False)
    op.create_foreign_key("fk_purchases_day_bill_id", "purchases", "day_bills", ["day_bill_id"], ["id"])

    op.add_column("sales", sa.Column("day_bill_id", sa.Uuid(), nullable=True))
    op.create_index(op.f("ix_sales_day_bill_id"), "sales", ["day_bill_id"], unique=False)
    op.create_foreign_key("fk_sales_day_bill_id", "sales", "day_bills", ["day_bill_id"], ["id"])

    op.add_column("expenses", sa.Column("day_bill_id", sa.Uuid(), nullable=True))
    op.create_index(op.f("ix_expenses_day_bill_id"), "expenses", ["day_bill_id"], unique=False)
    op.create_foreign_key("fk_expenses_day_bill_id", "expenses", "day_bills", ["day_bill_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_expenses_day_bill_id", "expenses", type_="foreignkey")
    op.drop_index(op.f("ix_expenses_day_bill_id"), table_name="expenses")
    op.drop_column("expenses", "day_bill_id")

    op.drop_constraint("fk_sales_day_bill_id", "sales", type_="foreignkey")
    op.drop_index(op.f("ix_sales_day_bill_id"), table_name="sales")
    op.drop_column("sales", "day_bill_id")

    op.drop_constraint("fk_purchases_day_bill_id", "purchases", type_="foreignkey")
    op.drop_index(op.f("ix_purchases_day_bill_id"), table_name="purchases")
    op.drop_column("purchases", "day_bill_id")

    op.drop_index(op.f("ix_day_bills_date"), table_name="day_bills")
    op.drop_index(op.f("ix_day_bills_bill_number"), table_name="day_bills")
    op.drop_index(op.f("ix_day_bills_id"), table_name="day_bills")
    op.drop_table("day_bills")
