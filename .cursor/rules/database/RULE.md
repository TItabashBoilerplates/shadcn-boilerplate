---
description: "Database schema standards for Drizzle ORM and RLS policies"
alwaysApply: false
globs: ["drizzle/**/*.ts"]
---
# Database Schema Standards

## ORM

- **Drizzle ORM** for schema
- **pgPolicy** for RLS

## Migration Policy (CRITICAL)

**自動マイグレーション禁止**

1. スキーマ編集: `drizzle/schema/*.ts`
2. ユーザーに確認依頼
3. ユーザーが `make migrate-dev` を実行

## Primary Key: UUID (MANDATORY)

```typescript
// CORRECT
id: uuid('id').primaryKey().defaultRandom()

// WRONG
id: serial('id').primaryKey()  // DO NOT USE
```

## AmbiguousForeignKeysError回避

同じテーブルへの複数FK参照を避ける:

```typescript
// WRONG: sqlacodegen エラーの原因
senderId: uuid('sender_id').references(() => users.id),
receiverId: uuid('receiver_id').references(() => users.id),

// CORRECT: 中間テーブルで分離
// または1つの参照のみ + 別テーブル
```

## RLS Policy (MANDATORY)

**ヘルパー関数禁止** - インラインSQLのみ

```typescript
// CORRECT
using: sql`(SELECT auth.uid()) = user_id`

// CORRECT: EXISTS subquery
using: sql`
  EXISTS (
    SELECT 1 FROM related_table
    WHERE related_table.owner_id = (SELECT auth.uid())
  )
`

// WRONG: Helper function
using: sql`is_owner(user_id)`  // DO NOT USE
```

