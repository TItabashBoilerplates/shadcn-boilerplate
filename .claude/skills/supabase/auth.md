# Supabase OAuth 認証ガイド

このドキュメントは Next.js で Supabase Auth の OAuth 認証（GitHub など）を実装する方法を説明します。

**公式ドキュメント**: https://supabase.com/docs/guides/auth/social-login/auth-github

## OAuth フローの概要

Supabase Auth の OAuth は PKCE（Proof Key for Code Exchange）フローを使用します。

```
[ユーザー] → [アプリ signInWithOAuth] → [GitHub 認証画面]
    → [Supabase Auth /auth/v1/callback] → [アプリ /api/auth/callback]
    → [exchangeCodeForSession] → [ホーム画面]
```

---

## 1. GitHub OAuth App の設定

### GitHub での設定手順

1. GitHub → Settings → Developer settings → OAuth Apps
2. 「New OAuth App」をクリック
3. 以下を入力：
   - **Application name**: 任意のアプリ名
   - **Homepage URL**: `http://localhost:3000`（開発環境）
   - **Authorization callback URL**: `http://127.0.0.1:54321/auth/v1/callback`

4. 「Register application」をクリック
5. **Client ID** をコピー
6. 「Generate a new client secret」をクリックし、**Client Secret** をコピー

> **CRITICAL**: Authorization callback URL は `http://127.0.0.1:54321/auth/v1/callback` です。
> - `/v1/` が必要
> - これは Supabase Auth のエンドポイント（アプリではない）
> - ローカル開発では `127.0.0.1` と `localhost` は異なるので注意

---

## 2. Supabase 設定（config.toml）

### 環境変数の設定

```bash
# env/secrets.env
SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=your_client_id
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=your_client_secret
```

### config.toml の設定

```toml
# supabase/config.toml

[auth]
enabled = true
site_url = "http://127.0.0.1:3000"

# CRITICAL: exact match なのでコールバックパスを含む完全なURLが必要
additional_redirect_urls = [
  "http://127.0.0.1:3000/api/auth/callback",
  "http://localhost:3000/api/auth/callback",
]

[auth.external.github]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET)"
```

### additional_redirect_urls の重要なルール

| ルール | 説明 |
|--------|------|
| **Exact Match** | 完全一致が必要。`http://localhost:3000` だけでは `/api/auth/callback` にリダイレクトできない |
| **パス込み** | コールバックルートのパスを含む完全な URL を指定 |
| **複数ホスト** | `127.0.0.1` と `localhost` は別ホストとして扱われる |
| **プロトコル** | `http://` と `https://` は別として扱われる |

---

## 3. コールバックルートの実装

### 配置場所

```
app/
└── api/
    └── auth/
        └── callback/
            └── route.ts   ← ここに配置
```

> **IMPORTANT**: OAuth コールバック処理に locale は不要です。
> - ❌ `app/[locale]/auth/callback/route.ts`
> - ✅ `app/api/auth/callback/route.ts`

### 実装コード

```typescript
// app/api/auth/callback/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient as createClient } from '@/shared/lib/supabase'

/**
 * OAuth Callback Route Handler
 *
 * Supabase Auth からリダイレクトされ、認証コードをセッションと交換する
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // next パラメータが外部 URL の場合はルートにリダイレクト（セキュリティ対策）
  const redirectPath = next.startsWith('/') ? next : '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 環境に応じてリダイレクト先を決定
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectPath}`)
      }

      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
      }

      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  // エラー時はログインページにリダイレクト
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
```

### exchangeCodeForSession の役割

1. URL パラメータの `code` を取得
2. Supabase Auth サーバーに送信してセッショントークンと交換
3. Cookie にセッションを保存
4. ユーザーをホーム画面にリダイレクト

---

## 4. Server Action での OAuth 開始

### 実装コード

```typescript
// features/auth/api/signInWithGitHub.ts
'use server'

import { headers } from 'next/headers'
import { createServerClient as createClient } from '@/shared/lib/supabase'

/**
 * GitHub OAuth 認証を開始し、リダイレクト URL を返す
 */
export async function signInWithGitHub() {
  const supabase = await createClient()
  const headersList = await headers()

  // IMPORTANT: Server Action では origin ヘッダーが空のことが多い
  // host ヘッダーからプロトコル付きで構築する
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      // CRITICAL: この URL は additional_redirect_urls に含まれている必要がある
      redirectTo: `${origin}/api/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.url) {
    return { error: 'Failed to get redirect URL' }
  }

  return { redirectUrl: data.url }
}
```

### origin 取得の注意点

| ヘッダー | Server Action での値 | 注意 |
|----------|---------------------|------|
| `origin` | 通常 `null` | クロスオリジンリクエスト時のみ設定される |
| `x-forwarded-host` | ホスト名のみ | プロトコルを含まない（例: `localhost:3000`） |
| `host` | ホスト名のみ | プロトコルを含まない（例: `localhost:3000`） |

**解決策**: `host` ヘッダー + 環境に応じたプロトコルで構築

```typescript
const host = headersList.get('host') ?? 'localhost:3000'
const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
const origin = `${protocol}://${host}`
```

---

## 5. Client Component でのボタン実装

```typescript
// features/auth/ui/GitHubLoginButton.tsx
'use client'

import { useActionState } from 'react'
import { signInWithGitHub } from '../api/signInWithGitHub'
import { Button } from '@workspace/ui/web/components/button'

export function GitHubLoginButton() {
  const [state, action, isPending] = useActionState(
    async () => {
      const result = await signInWithGitHub()

      if ('redirectUrl' in result) {
        // GitHub 認証画面にリダイレクト
        window.location.href = result.redirectUrl
      }

      return result
    },
    null
  )

  return (
    <form action={action}>
      <Button type="submit" disabled={isPending} variant="outline">
        {isPending ? 'Redirecting...' : 'Sign in with GitHub'}
      </Button>
      {state && 'error' in state && (
        <p className="text-destructive text-sm mt-2">{state.error}</p>
      )}
    </form>
  )
}
```

---

## 6. 他の OAuth プロバイダー

### 対応プロバイダー一覧

```toml
# supabase/config.toml で設定可能なプロバイダー
# apple, azure, bitbucket, discord, facebook, github, gitlab,
# google, keycloak, linkedin_oidc, notion, twitch, twitter,
# slack, spotify, workos, zoom
```

### Google の例

```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
```

```typescript
// signInWithGoogle.ts
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${origin}/api/auth/callback`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
})
```

---

## トラブルシューティング

### よくあるエラーと解決策

| エラー | 原因 | 解決策 |
|--------|------|--------|
| `redirect_uri is not associated with this application` | GitHub OAuth App の callback URL が間違い | `http://127.0.0.1:54321/auth/v1/callback` を設定 |
| `/?code=xxx` にリダイレクトされる | `additional_redirect_urls` に完全な URL がない | コールバックパスを含む完全な URL を追加 |
| `refresh_token_not_found` | ログイン前に Middleware で getUser() が呼ばれている | 正常な動作（無視可能） |
| origin が空文字列 | Server Action で `headers().get('origin')` が null | `host` ヘッダーからプロトコル付きで構築 |
| http/https の不一致 | プロトコルが一致していない | 開発環境は `http`、本番は `https` |
| localhost vs 127.0.0.1 | ホスト名が一致していない | 両方を `additional_redirect_urls` に追加 |

### 設定変更後の反映

Supabase の設定（`config.toml`）を変更したら、再起動が必要です：

```bash
make stop && make run
```

### デバッグ方法

1. **ブラウザの Network タブ**でリダイレクトチェーンを確認
2. **Server Action にログ追加**して `redirectTo` の値を確認
3. **Supabase Dashboard**（http://127.0.0.1:54323）で Auth 設定を確認

---

## 本番環境での設定

### 環境変数

```bash
# 本番用
SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=prod_client_id
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=prod_client_secret
```

### config.toml（本番）

```toml
[auth]
site_url = "https://your-domain.com"
additional_redirect_urls = [
  "https://your-domain.com/api/auth/callback",
]
```

### GitHub OAuth App（本番）

本番用に別の OAuth App を作成し、Authorization callback URL を設定：

```
https://your-project-ref.supabase.co/auth/v1/callback
```
