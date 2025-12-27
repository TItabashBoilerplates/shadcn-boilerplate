---
name: drizzle
description: Drizzle ORM database schema management guidance. Use for table definitions, RLS policies (pgPolicy), migrations, and Supabase integration.
---

# Drizzle ORM

This project uses **Drizzle ORM** for database schema management.

## Directory Structure

```
drizzle/
├── drizzle.config.ts         # Drizzle Kit config
├── migrate.ts                # Custom SQL execution script
├── schema/
│   ├── schema.ts             # Main schema (tables + RLS)
│   ├── types.ts              # Enum definitions
│   └── index.ts              # Public API
├── config/
│   └── functions.sql         # Custom SQL (functions, triggers)
└── (migrations → supabase/migrations/)
```

## Table Definition

```typescript
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const generalUsers = pgTable('general_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountName: text('account_name').notNull().unique(),
  displayName: text('display_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow(),
}).enableRLS() // Enable RLS
```

## RLS Policy Definition

### Basic Pattern (in same file as table)

```typescript
import { pgPolicy } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Define RLS policies immediately after table
export const generalUsers = pgTable('general_users', {
  // ... column definitions
}).enableRLS()

// SELECT policy: Everyone can view
export const selectOwnUser = pgPolicy('select_own_user', {
  for: 'select',
  to: ['anon', 'authenticated'],
  using: sql`true`,
}).link(generalUsers)

// Edit policy: Own data only
export const editPolicyGeneralUsers = pgPolicy('edit_policy_general_users', {
  for: 'all',
  to: 'authenticated',
  using: sql`(select auth.uid()) = id`,
  withCheck: sql`(select auth.uid()) = id`,
}).link(generalUsers)
```

### Policy Parameters

| Parameter | Description | Values |
|-----------|-------------|--------|
| **for** | Operation type | `'select'`, `'insert'`, `'update'`, `'delete'`, `'all'` |
| **to** | Target role | `'anon'`, `'authenticated'`, array, `authenticatedRole` |
| **using** | Row visibility condition | `sql` tagged template |
| **withCheck** | INSERT/UPDATE validation | `sql` tagged template |

## Schema Change Workflow

```bash
# 1. Edit schema
vi drizzle/schema/schema.ts

# 2. Generate + apply migration (user approval required)
# Agent must NOT auto-execute - ask user to run:
make migrate-dev

# 3. Generate types
make build-model
```

**Important**: Migrations are destructive operations - agent should NOT auto-execute.

## DateTime Column Best Practice

```typescript
timestamp('created_at', {
  withTimezone: true,  // TIMESTAMP WITH TIME ZONE
  precision: 3,        // Millisecond precision (JS Date compatible)
}).notNull().defaultNow()
```
