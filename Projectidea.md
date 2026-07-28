# Application Design Prompt – LEDGERDESK (Complete Poultry Business Management Platform)

Design and develop a modern, mobile-first poultry business management application named **LEDGERDESK**. The application is intended for poultry wholesalers, farms, and chicken shops to digitally manage their entire business from a single platform. The focus should be on **speed, simplicity, and real-time business tracking**, replacing traditional paper registers.

The application should support both **Android mobile devices** (primary platform) and a **responsive desktop/web interface** for office use. Both platforms must share the same backend and database so that all information remains synchronized in real time.

---

# Technology Stack

## Backend

Develop the backend using **Python 3.11+** and **FastAPI** with asynchronous APIs.

Use:

* FastAPI
* Uvicorn & Gunicorn
* PostgreSQL
* SQLAlchemy (Async ORM)
* Alembic
* Redis
* JWT Authentication
* Argon2 Password Hashing
* AWS S3 (Image/PDF Storage)
* ReportLab / FPDF2 / PyPDF for PDF generation
* Pillow for image processing

The backend should expose REST APIs for all modules and perform all business calculations securely.

---

## Mobile Application

Develop the mobile application using:

* React Native
* Expo
* TypeScript
* NativeWind (Tailwind CSS)

The application should provide a clean, modern UI optimized for one-hand operation, quick data entry, and offline-friendly behavior where possible.

---

## Desktop/Web Interface

Develop the desktop application using:

Electron
React
TypeScript
Tailwind CSS
Vite

---

# Application Modules

## 1. Dashboard

The dashboard should provide a complete overview of the business with a selectable date range.

Display:

* Total Sales Amount
* Total Purchase Amount
* Total Expense Amount
* Total Profit
* Total Customer Outstanding
* Total Supplier Outstanding
* Total Payment Received
* Total Payment Made
* Total Birds Purchased
* Total Birds Sold
* Total Net Purchase Weight
* Total Net Sales Weight

Profit Calculation:

```text
Total Profit =
Total Sales Amount
− Total Purchase Amount
− Total Expense Amount
```

Include graphical analytics:

* Daily Sales
* Daily Purchases
* Profit Trend
* Expense Breakdown
* Outstanding Summary

---

# 2. Party Management

Before recording any purchase or sale, a party must be created.

There are two party types:

* Customer
* Supplier

Store:

* Party Name
* Mobile Number
* Address
* Opening Balance
* Notes

Selecting a party should display:

* Opening Balance
* Current Outstanding
* Total Bills
* Pending Bills
* Payment History
* Ledger

Allow collecting payments directly from the party profile.

Payment entry should support:

* Cash Amount
* UPI Amount

The total paid amount should be calculated automatically.

---

# 3. Purchase Module

Record poultry purchases from suppliers.

Purchase fields:

* Date
* Supplier
* Vehicle Number
* Driver Name
* Total Boxes
* Birds Per Box
* Expected Birds
* Adjustment (+/- Birds)
* Actual Total Birds
* Weighbridge Weight
* Net Weight
* Average Weight
* Purchase Rate
* Purchase Amount
* Cash Payment
* UPI Payment
* Balance Amount
* Remarks

Automatic calculations:

Expected Birds

```text
Expected Birds =
Total Boxes × Birds Per Box
```

Actual Birds

```text
Actual Birds =
Expected Birds + Adjustment
```

Net Weight

```text
Net Weight =
Weighbridge Weight
− (Actual Birds × 0.04 kg)
```

Average Weight

```text
Average Weight =
Net Weight ÷ Actual Birds
```

Purchase Amount

```text
Purchase Amount =
Net Weight × Purchase Rate
```

Balance

```text
Balance =
Purchase Amount − Total Paid
```

---

# 4. Sales Module

Sales should always begin by selecting an existing customer.

Immediately display:

* Opening Balance
* Outstanding Due
* Pending Bills
* Total Bills

Sales Entry:

* Date
* Customer
* Vehicle Number
* Weight
* Weight Rate
* Weight Amount
* Number of Boxes
* Box Rate
* Box Amount
* Total Invoice Amount
* Cash Payment
* UPI Payment
* Balance Amount

Automatic calculations:

Weight Amount

```text
Weight × Weight Rate
```

Box Amount

```text
Boxes × Box Rate
```

Invoice Total

```text
Weight Amount + Box Amount
```

Balance

```text
Invoice Total − Paid Amount
```

Payment collection should also allow settling previous pending bills.

---

# 5. Expense Management

Allow users to create expense categories first.

Examples:

* Fuel
* Salary
* Electricity
* Feed
* Medicine
* Maintenance
* Office
* Transport
* Miscellaneous

Expense Entry:

* Date
* Category
* Description
* Amount
* Cash Amount
* UPI Amount
* Remarks

Expense Amount should equal:

```text
Cash + UPI
```

---

# 6. Reports

Generate professional reports with date-range filtering.

### Purchase Report

Display:

* Supplier
* Vehicle
* Driver
* Boxes
* Birds
* Net Weight
* Rate
* Amount
* Paid
* Balance

---

### Sales Report

Display:

* Customer
* Vehicle
* Weight
* Rate
* Boxes
* Box Charges
* Total Amount
* Paid
* Balance

---

### Expense Report

Display:

* Category
* Description
* Cash
* UPI
* Total

---

### Party Ledger

Display complete transaction history including:

* Opening Balance
* Purchases
* Sales
* Payments
* Outstanding Balance

---

# PDF Generation

Generate printable PDFs for:

* Purchase Invoice
* Sales Invoice
* Customer Ledger
* Supplier Ledger
* Purchase Report
* Sales Report
* Expense Report

All PDFs should include:

* Shop Name
* Address
* Contact Details
* Date Range
* Report Totals
* Page Numbers

---

# Search & Filters

Provide search and filters across all modules.

Allow filtering by:

* Date Range
* Customer
* Supplier
* Vehicle Number
* Payment Status
* Payment Mode
* Category

---

# User Experience

The application should prioritize:

* Fast data entry
* Minimal typing
* Large touch-friendly controls
* Auto-calculations
* Real-time balance updates
* Clean modern UI
* Mobile-first responsive design
* Consistent layout across mobile and desktop
* Professional PDF reports
* High performance for daily business operations

The overall objective is to build a **simple, reliable, and efficient poultry business management system** that enables shop owners to manage purchases, sales, customer and supplier accounts, expenses, payments, reports, and business performance from a single application with minimal effort.
