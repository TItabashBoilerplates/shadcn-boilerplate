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

### AmbiguousForeignKeysError の回避 (sqlacodegen)

`sqlacodegen` で SQLModel を自動生成する際、**同じテーブルへの複数の外部キー参照**があると `AmbiguousForeignKeysError` が発生する。

**原因**: sqlacodegen Issue [#376](https://github.com/agronholm/sqlacodegen/issues/376)（未解決）
**発生箇所**: `make run` 時の SQLModel 自動生成 (`backend-py/app/src/domain/entity/models.py`)

#### 問題のあるパターン

```typescript
// ❌ Wrong: 同じテーブルへの複数の外部キー参照
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  senderId: uuid('sender_id').references(() => users.id),
  receiverId: uuid('receiver_id').references(() => users.id),
})
// → sqlacodegen が relationship 生成時にどの FK を使うか判断できずエラー
```

#### 推奨パターン A: 中間テーブルで分離

```typescript
// ✅ Correct: 役割ごとに中間テーブルを作成
export const messageSenders = pgTable('message_senders', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => messages.id),
  userId: uuid('user_id').references(() => users.id),
})

export const messageReceivers = pgTable('message_receivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => messages.id),
  userId: uuid('user_id').references(() => users.id),
})
```

#### 推奨パターン B: 単一参照に限定

```typescript
// ✅ Correct: 同じテーブルへの参照は1つのみ
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id').references(() => users.id), // 1つだけ
})

// 受信者は別テーブルで管理
export const messageRecipients = pgTable('message_recipients', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => messages.id),
  userId: uuid('user_id').references(() => users.id),
})
```

#### やむを得ず複数参照が必要な場合

```typescript
// ⚠️ 注意: sqlacodegen でエラーの可能性あり
// backend-py 側で手動対応が必要になる場合がある
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdBy: uuid('created_by').references(() => users.id),
  updatedBy: uuid('updated_by').references(() => users.id),
})
```

---

## RLS Policy Design Rules (MANDATORY)

### No Helper Functions

**NEVER create PostgreSQL helper functions for RLS policies.**
All RLS logic MUST be defined inline within `drizzle/schema/*.ts` using `pgPolicy`.

```typescript
// ✅ Correct: Inline SQL in pgPolicy
export const selectOwnUser = pgPolicy('select_own_user', {
  for: 'select',
  to: 'authenticated',
  using: sql`(SELECT auth.uid()) = id`,
}).link(users)

// ✅ Correct: EXISTS subquery for related table checks
export const selectPolicyMessages = pgPolicy('select_policy_messages', {
  for: 'select',
  to: 'authenticated',
  using: sql`
    EXISTS (
      SELECT 1
      FROM user_chats
      WHERE user_chats.chat_room_id = messages.chat_room_id
      AND user_chats.user_id = (SELECT auth.uid())
    )
  `,
}).link(messages)

// ❌ Wrong: Using helper functions
CREATE FUNCTION is_owner(user_id uuid) RETURNS boolean AS $$
  SELECT user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

export const selectPolicy = pgPolicy('select_policy', {
  for: 'select',
  using: sql`is_owner(user_id)`,  // DO NOT USE helper functions
}).link(myTable)
```

### Why No Helper Functions?

1. **Single Source of Truth**: All RLS logic is visible in `drizzle/schema/`
2. **Version Control**: Policies are tracked with schema changes
3. **Debugging**: No hidden function logic to trace
4. **Migration Safety**: Functions require separate management and can become orphaned
5. **Transparency**: Security logic is explicit and reviewable

### RLS Definition Location

| Component | Location |
|-----------|----------|
| Table definition | `drizzle/schema/*.ts` |
| RLS enablement | `.enableRLS()` on table |
| Policy definition | `pgPolicy(...)` in same file |
| Policy linking | `.link(tableName)` |

### Common Patterns

```typescript
// Pattern 1: Direct user ID comparison
using: sql`(SELECT auth.uid()) = user_id`

// Pattern 2: EXISTS with related table
using: sql`
  EXISTS (
    SELECT 1 FROM related_table
    WHERE related_table.id = current_table.foreign_id
    AND related_table.owner_id = (SELECT auth.uid())
  )
`

// Pattern 3: Service role only (admin operations)
to: 'supabase_auth_admin',
withCheck: sql`true`

// Pattern 4: Public read access
to: ['anon', 'authenticated'],
using: sql`true`
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
