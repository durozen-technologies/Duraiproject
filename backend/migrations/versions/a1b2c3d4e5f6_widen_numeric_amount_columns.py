"""widen numeric amount columns to prevent overflow

Revision ID: a1b2c3d4e5f6
Revises: f7a8b9c0d1e2
Create Date: 2026-08-07 09:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Purchases — amounts & weights
    for col, prec in [
        ("weighbridge_weight", 14),
        ("net_weight", 14),
        ("average_weight", 14),
        ("purchase_rate", 14),
        ("purchase_amount", 18),
        ("cash_payment", 18),
        ("upi_payment", 18),
        ("bank_payment", 18),
        ("balance_amount", 18),
    ]:
        op.alter_column(
            "purchases",
            col,
            existing_type=sa.Numeric(),
            type_=sa.Numeric(prec, 2),
            postgresql_using=f"{col}::numeric({prec},2)",
        )

    # Sales — amounts & weights
    for col, prec in [
        ("weighbridge_weight", 14),
        ("weight", 14),
        ("weight_rate", 14),
        ("weight_amount", 18),
        ("box_rate", 14),
        ("box_amount", 18),
        ("total_invoice_amount", 18),
        ("cash_payment", 18),
        ("upi_payment", 18),
        ("bank_payment", 18),
        ("balance_amount", 18),
    ]:
        op.alter_column(
            "sales",
            col,
            existing_type=sa.Numeric(),
            type_=sa.Numeric(prec, 2),
            postgresql_using=f"{col}::numeric({prec},2)",
        )

    # Parties — balances updated from bill amounts
    for col in ("opening_balance", "unpaid_opening_balance", "current_balance"):
        op.alter_column(
            "parties",
            col,
            existing_type=sa.Numeric(),
            type_=sa.Numeric(18, 2),
            postgresql_using=f"{col}::numeric(18,2)",
        )

    # Payment transactions created alongside day bills
    for col in ("cash_amount", "upi_amount", "bank_amount", "total_amount", "opening_applied"):
        op.alter_column(
            "payment_transactions",
            col,
            existing_type=sa.Numeric(),
            type_=sa.Numeric(18, 2),
            postgresql_using=f"{col}::numeric(18,2)",
        )

    # Day bill totals
    for col, prec in [
        ("purchase_net_kg", 14),
        ("sale_net_kg", 14),
        ("purchase_amount", 18),
        ("purchase_to_pay", 18),
        ("sale_amount", 18),
        ("sale_pending", 18),
        ("expense_total", 18),
    ]:
        op.alter_column(
            "day_bills",
            col,
            existing_type=sa.Numeric(),
            type_=sa.Numeric(prec, 2),
            postgresql_using=f"{col}::numeric({prec},2)",
        )

    # Payment allocations & expenses
    for col in ("allocated_cash", "allocated_upi"):
        op.alter_column(
            "payment_allocations",
            col,
            existing_type=sa.Numeric(),
            type_=sa.Numeric(18, 2),
            postgresql_using=f"{col}::numeric(18,2)",
        )

    for col in ("cash_amount", "upi_amount", "total_amount"):
        op.alter_column(
            "expenses",
            col,
            existing_type=sa.Numeric(),
            type_=sa.Numeric(18, 2),
            postgresql_using=f"{col}::numeric(18,2)",
        )


def downgrade() -> None:
    # Narrowing may fail if existing values exceed old limits — intentional.
    for col, prec in [
        ("weighbridge_weight", 10),
        ("net_weight", 10),
        ("average_weight", 10),
        ("purchase_rate", 10),
        ("purchase_amount", 12),
        ("cash_payment", 12),
        ("upi_payment", 12),
        ("bank_payment", 12),
        ("balance_amount", 12),
    ]:
        op.alter_column(
            "purchases",
            col,
            existing_type=sa.Numeric(),
            type_=sa.Numeric(prec, 2),
            postgresql_using=f"{col}::numeric({prec},2)",
        )

    for col, prec in [
        ("weighbridge_weight", 10),
        ("weight", 10),
        ("weight_rate", 10),
        ("weight_amount", 12),
        ("box_rate", 10),
        ("box_amount", 12),
        ("total_invoice_amount", 12),
        ("cash_payment", 12),
        ("upi_payment", 12),
        ("bank_payment", 12),
        ("balance_amount", 12),
    ]:
        op.alter_column(
            "sales",
            col,
            existing_type=sa.Numeric(),
            type_=sa.Numeric(prec, 2),
            postgresql_using=f"{col}::numeric({prec},2)",
        )

    for col in ("opening_balance", "unpaid_opening_balance", "current_balance"):
        op.alter_column(
            "parties",
            col,
            existing_type=sa.Numeric(),
            type_=sa.Numeric(12, 2),
            postgresql_using=f"{col}::numeric(12,2)",
        )

    for col in ("cash_amount", "upi_amount", "bank_amount", "total_amount", "opening_applied"):
        op.alter_column(
            "payment_transactions",
            col,
            existing_type=sa.Numeric(),
            type_=sa.Numeric(12, 2),
            postgresql_using=f"{col}::numeric(12,2)",
        )

    for col, prec in [
        ("purchase_net_kg", 12),
        ("sale_net_kg", 12),
        ("purchase_amount", 14),
        ("purchase_to_pay", 14),
        ("sale_amount", 14),
        ("sale_pending", 14),
        ("expense_total", 14),
    ]:
        op.alter_column(
            "day_bills",
            col,
            existing_type=sa.Numeric(),
            type_=sa.Numeric(prec, 2),
            postgresql_using=f"{col}::numeric({prec},2)",
        )

    for col in ("allocated_cash", "allocated_upi"):
        op.alter_column(
            "payment_allocations",
            col,
            existing_type=sa.Numeric(),
            type_=sa.Numeric(12, 2),
            postgresql_using=f"{col}::numeric(12,2)",
        )

    for col in ("cash_amount", "upi_amount", "total_amount"):
        op.alter_column(
            "expenses",
            col,
            existing_type=sa.Numeric(),
            type_=sa.Numeric(12, 2),
            postgresql_using=f"{col}::numeric(12,2)",
        )
