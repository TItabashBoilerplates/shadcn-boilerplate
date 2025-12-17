# Supabase クライアント設定ガイド

このドキュメントは Next.js で Supabase サーバーサイドクライアントを設定する方法を詳細に説明します。

**公式ドキュメント**: https://supabase.com/docs/guides/auth/server-side/creating-a-client

## @supabase/ssr パッケージの役割

`@supabase/ssr` は Next.js などのサーバーサイドフレームワークで Supabase を使用するための公式パッケージです。

### なぜ @supabase/ssr が必要か

```
問題: Next.js の Server Components は Cookie を書き込めない
解決: Middleware がプロキシとして Auth トークンをリフレッシュ
```

**Middleware の責務**:
1. `supabase.auth.getUser()` で Auth トークンをリフレッシュ
2. `request.cookies.set` で Server Components にトークンを渡す
3. `response.cookies.set` でブラウザに更新済みトークンを返す

## クライアントの種類

| クライアント | 関数 | 使用場所 |
|------------|------|---------|
| **Server Client** | `createServerClient()` | Server Components, Server Actions, Route Handlers, Middleware |
| **Browser Client** | `createBrowserClient()` | Client Components |

## ユーティリティファイルの作成

### 1. Browser Client (`client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@workspace/types/schema'

/**
 * Client Components 用 Supabase クライアント
 *
 * 特徴:
 * - シングルトンパターン（何度呼び出しても同じインスタンス）
 * - Cookie 管理は自動的に処理される
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
```

### 2. Server Client (`server.ts`)

```typescript
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@workspace/types/schema'
import { cookies } from 'next/headers'

/**
 * Server Components / Server Actions / Route Handlers 用クライアント
 *
 * Next.js 15+: cookies() は非同期関数のため await が必要
 */
export async function createClient() {
  // Next.js 15+: cookies() は Promise を返す
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Component からの Cookie 書き込みエラーは
          // Middleware がセッション更新を担当するため安全に無視
        }
      },
    },
  })
}
```

### 3. Middleware Client (`middleware.ts`)

```typescript
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@workspace/types/schema'
import type { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware 用セッション更新関数
 *
 * すべてのリクエストで Auth トークンをリフレッシュし、
 * Server Components とブラウザの両方に渡します。
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // リクエストに Cookie を設定（Server Components で利用可能に）
          request.cookies.set(name, value)
          // レスポンスに Cookie を設定（ブラウザへ送信）
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // 重要: セッショントークンをリフレッシュ
  // getUser() を使用してトークンの真正性を検証
  await supabase.auth.getUser()

  return response
}
```

## Middleware の設定

### next-intl との統合例

```typescript
// middleware.ts または proxy.ts
import createMiddleware from 'next-intl/middleware'
import { type NextRequest } from 'next/server'
import { routing } from './src/shared/config/i18n'
import { updateSession } from '@workspace/client-supabase/middleware'

const handleI18nRouting = createMiddleware(routing)

export default async function middleware(request: NextRequest) {
  // Step 1: next-intl のルーティング処理
  const response = handleI18nRouting(request)

  // Step 2: Supabase セッション更新
  return await updateSession(request, response)
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

## 認証メソッドの比較

### 🔐 セキュリティ階層

| メソッド | セキュリティ | 検証方法 | 推奨用途 |
|---------|-------------|---------|---------|
| `getUser()` | ✅ 高 | Auth サーバーで検証 | ページ保護、認証チェック |
| `getClaims()` | ✅ 高 | JWT 署名を公開鍵で検証 | ページ保護（ネットワーク不要） |
| `getSession()` | ⚠️ 低 | Cookie ベース（偽装可能） | Client Component でのUI更新のみ |

### getUser() vs getSession()

```typescript
// ✅ 安全: サーバーで検証
const { data: { user }, error } = await supabase.auth.getUser()

// ⚠️ 危険: Cookie 偽装のリスク（サーバーで信頼しない）
const { data: { session } } = await supabase.auth.getSession()
```

### getClaims() について

`getClaims()` は JWT 署名をプロジェクトの公開鍵に対して検証するため、`getSession()` より安全です。ネットワークリクエストなしで検証できるため、パフォーマンスにも優れています。

```typescript
// ✅ 安全: JWT 署名検証（ネットワーク不要）
const { data: claims, error } = await supabase.auth.getClaims()

if (claims) {
  const userId = claims.sub
  const email = claims.email
}
```

## Server Component での使用

```typescript
// views/dashboard/ui/DashboardPage.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@workspace/client-supabase/server'

export default async function DashboardPage() {
  await cookies() // キャッシュ無効化

  const supabase = await createClient()

  // ✅ getUser() でセキュアに認証チェック
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

## Server Action での使用

```typescript
// features/profile/api/actions.ts
'use server'

import { createClient } from '@workspace/client-supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update({ name: formData.get('name') })
    .eq('id', user.id)

  if (!error) revalidatePath('/profile')
}
```

## Route Handler での使用

```typescript
// app/api/user/route.ts
import { createClient } from '@workspace/client-supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ user })
}
```

## Client Component での使用

```typescript
'use client'

import { createClient } from '@workspace/client-supabase/client'

export function ProfileForm({ initialData }) {
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data, error } = await supabase
      .from('profiles')
      .update({ /* ... */ })
      .select()
      .single()
  }

  return <form onSubmit={handleSubmit}>{/* ... */}</form>
}
```

## 環境変数

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## よくある問題と解決策

### Cookie 書き込みエラー

Server Component から Cookie を書き込もうとするとエラーが発生します。これは Middleware が処理するため、`setAll` 内の try-catch で安全に無視できます。

```typescript
setAll(cookiesToSet) {
  try {
    for (const { name, value, options } of cookiesToSet) {
      cookieStore.set(name, value, options)
    }
  } catch {
    // Middleware がセッション更新を担当するため安全に無視
  }
}
```

### Next.js 15+ での非同期 cookies()

Next.js 15 以降、`cookies()` は非同期関数です。必ず `await` を使用してください。

```typescript
// ✅ Next.js 15+
const cookieStore = await cookies()

// ❌ Next.js 14 以前の書き方（15+ ではエラー）
const cookieStore = cookies()
```

### セッションが更新されない

Middleware が正しく設定されていることを確認してください。すべてのリクエストで `updateSession` が呼び出される必要があります。

## 参考リンク

- [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Next.js Server-Side Auth](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [@supabase/ssr Package](https://github.com/supabase/auth-helpers/tree/main/packages/ssr)
