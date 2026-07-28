# LedgerDesk Coding Rules & Constraints

## 1. Python Backend (FastAPI)
- **Type Hinting:** Strictly use type hints for all function arguments and return types.
- **Dependency Management:** Use `uv` for resolving and installing Python packages.
- **Database Safety:** Handle database sessions safely, using dependency injection (`Depends`) properly. Ensure `AsyncSession` is used for all transactions.
- **Migrations:** All database schema changes MUST be tracked using Alembic. Never modify tables manually without a migration.

## 2. Frontend (React Native & Web)
- **Language:** Write all components strictly in TypeScript (`.tsx`).
- **Mobile (Expo):** Use NativeWind for utility styling.
- **Web (React/Vite):** Use Tailwind CSS for utility styling.
- **State Management:** Use `React Query` for all API data fetching, caching, and mutation. Avoid heavy local component state for remote data. Use `Zustand` for global client state.
- **Architecture:** Follow functional component patterns with React Hooks.

## 3. Business Logic Constraints (Poultry Business)
**CRITICAL RULE: DO NOT OVERCOMPLICATE.**
- **No Multi-Tenancy:** This is a single-tenant system. Use standard `public` schemas. Authentication is required, but there is no Organization separation.
- **Real-Time Stock:** Inventory (Birds and Weight) must be calculated in real-time. Purchases strictly increase stock, Sales strictly decrease stock.
- **Payment & Ledgers:** Party (Customer/Supplier) maintains an `opening_balance` and `current_balance`. Bills increase/decrease balance. standalone payments via Cash or UPI are logged simply to adjust the `current_balance`.

## 4. System Operations & CI/CD
**CRITICAL RULE: REPOSITORY DISCIPLINE.**
- **No Unprompted Pushes:** NEVER push to git or trigger GitHub Actions unless the user EXPLICITLY asks you to.
- **Manual CI:** GitHub Actions should only be triggered manually.

## 5. Strict Documentation Preservation
**CRITICAL RULE: DO NOT ERASE HISTORY.**
- **Logging Mandate:** Every action, chat, and command must be appended to `SESSION_HISTORY.md` and `CHAT_LOG.md`.
- **Ideation:** All user features and conceptual thoughts must be added sequentially to `IDEA.md`.
- **Append Only:** When making architectural or database changes, append them to `ARCHITECTURE.md` and `DATA_MODELS.md` under a new timestamped header. Do not overwrite historical states.
