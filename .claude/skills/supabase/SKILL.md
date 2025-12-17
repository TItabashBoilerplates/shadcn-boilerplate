---
name: supabase
description: Supabase統合ガイダンス。認証（getUser/getSession）、Server/Browserクライアント使い分け、RLSポリシー、Next.js統合についての質問に使用。セキュリティベストプラクティス、ハイドレーション対策の実装支援を提供。
---

# Supabase 統合スキル

このプロジェクトは Supabase を使用して認証・データベース・リアルタイム機能を提供しています。

## クライアントの種類

| クライアント | 使用場所 | インポート |
|-------------|---------|-----------|
| **Server Client** | Server Components, Server Actions | `@workspace/client-supabase/server` |
| **Browser Client** | Client Components | `@workspace/client-supabase/client` |
| **Native Client** | React Native | `@workspace/client-supabase/native` |

## 認証ベストプラクティス

### 重要: getUser() vs getSession()

```typescript
// ✅ 正しい: サーバーで認証検証
const { data: { user }, error } = await supabase.auth.getUser()

// ❌ 危険: Cookie偽装のリスク
const { data: { session } } = await supabase.auth.getSession()
```

**理由**:
- `getSession()`: Cookie ベース（偽装可能）
- `getUser()`: Supabase Auth サーバーで検証（安全）

## 実装パターン

### 認証付きページ（Server Component）

```typescript
// views/dashboard/ui/DashboardPage.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@workspace/client-supabase/server'

export default async function DashboardPage() {
  await cookies() // キャッシュ無効化

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return <Dashboard user={user} profile={data} />
}
```

### Client Component での操作

```typescript
'use client'
import { createClient } from '@workspace/client-supabase/client'

export function UserSettings({ userId }) {
  const supabase = createClient()

  const handleUpdate = async (updates) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ...
}
```

### リアルタイム購読（Client Component のみ）

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@workspace/client-supabase/client'

export function RealtimeMessages({ roomId }) {
  const [messages, setMessages] = useState([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [roomId])

  return <MessageList messages={messages} />
}
```

## RLS ポリシー設計

### パフォーマンス最適化

```sql
-- ✅ 推奨: SELECT でラップして関数結果をキャッシュ
create policy "select_own_data" on user_data
to authenticated
using ( (select auth.uid()) = user_id );

-- インデックスを追加
create index user_data_user_id_idx on user_data using btree (user_id);
```

### 基本パターン

```sql
-- 自分のデータのみ読み取り可能
create policy "Users read own data"
on profiles for select
to authenticated
using ( (select auth.uid()) = user_id );

-- 自分のデータのみ更新可能
create policy "Users update own data"
on profiles for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );
```

## ハイドレーションエラー対策

### 基本ルール

1. **Server Component**: 認証チェック後に redirect、条件付きUIは避ける
2. **Client Component**: `mounted` フラグを使用
3. **リアルタイム**: Client Component でのみ使用

```typescript
'use client'
export function AuthStatus() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    setMounted(true)
    // 認証状態取得
  }, [])

  if (!mounted) return null // ハイドレーション対策

  return user ? <UserInfo user={user} /> : <LoginButton />
}
```

## 使用マトリクス

| 機能 | コンポーネント | クライアント |
|------|--------------|-------------|
| 認証チェック | Server Component | Server Client + `getUser()` |
| 初期データ取得 | Server Component | Server Client |
| リアルタイム | Client Component | Browser Client |
| フォーム送信 | Server Action | Server Client |
| ユーザー操作 | Client Component | Browser Client |

詳細: [auth.md](auth.md), [rls.md](rls.md)
