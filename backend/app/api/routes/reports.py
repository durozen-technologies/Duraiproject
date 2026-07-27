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
from ...models.party import Party

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

router = APIRouter(prefix="/reports", tags=["reports"])

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
            "Avg\nWt", "Rate\n(Rs.)", "Amount\n(Rs.)", "Paid Cash\n(Rs.)", "Paid UPI\n(Rs.)", "Balance\n(Rs.)"
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
            balance
        ]
        data.append(row)
        
    # Table Style
    t = Table(data, repeatRows=1)
    
    # Column widths based on A4 Landscape (842pts) minus 30pts margins = 812pts usable
    usable_width = 812
    t._argW = [
        usable_width * 0.07, # Date
        usable_width * 0.10, # Purchaser Name
        usable_width * 0.09, # Vehicle No
        usable_width * 0.10, # Bill No
        usable_width * 0.08, # Driver Name
        usable_width * 0.04, # Total Box
        usable_width * 0.05, # Total Birds
        usable_width * 0.07, # Weighbridge Weight
        usable_width * 0.05, # Net Weight
        usable_width * 0.04, # Avg Wt
        usable_width * 0.06, # Rate
        usable_width * 0.06, # Amount
        usable_width * 0.06, # Paid Cash
        usable_width * 0.05, # Paid UPI
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
