# BROILER 360 Chat & Command Log

*This file serves as the historical record of chat reasoning and exact terminal commands run by agents for BROILER 360.*

## [2026-07-21] Project Initialization

**User Request**: Initialize the BROILER 360 project structure using Duro Tracker's `.agents` and `.core` folders, adapting them to the new poultry business model.

**Agent Actions**:
1. Copied `.agents` and `.core` from Duro Tracker.
2. Rewrote `AGENTS.md` to point to `Layer-Brolier`.
3. Rewrote `RULES.md` to remove multi-tenancy and add Poultry constraints.
4. Rewrote `IDEA.md` with the contents of `Projectidea.md`.
5. Rewrote `ADMIN_PLAN.md` with the new modules.
6. Rewrote `ARCHITECTURE.md` and `DATA_MODELS.md` for a single-tenant poultry system.

## [2026-07-21] Phase 1 Execution
**User Request**: ok build the application.
**Agent Actions**: Executed Phase 1 Backend Foundation. Ran uv init, created models, and ran alembic upgrade head to create the PostgreSQL tables in duraiproject database.

## [2026-07-21] Phase 2 Execution
**User Request**: do the UI for all -> rewrite plan (explicitly requested Expo over PWA).
**Agent Actions**: Executed Phase 2 React Native architecture. Built the Dashboard, Parties, Sales, and Purchase screens using NativeWind. Corrected the UI structure to include Actual Birds, Adjusted Birds, Payment sections for Sales, and enforced the ? symbol globally.

**User Request**: run the frontend
**Agent Actions**: Started the Expo frontend server.

### [2026-07-21 14:18:48] Added frontend_mobile env
**User:** i need to add the frontend_mobile env to update the backend URL
**Agent:** Updated frontend_mobile/src/api/client.ts to use process.env.EXPO_PUBLIC_API_URL and created .env and .env.example files.

### [2026-07-21 14:21:30] Added backend env
**User:** by that same keep the backend also a env
**Agent:** Created backend/.env and .env.example with the settings from config.py, and added .env to backend/.gitignore.

**Agent:** Created backend/.env and .env.example with the settings from config.py, and added .env to backend/.gitignore.

### [2026-07-23 09:50:58] Chat Log
User: while add new party it make error failed to add party.
Agent: Fixed network error caused by localhost resolution on Android Emulator by updating API client configuration. Also improved error message display for better debugging.

### [2026-07-23 09:55:41] Chat Log
User: make test file to add the detailUser: these are parties are presented in database, but UI not is showing.
Agent: Investigated the frontend `PartiesScreen.tsx`. Found that the Axios API call was missing a trailing slash (`/parties?party_type=customer`), which causes FastAPI to issue a `307 Temporary Redirect` to `/parties/?...`. This redirect often causes network errors or dropped query parameters in React Native's networking layer. I added the trailing slash directly to the request in `PartiesScreen.tsx`, `NewPurchaseScreen.tsx`, and `NewSaleScreen.tsx` to fix this issue. I also added explicit error boundary text to `PartiesScreen.tsx` so any future network issues display an error message directly in the UI instead of silently failing and showing an empty list.Created and ran verify_party_db.py which creates a party using the API and then fetches the data back from the DB to verify all fields match.

### [2026-07-23 10:02:00] Chat Log
User: check the front end and the backend connection end point use the mcp server to chack the pi endpoints
Agent: I checked the frontend API client (`d:\Layer-Brolier\frontend_mobile\src\api\client.ts`) and verified it points to `http://localhost:8000/api`. I then checked the backend API configurations in `main.py` and `api.py`. Next, I tested the `/api/parties/` endpoint using `Invoke-RestMethod` and verified it returns the expected data. Finally, I used the `postgres` MCP server to directly query the `duraiproject` database and confirm that the API endpoints are properly returning the data stored in the database.

### [2026-07-23 10:16:15] Chat Log
User: in mobile data are not showing, only loading icon is not showing, but in the web view it showing.
Agent: Investigated the issue and determined that when testing on a physical mobile device, using `localhost` in the API URL does not work because `localhost` refers to the device itself, not your computer. I used `ipconfig` to find your machine's local IP address (`192.168.1.13`) and updated `EXPO_PUBLIC_API_URL` in `frontend_mobile/.env` to point to it. You will need to restart the Expo server for the changes to take effect.

### [2026-07-23 10:24:44] Chat Log
User: Parties page there are phone number is presented, in DB, but in UI there are showing as No Phone
Agent: Found that the frontend was incorrectly trying to read `party.phone`, but the backend database uses the field name `mobile`. I updated `PartiesScreen.tsx` to display `{party.mobile}`.

### [2026-07-23 10:26:59] Chat Log
User: in that change the customer change to Purchaser as buying items from their parties.
Agent: I searched the frontend UI and successfully replaced all instances of "Customer" with "Purchaser" across the React Native screens (`PartiesScreen`, `NewSaleScreen`, `NewPartyScreen`, and `DashboardScreen`). The underlying API and Database models continue to use the term "customer" to ensure we don't break existing features, but the UI will now display "Purchaser" everywhere.


### [2026-07-23 10:34:25]
**User:** in that add party page, add a new field as Address, it alsoshow on parties.
**Agent:** Checked backend and it already had address field. Added address input field to NewPartyScreen.tsx and display to PartiesScreen.tsx.

### [2026-07-23 10:36:00]
**User:** i want database alos address want to be save. not a hotsave.
**Agent:** Generated and ran the missing Alembic migration (lembic revision --autogenerate and lembic upgrade head) to add the address column to the database.

### [2026-07-23 10:41:59]
**User:** Reported a render error in NewSaleScreen.tsx (Property User missing).
**Agent:** Fixed the error by importing the missing User icon component from lucide-react-native.

### [2026-07-23 10:50:09]
**User:** in that SupplierID, make a Dropdown box to select the purchaser to save their purchase record.
**Agent:** Installed @react-native-picker/picker and replaced the manual ID text inputs with Dropdown Pickers populated from the database.

### [2026-07-23 10:55:55]
**User:** in that change the name as Supplier to Purchaser, Purchaser to Supplier, in that Database Customer as Supplier parttype, as Supplier as Purchaser parttype.
**Agent:** Updated the UI labels and database type filtering across the screens to swap the internal mapping of Purchaser and Supplier.

### [2026-07-23 11:01:43]
**User:** partytype in database. CUSTOMER change to SUPPLIER. SUPPLIER change to PURCHASER
**Agent:** Updated the actual PostgreSQL database enum values directly via SQL script and synchronized the Python and React Native code to use the new SUPPLIER and PURCHASER types.

### [2026-07-23 11:12:44]
**User:** in there are two things, one purchasing items is purchaser, while making a selles is the Suppliers. correct in the UI properly.
**Agent:** Updated NewPurchaseScreen and NewSaleScreen UI labels and Picker filters to perfectly match this logic (Purchasing from a Purchaser, Selling to a Supplier).

### [2026-07-23 11:44:39]
**User:** Reported 500 Internal Server Error when creating a purchase
**Agent:** Fixed the buggy PaymentTransaction insertion code in both purchases.py and sales.py to match the actual database model fields.

### [2026-07-23 11:48:35]
**User:** Reported 500 Error: TypeError Decimal + float
**Agent:** Fixed the type mismatch by wrapping current_balance in a float conversion before adding/subtracting values.


### [2026-07-23 11:53:51]
**User:** Requested Purchases to be a listing page with an ADD button instead of directly opening the New Purchase form.
**Agent:** Created PurchasesScreen.tsx and SalesScreen.tsx as listing screens for the bottom tabs, and added a 'New Purchase / New Sale' button that navigates to the respective forms.


### [2026-07-23 12:52:41]
**User:** Requested 'Driver Name' input field above Vehicle Number.
**Agent:** Added the Driver Name field to both UI screens and updated the database schema and API to properly save it.


### [2026-07-23 12:58:06]
**User:** Requested to replace Adjustment and Actual Birds fields with an auto-calculated Total Birds count that can be edited with a pencil icon.
**Agent:** Created an auto-updating Total Birds field that multiplies Boxes by Birds Per Box. Added an edit override toggle and removed the old redundant fields.


### [2026-07-23 13:07:57]
**User:** Reported driver name and vehicle number not saving, and requested removal of expected_birds and adjustment columns.
**Agent:** Ran a database migration to permanently delete the requested columns. Fixed the server state so that driver name and vehicle number save correctly, and added them to the history screens so you can see them.

### [2026-07-23 13:12:00]
**User:** Requested a refresh icon button because saved purchase records were not showing up automatically.
**Agent:** Fixed the backend state syncing by ensuring the app invalidates the 'purchases' and 'sales' caches after saving. Also added a manual refresh button and pull-to-refresh to the Purchases, Sales, and Parties screens.


### [2026-07-23 13:20:26]
**User:** Requested to remove the Empty Box Weight (kg) field.
**Agent:** Removed the field from the NewPurchaseScreen UI and form state.


### [2026-07-23 13:24:17]
**User:** Requested layout changes in Purchase screen: Purchase Rate on left, Weighbridge on right, and an auto-calculated Net Weight field with an edit icon.
**Agent:** Restructured the UI in NewPurchaseScreen.tsx to match the requested layout. Added state and effect hooks to automatically calculate Net Weight based on 40g per bird and subtract it from the Weighbridge weight, with an override pencil icon.


### [2026-07-23 13:25:14]
**User:** Reported ReferenceError: Edit2 is not defined.
**Agent:** Fixed the error by adding the missing Edit2 import from lucide-react-native in NewPurchaseScreen.tsx.


### [2026-07-23 13:31:34]
**User:** Reported ReferenceError: Property 'Pencil' doesn't exist.
**Agent:** Re-added Pencil to the lucide-react-native imports in NewPurchaseScreen.tsx.


### [2026-07-23 13:34:28]
**User:** Requested Net Weight edit UI to match the Total Birds Count edit button style.
**Agent:** Updated NewPurchaseScreen to use the explicit 'Edit' pencil toggle and 'Cancel Edit' text button below the Net Weight field, exactly mirroring the Total Birds Count.


### [2026-07-23 13:39:17]
**User:** Requested Total Purchase Amount to be auto-calculated, and to show the Balance Amount dynamically under Total Paid Now.
**Agent:** Added a useEffect hook to calculate total_amount = net_weight * purchase_rate. Added a dynamically calculated Balance Amount text indicator (total_amount - amount_paid) below the Total Paid Now input.


### [2026-07-23 13:46:43]
**User:** Requested splitting the Total Paid field into Cash and UPI, and showing the sum alongside the balance.
**Agent:** Updated NewPurchaseScreen and NewSaleScreen to include separate Cash and UPI fields. The backend now accurately records these as two separate transaction types via the handleSave logic. The UI sums them dynamically and shows the remaining balance.


### [2026-07-23 13:53:45]
**User:** Requested the 40g auto-calculate value to be editable with a small edit icon.
**Agent:** Updated NewPurchaseScreen.tsx to include an inline editing state (isEditingGrams) inside the helper text. The net weight now automatically recalculates based on whatever grams value the user inputs, instead of being hardcoded to 40.


### [2026-07-23 14:00:04]
**User:** Requested styling changes to Total Purchase Amount field (change background to gray, make text green, non-editable).
**Agent:** Updated NewPurchaseScreen and NewSaleScreen to apply the requested styling (bg-gray-100, text-[#006948], editable={false}) to the auto-calculated total amount fields.


### [2026-07-23 14:05:23]
**User:** Reported that the Payment section fields at the bottom are not clearly visible on mobile because the keyboard blocks them, and requested KeyboardAwareScrollView for all pages.
**Agent:** Installed react-native-keyboard-aware-scroll-view and updated all form screens (NewPurchaseScreen, NewSaleScreen, NewPartyScreen) to use it so the UI automatically pushes up when the keyboard is open.


### [2026-07-23 14:08:40]
**User:** Reported the keyboard was still hiding the background and layout when it appears.
**Agent:** Configured KeyboardAwareScrollView with enableOnAndroid={true}, extraScrollHeight={120}, and keyboardShouldPersistTaps='handled' on all screens to force the scrollview to push up the content above the keyboard natively on Android.


### [2026-07-23 14:12:15]
**User:** Reported that the total paid and balance amounts were hiding behind the cancel and save buttons on mobile.
**Agent:** The issue was caused by Tailwind classes applying padding to the ScrollView container rather than the scrollable content. Fixed by changing className to just flex-1 and explicitly passing contentContainerStyle={{ padding: 16, paddingBottom: 100 }} to KeyboardAwareScrollView on all screens. This ensures users can scroll the bottom-most fields fully above the absolute floating action buttons.


### [2026-07-23 14:16:35]
**User:** Requested Driver Name and Vehicle Number to be side-by-side on web views only, across both sales and purchase screens.
**Agent:** Used NativeWind responsive classes (md:flex-row, md:justify-between, md:w-[48%]) on those fields in NewPurchaseScreen and NewSaleScreen so they stack on mobile but sit in a two-column row on wider screens.


### [2026-07-23 14:20:53]
**User:** Requested manual Date entry placed above/beside the Purchaser and Supplier dropdowns on web view.
**Agent:** Updated backend routes to accept an optional 'date' string. Added a Date TextInput to NewPurchaseScreen and NewSaleScreen using NativeWind responsive row formatting, placing it next to Purchaser/Supplier on web views while stacking on mobile.


### [2026-07-23 14:24:32]
**User:** Requested replacing the Date text field with a native datepicker, formatted as DD/MM/YYYY.
**Agent:** Installed @react-native-community/datetimepicker and replaced the TextInput with a TouchableOpacity that opens the DateTimePicker on mobile. Created a formatDate utility to display the state in DD/MM/YYYY while preserving the correct ISO format for API submission.


### [2026-07-23 14:26:59]
**User:** Reported that the Supplier and Purchase fields (Date and Purchaser) were not UI formatted properly on mobile views.
**Agent:** The issue was caused by NativeWind's space-y-3 class occasionally failing on flex-col nested containers in React Native. Fixed by replacing space-y-3 with explicit mb-3 (margin-bottom) on the first field of each row, resolving the overlap and squished UI.


### [2026-07-23 14:29:40]
**User:** Pointed out with a screenshot that the bottom 25% of the letters in the Purchaser/Supplier dropdown were clipped (hiding).
**Agent:** The default height (50px) combined with 'overflow-hidden' on Android caused the native Picker to clip the bottom tail of fonts. Fixed by increasing the wrapper and Picker heights to 54px and ensuring 'justify-center' was applied, solving the clipping across all screens.


### [2026-07-23 14:34:25]
**User:** Requested that Purchaser and Supplier not auto-select, but instead default to the placeholder, and the placeholder itself should not be selectable from the dropdown.
**Agent:** Updated initial states of supplier_id and customer_id to empty strings, removed auto-select useEffects, and added enabled={false} and color='#9ca3af' to the Picker.Item placeholders so they are disabled in the list.


### [2026-07-23 15:12:12]
**User:** Requested proper validation for purchases and sales forms.
**Agent:** Added client-side validation logic inside the handleSave function on both NewPurchaseScreen and NewSaleScreen. The app now uses Alert.alert to block submission if the user hasn't selected a supplier/purchaser, or if Net Weight or Rate fields are empty/zero.


### [2026-07-23 15:18:38]
**User:** Requested inline error messages below each mandatory field (Purchaser, Driver, Vehicle, Boxes, Birds Per Box, Rate, Weight) instead of a general popup.
**Agent:** Implemented a new 'errors' state object. handleSave now checks all required fields and populates the errors object. Displayed inline <Text> blocks with red Tailwind styling below each field conditionally if an error exists. The error clears immediately when the user types in the field.


### [2026-07-23 15:21:40]
**User:** Requested that the full text box for Purchaser/Supplier selection be clickable instead of just the down arrow.
**Agent:** Updated the <Picker> components in NewPurchaseScreen and NewSaleScreen by explicitly adding mode='dropdown' and flex: 1 to ensure the touch area extends across the entire width of the container.


### [2026-07-23 15:24:29]
**User:** Reported a LogBox console warning regarding DateTimePicker 'onChange' being deprecated.
**Agent:** Updated NewPurchaseScreen and NewSaleScreen to use 'onValueChange' and 'onDismiss' instead of 'onChange', conforming to the latest @react-native-community/datetimepicker API.


### [2026-07-23 15:28:03]
**User:** Reported that initially, the Purchaser/Supplier dropdown field is only clickable via the down arrow, but after selecting a value, the whole box becomes clickable.
**Agent:** Identified that 'enabled={false}' on the default placeholder item disables the Picker's entire touch target (except the native arrow) while it is selected. Removed 'enabled={false}' and relied on our form validation to ensure the user changes it.


### [2026-07-23 15:33:16]
**User:** Complained that the bottom 20% of letters inside the Purchaser/Supplier selection was visually hiding/cut off.
**Agent:** The clipping was caused by a strict 'h-[54px]' container with 'overflow-hidden' competing with the native Picker height. Changed the wrapper to use 'min-h-[50px]' and removed hardcoded heights so the text can render fully.


### [2026-07-23 15:38:57]
**User:** Requested strict format validation for the vehicle number (MH-12-AB-1234).
**Agent:** Implemented a regex /^[A-Za-z]{2}-\d{2}-[A-Za-z]{1,2}-\d{4}$/ in the validation logic of both forms. If the format does not perfectly match, an inline error is displayed.


### [2026-07-23 15:41:10]
**User:** Requested that the hyphens in the vehicle number be inserted automatically while typing.
**Agent:** Created a smart handleVehicleNumberChange formatter function that automatically strips non-alphanumeric characters, converts to uppercase, and inserts hyphens exactly at the 2nd, 4th, and variable (5th/6th) positions, updating the input in real-time.


### [2026-07-23 15:47:09]
**User:** Reported the UI for 'Birds per Box' was not displaying properly on mobile.
**Agent:** Discovered a Tailwind CSS class typo ('md:w-[48%]' instead of 'w-[48%]') on the Birds per Box wrapper, which caused it to take 100% width on mobile and break the flex layout. Corrected it to ensure side-by-side layout is maintained.


### [2026-07-23 15:50:08]
**User:** Requested removing 'E.G.' from the placeholders.
**Agent:** Removed the 'E.G.' prefix from all inputs across both forms to keep the placeholders concise.


### [2026-07-23 16:06:30]
**User:** Requested changing 'Empty Boxes' to 'Total Boxes' on the New Sales screen, and adding the auto-calculation for Total Sale Amount.
**Agent:** Renamed the label and injected a React useEffect to automatically calculate and update the total amount exactly as requested: (Net Weight * Rate) + (Total Boxes * Box Rate).


### [2026-07-23 16:12:46]
**User:** Provided a screenshot showing a red screen crash: 'Value for message cannot be cast from ReadableNativeArray to String'.
**Agent:** Diagnosed that FastAPI validation errors return an array under the 'detail' key. When passed directly to Alert.alert(), it causes a native bridging crash on Android. Updated both screens to parse the array and extract the 'msg' string instead.


### [2026-07-23 16:36:31]
**User:** Reported a crash when saving new purchases or sales ('Value for message cannot be cast from ReadableNativeArray to String').
**Agent:** Discovered that FastAPI validation errors return as an array, which crashes React Native's Alert.alert(). Added defensive parsing logic to map array errors into a readable string in both screens.


### [2026-07-23 16:44:40]
**User:** Reported a backend 422 error: 'body.date input should be None'.
**Agent:** Discovered a known edge case with Pydantic where naming a field the same as its imported type (date: Optional[date]) causes namespace shadowing, leading Pydantic to misinterpret the required type as NoneType. Aliased the import to datetime_date to fix it.


### [2026-07-23 17:02:16]
**User:** Requested adding 'Birds per Box' and 'Total Birds Count' to the New Sale page, behaving exactly like the Purchase page.
**Agent:** Executed full stack update: modified the SQLAlchemy model, ran an Alembic database migration (with default values to avoid constraints on existing rows), updated the FastAPI Pydantic schema, and implemented the UI and React useEffect auto-calculation in NewSaleScreen.tsx.

### [2026-07-24 09:42]
**User:** Requested to port the expense section from Duro_POS to the current project, excluding the branch allocation logic.
**Agent:** Investigated the database models, backend routing, and frontend UI logic from Duro_POS. Drafted an `implementation_plan.md` to recreate this functionality.
**User:** Rejected the use of the `tamil_name` field and requested to rewrite the plan. Also asked to generate a new Alembic migration for the database changes.
**Agent:** Revised the plan, stripping out `tamil_name`. Upon approval, executed the full stack implementation: updated the `ExpenseCategory` and `Expense` SQLAlchemy models with `sort_order`, `is_active`, `spent_at`, `cash_amount`, `upi_amount`, etc. Generated and ran an Alembic migration. Created `backend/app/api/routes/expenses.py` for API routes and wired it into `main.py`. Built `frontend_mobile/src/api/expenses.ts`. Built `ExpenseCategoriesScreen.tsx` (Admin category management) and `ExpensesScreen.tsx` (Daily entry logging). Wired these into `RootNavigator.tsx` and added Quick Actions on the `DashboardScreen.tsx`.

### [2026-07-24 10:03]
**User:** Encountered a 500 Internal Server Error when calling `/api/dashboard/stats`: `AttributeError: 'Expense' object has no attribute 'amount'`.
**Agent:** Identified that the Dashboard API route was referencing `e.amount` which had been renamed to `e.total_amount` in the updated `Expense` database model. Fixed the field reference in `dashboard.py` to restore the dashboard statistics.

### [2026-07-24 10:07]
**User:** Requested to replace the bottom-right tab with 'Expenses', and to add a navigation link to 'Categories' inside the Expenses screen.
**Agent:** Updated `RootNavigator.tsx` to replace the "More" tab with an "Expenses" tab, using a Receipt icon. Updated `ExpensesScreen.tsx` to include a "Categories" pill button in the top-right of the header for easy access to the category management screen.

### [2026-07-24 10:09]
**User:** Requested to remove the 'Sort Order' text box from the new expense category section and center it.
**Agent:** Removed the Sort Order `TextInput` and its display from the category list in `ExpenseCategoriesScreen.tsx`. Centered the modal title text (`New Category`/`Edit Category`) as requested.

### [2026-07-24 10:11]
**User:** Requested that the edit category and new category modals appear in the center instead of at the bottom.
**Agent:** Updated both `ExpenseCategoriesScreen.tsx` and `ExpensesScreen.tsx`. Changed the modal `animationType` to `fade`, updated the parent container to use `justify-center p-4`, and removed the `rounded-t-3xl` bottom docking in favor of standard centered `rounded-2xl` corners.

### [2026-07-24 10:45]
**User:** Requested to add update and delete capability for Purchases, Sales, and Expenses.
**Agent:** 
- Analyzed the backend and confirmed that Purchases and Sales require Ledger Reversal logic to keep `PaymentTransaction` and `Party.current_balance` in sync when an old bill is updated or deleted.
- Implemented `PUT` and `DELETE` endpoints in `purchases.py` and `sales.py` handling the complete reversal logic.
- Implemented `PUT` and `DELETE` endpoints for `expenses.py` (which are simpler and do not impact party ledger).
- Updated frontend UI: Wrapped Purchase and Sale list items in `TouchableOpacity` to pass `editData` to their respective "New" screens.
- Updated `NewPurchaseScreen.tsx` and `NewSaleScreen.tsx` to pre-fill from `editData`, modified the save button to call `PUT` (update) if in edit mode, and added a Trash icon to call `DELETE`.
- Updated `ExpensesScreen.tsx` to handle tapping on expense history to open the existing modal in Edit mode, added Update and Delete mutations, and hooked them to the UI.

### [2026-07-24 11:05]
**User:** Requested that tapping a bill opens a "Preview Mode" first, and to fix an issue where Cash and UPI payment fields show as 0 when editing.
**Agent:** 
- Discovered that `cash_payment` and `upi_payment` were missing from the `PurchaseBase` and `SaleBase` backend Pydantic schemas, so they were not being returned to the frontend. Added them to the schemas so they correctly pre-fill in the UI.
- Updated `NewPurchaseScreen.tsx` and `NewSaleScreen.tsx` to include an `isEditing` state. When opening a bill from history, the form is wrapped in `<View pointerEvents="none">` to make it read-only, and the bottom Save/Delete actions are hidden.
- Added an "Edit" button to the top header in Preview Mode to unlock the form for editing.

### [2026-07-24 11:34]
**User:** Reported that when tapping on an existing Sale bill, the Net Weight (kg) was showing as 0.
**Agent:** 
- Checked the `NewSaleScreen.tsx` code and discovered a typo where it was trying to read `editData?.net_weight` (which is the property name used in Purchases).
- Changed it to `editData?.weight` (the actual property name in the Sales schema) to correctly pre-fill the Net Weight field.

### [2026-07-24 11:40]
**User:** Posted a database row showing `weight` was actually saved as 0.00 in the database despite `weight_amount` being calculated correctly.
**Agent:** 
- Checked the `NewSaleScreen.tsx` mutation payload and discovered that it was sending `{ "net_weight": form.net_weight }` instead of `{ "weight": form.net_weight }`.
- Since the backend `SaleCreate` Pydantic schema didn't have a `net_weight` field, it dropped the value and defaulted `weight` to `0.0`.
- Changed the payload key from `net_weight` to `weight` in `NewSaleScreen.tsx` to fix this issue.

### [2026-07-24 11:45]
**User:** Pointed out that `birds_per_box` and `actual_birds` were also being saved as 0 in the database despite values being entered.
**Agent:** 
- Checked the `create_sale` endpoint in `sales.py` and found that `birds_per_box` and `actual_birds` were missing from the instantiation of the `Sale` database model.
- Added `birds_per_box=sale_in.birds_per_box` and `actual_birds=sale_in.actual_birds` to `db_sale = Sale(...)` in `sales.py` so the backend actually saves the frontend values to the database.

### [2026-07-24 11:58]
**User:** Requested to push all code to GitHub.
**Agent:** 
- Discovered that the root repo was trying to add `.git` subfolders from `backend/` and `frontend_mobile/` which caused Git to fail adding the files.
- Deleted the nested `.git` folders so they could be properly tracked by the root repository.
- Ran `git add .`, `git commit -m "Push all code"`, and `git push -u origin main`.
