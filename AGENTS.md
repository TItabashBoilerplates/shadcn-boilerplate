# Project Guidelines

Full-stack application boilerplate with multi-platform frontend and backend services.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend (Web)** | Next.js 16, React 19, TypeScript, Bun |
| **Frontend (Mobile)** | Expo 55, React Native, TypeScript |
| **UI (Web)** | shadcn/ui, Radix UI, TailwindCSS 4 |
| **UI (Mobile)** | gluestack-ui, NativeWind 5, TailwindCSS 4 |
| **State** | TanStack Query (server), Zustand (global) |
| **Architecture** | Feature Sliced Design (FSD) |
| **i18n** | next-intl (en, ja) |
| **Backend** | FastAPI (Python), Supabase Edge Functions (Deno) |
| **Database** | PostgreSQL, Drizzle ORM, pgvector |
| **Auth** | Supabase Auth |

## Commands (MANDATORY)

**ALWAYS use Makefile commands** for development tasks:

```bash
# Setup
make init              # Full project initialization

# Services
make run               # Start backend (Docker)
make frontend          # Start frontend dev server
make stop              # Stop all services

# Quality
make lint              # Lint all
make format            # Format all
make type-check        # Type check all
make ci-check          # CI checks (lint + format + type)

# Testing
make test              # Run all tests
make test-frontend     # Run frontend tests
make test-backend-py   # Run backend tests

# Database (user approval required)
make migrate-dev       # Generate + apply migration
make build-model       # Generate types only
```

**NEVER execute tools directly**:

```bash
# WRONG
cd frontend && bun run biome check --write
npx tsc --noEmit

# CORRECT
make lint-frontend
make type-check-frontend
```

---

## Core Policies (NON-NEGOTIABLE)

### 1. Research-First Development

**Before implementation, you MUST**:

1. Use **Context7 MCP** to fetch latest documentation
2. Use **WebSearch** to verify current best practices
3. Use **WebFetch** to read official documentation directly

**NEVER**:
- Make assumptions based on memory or general knowledge
- Use outdated patterns without verification
- Guess API signatures or parameter types

### 2. Test-Driven Development (TDD)

**MANDATORY workflow**:

1. **Write Tests First**: Define expected inputs/outputs before implementation
2. **Run Tests and Confirm Failure**: Verify tests fail (Red phase)
3. **Implement to Pass Tests**: Write minimal code (Green phase)
4. **Refactor if Needed**: Keep tests green

**All Green Policy**: Work MUST end with all tests passing (`make test`).

**NEVER**:
- Write implementation code before tests
- Modify tests to make them pass
- Leave failing tests at end of work

### 3. Supabase-First Architecture

**Priority order**:
1. **First**: `supabase-js` / `@supabase/ssr` from frontend
2. **Second**: Edge Functions (if necessary)
3. **Last Resort**: `backend-py` (only when required)

**Use backend-py ONLY for**:
- Complex database transactions
- AI/ML processing (LangChain, embeddings)
- Long-running background jobs
- Python-specific library requirements

### 4. Auto-Generated Files (DO NOT EDIT)

**NEVER manually edit**:
- `frontend/packages/types/schema.ts`
- `supabase/functions/shared/types/supabase/schema.ts`
- `backend-py/app/src/domain/entity/models.py`

**Correct workflow**: Edit `drizzle/schema/*.ts` → run `make migrate-dev`

### 5. Internationalization (i18n)

**ALL user-facing text MUST be internationalized**:

```typescript
// WRONG
<Button>Save</Button>

// CORRECT
<Button>{t('common.save')}</Button>
```

Both `en.json` and `ja.json` are required.

### 6. DateTime Handling

| Layer | Timezone | Format |
|-------|----------|--------|
| **Database** | UTC | `TIMESTAMP WITH TIME ZONE` |
| **API** | UTC | ISO 8601 string |
| **Frontend** | Convert UTC ⇔ Local | `toISOString()` / `Intl.DateTimeFormat` |

**Frontend is responsible for all timezone conversions**.

### 7. Storage Policy

**Default: Private buckets** (unless explicitly requested otherwise)

```typescript
// CORRECT: Use createSignedUrl for private files
const { data } = await supabase.storage
  .from('documents')
  .createSignedUrl('path/to/file.pdf', 60)

// WRONG: getPublicUrl on private bucket
const { data } = supabase.storage
  .from('documents')
  .getPublicUrl('path/to/file.pdf')
```

**RESTful path structure**: `{resource}/{id}/{sub-resource}/{filename}`

---

## Domain Documentation

| Domain | Documentation |
|--------|---------------|
| Frontend (Web) | [frontend/README.md](frontend/README.md) |
| Frontend (Mobile) | [frontend/apps/mobile/README.md](frontend/apps/mobile/README.md) |
| Backend Python | [backend-py/README.md](backend-py/README.md) |
| Database Schema | [drizzle/README.md](drizzle/README.md) |
| Edge Functions | [supabase/functions/README.md](supabase/functions/README.md) |

---

## Package Management

| Component | Package Manager |
|-----------|-----------------|
| Frontend Web | **Bun** |
| Frontend Mobile | **Bun** |
| Backend Python | **uv** |
| Drizzle | **Bun** |
| Edge Functions | **Deno** |

---

## Skills

Detailed guidance available in `.codex/skills/`:

- `fsd/` - Feature Sliced Design
- `drizzle/` - Drizzle ORM schema management
- `supabase/` - Supabase Auth, RLS, Storage
- `tanstack-query/` - TanStack Query v5
- `datetime/` - DateTime handling patterns
- `i18n/` - next-intl internationalization
- `shadcn-ui/` - shadcn/ui + TailwindCSS
