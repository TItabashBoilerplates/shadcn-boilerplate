# Drizzle ORM Schema Management

TypeScript-first database schema management with Drizzle ORM, integrated with Supabase migrations.

## Overview

This project uses **Drizzle ORM** for declarative schema management with the following key features:

- **TypeScript-based schema** definitions
- **Declarative RLS policies** co-located with table definitions
- **Automatic type inference** for type-safe database operations
- **Supabase migration integration** (migrations stored in `supabase/migrations/`)
- **Programmatic custom SQL execution** (pgvector, triggers, functions)

## Tech Stack

- **ORM**: Drizzle ORM 0.44.7
- **Database**: PostgreSQL (via Supabase)
- **Driver**: postgres 3.4.7
- **Package Manager**: Bun
- **Code Quality**: Biome (linting & formatting)

## Project Structure

```
drizzle/
├── schema/
│   ├── schema.ts          # Main schema (tables, RLS, constraints)
│   ├── types.ts           # Enum definitions
│   └── index.ts           # Public API (exports)
├── config/
│   └── functions.sql      # Custom SQL (pgvector, triggers, auth hooks)
├── drizzle.config.ts      # Drizzle Kit configuration
├── migrate.ts             # Custom SQL execution script
├── package.json           # Drizzle-specific dependencies
├── tsconfig.json          # TypeScript configuration
└── biome.json             # Linting/formatting configuration
```

## Schema Structure

### Tables

This project manages the following database tables:

1. **organizations** - Corporate organizations
2. **corporateUsers** (RLS) - Corporate users with row-level security
3. **generalUsers** (RLS) - General users with authentication
4. **generalUserProfiles** (RLS) - User profile information
5. **addresses** (RLS) - User addresses
6. **chatRooms** (RLS) - Chat rooms (PRIVATE/GROUP types)
7. **messages** (RLS + check constraints) - Chat messages
8. **userChats** (RLS) - User-chat room relationships
9. **virtualUsers** - AI virtual users
10. **virtualUserChats** - Virtual user-chat room relationships
11. **virtualUserProfiles** - Virtual user profiles
12. **embeddings** (pgvector) - AI embeddings (1536 dimensions)

### RLS Policies

All Row Level Security policies are **co-located with table definitions** in `schema/schema.ts`.

#### Example: generalUsers RLS

```typescript
// Table definition
export const generalUsers = pgTable('general_users', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name').notNull(),
  accountName: text('account_name').notNull().unique(),
  // ... other columns
}).enableRLS()

// RLS policies (immediately following table definition)
export const insertPolicyGeneralUsers = pgPolicy('insert_policy_general_users', {
  for: 'insert',
  to: 'supabase_auth_admin',
  withCheck: sql`true`,
}).link(generalUsers)

export const selectOwnUser = pgPolicy('select_own_user', {
  for: 'select',
  to: ['anon', 'authenticated'],
  using: sql`true`,
}).link(generalUsers)

export const editPolicyGeneralUsers = pgPolicy('edit_policy_general_users', {
  for: 'all',
  to: 'authenticated',
  using: sql`(SELECT auth.uid()) = id`,
  withCheck: sql`(SELECT auth.uid()) = id`,
}).link(generalUsers)
```

#### RLS Policy Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `for` | `'select'`, `'insert'`, `'update'`, `'delete'`, `'all'` | Operation type |
| `to` | Role name(s) (array or string) | Target role(s) |
| `using` | `sql` template | Condition for viewing/editing existing rows |
| `withCheck` | `sql` template | Condition for inserting/updating new rows |

#### Complex RLS Example

```typescript
// Messages: Only visible to users who are members of the chat room
export const selectPolicyMessages = pgPolicy('select_policy_messages', {
  for: 'select',
  to: 'authenticated',
  using: sql`
    EXISTS (
      SELECT 1
      FROM user_chats
      JOIN general_users ON user_chats.user_id = general_users.id
      WHERE user_chats.chat_room_id = messages.chat_room_id
      AND general_users.id = (SELECT auth.uid())
    )
  `,
}).link(messages)
```

## Development Workflow

### Local Development (Recommended)

```bash
# 1. Edit schema
vi drizzle/schema/schema.ts

# 2. Generate migration + Apply + Generate types (all-in-one)
make migrate-dev
# or shorthand
make migration

# 3. Review generated migration
cat supabase/migrations/0000_*.sql

# 4. Commit changes
git add supabase/migrations/
git commit -m "Add new feature schema"
```

### Direct Schema Commands

```bash
cd drizzle

# Generate migration files
bun run generate

# Apply migrations to local database
bun run migrate

# Validate schema
bun run check

# Launch Drizzle Studio (GUI)
bun run studio

# Execute custom SQL (functions.sql)
bun run migrate:custom
```

### Remote Environment (CI/CD or Manual)

```bash
# 1. Pull latest migrations
git pull

# 2. Apply migrations to remote environment
ENV=staging make migrate-deploy
# or for production
ENV=production make migrate-deploy
```

## Type Inference

Drizzle ORM provides **automatic type inference** for type-safe database operations.

### Generated Types

All tables export both SELECT and INSERT types:

```typescript
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { generalUsers, chatRooms, messages } from './schema'

// SELECT types (existing records)
export type GeneralUser = InferSelectModel<typeof generalUsers>
export type ChatRoom = InferSelectModel<typeof chatRooms>
export type Message = InferSelectModel<typeof messages>

// INSERT types (new records)
export type NewGeneralUser = InferInsertModel<typeof generalUsers>
export type NewChatRoom = InferInsertModel<typeof chatRooms>
export type NewMessage = InferInsertModel<typeof messages>
```

### Usage Example

```typescript
import { generalUsers, type GeneralUser, type NewGeneralUser } from '@/drizzle'

// Type-safe insert
const newUser: NewGeneralUser = {
  id: crypto.randomUUID(),
  displayName: 'John Doe',
  accountName: 'johndoe',
  // TypeScript will enforce all required fields
}

// Type-safe select
const users: GeneralUser[] = await db.select().from(generalUsers)
```

## Custom SQL Management

Custom SQL (pgvector extension, triggers, functions) is managed in `drizzle/config/functions.sql` and executed **programmatically** via `migrate.ts`.

### functions.sql Contents

1. **pgvector extension**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **CUID-like ID generation function**
   ```sql
   CREATE OR REPLACE FUNCTION generate_cuid()
   RETURNS TEXT
   -- Generates unique IDs using sha256 + random + timestamp
   ```

3. **Auth hook function**
   ```sql
   CREATE OR REPLACE FUNCTION handle_new_user()
   RETURNS TRIGGER
   -- Auto-inserts into general_users when auth.users receives new user
   ```

4. **Auth hook trigger**
   ```sql
   CREATE TRIGGER auth_hook
   AFTER INSERT ON auth.users
   FOR EACH ROW
   EXECUTE FUNCTION handle_new_user();
   ```

### Programmatic Execution

Custom SQL is automatically executed after migrations via `migrate.ts`:

```typescript
// drizzle/migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import { readFileSync } from 'fs'

const client = postgres(process.env.DATABASE_URL)
const db = drizzle(client)

// Read and execute custom SQL
const customSql = readFileSync('drizzle/config/functions.sql', 'utf-8')
await db.execute(sql.raw(customSql))
```

**Execution Timing**:
- `make migrate-dev` - Runs after local migration
- `make migrate-deploy` - Runs after remote migration (all environments)

**Benefits**:
- No dependency on `psql` CLI
- Type-safe execution with TypeScript
- Unified error handling
- Simpler environment variable management

## Configuration

### drizzle.config.ts

```typescript
export default defineConfig({
  schema: './schema/index.ts',       // Schema entry point
  out: '../supabase/migrations',     // Migration output (Supabase integration)
  dialect: 'postgresql',             // PostgreSQL dialect
  dbCredentials: {
    url: process.env.DATABASE_URL!,  // Database connection URL
  },
  schemaFilter: ['public'],          // Only manage 'public' schema
  verbose: true,                     // Debug output
  strict: true,                      // Strict mode
})
```

### Environment Variables

Create `.env` file in the `drizzle/` directory:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

## Migration Management

### Migration Files

- **Location**: `supabase/migrations/`
- **Format**: `YYYYMMDDHHMMSS_description.sql`
- **Generation**: Automatic via Drizzle Kit
- **Version Control**: Committed to Git

### Migration Workflow

1. **Development**: `make migrate-dev` generates and applies migration locally
2. **Review**: Check generated SQL in `supabase/migrations/`
3. **Commit**: Add migration file to Git
4. **Deploy**: `make migrate-deploy` applies to remote environments

### Rollback Strategy

Drizzle doesn't support automatic rollback. To rollback:

1. Delete the problematic migration file
2. Create a new migration with inverse changes
3. Apply the new migration

## pgvector Integration

This project uses **pgvector** for vector similarity search (AI embeddings).

### Embeddings Table

```typescript
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)'
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value)
  },
})

export const embeddings = pgTable('embeddings', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  userId: uuid('user_id')
    .notNull()
    .references(() => generalUsers.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow(),
})
```

### Usage

```typescript
// Insert embedding
await db.insert(embeddings).values({
  userId: 'user-uuid',
  content: 'Sample text',
  embedding: [0.1, 0.2, ...], // 1536 dimensions
})

// Similarity search (requires custom SQL or raw query)
const similar = await db.execute(sql`
  SELECT content
  FROM embeddings
  WHERE user_id = ${userId}
  ORDER BY embedding <-> ${queryEmbedding}::vector
  LIMIT 10
`)
```

## Code Quality

### Linting and Formatting

```bash
# Lint (auto-fix)
bun run lint

# Lint (CI mode, no fix)
bun run lint:ci

# Format (auto-fix)
bun run format

# Format check
bun run format-check
```

### Biome Configuration

- **Indentation**: 2 spaces
- **Line Width**: 100 characters
- **Quote Style**: Single quotes
- **Semicolons**: As needed

## Best Practices

### Schema Organization

1. **Co-locate RLS policies** with table definitions
2. **Use TypeScript enums** for database enums (`types.ts`)
3. **Export types** using `InferSelectModel` and `InferInsertModel`
4. **Document complex policies** with comments

### RLS Policy Design

1. **Start restrictive** - Only allow what's necessary
2. **Use auth.uid()** for user-specific checks
3. **Test policies** before deploying to production
4. **Document JOIN-based policies** for clarity

### Migration Strategy

1. **Generate migrations locally** before deploying
2. **Review migration SQL** before committing
3. **Test migrations** on staging environment first
4. **Never edit migration files** after committing

### Type Safety

1. **Always use inferred types** instead of manual type definitions
2. **Import types from schema** rather than duplicating
3. **Leverage TypeScript strict mode** for compile-time safety

## Troubleshooting

### Migration Generation Fails

```bash
# Check schema validation
cd drizzle
bun run check

# Ensure DATABASE_URL is set
echo $DATABASE_URL
```

### RLS Policy Not Working

1. Verify `.enableRLS()` is called on the table
2. Check policy conditions with `SELECT` queries
3. Test with `SET LOCAL ROLE` in psql

### Type Generation Issues

```bash
# Regenerate types
make build-model

# For frontend types specifically
make build-model-frontend

# For Edge Functions types specifically
make build-model-functions
```

### Custom SQL Fails

```bash
# Run custom SQL manually
cd drizzle
bun run migrate:custom

# Check syntax in functions.sql
cat drizzle/config/functions.sql
```

## Integration with Other Services

### Frontend Integration

Frontend uses Supabase-generated types (not Drizzle types directly):

```bash
make build-model-frontend
```

Generated at: `frontend/packages/types/api/schema.ts`

### Edge Functions Integration

Edge Functions can use **both** Supabase types and Drizzle schemas:

```bash
make build-model-functions
```

Generated at:
- `supabase/functions/shared/types/supabase/schema.ts` (Supabase types)
- `supabase/functions/shared/drizzle/` (Drizzle schemas copied)

Usage in Edge Functions:

```typescript
import type { InferSelectModel } from 'npm:drizzle-orm'
import { generalUsers } from '../shared/drizzle/index.ts'

type User = InferSelectModel<typeof generalUsers>
```

### Backend Python Integration

Backend Python uses **SQLModel** generated from database (not Drizzle):

```bash
cd backend-py/app
sqlacodegen postgresql://... > src/domain/entity/models.py
```

## Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)

For project-specific guidelines, see `/CLAUDE.md` in the project root.
