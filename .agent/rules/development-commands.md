# Development Commands

## Initial Setup

```bash
make init                    # Full project initialization (run once)
```

## Running Services

```bash
make run                     # Start backend services with Docker
make frontend                # Start frontend (web) development server
make stop                    # Stop all services
```

## Lint & Format

```bash
# Frontend (Biome)
make lint-frontend           # Biome lint (auto-fix)
make lint-frontend-ci        # Biome lint (CI mode, no fixes)
make format-frontend         # Biome format (auto-fix)
make format-frontend-check   # Biome format check (check only)
make type-check-frontend     # TypeScript type checking

# Drizzle (Biome)
make lint-drizzle            # Biome lint (auto-fix)
make lint-drizzle-ci         # Biome lint (CI mode, no fixes)
make format-drizzle          # Biome format (auto-fix)
make format-drizzle-check    # Biome format check (check only)

# Backend Python (Ruff + MyPy)
make lint-backend-py         # Ruff lint (auto-fix)
make lint-backend-py-ci      # Ruff lint (CI mode, no fixes)
make format-backend-py       # Ruff format (auto-fix)
make format-backend-py-check # Ruff format check (check only)
make type-check-backend-py   # MyPy type checking (strict mode)

# Edge Functions (Deno)
make lint-functions          # Deno lint
make format-functions        # Deno format (auto-fix)
make format-functions-check  # Deno format check (check only)
make check-functions         # Deno type checking (auto-detect all functions)

# Integrated Commands (Recommended)
make lint                    # Lint all (Frontend + Drizzle + Backend Python + Edge Functions)
make format                  # Format all (auto-fix)
make format-check            # Format check all (CI mode)
make type-check              # Type check all
make ci-check                # All CI checks (lint + format + type)
```

## Database Operations

```bash
# Development Migration
make migrate-dev           # Generate + apply migration + type generation (local only)
make migration             # Alias for migrate-dev

# Production Migration Apply
make migrate-deploy        # Apply migration files (all environments)
ENV=staging make migrate-deploy    # Staging environment
ENV=production make migrate-deploy # Production environment

# Type Generation (usually included in migrate-dev)
make build-model           # Generate Supabase types and SQLModel
```

## Model Generation

```bash
make build-model-frontend  # Generate Supabase types for frontend
make build-model-functions # Generate types + copy Drizzle schema for Edge Functions
```

**Generated for Edge Functions**:

- `supabase/functions/shared/types/supabase/schema.ts` - Supabase TypeScript types
- `supabase/functions/shared/drizzle/` - Drizzle schema (TypeScript)

## Frontend Development

```bash
cd frontend
bun run dev                 # Next.js web development (Turbo)
bun run build              # Build all packages
bun run lint               # Run Biome lint (auto-fix)
bun run format             # Format code with Biome
bun run type-check         # TypeScript type checking
```

## Backend Development (Python)

Backend follows clean architecture with strict separation of concerns:

- Controllers handle HTTP requests/responses only
- Use cases contain business logic
- Gateways provide data access interfaces
- Infrastructure handles external dependencies

Code quality tools:

- Ruff for linting (line length: 88)
- MyPy for type checking (strict mode)
- Maximum function complexity: 3 (McCabe)

## Edge Functions Development

Edge Functions use Deno's native `Deno.serve` API for serverless API development:

- Built with Deno runtime for TypeScript support
- Native `Deno.serve` API for lightweight, efficient serverless functions
- Each function should have a `deno.json` with import map configuration
- **IMPORTANT**: Use `npm:` prefix for npm package imports by default
  - Do not use JSR (`jsr:`) unless there's a specific reason
  - Example: `"@supabase/supabase-js": "npm:@supabase/supabase-js@^2"`
- Type-safe integration with Supabase client and database schema
- Proper error handling with TypeScript type guards (`error instanceof Error`)

### Using Drizzle Schema in Edge Functions

You can use Drizzle schema directly in Edge Functions:

```typescript
// supabase/functions/example/index.ts
import type { InferSelectModel, InferInsertModel } from "npm:drizzle-orm";
import { generalUsers, generalUserProfiles } from "../shared/drizzle/index.ts";

// Infer types
type User = InferSelectModel<typeof generalUsers>;
type NewUser = InferInsertModel<typeof generalUsers>;
type UserProfile = InferSelectModel<typeof generalUserProfiles>;

Deno.serve(async (req) => {
  const user: User = {
    id: crypto.randomUUID(),
    displayName: "John Doe",
    accountName: "johndoe",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return new Response(JSON.stringify({ user }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**Benefits**:

- TypeScript type safety
- Types auto-update when schema changes (when running `make build-model`)
- Can use both Supabase-generated types and Drizzle types

**→ For detailed Edge Functions documentation, see [`supabase/functions/README.md`](../../supabase/functions/README.md)**
