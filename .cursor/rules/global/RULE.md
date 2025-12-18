---
description: "Project-wide rules for tech stack, commands, and architecture policies"
alwaysApply: true
globs: []
---
# Project Global Rules

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Bun
- Backend: FastAPI (Python), Supabase Edge Functions (Deno)
- Database: PostgreSQL, Drizzle ORM
- Auth: Supabase Auth

## Commands

Always use Makefile commands:

- `make lint` / `make format` / `make type-check`
- Never run tools directly

## Auto-Generated Files (DO NOT EDIT)

- frontend/packages/types/schema.ts
- backend-py/app/src/domain/entity/models.py

## i18n

- All UI text via next-intl
- Both en.json and ja.json required

## Supabase-First

- Prefer supabase-js for data operations
- Use Edge Functions only when necessary
