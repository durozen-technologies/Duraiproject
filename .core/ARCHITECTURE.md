# BROILER 360 Architecture

## Architectural Changes Log
*Note: Each time the architecture changes, append the change in this section with a timestamp. NEVER overwrite the historical architecture.*

### [2026-07-21] Initial BROILER 360 Architecture Tracking

## Application Type
Single-tenant B2B application for Poultry Business Management (Wholesalers, Farms, Chicken Shops). Supports both Android Mobile (primary) and Desktop/Web (for office use).

## Stack Overview
- **Frontend (Mobile)**: React Native (Expo)
  - UI Styling: NativeWind / Tailwind CSS
  - State/Data Management: React Query, Zustand
  - Navigation: Expo Router / React Navigation
- **Frontend (Web)**: React
  - UI Styling: Tailwind CSS
  - Framework: Vite
- **Backend**: Python (FastAPI)
  - ORM: SQLAlchemy (Async)
  - Migrations: Alembic
  - Authentication: JWT (Single-tenant login)
- **Database**: PostgreSQL
  - Schema: Standard `public` schema.
- **CI/CD**: GitHub Actions
  - Workflows: Automated Android APK builds and web deployment

## Code Files & Folders Structure

```text
Layer-Brolier (Root)
├── .agents/
│   ├── .env
│   └── AGENTS.md
├── .core/
│   ├── ADMIN_PLAN.md
│   ├── AGENT_COMMANDS.md
│   ├── ARCHITECTURE.md
│   ├── CHAT_LOG.md
│   ├── DATA_MODELS.md
│   ├── IDEA.md
│   ├── RULES.md
│   ├── SESSION_HISTORY.md
│   └── TEST_CREDENTIALS.md
├── backend/          # FastAPI Python Backend
├── frontend_mobile/  # Expo React Native App
└── frontend_web/     # Vite React App (Planned)
```
