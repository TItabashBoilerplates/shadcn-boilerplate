---
name: supabase-test
description: supabase-test を使用したフロントエンドテストガイダンス。RLSポリシーテスト、TDD ワークフロー、Vitest + jsdom 設定、FSD api セグメントのテストパターンについての質問に使用。Supabase クライアントを使った実践的なテスト支援を提供。
---

# supabase-test スキル

このプロジェクトは **supabase-test** を使用して Supabase 連携のテストを行います。

## 概要

**supabase-test** は Supabase データベースと RLS ポリシーをテストするための TypeScript ファーストなライブラリです。

- **隔離されたテスト環境**: 各テストはトランザクション内で実行、自動ロールバック
- **ロールシミュレーション**: PostgreSQL ロール (`authenticated`, `anon`) を簡単に切り替え
- **JWT コンテキスト**: JWT claims を設定して RLS ポリシーをテスト
- **CI/CD 対応**: GitHub Actions と統合可能

## このガイドのアプローチ

**実践的アプローチ** を採用（公式の `db.query()` ではなく `@supabase/supabase-js` クライアントを使用）:

| アプローチ | 方法 | 用途 |
|-----------|------|------|
| 公式 | `db.query()` で SQL 直接実行 | スキーマ・RLS の単体テスト |
| **実践的（本ガイド）** | `@supabase/supabase-js` + supabase-test | **FSD api セグメントのテスト** |

**理由**: 実際のコードは `@supabase/supabase-js` を使用するため、テストも同様にすべき。

## セットアップ

### 1. インストール

```bash
cd frontend
bun add -d supabase-test
```

### 2. Vitest 設定

```typescript
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',  // 必須: localStorage サポート
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000,
  },
})
```

**`jsdom` が必須な理由**:
- `@supabase/supabase-js` は認証トークンを `localStorage` に保存
- Node.js 環境には `localStorage` がない
- `jsdom` でブラウザ環境をシミュレート

### 3. セットアップファイル

```typescript
// frontend/tests/setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { getConnections } from 'supabase-test'

let db
let teardown

beforeAll(async () => {
  ({ db, teardown } = await getConnections())
})

afterAll(() => teardown())
beforeEach(() => db.beforeEach())
afterEach(() => db.afterEach())

export { db }
```

### 4. Supabase ローカルスタック起動

```bash
npx supabase start
```

## FSD ディレクトリ構造

```
src/
├── entities/
│   └── user/
│       ├── api/
│       │   ├── userApi.ts          # Supabase API 実装
│       │   └── userApi.test.ts     # テスト
│       ├── model/
│       └── ui/
└── features/
    └── authentication/
        ├── api/
        │   ├── authApi.ts
        │   └── authApi.test.ts
        └── ...
```

## TDD ワークフロー

### 1. Red（失敗するテストを書く）

```typescript
// src/entities/user/api/userApi.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/tests/setup'
import { getUserProfile } from './userApi'
import crypto from 'crypto'

describe('User API - RLS Policy Tests', () => {
  const userId = crypto.randomUUID()

  beforeEach(async () => {
    await db.query(`
      INSERT INTO users (id, account_name, display_name)
      VALUES ($1, 'testuser', 'Test User')
    `, [userId])
  })

  it('authenticated user can fetch own profile', async () => {
    db.setContext({
      role: 'authenticated',
      'jwt.claims.sub': userId
    })

    const profile = await getUserProfile(userId)

    expect(profile).toBeDefined()
    expect(profile.user_id).toBe(userId)
  })
})
```

### 2. Green（最小限の実装）

```typescript
// src/entities/user/api/userApi.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}
```

### 3. Refactor（改善）

```typescript
export async function getUserProfile(userId: string) {
  if (!userId) throw new Error('User ID is required')

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('User profile not found')
    }
    throw error
  }

  return data
}
```

## RLS ポリシーテスト要件

**必須テストケース**:

1. **全操作**: SELECT, INSERT, UPDATE, DELETE
2. **全ロール**: `anon`, `authenticated`
3. **正常系**: 成功すべき操作
4. **異常系**: 拒否されるべき操作

### 包括的な RLS テスト例

```typescript
describe('User API - RLS Policy Tests', () => {
  const userId1 = crypto.randomUUID()
  const userId2 = crypto.randomUUID()

  beforeEach(async () => {
    await db.query(`
      INSERT INTO users (id, account_name, display_name)
      VALUES ($1, 'user1', 'User One'), ($2, 'user2', 'User Two')
    `, [userId1, userId2])

    await db.query(`
      INSERT INTO user_profiles (user_id, bio, avatar_url)
      VALUES ($1, 'Bio 1', 'https://example.com/1.jpg'),
             ($2, 'Bio 2', 'https://example.com/2.jpg')
    `, [userId1, userId2])
  })

  describe('SELECT policy', () => {
    it('authenticated user can fetch own profile', async () => {
      db.setContext({ role: 'authenticated', 'jwt.claims.sub': userId1 })
      const profile = await getUserProfile(userId1)
      expect(profile.user_id).toBe(userId1)
    })

    it('authenticated user can fetch other user profile (public info)', async () => {
      db.setContext({ role: 'authenticated', 'jwt.claims.sub': userId1 })
      const profile = await getUserProfile(userId2)
      expect(profile.user_id).toBe(userId2)
    })

    it('anonymous user cannot fetch profile', async () => {
      db.setContext({ role: 'anon' })
      await expect(getUserProfile(userId1)).rejects.toThrow()
    })
  })

  describe('UPDATE policy', () => {
    it('authenticated user can update own profile', async () => {
      db.setContext({ role: 'authenticated', 'jwt.claims.sub': userId1 })
      const updated = await updateUserProfile(userId1, { bio: 'Updated bio' })
      expect(updated.bio).toBe('Updated bio')
    })

    it('authenticated user cannot update other user profile', async () => {
      db.setContext({ role: 'authenticated', 'jwt.claims.sub': userId1 })
      await expect(
        updateUserProfile(userId2, { bio: 'Hacked!' })
      ).rejects.toThrow(/row-level security policy/)
    })
  })
})
```

## Admin クライアント（フィクスチャ用）

```typescript
import { createClient } from '@supabase/supabase-js'

// RLS をバイパスする Admin クライアント
const adminClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }  // 重要: セッション永続化を無効化
)

beforeEach(async () => {
  // Admin クライアントでテストデータをセットアップ
  await adminClient.from('users').insert([
    { id: userId1, name: 'Alice' },
    { id: userId2, name: 'Bob' }
  ])
})
```

## テスト実行コマンド

```bash
cd frontend

# 全テスト実行
bun test

# ウォッチモード
bun test:watch

# 特定ファイル
bun test src/entities/user/api/userApi.test.ts

# カバレッジ
bun test --coverage
```

## トラブルシューティング

### localStorage エラー

```
ReferenceError: localStorage is not defined
```

**解決策**: `vitest.config.ts` で `environment: 'jsdom'` を設定

### Service Role クライアントがユーザーセッションを取得

```typescript
// 問題: Service Role クライアントが通常ユーザーのセッションを取得
// 解決策: セッション永続化を無効化
const adminClient = createClient(url, serviceKey, {
  auth: { persistSession: false }
})
```

### テストが遅い

- `testTimeout` を適切に設定（デフォルト 10000ms）
- 各テストで独立した UUID を使用
- 不要なデータベースクエリを削減

## ベストプラクティス

1. **テスト分離**: `crypto.randomUUID()` で一意の ID を使用
2. **RLS エラー検証**: 拒否ケースで正しいエラーメッセージを確認
3. **クライアント分離**: Admin（Service Role）と User クライアントを分ける
4. **フィクスチャデータ**: Admin クライアントで RLS をバイパスしてセットアップ
