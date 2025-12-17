---
paths: drizzle/**/*.ts, supabase/migrations/**/*.sql
---

# Database Migration Policy

**CRITICAL**: NEVER automatically execute database migrations without explicit user approval.

## Rules

1. **Schema Changes Only**: You may edit schema files (`drizzle/schema/schema.ts`, etc.)
2. **NO Automatic Migration**: Do NOT run `make migrate-dev`, `make migrate-deploy`, or `make migration`
3. **User Confirmation Required**: Always ask the user to review schema changes and execute migration commands manually

## Workflow

```bash
# ✅ Good: Proper workflow
# 1. Edit schema
vi drizzle/schema/schema.ts

# 2. Inform user
"スキーマを更新しました。以下のコマンドでマイグレーションを実行してください：
make migrate-dev"

# 3. User executes migration manually
# (Claude does NOT execute this)

# ❌ Bad: Automatic migration execution
# Claude runs make migrate-dev automatically - PROHIBITED
```

## Schema Design Rules (MANDATORY)

### Primary Key: UUID

**ALWAYS use UUID** for primary keys, not auto-increment integers.

```typescript
// ✅ Correct: UUID primary key
import { uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ...
})

// ❌ Wrong: Auto-increment integer
export const users = pgTable('users', {
  id: serial('id').primaryKey(),  // DO NOT USE
  // ...
})
```

### Benefits of UUID

1. **Security**: IDs are not guessable/sequential
2. **Distributed systems**: No collision when merging data
3. **Privacy**: Doesn't expose record count
4. **Supabase Auth**: Consistent with `auth.users.id` (UUID)

### Foreign Keys

```typescript
// ✅ Correct: UUID foreign key referencing auth.users
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => authUsers.id),
  // ...
})
```

---

## Type Generation (Allowed)

Type generation is allowed as it's a read-only operation:

```bash
# ✅ Allowed
make build-model-frontend   # Generate Supabase types
make build-model-functions  # Generate Edge Functions types
make build-model            # Generate all types

# ❌ Prohibited
make migrate-dev            # Includes migration execution
```

## Why This Policy Exists

- Database migrations are **irreversible** operations
- Schema changes affect **production data**
- User must review migration SQL before applying
- Prevents accidental data loss or corruption

## Enforcement

**Always ask the user for explicit approval before database operations.**
