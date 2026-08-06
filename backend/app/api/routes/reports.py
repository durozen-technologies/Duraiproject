import io
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ...db.database import get_db
from ...models.purchase import Purchase
from ...models.sale import Sale
from ...models.party import Party

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

router = APIRouter(prefix="/reports", tags=["reports"])


def _fmt_inr(amount: float) -> str:
    """Indian grouping with 2 decimals, e.g. 1,02,000.00"""
    n = float(amount or 0)
    sign = "-" if n < 0 else ""
    n = abs(n)
    whole, frac = f"{n:.2f}".split(".")
    if len(whole) <= 3:
        grouped = whole
    else:
        last3 = whole[-3:]
        rest = whole[:-3]
        parts = []
        while rest:
            parts.append(rest[-2:])
            rest = rest[:-2]
        grouped = ",".join(reversed(parts)) + "," + last3
    return f"{sign}{grouped}.{frac}"


def _fmt_weight(value: float) -> str:
    return f"{float(value or 0):.2f}"


def _fmt_rate(value: float) -> str:
    return f"Rs.{_fmt_inr(value)}"

@router.get("/purchases")
async def generate_purchase_report(
    from_date: date,
    to_date: date,
    party_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Purchase).options(selectinload(Purchase.party)).where(
        and_(Purchase.date >= from_date, Purchase.date <= to_date)
    ).order_by(Purchase.date)
    
    if party_id:
        query = query.where(Purchase.party_id == party_id)
        
    result = await db.execute(query)
    purchases = result.scalars().all()
    
    # Generate PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=15,
        leftMargin=15,
        topMargin=20,
        bottomMargin=20
    )
    
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    title_style.alignment = 1 # Center
    
    elements.append(Paragraph(f"Purchase Register ({from_date.strftime('%d-%m-%Y')} to {to_date.strftime('%d-%m-%Y')})", title_style))
    elements.append(Spacer(1, 10))
    
    # Table Header based on Purchase.html
    data = [
        [
            "Date", "Purchaser\nName", "Vehicle\nNo", "Bill\nNo", "Driver\nName",
            "Total\nBox", "Total\nBirds", "Weighbridge\nWeight(Kg)", "Net\nWeight",
            "Avg\nWt", "Rate\n(Rs.)", "Amount\n(Rs.)", "Paid Cash\n(Rs.)", "Paid UPI\n(Rs.)", "Total Paid\nAmount (Rs.)", "Balance\n(Rs.)"
        ]
    ]
    
    for p in purchases:
        # Convert rate and amounts to float, then format
        amount = f"{p.purchase_amount:,.2f}" if p.purchase_amount else "0.00"
        cash = f"{p.cash_payment:,.2f}" if p.cash_payment else "0.00"
        upi = f"{p.upi_payment:,.2f}" if p.upi_payment else "0.00"
        balance = f"{p.balance_amount:,.2f}" if p.balance_amount else "0.00"
        rate = f"{p.purchase_rate:,.2f}" if p.purchase_rate else "0.00"
        
        # Calculate Average Weight dynamically for the report
        net_wt = p.net_weight or 0
        birds = p.actual_birds or 0
        calc_avg_wt = (net_wt / birds) if birds > 0 else 0.0
        
        # Calculate Total Paid dynamically
        total_paid_val = (p.cash_payment or 0) + (p.upi_payment or 0)
        total_paid = f"{total_paid_val:,.2f}"
        
        row = [
            p.date.strftime('%d-%m-%Y') if p.date else "-",
            p.party.name if p.party else "Unknown",
            p.vehicle_number or "-",
            p.bill_number or "-",
            p.driver_name or "-",
            str(p.total_boxes) if p.total_boxes else "0",
            str(p.actual_birds) if p.actual_birds else "0",
            f"{p.weighbridge_weight:.2f}" if p.weighbridge_weight else "0.00",
            f"{p.net_weight:.2f}" if p.net_weight else "0.00",
            f"{calc_avg_wt:.2f}",
            rate,
            amount,
            cash,
            upi,
            total_paid,
            balance
        ]
        data.append(row)
        
    # Table Style
    t = Table(data, repeatRows=1)
    
    # Column widths based on A4 Landscape (842pts) minus 30pts margins = 812pts usable
    usable_width = 812
    t._argW = [
        usable_width * 0.07, # Date
        usable_width * 0.08, # Purchaser Name
        usable_width * 0.08, # Vehicle No
        usable_width * 0.08, # Bill No
        usable_width * 0.07, # Driver Name
        usable_width * 0.04, # Total Box
        usable_width * 0.05, # Total Birds
        usable_width * 0.07, # Weighbridge Weight
        usable_width * 0.05, # Net Weight
        usable_width * 0.04, # Avg Wt
        usable_width * 0.06, # Rate
        usable_width * 0.06, # Amount
        usable_width * 0.05, # Paid Cash
        usable_width * 0.05, # Paid UPI
        usable_width * 0.07, # Total Paid Amount
        usable_width * 0.08  # Balance
    ]
    
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d9d9d9')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cfcfcf')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cfcfcf')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'), # Date
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),   # Party Name
        ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'), # Party Name Bold
        ('ALIGN', (2, 1), (3, -1), 'CENTER'), # Vehicle, Bill
        ('ALIGN', (4, 1), (4, -1), 'LEFT'),   # Driver Name
        ('ALIGN', (5, 1), (9, -1), 'CENTER'), # Boxes to Avg Wt
        ('ALIGN', (10, 1), (-1, -1), 'RIGHT'), # Rate to Balance
        ('FONTNAME', (11, 1), (-1, -1), 'Helvetica-Bold'), # Amounts Bold
    ])
    
    t.setStyle(style)
    elements.append(t)
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=purchase_report_{from_date.strftime('%Y%m%d')}_{to_date.strftime('%Y%m%d')}.pdf"}
    )

@router.get("/sales")
async def generate_sale_report(
    from_date: date,
    to_date: date,
    party_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Sale).options(selectinload(Sale.party)).where(
        and_(Sale.date >= from_date, Sale.date <= to_date)
    ).order_by(Sale.date)
    
    if party_id:
        query = query.where(Sale.party_id == party_id)
        
    result = await db.execute(query)
    sales = result.scalars().all()
    
    # Generate PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=15,
        leftMargin=15,
        topMargin=20,
        bottomMargin=20
    )
    
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    title_style.alignment = 1 # Center
    
    elements.append(Paragraph(f"Sales Register ({from_date.strftime('%d-%m-%Y')} to {to_date.strftime('%d-%m-%Y')})", title_style))
    elements.append(Spacer(1, 10))
    
    # Table Header based on sale.html
    data = [
        [
            "Date", "Party\nName", "Vehicle\nNo", "Bill\nNo", "Driver\nName",
            "Weight\n(Kg)", "Weight\nRate (Rs.)", "Box", "Box\nRate (Rs.)",
            "Total\nAmount (Rs.)", "Paid Cash\n(Rs.)", "Paid UPI\n(Rs.)", "Total Paid\nAmount (Rs.)", "Balance\n(Rs.)"
        ]
    ]
    
    for s in sales:
        # Format amounts
        amount = f"{s.total_invoice_amount:,.2f}" if s.total_invoice_amount else "0.00"
        cash = f"{s.cash_payment:,.2f}" if s.cash_payment else "0.00"
        upi = f"{s.upi_payment:,.2f}" if s.upi_payment else "0.00"
        balance = f"{s.balance_amount:,.2f}" if s.balance_amount else "0.00"
        wt_rate = f"{s.weight_rate:,.2f}" if s.weight_rate else "0.00"
        box_rate = f"{s.box_rate:,.2f}" if s.box_rate else "0.00"
        
        # Calculate Total Paid dynamically
        total_paid_val = (s.cash_payment or 0) + (s.upi_payment or 0)
        total_paid = f"{total_paid_val:,.2f}"
        
        row = [
            s.date.strftime('%d-%m-%Y') if s.date else "-",
            s.party.name if s.party else "Unknown",
            s.vehicle_number or "-",
            s.bill_number or "-",
            s.driver_name or "-",
            f"{s.weight:.2f}" if s.weight else "0.00",
            wt_rate,
            str(s.boxes) if s.boxes else "0",
            box_rate,
            amount,
            cash,
            upi,
            total_paid,
            balance
        ]
        data.append(row)
        
    # Table Style
    t = Table(data, repeatRows=1)
    
    # Column widths based on A4 Landscape (842pts) minus 30pts margins = 812pts usable
    # We have 14 columns total
    usable_width = 812
    t._argW = [
        usable_width * 0.07, # Date
        usable_width * 0.10, # Party Name
        usable_width * 0.08, # Vehicle No
        usable_width * 0.08, # Bill No
        usable_width * 0.08, # Driver Name
        usable_width * 0.07, # Weight
        usable_width * 0.07, # Wt Rate
        usable_width * 0.04, # Box
        usable_width * 0.07, # Box Rate
        usable_width * 0.08, # Total Amt
        usable_width * 0.06, # Paid Cash
        usable_width * 0.05, # Paid UPI
        usable_width * 0.07, # Total Paid Amount
        usable_width * 0.08  # Balance
    ]
    
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d9d9d9')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cfcfcf')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cfcfcf')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'), # Date
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),   # Party Name
        ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'), # Party Name Bold
        ('ALIGN', (2, 1), (3, -1), 'CENTER'), # Vehicle, Bill
        ('ALIGN', (4, 1), (4, -1), 'LEFT'),   # Driver Name
        ('ALIGN', (5, 1), (8, -1), 'CENTER'), # Wt to Box Rate
        ('ALIGN', (9, 1), (-1, -1), 'RIGHT'), # Amt to Balance
    ])
    
    t.setStyle(style)
    elements.append(t)
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=sale_report_{from_date.strftime('%Y%m%d')}_{to_date.strftime('%Y%m%d')}.pdf"}
    )


@router.get("/party-ledger")
async def generate_party_ledger_report(
    party_id: UUID,
    from_date: date,
    to_date: date,
    db: AsyncSession = Depends(get_db),
):
    """Party Ledger PDF matching Partystatement.html layout."""
    party_result = await db.execute(select(Party).where(Party.id == party_id))
    party = party_result.scalar_one_or_none()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    purchases_result = await db.execute(
        select(Purchase)
        .where(
            and_(
                Purchase.party_id == party_id,
                Purchase.date >= from_date,
                Purchase.date <= to_date,
            )
        )
        .order_by(Purchase.date.asc(), Purchase.created_at.asc())
    )
    purchases = purchases_result.scalars().all()

    sales_result = await db.execute(
        select(Sale)
        .where(
            and_(
                Sale.party_id == party_id,
                Sale.date >= from_date,
                Sale.date <= to_date,
            )
        )
        .order_by(Sale.date.asc(), Sale.created_at.asc())
    )
    sales = sales_result.scalars().all()

    rows: list[dict] = []
    for p in purchases:
        rows.append(
            {
                "date": p.date,
                "kind": "Purchase",
                "net_weight": float(p.net_weight or 0),
                "rate": float(p.purchase_rate or 0),
                "credit": float(p.purchase_amount or 0),
                "debit": 0.0,
                "sort_key": (p.date, 0, str(p.id)),
            }
        )
    for s in sales:
        rows.append(
            {
                "date": s.date,
                "kind": "Sale",
                "net_weight": float(s.weight or 0),
                "rate": float(s.weight_rate or 0),
                "credit": 0.0,
                "debit": float(s.total_invoice_amount or 0),
                "sort_key": (s.date, 1, str(s.id)),
            }
        )
    rows.sort(key=lambda r: r["sort_key"])

    total_credit = sum(r["credit"] for r in rows)
    total_debit = sum(r["debit"] for r in rows)
    difference = total_credit - total_debit
    closing_suffix = "Cr" if difference >= 0 else "Dr"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "PartyLedgerTitle",
        parent=styles["Heading1"],
        alignment=1,
        fontSize=22,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "PartyLedgerSubtitle",
        parent=styles["Normal"],
        alignment=1,
        fontSize=12,
        textColor=colors.HexColor("#666666"),
        spaceAfter=4,
    )
    range_style = ParagraphStyle(
        "PartyLedgerRange",
        parent=styles["Normal"],
        alignment=1,
        fontSize=11,
        textColor=colors.HexColor("#444444"),
        spaceAfter=16,
    )

    elements = []
    elements.append(Paragraph(party.name.upper(), title_style))
    elements.append(Paragraph("Party Ledger Statement", subtitle_style))
    elements.append(
        Paragraph(
            f"{from_date.strftime('%d-%m-%Y')} to {to_date.strftime('%d-%m-%Y')}",
            range_style,
        )
    )

    table_data = [
        ["Date", "Type", "Net Weight (Kg)", "Rate", "Credit (Rs.)", "Debit (Rs.)"]
    ]

    green = colors.HexColor("#0b8b32")
    red = colors.HexColor("#d10000")

    for r in rows:
        is_purchase = r["kind"] == "Purchase"
        credit_cell = f"Rs.{_fmt_inr(r['credit'])}" if is_purchase else "-"
        debit_cell = f"Rs.{_fmt_inr(r['debit'])}" if not is_purchase else "-"
        table_data.append(
            [
                r["date"].strftime("%d-%m-%Y") if r["date"] else "-",
                r["kind"],
                _fmt_weight(r["net_weight"]),
                _fmt_rate(r["rate"]),
                credit_cell,
                debit_cell,
            ]
        )

    usable_width = A4[0] - 72
    col_widths = [
        usable_width * 0.15,
        usable_width * 0.15,
        usable_width * 0.18,
        usable_width * 0.12,
        usable_width * 0.20,
        usable_width * 0.20,
    ]

    ledger_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ececec")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cfcfcf")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cfcfcf")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
    ]
    for i, r in enumerate(rows, start=1):
        if r["kind"] == "Purchase":
            style_cmds.append(("TEXTCOLOR", (1, i), (1, i), green))
            style_cmds.append(("FONTNAME", (1, i), (1, i), "Helvetica-Bold"))
            style_cmds.append(("TEXTCOLOR", (4, i), (4, i), green))
            style_cmds.append(("FONTNAME", (4, i), (4, i), "Helvetica-Bold"))
        else:
            style_cmds.append(("TEXTCOLOR", (1, i), (1, i), red))
            style_cmds.append(("FONTNAME", (1, i), (1, i), "Helvetica-Bold"))
            style_cmds.append(("TEXTCOLOR", (5, i), (5, i), red))
            style_cmds.append(("FONTNAME", (5, i), (5, i), "Helvetica-Bold"))

    ledger_table.setStyle(TableStyle(style_cmds))
    elements.append(ledger_table)
    elements.append(Spacer(1, 20))

    summary_data = [
        ["Total Credit", f"Rs.{_fmt_inr(total_credit)}"],
        ["Total Debit", f"Rs.{_fmt_inr(total_debit)}"],
        ["Difference (Credit - Debit)", f"Rs.{_fmt_inr(difference)}"],
        ["Closing Balance", f"Rs.{_fmt_inr(abs(difference))} {closing_suffix}"],
    ]
    summary_table = Table(summary_data, colWidths=[usable_width * 0.35, usable_width * 0.25])
    summary_table.hAlign = "RIGHT"
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 2), colors.HexColor("#efefef")),
                ("BACKGROUND", (0, 3), (-1, 3), colors.HexColor("#d9edf7")),
                ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#f8f8f8")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 2), 10),
                ("FONTSIZE", (0, 3), (-1, 3), 12),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cfcfcf")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cfcfcf")),
            ]
        )
    )
    elements.append(summary_table)

    doc.build(elements)
    buffer.seek(0)

    safe_name = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in party.name)[:40]
    filename = f"party_ledger_{safe_name}_{from_date.strftime('%Y%m%d')}_{to_date.strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/parties-balance-sheet")
async def generate_parties_balance_sheet(
    db: AsyncSession = Depends(get_db),
):
    """All-parties Balance Sheet PDF: Party Name | Credit (To Pay) | Debit (To Receive)."""
    from datetime import datetime as dt

    result = await db.execute(
        select(Party).where(Party.is_active == True).order_by(Party.name.asc())  # noqa: E712
    )
    parties = result.scalars().all()

    generated_on = dt.now().strftime("%d-%m-%Y")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "BalanceSheetTitle",
        parent=styles["Heading1"],
        alignment=1,
        fontSize=22,
        spaceAfter=6,
    )
    date_style = ParagraphStyle(
        "BalanceSheetDate",
        parent=styles["Normal"],
        alignment=1,
        fontSize=11,
        textColor=colors.HexColor("#555555"),
        spaceAfter=18,
    )

    elements = []
    elements.append(Paragraph("Balance Sheet", title_style))
    elements.append(Paragraph(f"Generate Date: {generated_on}", date_style))

    table_data = [["Party Name", "Credit (To Pay)", "Debit (To Receive)"]]
    total_credit = 0.0
    total_debit = 0.0

    for party in parties:
        bal = float(party.current_balance or 0)
        if bal > 0:
            credit = bal
            debit = 0.0
            credit_cell = f"Rs.{_fmt_inr(credit)}"
            debit_cell = "-"
        elif bal < 0:
            credit = 0.0
            debit = abs(bal)
            credit_cell = "-"
            debit_cell = f"Rs.{_fmt_inr(debit)}"
        else:
            credit = 0.0
            debit = 0.0
            credit_cell = "-"
            debit_cell = "-"

        total_credit += credit
        total_debit += debit
        table_data.append([party.name, credit_cell, debit_cell])

    table_data.append(
        [
            "Total",
            f"Rs.{_fmt_inr(total_credit)}",
            f"Rs.{_fmt_inr(total_debit)}",
        ]
    )

    usable_width = A4[0] - 72
    col_widths = [usable_width * 0.46, usable_width * 0.27, usable_width * 0.27]
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    last_row = len(table_data) - 1
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ececec")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 11),
                ("FONTNAME", (0, 1), (-1, last_row - 1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 10),
                ("FONTNAME", (0, last_row), (-1, last_row), "Helvetica-Bold"),
                ("BACKGROUND", (0, last_row), (-1, last_row), colors.HexColor("#f0f4f2")),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cfcfcf")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cfcfcf")),
                ("ROWBACKGROUNDS", (0, 1), (-1, last_row - 1), [colors.white, colors.HexColor("#fafafa")]),
            ]
        )
    )
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)

    filename = f"parties_balance_sheet_{dt.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
