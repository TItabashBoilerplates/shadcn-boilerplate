---
name: drizzle
description: Drizzle ORM によるデータベーススキーマ管理ガイダンス。テーブル定義、RLSポリシー（pgPolicy）、マイグレーション、Supabase統合についての質問に使用。スキーマ変更ワークフロー、型生成の実装支援を提供。
---

# Drizzle ORM スキル

このプロジェクトは **Drizzle ORM** でデータベーススキーマを管理しています。

## ディレクトリ構成

```
drizzle/
├── drizzle.config.ts         # Drizzle Kit 設定
├── migrate.ts                # カスタムSQL実行スクリプト
├── schema/
│   ├── schema.ts             # メインスキーマ（テーブル + RLS）
│   ├── types.ts              # Enum 定義
│   └── index.ts              # Public API
├── config/
│   └── functions.sql         # カスタムSQL（関数・トリガー）
└── (migrations → supabase/migrations/)
```

## テーブル定義

```typescript
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountName: text('account_name').notNull().unique(),
  displayName: text('display_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow(),
}).enableRLS() // RLS 有効化
```

## RLS ポリシー定義

### 基本パターン（テーブルと同じファイルに配置）

```typescript
import { pgPolicy } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// テーブル定義の直後にRLSポリシーを定義
export const users = pgTable('users', {
  // ... カラム定義
}).enableRLS()

// SELECT ポリシー: 全員閲覧可能
export const selectOwnUser = pgPolicy('select_own_user', {
  for: 'select',
  to: ['anon', 'authenticated'],
  using: sql`true`,
}).link(users)

// 編集ポリシー: 自分のデータのみ
export const editPolicyUsers = pgPolicy('edit_policy_users', {
  for: 'all',
  to: 'authenticated',
  using: sql`(select auth.uid()) = id`,
  withCheck: sql`(select auth.uid()) = id`,
}).link(users)
```

### Supabase 組み込みロールの使用

```typescript
import { authenticatedRole, serviceRole } from 'drizzle-orm/supabase'

export const insertPolicy = pgPolicy('authenticated_insert', {
  for: 'insert',
  to: authenticatedRole,
  withCheck: sql`(select auth.uid()) = user_id`,
}).link(myTable)
```

### ポリシーパラメータ

| パラメータ | 説明 | 値 |
|-----------|------|-----|
| **for** | 操作タイプ | `'select'`, `'insert'`, `'update'`, `'delete'`, `'all'` |
| **to** | 対象ロール | `'anon'`, `'authenticated'`, 配列, `authenticatedRole` |
| **using** | 行の可視性条件 | `sql` タグ付きテンプレート |
| **withCheck** | INSERT/UPDATE の検証条件 | `sql` タグ付きテンプレート |

## スキーマ変更ワークフロー

```bash
# 1. スキーマ編集
vi drizzle/schema/schema.ts

# 2. マイグレーション生成 + 適用（ユーザー承認が必要）
# ⚠️ Claude は自動実行禁止 - ユーザーに以下を依頼:
make migrate-dev

# 3. 型生成
make build-model
```

**重要**: マイグレーションは破壊的操作のため、Claude は自動実行しません。

## Enum 定義

```typescript
// schema/types.ts
import { pgEnum } from 'drizzle-orm/pg-core'

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'inactive',
  'suspended',
])

// schema/schema.ts で使用
import { userStatusEnum } from './types'

export const users = pgTable('users', {
  status: userStatusEnum('status').notNull().default('active'),
})
```

## カスタムSQL（functions.sql）

```sql
-- drizzle/config/functions.sql

-- pgvector 拡張
CREATE EXTENSION IF NOT EXISTS vector;

-- Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- カスタム関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 型生成

```bash
# Frontend 用 Supabase 型
make build-model-frontend

# Edge Functions 用（Drizzle スキーマもコピー）
make build-model-functions
```

### Edge Functions での使用

Edge Functions で Drizzle ORM と PostgreSQL を使用する場合：

**deno.json 設定（必須）**:
```json
{
  "imports": {
    "drizzle-orm": "npm:drizzle-orm@^0.44.7",
    "drizzle-orm/": "npm:drizzle-orm@^0.44.7/",
    "postgres": "https://deno.land/x/postgresjs@v3.4.8/mod.js"
  }
}
```

**IMPORTANT**: postgres.js は `deno.land/x` からの最新版 `v3.4.8` を使用すること。`npm:postgres` は Deno 環境で互換性問題が発生する可能性がある。

**型のみ使用する場合**:
```typescript
// supabase/functions/example/index.ts
import type { InferSelectModel } from 'drizzle-orm'
import { users } from '../shared/drizzle/index.ts'

type User = InferSelectModel<typeof users>
```

**クエリ実行する場合**:
```typescript
// supabase/functions/shared/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './drizzle/index.ts'

const connectionString = Deno.env.get('SUPABASE_DB_URL')!
const client = postgres(connectionString, { prepare: false })
export const db = drizzle(client, { schema })

// supabase/functions/example/index.ts
import { db } from '../shared/db.ts'
import { users } from '../shared/drizzle/index.ts'
import { eq } from 'drizzle-orm'

const result = await db.select().from(users).where(eq(users.id, userId))
```

## 日時カラムのベストプラクティス

```typescript
timestamp('created_at', {
  withTimezone: true,  // TIMESTAMP WITH TIME ZONE
  precision: 3,        // ミリ秒精度（JSのDateと互換）
}).notNull().defaultNow()
```

詳細: [rls.md](rls.md), [migrations.md](migrations.md)
