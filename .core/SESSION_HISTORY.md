# BROILER 360 Session History

*Every action taken by the AI agent MUST be logged here before ending the turn.*

---

### [2026-07-24 09:42] Expense Module Implementation
- [2026-07-24 09:42]: User requested to port the expense section from Duro_POS to the current project, excluding the branch allocation logic.
- [2026-07-24 09:48]: Created an implementation plan which included migrating models, APIs, and screens.
- [2026-07-24 09:49]: User rejected `tamil_name` field. Rewrote implementation plan without it.
- [2026-07-24 09:50]: User approved plan and requested a new Alembic migration.
- [2026-07-24 09:51]: Executed implementation plan: Updated `ExpenseCategory` and `Expense` models in `backend/app/models/expense.py`, generated and ran Alembic migration, created `expenses` router in backend, built `expenses.ts` frontend API client, and created `ExpenseCategoriesScreen.tsx` & `ExpensesScreen.tsx` frontend screens. Linked screens to Dashboard.
- [2026-07-24 10:03]: Fixed a 500 error on `/api/dashboard/stats` caused by referring to `e.amount` instead of `e.total_amount` for Expense calculations.
- `[2026-07-24 10:07]`: UI Adjustment: Replaced the 'More' bottom tab with 'Expenses' and added a 'Categories' navigation button inside the Expenses screen header.
- `[2026-07-24 10:09]`: UI Adjustment: Removed the 'Sort Order' input from the Category creation modal and centered the title.
- `[2026-07-24 10:11]`: UI Adjustment: Changed the modals on the Expenses and Categories screens to appear centered on the screen instead of being docked at the bottom.
### [2026-07-21] Initial Documentation Setup
**Request:** Copy `.agents` and `.core` from Duro Tracker and adapt them to the BROILER 360 project.
**Actions Taken:**
1. Evaluated `Projectidea.md`.
2. Created an implementation plan to overwrite the documentation.
3. Updated `AGENTS.md` paths.
4. Rewrote `RULES.md` to reflect a single-tenant poultry business.
5. Overwrote `IDEA.md` with the complete project idea.
6. Rewrote `ADMIN_PLAN.md` to list the new modules (Dashboard, Party, Purchase, Sales, Expense, Reports).
7. Completely redesigned `ARCHITECTURE.md` and `DATA_MODELS.md` for the single-tenant system with Party, Purchase, Sale, and PaymentTransaction models.
8. Initialized `CHAT_LOG.md` and `SESSION_HISTORY.md`.

### [2026-07-21] Phase 1: Backend Foundation Executed
**Request:** Build the application (Phase 1).
**Actions Taken:**
1. Initialized FastAPI project with uv.
2. Configured database connection for duraiproject.
3. Created all SQLAlchemy models (User, Party, Purchase, Sale, Expense, PaymentTransaction).
4. Set up Alembic and ran initial migration successfully.

### [2026-07-21] Phase- Setup React Native (Expo) app with `NativeWind` and ported UI screens.
- Re-ran Expo to install missing Babel preset.

### [2026-07-21 12:30:00] Backend API Integration (Phase 3)
- Built FastAPI async endpoints for Parties, Purchases, Sales, and Dashboard.
- Integrated Axios and `@tanstack/react-query` in the Expo mobile app.
- Connected `DashboardScreen.tsx`, `PartiesScreen.tsx`, `NewPurchaseScreen.tsx`, and `NewSaleScreen.tsx` to live backend endpoints.

### [2026-07-21] Phase 2: React Native (Expo) Frontend Architecture
**Request:** Do the UI for all (using Expo React Native).
**Actions Taken:**
1. Initialized Expo React Native app in frontend_mobile.
2. Configured NativeWind and Lucide icons.
3. Created Bottom Tabs navigation shell.
4. Ported Dashboard, New Purchase, New Sale, and Parties mockups from web to Native with updated calculations and ? currency.
5. Verified TypeScript compilation.

### [2026-07-21 14:18:48] Added frontend_mobile env
- Added EXPO_PUBLIC_API_URL to frontend_mobile/src/api/client.ts
- Created .env and .env.example in frontend_mobile

### [2026-07-21 14:21:30] Added backend env
- Created .env and .env.example in backend/ mirroring the config in app/core/config.py
- Added .env to backend/.gitignore

### [2026-07-23 09:50:58] Add Party Bugfix
- Investigated failed party creation issue.
- Added .env to backend/.gitignore

### [2026-07-23 09:50:58] Add Party Bugfix
- Investigated failed party creation issue.
- Identified that Android Emulator requests to localhost fail with Network Error.
- Updated frontend_mobile/src/api/client.ts to dynamically convert localhost to 10.0.2.2 for Android devices.
- Enhanced error handling in frontend_mobile/src/screens/NewPartyScreen.tsx to correctly parse and display FastAPI 422 Validation Error details instead of fallback messages.

### [2026-07-23 09:55:41] Create DB Verification Test
- Created test script verify_party_db.py to verify that adding a party successfully saves all details to the PostgreSQL database.
- Ran the test which successfully passed, confirming that Name, Mobile, Type, and Opening Balance are saved properly.

### [2026-07-23 10:02:00] Verify Endpoints and MCP
- Checked frontend `client.ts` to confirm it points to `http://localhost:8000/api`.
- Checked backend `main.py` and `api.py` to confirm the API routes.
- Verified `/api/parties/` endpoint returns data successfully.
### [2026-07-23 10:10:00] UI Empty List Fix
- Investigated why `PartiesScreen` was rendering an empty list despite DB having data.
- Identified that missing a trailing slash on `GET /parties` triggered a `307 Temporary Redirect` from FastAPI, breaking React Native Axios requests silently.
- Added trailing slash to all `/parties/` GET requests in `PartiesScreen.tsx`, `NewSaleScreen.tsx`, and `NewPurchaseScreen.tsx`.
- Added visible error state to `PartiesScreen.tsx` to prevent silent failures in the future.

### [2026-07-23 10:16:15] Physical Device Connection Fix
- Investigated infinite loading issue on mobile device compared to web view.
- Identified that `EXPO_PUBLIC_API_URL` was set to `localhost`, which fails on physical devices as they cannot resolve the laptop's localhost.
- Retrieved host local IP address (`192.168.1.13`) using `ipconfig`.
- Updated `frontend_mobile/.env` to set `EXPO_PUBLIC_API_URL="http://192.168.1.13:8000/api"`.

### [2026-07-23 10:24:44] UI Data Mapping Fix
- Fixed an issue in `PartiesScreen.tsx` where phone numbers were not displaying.
- Corrected the field mapping from `party.phone` to `party.mobile` to match the backend database schema.

### [2026-07-23 10:26:59] UI Terminology Update
- Updated UI text across `PartiesScreen.tsx`, `NewSaleScreen.tsx`, `NewPartyScreen.tsx`, and `DashboardScreen.tsx`.
- Changed "Customer" to "Purchaser" to better reflect the business domain (buying items from parties).
- Left internal states and backend models as "customer" to prevent data breakage.

- [2026-07-23 10:34:25] User requested to add an Address field to the add party page and show it on the parties page. Added the address field to frontend NewPartyScreen.tsx and PartiesScreen.tsx (backend already supported it).
- [2026-07-23 10:36:00] Generated and ran Alembic migration to add ddress column to the parties table in the database to ensure it persists.
- [2026-07-23 10:41:59] Fixed render error in NewSaleScreen.tsx by importing the missing User icon component from lucide-react-native.
- [2026-07-23 10:50:09] Replaced Supplier ID and Purchaser ID TextInputs with Dropdown (Picker) components in NewPurchaseScreen.tsx and NewSaleScreen.tsx to allow selecting from fetched parties.
- [2026-07-23 10:55:55] Swapped Purchaser and Supplier UI labels and mappings. Database customer is now used for Suppliers, and supplier is used for Purchasers across NewPartyScreen, PartiesScreen, NewPurchaseScreen, and NewSaleScreen.
- [2026-07-23 11:01:43] Refactored database enum partytype using raw SQL to rename CUSTOMER to SUPPLIER, and SUPPLIER to PURCHASER. Updated enums.py and frontend screens to use these new uppercase types directly.
- [2026-07-23 11:12:44] Corrected labels and DB types in NewPurchaseScreen (to use Purchaser) and NewSaleScreen (to use Supplier) based on the user business logic.
- [2026-07-23 11:44:39] Fixed TypeError: invalid keyword argument for PaymentTransaction in both purchases.py and sales.py by aligning the instantiation arguments with the PaymentTransaction model (type, cash_amount, upi_amount, total_amount).
- [2026-07-23 11:48:35] Fixed TypeError (Decimal + float) in purchases.py and sales.py by converting current_balance to float before math operations.

- [2026-07-23 11:48:35] Fixed TypeError (Decimal + float) in purchases.py and sales.py by converting current_balance to float before math operations.

- [2026-07-23 11:53:51] Created PurchasesScreen and SalesScreen to show a list of history, and moved NewPurchaseScreen and NewSaleScreen to stack navigators accessed via Add buttons.

- [2026-07-23 12:52:41] Added 'Driver Name' text input field to both NewPurchaseScreen and NewSaleScreen, and updated the Pydantic schemas and database models (via new Alembic migration) to save the driver_name.

- [2026-07-23 12:58:06] Removed Adjustment and Actual Birds fields in NewPurchaseScreen. Replaced with an auto-calculated Total Birds Count that allows manual override via an Edit button (Pencil icon).

- [2026-07-23 13:07:57] Removed expected_birds and adjustment columns from the purchases table via Alembic migration. Fixed driver_name saving issue and added driver_name to the history list views.

- [2026-07-23 13:12:00] Fixed automatic list refresh bug by adding query invalidation for ['purchases'] and ['sales'] on save. Added pull-to-refresh and a manual refresh icon to Purchases, Sales, and Parties list screens.

- [2026-07-23 13:20:26] Removed 'Empty Box Weight (kg)' field from NewPurchaseScreen as requested.

- [2026-07-23 13:24:17] Reorganized NewPurchaseScreen Weight & Rates layout to place Purchase Rate on the left and Weighbridge on the right. Added automatic calculation for Net Weight (Weighbridge - Total Birds * 40g) with a manual edit toggle.

- [2026-07-23 13:25:14] Fixed ReferenceError for missing Edit2 import in NewPurchaseScreen.

- [2026-07-23 13:31:34] Fixed ReferenceError for missing Pencil import in NewPurchaseScreen.

- [2026-07-23 13:34:28] Updated Net Weight edit UI to match the Total Birds Count UI (Pencil icon with Edit text, and a Cancel Edit button below).

- [2026-07-23 13:39:17] Updated NewPurchaseScreen to auto-calculate Total Purchase Amount based on Net Weight * Purchase Rate. Added a visible Balance Amount indicator under the Total Paid Now field.

- [2026-07-23 13:46:43] Updated Payment section in NewPurchaseScreen and NewSaleScreen to split amount_paid into cash_payment and upi_payment. Added UI to display Total Paid and Balance.

- [2026-07-23 13:53:45] Made the empty bird box weight (40g) editable inline in the NewPurchaseScreen Net Weight auto-calculate text.

- [2026-07-23 14:00:04] Updated styling for Total Purchase Amount and Total Sale Amount to have a gray background with bold green text, and made them non-editable.

- [2026-07-23 14:05:23] Replaced standard ScrollView with KeyboardAwareScrollView in NewPurchaseScreen, NewSaleScreen, and NewPartyScreen to prevent the mobile keyboard from blocking the bottom Payment UI.

- [2026-07-23 14:08:40] Added enableOnAndroid={true} and extraScrollHeight={120} props to KeyboardAwareScrollView on all form screens to fix issue where keyboard was still covering the bottom fields on Android.

- [2026-07-23 14:12:15] Fixed the ScrollView bottom padding issue where content was hiding behind the absolute bottom 'Save/Cancel' buttons. Moved padding classes to contentContainerStyle on all form screens.

- [2026-07-23 14:16:35] Updated Driver Name and Vehicle Number fields in NewPurchaseScreen and NewSaleScreen to display side-by-side on web (md breakpoint) while remaining stacked on mobile.

- [2026-07-23 14:20:53] Added manual Date entry field to NewPurchaseScreen and NewSaleScreen. Positioned Date next to Purchaser/Supplier in a side-by-side layout on web views. Updated backend schemas to accept date from frontend.

- [2026-07-23 14:24:32] Replaced simple Date text input with @react-native-community/datetimepicker on NewPurchaseScreen and NewSaleScreen to display a native date picker modal on mobile. Formatted the displayed date to DD/MM/YYYY while keeping backend payload as YYYY-MM-DD.

- [2026-07-23 14:26:59] Fixed mobile layout stacking issue for Date/Purchaser and Driver/Vehicle fields. Replaced buggy NativeWind space-y-3 classes with explicit mb-3 md:mb-0 margins to guarantee correct vertical spacing between fields on mobile devices.

- [2026-07-23 14:29:40] Fixed React Native Picker UI bug on Android where the bottom 25% of text was clipped. Increased Picker height to 54 and applied flex-center constraints.

- [2026-07-23 14:34:25] Changed default state of Purchaser and Supplier fields to empty so users are forced to make a selection. Set the placeholder options ('Select a purchaser...') to be unselectable/hidden in the dropdown list using enabled={false}.

- [2026-07-23 15:12:12] Added form validation checks on NewPurchaseScreen and NewSaleScreen to ensure a valid party is selected, and that Weight and Rate fields are > 0 before allowing form submission.

- [2026-07-23 15:18:38] Replaced popup validation with inline error messages below each mandatory field in NewPurchaseScreen and NewSaleScreen. Fields auto-clear their error state on input.

- [2026-07-23 15:21:40] Fixed the Purchaser and Supplier dropdowns (Picker component) so the entire text box space is clickable, not just the down arrow icon. Achieved this by setting mode='dropdown' and flex: 1 on the Picker styles in NewPurchaseScreen and NewSaleScreen.

- [2026-07-23 15:24:29] Fixed React Native DateTimePicker LogBox warning by migrating from the deprecated 'onChange' prop to 'onValueChange' and 'onDismiss' in both NewPurchaseScreen and NewSaleScreen.

- [2026-07-23 15:28:03] Removed 'enabled={false}' from the initial placeholder Picker items in NewPurchaseScreen and NewSaleScreen because it was causing the entire Picker touch area to be disabled when the placeholder was the currently selected value.

- [2026-07-23 15:33:16] Fixed the Picker UI text getting cropped (bottom 20% of letters hiding) by removing fixed heights (h-[54px] and height: 54) and overflow-hidden from the Purchaser/Supplier dropdown containers in NewPurchaseScreen and NewSaleScreen.

- [2026-07-23 15:38:57] Added regex validation for standard Indian vehicle numbers (e.g. MH-12-AB-1234) in NewPurchaseScreen and NewSaleScreen to ensure valid formatting before saving.

- [2026-07-23 15:41:10] Implemented automatic format handling for the Vehicle Number fields in NewPurchaseScreen and NewSaleScreen. As the user types alphanumeric characters, it automatically capitalizes them and injects hyphens in the standard Indian vehicle number plate format (MH-12-AB-1234).

- [2026-07-23 15:47:09] Fixed mobile UI layout for the 'Birds per Box' field in NewPurchaseScreen. Replaced the md:w-[48%] CSS class with w-[48%] to ensure it renders consistently side-by-side with 'Total Boxes' on smaller screens.

- [2026-07-23 15:50:08] Removed 'E.G.' prefix from all text input placeholders in NewPurchaseScreen and NewSaleScreen for a cleaner UI.

- [2026-07-23 16:06:30] Changed 'Empty Boxes' to 'Total Boxes' in NewSaleScreen and implemented the dynamic Total Sale Amount calculation: (Net Weight * Rate) + (Total Boxes * Box Rate).

- [2026-07-23 13:20:26] Removed 'Empty Box Weight (kg)' field from NewPurchaseScreen as requested.

- [2026-07-23 13:24:17] Reorganized NewPurchaseScreen Weight & Rates layout to place Purchase Rate on the left and Weighbridge on the right. Added automatic calculation for Net Weight (Weighbridge - Total Birds * 40g) with a manual edit toggle.

- [2026-07-23 13:25:14] Fixed ReferenceError for missing Edit2 import in NewPurchaseScreen.

- [2026-07-23 13:31:34] Fixed ReferenceError for missing Pencil import in NewPurchaseScreen.

- [2026-07-23 13:34:28] Updated Net Weight edit UI to match the Total Birds Count UI (Pencil icon with Edit text, and a Cancel Edit button below).

- [2026-07-23 13:39:17] Updated NewPurchaseScreen to auto-calculate Total Purchase Amount based on Net Weight * Purchase Rate. Added a visible Balance Amount indicator under the Total Paid Now field.

- [2026-07-23 13:46:43] Updated Payment section in NewPurchaseScreen and NewSaleScreen to split amount_paid into cash_payment and upi_payment. Added UI to display Total Paid and Balance.

- [2026-07-23 13:53:45] Made the empty bird box weight (40g) editable inline in the NewPurchaseScreen Net Weight auto-calculate text.

- [2026-07-23 14:00:04] Updated styling for Total Purchase Amount and Total Sale Amount to have a gray background with bold green text, and made them non-editable.

- [2026-07-23 14:05:23] Replaced standard ScrollView with KeyboardAwareScrollView in NewPurchaseScreen, NewSaleScreen, and NewPartyScreen to prevent the mobile keyboard from blocking the bottom Payment UI.

- [2026-07-23 14:08:40] Added enableOnAndroid={true} and extraScrollHeight={120} props to KeyboardAwareScrollView on all form screens to fix issue where keyboard was still covering the bottom fields on Android.

- [2026-07-23 14:12:15] Fixed the ScrollView bottom padding issue where content was hiding behind the absolute bottom 'Save/Cancel' buttons. Moved padding classes to contentContainerStyle on all form screens.

- [2026-07-23 14:16:35] Updated Driver Name and Vehicle Number fields in NewPurchaseScreen and NewSaleScreen to display side-by-side on web (md breakpoint) while remaining stacked on mobile.

- [2026-07-23 14:20:53] Added manual Date entry field to NewPurchaseScreen and NewSaleScreen. Positioned Date next to Purchaser/Supplier in a side-by-side layout on web views. Updated backend schemas to accept date from frontend.

- [2026-07-23 14:24:32] Replaced simple Date text input with @react-native-community/datetimepicker on NewPurchaseScreen and NewSaleScreen to display a native date picker modal on mobile. Formatted the displayed date to DD/MM/YYYY while keeping backend payload as YYYY-MM-DD.

- [2026-07-23 14:26:59] Fixed mobile layout stacking issue for Date/Purchaser and Driver/Vehicle fields. Replaced buggy NativeWind space-y-3 classes with explicit mb-3 md:mb-0 margins to guarantee correct vertical spacing between fields on mobile devices.

- [2026-07-23 14:29:40] Fixed React Native Picker UI bug on Android where the bottom 25% of text was clipped. Increased Picker height to 54 and applied flex-center constraints.

- [2026-07-23 14:34:25] Changed default state of Purchaser and Supplier fields to empty so users are forced to make a selection. Set the placeholder options ('Select a purchaser...') to be unselectable/hidden in the dropdown list using enabled={false}.

- [2026-07-23 15:12:12] Added form validation checks on NewPurchaseScreen and NewSaleScreen to ensure a valid party is selected, and that Weight and Rate fields are > 0 before allowing form submission.

- [2026-07-23 15:18:38] Replaced popup validation with inline error messages below each mandatory field in NewPurchaseScreen and NewSaleScreen. Fields auto-clear their error state on input.

- [2026-07-23 15:21:40] Fixed the Purchaser and Supplier dropdowns (Picker component) so the entire text box space is clickable, not just the down arrow icon. Achieved this by setting mode='dropdown' and flex: 1 on the Picker styles in NewPurchaseScreen and NewSaleScreen.

- [2026-07-23 15:24:29] Fixed React Native DateTimePicker LogBox warning by migrating from the deprecated 'onChange' prop to 'onValueChange' and 'onDismiss' in both NewPurchaseScreen and NewSaleScreen.

- [2026-07-23 15:28:03] Removed 'enabled={false}' from the initial placeholder Picker items in NewPurchaseScreen and NewSaleScreen because it was causing the entire Picker touch area to be disabled when the placeholder was the currently selected value.

- [2026-07-23 15:33:16] Fixed the Picker UI text getting cropped (bottom 20% of letters hiding) by removing fixed heights (h-[54px] and height: 54) and overflow-hidden from the Purchaser/Supplier dropdown containers in NewPurchaseScreen and NewSaleScreen.

- [2026-07-23 15:38:57] Added regex validation for standard Indian vehicle numbers (e.g. MH-12-AB-1234) in NewPurchaseScreen and NewSaleScreen to ensure valid formatting before saving.

- [2026-07-23 15:41:10] Implemented automatic format handling for the Vehicle Number fields in NewPurchaseScreen and NewSaleScreen. As the user types alphanumeric characters, it automatically capitalizes them and injects hyphens in the standard Indian vehicle number plate format (MH-12-AB-1234).

- [2026-07-23 15:47:09] Fixed mobile UI layout for the 'Birds per Box' field in NewPurchaseScreen. Replaced the md:w-[48%] CSS class with w-[48%] to ensure it renders consistently side-by-side with 'Total Boxes' on smaller screens.

- [2026-07-23 15:50:08] Removed 'E.G.' prefix from all text input placeholders in NewPurchaseScreen and NewSaleScreen for a cleaner UI.

- [2026-07-23 16:06:30] Changed 'Empty Boxes' to 'Total Boxes' in NewSaleScreen and implemented the dynamic Total Sale Amount calculation: (Net Weight * Rate) + (Total Boxes * Box Rate).

- [2026-07-23 16:12:46] Fixed a React Native red screen crash ('Value for message cannot be cast from ReadableNativeArray to String') caused by passing an array of FastAPI validation errors directly into Alert.alert() in NewPurchaseScreen and NewSaleScreen. Implemented robust error parsing to convert arrays to string messages.

- [2026-07-23 16:36:31] Fixed the React Native 'ReadableNativeArray to String' crash during form submission by safely parsing FastAPI validation error arrays before passing them to Alert.alert() in both NewPurchaseScreen and NewSaleScreen.

- [2026-07-23 16:44:40] Fixed the Pydantic 'body.date input should be None' 422 Unprocessable Entity error by aliasing the datetime.date import to datetime_date in both purchases.py and sales.py. This prevents Pydantic from mistaking the 'date' type hint for a self-referential 'None' default value due to namespace shadowing.

- [2026-07-23 17:02:16] Added 'birds_per_box' and 'actual_birds' (Total Birds Count) to the Sales flow. Updated the backend Sale database model, ran Alembic migration, updated the Sales pydantic schemas, and added the auto-calculating UI fields (with manual Edit override) to NewSaleScreen.tsx, matching the Purchase screen.

- [2026-07-24 10:45:00] Completed the Backend Edit/Delete flow for Purchases, Sales, and Expenses. This included adding full financial ledger reversal logic for Purchases and Sales (reverting original transactions and balances, deleting old transactions, and creating new ones). Added PUT and DELETE endpoints for all three entities. Hooked up the frontend UI to pass edit data into forms and updated schemas to handle Updates and Deletes with proper backend synchronization.

- [2026-07-24 11:05:00] Added "Preview Mode" to NewPurchaseScreen and NewSaleScreen when tapping an existing bill. Bills now open in read-only mode by default, requiring the user to tap "Edit" in the top header to unlock the form. Also fixed an issue where `cash_payment` and `upi_payment` were missing from the `PurchaseBase` and `SaleBase` backend Pydantic schemas, preventing them from pre-filling correctly when editing a bill.

- [2026-07-24 11:34:00] Fixed a bug in NewSaleScreen where the Net Weight (kg) was showing as 0 in edit mode. The UI was mistakenly trying to read `editData.net_weight` (used in Purchases) instead of `editData.weight` (the actual field name in the Sales schema).

- [2026-07-24 11:40:00] Fixed a bug in NewSaleScreen where new sales were being saved to the database with a weight of 0. The UI mutation was incorrectly sending `net_weight` in the JSON payload, which the backend Pydantic `SaleCreate` schema dropped since it expects the field to be named `weight`. Changed the mutation payload key from `net_weight` to `weight`.

- [2026-07-24 11:45:00] Fixed a backend bug in `create_sale` endpoint where `birds_per_box` and `actual_birds` were not being assigned to the new `Sale` model instance when saving to the database, resulting in them being stored as `0`. Added mapping for these two fields in `sales.py`.
