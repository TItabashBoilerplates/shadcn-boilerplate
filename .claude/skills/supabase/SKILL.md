---
name: supabase
description: Supabase統合ガイダンス。認証（getUser/getSession）、Server/Browserクライアント使い分け、RLSポリシー、Next.js統合についての質問に使用。セキュリティベストプラクティス、ハイドレーション対策の実装支援を提供。
---

# Supabase SSR/CSR ベストプラクティス

このドキュメントは Next.js で Supabase を使用する際の公式推奨パターンを記述しています。

## 公式リファレンス

| ドキュメント | URL |
|-------------|-----|
| **Creating a Supabase Client for SSR** | https://supabase.com/docs/guides/auth/server-side/creating-a-client |
| **Next.js Server-Side Auth** | https://supabase.com/docs/guides/auth/server-side/nextjs |
| **@supabase/ssr パッケージ** | https://github.com/supabase/auth-helpers/tree/main/packages/ssr |
| **Auth Helpers Migration Guide** | https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers |

---

## @supabase/ssr パッケージの概要

`@supabase/ssr` は Next.js などのサーバーサイドフレームワークで Supabase を使用するための**公式パッケージ**です。

### なぜ @supabase/ssr が必要か

```
問題: Next.js の Server Components は Cookie を書き込めない
解決: Middleware がプロキシとして Auth トークンをリフレッシュ
```

**アーキテクチャ**:
1. ブラウザがリクエストを送信
2. **Middleware** が Auth トークンをリフレッシュ（`getUser()` 呼び出し）
3. `request.cookies.set()` で Server Components にトークンを渡す
4. `response.cookies.set()` でブラウザに更新済みトークンを返す
5. Server Components は読み取り専用で Cookie を参照

---

## クライアントの種類

| クライアント | 関数 | 使用場所 | Cookie 書き込み |
|------------|------|---------|----------------|
| **Browser Client** | `createBrowserClient()` | Client Components | 自動 |
| **Server Client** | `createServerClient()` | Server Components, Server Actions, Route Handlers | try-catch で無視 |
| **Middleware Client** | `createServerClient()` | Middleware | 必須（リクエスト＆レスポンス両方） |

---

## 認証メソッドのセキュリティ階層

### 重要: getUser() vs getSession() vs getClaims()

| メソッド | セキュリティ | 検証方法 | 推奨用途 |
|---------|-------------|---------|---------|
| `getUser()` | **高** | Auth サーバーで JWT を検証 | ページ保護、認証チェック（**推奨**） |
| `getClaims()` | **高** | JWT 署名を公開鍵でローカル検証 | ページ保護（ネットワーク不要） |
| `getSession()` | **低** | Cookie ベース（偽装可能） | Client Component での UI 更新のみ |

### 公式の警告

> **Security Warning**: `getSession()` loads values directly from storage (local storage, cookies). These values may not be authentic. **Do NOT trust** `getSession()` for authorization on the server. Use `getUser()` or `getClaims()` instead.

```typescript
// ✅ 正しい: サーバーで認証検証（Auth サーバーに問い合わせ）
const { data: { user }, error } = await supabase.auth.getUser()

// ✅ 正しい: JWT 署名をローカル検証（ネットワーク不要）
const { data: claims, error } = await supabase.auth.getClaims()

// ❌ 危険: Cookie 偽装のリスク（サーバーで信頼しない）
const { data: { session } } = await supabase.auth.getSession()
```

### getClaims() の使用例

`getClaims()` は JWT 署名をプロジェクトの公開鍵に対してローカルで検証するため、ネットワークリクエストなしで安全に認証情報を取得できます。

```typescript
const { data: claims, error } = await supabase.auth.getClaims()

if (claims) {
  const userId = claims.sub        // ユーザーID
  const email = claims.email       // メールアドレス
  const aal = claims.aal           // Assurance Level (MFA)
}
```

---

## Proxy の設定（CRITICAL）

> **Next.js 16 Breaking Change**: `middleware.ts` は `proxy.ts` に、`middleware()` は `proxy()` にリネームされました。

### なぜ Proxy が必須か

1. **トークンリフレッシュ**: 期限切れの Auth トークンを自動更新
2. **Cookie 同期**: Server Components とブラウザ間で Cookie を同期
3. **認証状態の維持**: すべてのリクエストで認証状態を最新に保つ

### マイグレーション（Next.js 15 → 16）

```bash
# 自動マイグレーション
npx @next/codemod@canary middleware-to-proxy .

# または手動で
mv middleware.ts proxy.ts
# 関数名を middleware → proxy に変更
```

### 公式推奨の実装

```typescript
// utils/supabase/middleware.ts (ユーティリティは名前維持OK)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Step 1: リクエストに Cookie を設定（Server Components で利用可能に）
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Step 2: 新しいレスポンスを作成
          supabaseResponse = NextResponse.next({ request })
          // Step 3: レスポンスに Cookie を設定（ブラウザへ送信）
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ⚠️ CRITICAL: createServerClient と getUser() の間にコードを入れないこと
  // 間にコードがあると、ランダムにログアウトする問題のデバッグが困難になる

  // ⚠️ IMPORTANT: auth.getUser() を削除しないこと
  const { data: { user } } = await supabase.auth.getUser()

  // 認証されていないユーザーをリダイレクト
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ⚠️ IMPORTANT: supabaseResponse をそのまま返すこと
  // 新しい NextResponse.next() を作成する場合は:
  // 1. request を渡す: NextResponse.next({ request })
  // 2. Cookie をコピーする
  return supabaseResponse
}
```

### Proxy 本体（Next.js 16）

```typescript
// proxy.ts (Next.js 16: middleware.ts → proxy.ts)
import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// Next.js 16: middleware() → proxy()
export function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - 画像ファイル
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### next-intl との統合（Next.js 16）

```typescript
// proxy.ts
import createMiddleware from 'next-intl/middleware'
import { type NextRequest } from 'next/server'
import { routing } from './src/shared/config/i18n'
import { updateSession } from '@workspace/client-supabase/middleware'

const handleI18nRouting = createMiddleware(routing)

// Next.js 16: default export も可
export default async function proxy(request: NextRequest) {
  // Step 1: next-intl のルーティング処理
  const response = handleI18nRouting(request)

  // Step 2: Supabase セッション更新
  return await updateSession(request, response)
}
```

---

## Server Client の実装

### ユーティリティ関数

```typescript
// utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()  // Next.js 15+: 非同期

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component からの Cookie 書き込みエラーは
            // Middleware がセッション更新を担当するため安全に無視
          }
        },
      },
    }
  )
}
```

### Server Component での使用

```typescript
// app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  // ✅ getUser() でセキュアに認証チェック
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // ✅ RLS で保護されたデータを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return <Dashboard user={user} profile={profile} />
}
```

### Server Action での使用

```typescript
// app/actions.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  // ✅ Server Action でも getUser() を使用
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      name: formData.get('name') as string
    })
    .eq('user_id', user.id)

  if (error) throw error

  revalidatePath('/profile')
}
```

### Route Handler での使用

```typescript
// app/api/user/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ user })
}
```

---

## Browser Client の実装

### ユーティリティ関数

```typescript
// utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

### Client Component での使用

```typescript
'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export function ProfileForm({ userId }: { userId: string }) {
  const supabase = createClient()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      setProfile(data)
    }
    fetchProfile()
  }, [userId])

  const handleUpdate = async (formData: FormData) => {
    const { error } = await supabase
      .from('profiles')
      .update({ name: formData.get('name') })
      .eq('user_id', userId)

    if (!error) {
      // 成功時の処理
    }
  }

  return <form action={handleUpdate}>{/* ... */}</form>
}
```

### リアルタイム購読（Client Component のみ）

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export function RealtimeMessages({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [roomId, supabase])

  return <MessageList messages={messages} />
}
```

---

## ハイドレーションエラー対策

### 問題

Server と Client で異なる HTML がレンダリングされると、ハイドレーションエラーが発生します。

### 解決策

#### 1. Server Component: 認証チェック後に redirect

```typescript
// ✅ 正しい: Server Component でリダイレクト
export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')  // 条件付き UI ではなくリダイレクト

  return <Dashboard user={user} />
}
```

#### 2. Client Component: mounted フラグを使用

```typescript
'use client'

export function AuthStatus() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setMounted(true)
    // 認証状態を取得
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])

  // ハイドレーション対策: マウント前は何もレンダリングしない
  if (!mounted) return null

  return user ? <UserInfo user={user} /> : <LoginButton />
}
```

#### 3. Suspense を活用

```typescript
// ✅ 推奨: Suspense で非同期データをラップ
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <AuthenticatedContent />
    </Suspense>
  )
}
```

---

## 使用マトリクス

| 機能 | コンポーネント | クライアント | 認証メソッド |
|------|--------------|-------------|-------------|
| 認証チェック | Server Component | Server Client | `getUser()` |
| 初期データ取得 | Server Component | Server Client | `getUser()` |
| フォーム送信 | Server Action | Server Client | `getUser()` |
| API ルート | Route Handler | Server Client | `getUser()` |
| リアルタイム | Client Component | Browser Client | - |
| ユーザー操作 | Client Component | Browser Client | - |
| UI 状態表示 | Client Component | Browser Client | `getSession()` (UI のみ) |

---

## Cookie 管理の注意点

### Next.js 15+ での非同期 cookies()

```typescript
// ✅ Next.js 15+: await が必要
const cookieStore = await cookies()

// ❌ Next.js 14 以前の書き方（15+ ではエラー）
const cookieStore = cookies()
```

### Server Component での Cookie 書き込みエラー

Server Component から Cookie を書き込もうとするとエラーが発生しますが、Middleware がセッション更新を担当するため、`setAll` 内の try-catch で安全に無視できます。

```typescript
setAll(cookiesToSet) {
  try {
    cookiesToSet.forEach(({ name, value, options }) =>
      cookieStore.set(name, value, options)
    )
  } catch {
    // Middleware がセッション更新を担当するため安全に無視
  }
}
```

---

## セキュリティベストプラクティス

### 1. サーバーサイドでは必ず getUser() を使用

```typescript
// ✅ サーバーサイド認証
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) {
  // 認証エラー処理
}
```

### 2. RLS ポリシーと併用

```sql
-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view own data"
ON profiles FOR SELECT
TO authenticated
USING ( (SELECT auth.uid()) = user_id );
```

### 3. MFA (Multi-Factor Authentication) の検証

```sql
-- MFA 完了ユーザーのみ更新可能
CREATE POLICY "Require MFA for updates"
ON profiles AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING ( (SELECT auth.jwt()->>'aal') = 'aal2' );
```

---

## 環境変数

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

---

## 詳細ガイド

| トピック | ファイル | 内容 |
|---------|---------|------|
| クライアント設定 | [client-setup.md](client-setup.md) | @supabase/ssr、Cookie 管理、Middleware |
| ストレージ | [storage.md](storage.md) | バケット設計、パスプレフィックス、RLS |
| RLS パフォーマンス | [rls-advanced.md](rls-advanced.md) | 最適化テクニック、security definer |
| Realtime 認証 | [realtime.md](realtime.md) | Private Channel、realtime.messages RLS |

---

## よくある間違い

### ❌ Proxy で getUser() を省略

```typescript
// ❌ 間違い: getUser() を呼び出さない
export async function updateSession(request: NextRequest) {
  const supabase = createServerClient(/* ... */)
  // getUser() がない → トークンがリフレッシュされない
  return NextResponse.next()
}
```

### ❌ Server Component で getSession() を信頼

```typescript
// ❌ 間違い: サーバーで getSession() を認証に使用
const { data: { session } } = await supabase.auth.getSession()
if (session) {
  // Cookie が偽装されている可能性がある
}
```

### ❌ createServerClient と getUser() の間にコード

```typescript
// ❌ 間違い: 間にコードを入れる
const supabase = createServerClient(/* ... */)

// ここにコードを入れると、ランダムにログアウトする問題のデバッグが困難
const someData = await fetchSomething()

const { data: { user } } = await supabase.auth.getUser()
```

### ❌ Next.js 16 で middleware.ts を使用

```typescript
// ❌ 間違い: Next.js 16 では middleware.ts は非推奨
// middleware.ts
export function middleware(request: NextRequest) { ... }

// ✅ 正しい: proxy.ts を使用
// proxy.ts
export function proxy(request: NextRequest) { ... }
```

---

## ストリーミングレスポンス時の注意

Server Actions や Route Handlers でストリーミングレスポンスを返す場合、Cookie の設定タイミングに注意が必要です。

```typescript
// ⚠️ ストリーミング時は Cookie 設定が完了してからストリームを開始
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Cookie 設定が完了した後にストリームを返す
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  })
}
```
