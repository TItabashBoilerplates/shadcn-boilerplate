# マイクロフロントエンド運用（Vercel Microfrontends）

このドキュメントは、`frontend/` モノレポの **Web を Vercel Microfrontends（マネージド製品）でマイクロフロントエンドとして運用する**ための正本ガイドです。**管理者アプリ（admin）とメインアプリ（web）で認証・認可を分離する**構造を、単一ドメイン合成の中でどう維持するかまで含めて解説します。

> **調査の出典**: このドキュメントの構成・API・制約はすべて一次情報に基づきます。詳細な調査ログ（バージョン実測値・引用付き）は [`docs/_research/2026-07-07-vercel-microfrontends.md`](../../../docs/_research/2026-07-07-vercel-microfrontends.md) を参照してください。

---

## 🎯 採用方針（決定事項）

| 項目 | 決定 |
| --- | --- |
| **合成方式** | **Vercel Microfrontends（マネージド）** — `@vercel/microfrontends` + `microfrontends.json` + `withMicrofrontends` |
| **ドメイン** | **単一ドメイン**でパスベース合成（`/` = web、`/admin` = admin） |
| **認証・認可の分離** | **Supabase の cookie 名（= storageKey）をアプリ別にスコープ**して web / admin のセッションを物理的に分離。認可も各アプリ独立 |
| **`basePath`** | **使わない**（Vercel Microfrontends は `basePath` 非対応）。パス割り当ては `microfrontends.json` の `routing.paths` で行う |
| **各アプリのデプロイ** | それぞれ**独立した Vercel project** として個別ビルド・デプロイ・ロールバック |

> **なぜこの構成か**: 単一ドメイン配下で `/admin` を合成しつつ、Vercel のネットワークレベルルーティング（追加ホップなし）・Instant Rollback 連動・prefetch 最適化といった **Vercel Services の恩恵を最大限**受けられる。認証は Supabase の cookie 名分離で確実にアプリ間を切り離す。

> **代替案について**: サブドメイン分離（`admin.example.com`）や素の Next.js Multi-Zones も選択肢としては成立します（比較は調査レポート §5 を参照）。本リポジトリは上表の Vercel Microfrontends 構成を**既定の方針**として採用します。強い分離要件が新たに出た場合のみサブドメイン分離への切り替えを検討してください。

---

## 📐 全体像

```
                         ┌───────────────────────────────┐
   単一ドメイン           │      Vercel Edge Network        │
   example.com  ────────▶│  microfrontends.json を読んで    │
                         │  パスで各 project にルーティング   │
                         └───────────────┬───────────────┘
                        /                                 /admin/*
                        ▼                                 ▼
             ┌────────────────────┐            ┌────────────────────┐
             │  apps/web           │            │  apps/admin         │
             │  = default app      │            │  = child app        │
             │  Vercel project:web │            │  Vercel project:    │
             │                     │            │  admin              │
             │  cookie:            │            │  cookie:            │
             │  sb-<ref>-auth-token│            │  sb-admin           │
             └─────────┬───────────┘            └──────────┬──────────┘
                       │                                    │
                       └───────── 共有パッケージ ───────────┘
                          @workspace/ui / types / query /
                          client-supabase / auth …（packages/*）
```

- **web = default application**: `microfrontends.json` を保持し、他のどの child にもマッチしないリクエストをすべて受ける。
- **admin = child application**: `/admin/*` にマッチしたリクエストのみを受ける。**自身は basePath なしのルート `/` で実装**し、`/admin` への割り当ては `microfrontends.json` 側で行う。
- **共有コード**は従来どおり `packages/*`（`@workspace/*`）。マイクロフロントエンド化しても FSD とパッケージ共有の責務分担は不変（[architecture.md](./architecture.md) / [design-principles.md](./design-principles.md)）。

---

## 1. Vercel Microfrontends セットアップ

> 出典: [Getting started](https://vercel.com/docs/microfrontends/quickstart) / [Configuration](https://vercel.com/docs/microfrontends/configuration) / [Path routing](https://vercel.com/docs/microfrontends/path-routing) / [Local development](https://vercel.com/docs/microfrontends/local-development)

### 前提

- **Vercel project が 2 つ以上**（web と admin）、同一の microfrontends group に所属していること。
- group は CLI（`vercel microfrontends create-group`）または Dashboard の Settings → Microfrontends から作成し、**default application に web** を指定する。
- Hobby / Pro とも **Included Projects は 2** なので、main + admin なら無料枠に収まる。

### 1.1 `microfrontends.json`（default app = web のルートに置く）

`microfrontends.json` は **default app（web）にのみ**置く。application 名は **Vercel project 名と一致**させる（不一致なら `packageName` で `package.json` の名前を橋渡し）。

```jsonc
// frontend/apps/web/microfrontends.json
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json",
  "applications": {
    // default app（routing を書かない = 他にマッチしない全部を受ける）
    "web": {
      "development": {
        "fallback": "your-web-app.vercel.app"
      }
    },
    // child app: /admin/* のみを admin project にルーティング
    "admin": {
      "packageName": "@workspace/admin",
      "routing": [{ "paths": ["/admin/:path*"] }]
    }
  }
}
```

- **path 式**: `/:path`（1 セグメント）/ `/prefix/:path*`（0+）/ `/prefix/:path+`（1+）/ `/:path(a|b)` など。**パスは各アプリで一意**（web と admin が同じパスを出すと衝突する）。
- **assetPrefix は自動**: `withMicrofrontends` が `/vc-ap-<hash>` を自動付与するため、JS/CSS の配線は不要。`public/` 配下の静的ファイルを人間可読なパスで出したい場合のみ application に `"assetPrefix"` を明示。

### 1.2 `@vercel/microfrontends` を各アプリに導入

**すべての MFE アプリ**（web / admin 両方）にインストールする。パッケージ追加は ni 経由（`.claude/CLAUDE.md` の ni ポリシー）。

```bash
# 各アプリのディレクトリで
cd frontend/apps/web   && ni @vercel/microfrontends
cd frontend/apps/admin && ni @vercel/microfrontends
```

### 1.3 `next.config` に `withMicrofrontends` を巻く

各 Next.js アプリの `next.config` を `withMicrofrontends` でラップする。本リポジトリの web は既に `next-intl` プラグインを使っているので、**両プラグインを合成**する:

```ts
// frontend/apps/web/next.config.ts
import { withMicrofrontends } from '@vercel/microfrontends/next/config'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/shared/config/i18n/request.ts')

const nextConfig: NextConfig = {}

// next-intl → microfrontends の順で合成
export default withMicrofrontends(withNextIntl(nextConfig))
```

- **`basePath` は設定しない**（Vercel Microfrontends 非対応）。`/admin` への割り当ては `microfrontends.json` の `routing.paths` が担う。
- App Router + Pages Router 混在時のみ `withMicrofrontends(config, { supportPagesRouter: true })`。本リポジトリは App Router のみなので不要。

### 1.4 ローカル開発（Turborepo 統合プロキシ）

`@vercel/microfrontends` は **1 つの MFE だけローカルで動かし、他は production fallback にルートする** local proxy を提供する。本リポジトリは Turborepo を使っているため統合が効く（turbo 2.3.6 / 2.4.2 以降）。

- `dev` スクリプトのポートを proxy と同期させる:
  ```jsonc
  // frontend/apps/web/package.json（および admin）
  "scripts": {
    "dev": "next dev --port $(microfrontends port)"
  }
  ```
- **devenv 経由の起動**: 本リポジトリのフロント dev は devenv scripts（`dev-web` / `dev-all`）または `frontend` script（`turbo dev`）で行う（`.claude/rules/commands.md`）。Turborepo が dev タスク実行時に proxy を自動起動する。proxy URL（既定 `http://localhost:3024`）にアクセスすると `/` は web、`/admin` は admin（またはその fallback）に合成された状態で確認できる。
- proxy ポートを変えたい場合は `microfrontends.json` の `options.localProxyPort` で調整。

### 1.5 デプロイ（各アプリ独立の Vercel project）

各 MFE は自分の Vercel project として独立ビルド・デプロイ・ロールバックする。Root Directory を各アプリに向け、Turborepo フィルタでビルドする。

| 設定 | web（default） | admin（child） |
| --- | --- | --- |
| Root Directory | `frontend/apps/web` | `frontend/apps/admin` |
| Build Command | `cd ../.. && turbo build --filter=@workspace/web` | `cd ../.. && turbo build --filter=@workspace/admin` |
| Output Directory | `apps/web/.next` | `apps/admin/.next` |

- **`microfrontends.json` は web project にのみデプロイされる**（default app が保持）。これが production に反映されて初めてマイクロフロントエンド合成が有効になる。
- **独立デプロイの注意**: web と admin は lockstep で出ない。`microfrontends.json` のパス割り当てを変える前に、受け手アプリが対応済みであること（または flag ルーティングで保護）を確認する。まず Preview 環境で検証してから production へ。

---

## 2. 認証・認可の分離（Supabase cookie 名スコープ）

> 出典: [Supabase SSR client](https://supabase.com/docs/guides/auth/server-side/creating-a-client) / [@supabase/ssr types](https://github.com/supabase/ssr/blob/main/src/types.ts) / [advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)

### 課題

同じ Supabase project を web / admin が共有すると、既定 cookie 名が両方 `sb-<project_ref>-auth-token` で**同一**になる。単一ドメイン合成では両アプリが同じホストに出るため、**セッションが相互に見えてしまう**。これを防ぐには cookie の **name（= storageKey）** をアプリ別に分離する。

### 方針: `cookieOptions.name` で cookie 名 = storageKey を分離

`@supabase/ssr`（0.12.0）の `createServerClient` / `createBrowserClient` は `cookieOptions?: CookieOptionsWithName`（`{ name?: string } & CookieOptions`）を受け取り、**`cookieOptions.name` を渡すと storageKey もその名前に派生**する。これにより web と admin のセッションが物理的に別 cookie になる。

| アプリ | cookie 名（storageKey） |
| --- | --- |
| **web**（default app） | `sb-<project_ref>-auth-token`（既定のまま） |
| **admin**（child app） | `sb-admin`（`cookieOptions.name` で明示） |

### 2.1 共有 Supabase クライアントをアプリ別にパラメータ化

本リポジトリの Supabase クライアントは以下に分かれている（現状 web 専用の実装は `apps/web/src/shared/lib/supabase/` にある）:

| 用途 | 配置 |
| --- | --- |
| Client Components（ブラウザ） | `@workspace/client-supabase/client`（`createBrowserClient` を re-export） |
| Server Components / Actions | `apps/web/src/shared/lib/supabase/server.ts` |
| proxy（middleware）でのセッション更新 | `apps/web/src/shared/lib/supabase/middleware.ts`（`updateSession`） |

admin を追加する際は、**cookie 名を引数で受け取れるようにファクトリを一般化**し、web は既定名・admin は `sb-admin` を渡す。ブラウザ用（`@workspace/client-supabase/client`）の例:

```ts
// packages/client/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@workspace/types/schema'

/**
 * Client Components 用 Supabase クライアント
 *
 * @param cookieName - アプリ別に cookie 名（= storageKey）を分離したい場合に指定。
 *   未指定なら Supabase 既定（sb-<project_ref>-auth-token）。
 */
export function createClient(cookieName?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    )
  }

  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey, {
    ...(cookieName ? { cookieOptions: { name: cookieName } } : {}),
  })
}
```

- **web**: `createClient()`（既定名）。
- **admin**: `createClient('sb-admin')`。admin 側の `AuthProvider` も同じ名前で client を生成する（`@workspace/auth` の `AuthProvider` に cookie 名を渡せるよう prop を追加するか、admin 専用の provider ラッパーを `apps/admin/src/app/` に置く）。

server / middleware 側（各アプリの `shared/lib/supabase/`）も同様に `createServerClient(url, key, { cookieOptions: { name }, cookies: {...} })` の `name` をアプリ別に固定する。web は既定名のままなので変更不要、admin だけ `sb-admin` を渡す。

### 2.2 認可（authz）も各アプリ独立

- **web**: 一般ユーザー向け。既存の `useRequireAuth`（クライアント側ガード）+ Server Component での `getUser()` チェックを継続。
- **admin**: 管理者専用の認可を admin アプリ内に閉じて実装する（FSD の `apps/admin/src/shared/lib/` に auth-guard を置く）。ロール/権限判定は admin 側の責務。

```ts
// apps/admin/src/shared/lib/auth-guard.ts（例）
import { redirect } from 'next/navigation'
import { createClient } from './supabase/server' // admin 用（cookieOptions.name = 'sb-admin'）

export async function requireAdmin() {
  const supabase = await createClient()
  // 認証はトークンの真正性まで検証する getUser() を必ず使う（getSession だけに頼らない）
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/admin/login')
    return
  }

  // 認可: 管理者ロールの検証（プロジェクトのロール設計に合わせる）
  const isAdmin = user.app_metadata?.role === 'admin'
  if (!isAdmin) {
    redirect('/admin/login')
    return
  }

  return user
}
```

> **重要**: セッションの有効性は必ず `supabase.auth.getUser()`（サーバー側でトークンを検証）で確認する。`getSession()` の戻り値をそのまま信用しない（`.claude/rules/error-handling.md` / Supabase 公式）。

### 2.3 cookie 名分離を選ぶ理由（path scope より堅牢）

`cookieOptions.path: '/admin'` でパス限定する手もあるが、MFE 間で prefetch / soft-nav が絡む構成では path scope が扱いづらい。**name（storageKey）分離の方が堅牢**なので本リポジトリは name 分離を既定とする。

---

## 3. devenv との連携（プロセス・スクリプト）

新しいアプリ（admin）を追加するときは、`devenv.nix` の `frontendApps` attrset に **1 行足すだけ**で、process / `dev-<name>` script / `dev-all` がすべて自動連動する（`.claude/CLAUDE.md`）。

```nix
# devenv.nix（抜粋）
frontendApps = {
  web   = { port = 3000; };
  admin = { port = 3001; };   # ← 追加。dev-admin / dev-all が自動生成される
  mobile = { port = 8081; ready = "/status"; exec = ''…''; };
};
```

- `apps/<name>` は **opt-in process**（`start.enable = false`）なので `devenv up` 単体では起動しない。`dev-admin` / `dev-all` または `devenv up admin` で明示起動する。
- ポートは MFE ローカル proxy と衝突しないよう割り当てる（proxy 既定 `3024`）。`microfrontends port` で自動採番されるポートを `next dev --port` に渡す運用と揃える。

---

## 4. やってはいけないこと（アンチパターン）

```
❌ admin に Next.js の basePath を設定する
   → Vercel Microfrontends は basePath 非対応。パス割り当ては microfrontends.json の routing.paths で行う。

❌ web と admin で同じ Supabase cookie 名（既定）のまま単一ドメインに出す
   → セッションが相互に見える。admin は cookieOptions.name = 'sb-admin' で必ず分離する。

❌ microfrontends.json を child（admin）側にも置く
   → default app（web）にのみ置く。child は routing を持たず web の設定に従う。

❌ admin 専用の UI / feature / ロジックを packages/ に置く
   → admin でしか使わないものは apps/admin/src/shared|features|entities/ に置く（FSD）。
      複数アプリで実際に共有することが確定してから packages/ に昇格する（design-principles.md）。

❌ 認可チェックを getSession() の戻り値だけで済ませる
   → 必ず getUser() でトークンを検証する。
```

---

## 5. 参考（一次情報）

- 調査レポート（本リポジトリ）: [`docs/_research/2026-07-07-vercel-microfrontends.md`](../../../docs/_research/2026-07-07-vercel-microfrontends.md)
- Vercel Microfrontends 概要 / 課金: https://vercel.com/docs/microfrontends
- Quickstart（`microfrontends.json` / `withMicrofrontends` / パッケージ）: https://vercel.com/docs/microfrontends/quickstart
- Configuration（スキーマ / `packageName`）: https://vercel.com/docs/microfrontends/configuration
- Path Routing（path 式 / assetPrefix / flag）: https://vercel.com/docs/microfrontends/path-routing
- Local Development（proxy / Turborepo / polyrepo）: https://vercel.com/docs/microfrontends/local-development
- Supabase SSR client 作成: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- @supabase/ssr 型定義（`CookieOptionsWithName`）: https://github.com/supabase/ssr/blob/main/src/types.ts

---

## 関連ドキュメント

- [アーキテクチャ設計図](./architecture.md)
- [設計原則](./design-principles.md) — **必読**（packages/ と apps/ の責務分担）
- [新しいアプリの追加方法](./adding-apps.md) — admin を追加する具体手順
- [設定ファイルガイド](./configuration-guide.md)
