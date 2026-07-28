# Data Models & Core Functions

## Data Models Changes Log
*Note: Each time the data models change, append the change in this section with a timestamp. NEVER overwrite historical models.*

### [2026-07-21] Initial LedgerDesk Models Tracked

## Database Operations
Single-tenant PostgreSQL schema (`public`).

### Module Data Models
Below is the list of models tracked in the LedgerDesk system:

**User Model (`users`)**
- Represents authentication credentials for the app.
- Fields: `id`, `username`, `password_hash`, `is_active`, `last_login_at`.

**Party Model (`parties`)**
- Tracks Customers and Suppliers.
- Fields: `id`, `type` (Enum: CUSTOMER, SUPPLIER), `name`, `mobile`, `address`, `opening_balance` (Numeric), `current_balance` (Numeric).
- Logic: `current_balance` represents what is owed. For customers, positive means they owe us. For suppliers, positive means we owe them.

**Purchase Model (`purchases`)**
- Tracks poultry purchases from suppliers.
- Fields: `id`, `party_id` (Supplier), `date`, `vehicle_number`, `driver_name`, `total_boxes`, `birds_per_box`, `expected_birds`, `adjustment`, `actual_birds`, `weighbridge_weight`, `net_weight`, `average_weight`, `purchase_rate`, `purchase_amount`, `cash_payment`, `upi_payment`, `balance_amount`, `remarks`.
- Logic: Automatically adjusts the `current_balance` of the supplier party based on `balance_amount`.

**Sale Model (`sales`)**
- Tracks poultry sales to customers.
- Fields: `id`, `party_id` (Customer), `date`, `vehicle_number`, `weight`, `weight_rate`, `weight_amount`, `boxes`, `box_rate`, `box_amount`, `total_invoice_amount`, `cash_payment`, `upi_payment`, `balance_amount`.
- Logic: Automatically adjusts the `current_balance` of the customer party based on `balance_amount`.

**Expense Category Model (`expense_categories`)**
- Configurable list of expense types (Fuel, Salary, etc.).
- Fields: `id`, `name`.

**Expense Model (`expenses`)**
- Tracks daily operational expenses.
- Fields: `id`, `category_id`, `date`, `description`, `cash_amount`, `upi_amount`, `total_amount`, `remarks`.

**Payment Transaction Model (`payment_transactions`)**
- Simple log of standalone money collection or payout that adjusts a Party's balance (not tied directly to a single bill during creation).
- Fields: `id`, `party_id`, `date`, `cash_amount`, `upi_amount`, `total_amount`, `type` (Enum: RECEIVED, PAID).
- Logic: Adjusts the `current_balance` on the Party immediately.
