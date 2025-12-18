# Project Guidelines

Full-stack application boilerplate with multi-platform frontend and backend services.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Bun |
| UI | shadcn/ui, TailwindCSS 4 |
| Backend | FastAPI (Python), Supabase Edge Functions (Deno) |
| Database | PostgreSQL, Drizzle ORM |
| Auth | Supabase Auth |

## Commands

```bash
make init              # Full project initialization
make run               # Start backend (Docker)
make frontend          # Start frontend dev server
make lint              # Lint all
make format            # Format all
make type-check        # Type check all
make ci-check          # CI checks
```

## Core Policies

### TDD Required

Write tests BEFORE implementation. Red → Green → Refactor.

### Research-First

Verify APIs via documentation before implementation.

### Supabase-First

Frontend (supabase-js) → Edge Functions → backend-py

### Auto-Generated Files (DO NOT EDIT)

- `frontend/packages/types/schema.ts`
- `backend-py/app/src/domain/entity/models.py`

### i18n

All UI text via next-intl. Both en.json and ja.json required.

## Domain Documentation

- [Frontend](frontend/README.md) - Next.js 16, FSD, shadcn/ui
- [Backend Python](backend-py/README.md) - FastAPI, Clean Architecture
- [Database](drizzle/README.md) - Drizzle ORM, RLS policies
- [Edge Functions](supabase/functions/README.md) - Deno, Supabase
