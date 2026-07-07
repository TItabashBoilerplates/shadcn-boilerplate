# マイクロフロントエンド運用（Vercel Microfrontends）

このドキュメントは、`frontend/` モノレポの **Web を Vercel Microfrontends（マネージド製品）でマイクロフロントエンドとして運用する**ための正本ガイドです。**管理者アプリ（admin）とメインアプリ（web）で認証・認可を分離する**構造を、単一ドメイン合成の中でどう維持するかまで含めて解説します。

> **調査の出典**: このドキュメントの構成・API・制約はすべて一次情報に基づきます。詳細な調査ログ（バージョン実測値・引用付き）は [`docs/_research/2026-07-07-vercel-microfrontends.md`](../../../docs/_research/2026-07-07-vercel-microfrontends.md) を参照してください。

---

## 🎯 採用方針（決定事項）

| 項目 | 決定 |
| --- | --- |
| **合成方式** | **Vercel Microfrontends（マネージド）** — `@vercel/microfrontends` + `microfrontends.json` + `withMicrofrontends` |
| **ドメイン** | **単一ドメイン**でパスベース合成（`/` = web、`/admin` = admin） |
| **認証・認可の分離** | **アプリごとに認証スタック自体を分ける**。メイン（web）= Supabase Auth、管理者（admin）= **Better Auth**。別システム = 別 cookie なので単一オリジンでも自然に分離。認可も各スタックで独立（Supabase Auth 単独で分けることは基本しない） |
| **Next.js `basePath`** | **使わない**（Vercel Microfrontends は Next.js `basePath` 非対応）。パス割り当ては `microfrontends.json` の `routing.paths` で行う（※ Better Auth の `basePath` は認証 API プレフィックスで別物・こちらは使う） |
| **各アプリのデプロイ** | それぞれ**独立した Vercel project** として個別ビルド・デプロイ・ロールバック |

> **なぜこの構成か**: 単一ドメイン配下で `/admin` を合成しつつ、Vercel のネットワークレベルルーティング（追加ホップなし）・Instant Rollback 連動・prefetch 最適化といった **Vercel Services の恩恵を最大限**受けられる。認証は「アプリごとに別スタック」（web=Supabase Auth / admin=Better Auth）にすることで、別 cookie・別システムとして確実にアプリ間を切り離す。

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
             ┌────────────────────┐            ┌─────────────────────────┐
             │  apps/web           │            │  apps/admin             │
             │  = default app      │            │  = child app            │
             │  Vercel project:web │            │  Vercel project: admin  │
             │                     │            │                         │
             │  認証: Supabase Auth │            │  認証: Better Auth       │
             │  cookie:            │            │  cookie:                │
             │  sb-<ref>-auth-token│            │  better-auth.session... │
             └─────────┬───────────┘            └────────────┬────────────┘
                       │                                      │
                       └───────── 共有パッケージ ─────────────┘
                          @workspace/ui / types / query …（packages/*）
                          ※ 認証スタックはアプリごとに別（共有しない）
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

## 2. 認証・認可の分離（アプリごとに認証スタックを分ける）

> 出典: [Better Auth Next.js](https://better-auth.com/docs/integrations/next) / [Cookies](https://better-auth.com/docs/concepts/cookies) / [Options](https://better-auth.com/docs/reference/options) / [Supabase SSR client](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
>
> 詳細な調査ログ（引用付き）は [`docs/_research/2026-07-07-better-auth-admin-microfrontend.md`](../../../docs/_research/2026-07-07-better-auth-admin-microfrontend.md) を参照。

### 方針: 認証スタック自体をアプリごとに分ける

**このリポジトリでは、Supabase Auth 単独で認証を「分ける」ことは基本しない。** 複数の認証・認可を組み込む場合は、**アプリごとに認証スタック自体を分離**する。

| アプリ | 認証スタック | 既定 cookie 名 |
| --- | --- | --- |
| **web**（メイン / default app） | **Supabase Auth**（`@supabase/ssr`、既存） | `sb-<project_ref>-auth-token` |
| **admin**（管理者 / child app） | **Better Auth**（追加） | `better-auth.session_token` |

**自然分離**: web は Supabase の `sb-<ref>-auth-token`、admin は Better Auth の `better-auth.session_token` と **cookie 名も認証システムも別**なので、単一オリジン（同一ドメイン）でも**セッションが衝突しない**。Supabase の `cookieOptions.name` を弄って無理やり分ける必要はない。認可（権限判定）も各スタックで完全に独立する。

### 2.1 メインアプリ（web）= Supabase Auth（現状維持）

web は既存の Supabase Auth をそのまま使う（`@workspace/client-supabase` + `apps/web/src/shared/lib/supabase/`、`proxy.ts` でのセッション更新、`getUser()` による検証）。変更不要。実装規約は `frontend/CLAUDE.md` の「Supabase Integration Guidelines」参照。

### 2.2 管理者アプリ（admin）= Better Auth（追加）

admin に Better Auth を追加する。着手前に `better-auth-best-practices` / `better-auth-security-best-practices` Skill を起動し、[better-auth.com/docs](https://better-auth.com/docs) で最新 API を確認すること（推測実装禁止）。

**a. パッケージと設定**

```bash
cd frontend/apps/admin && ni better-auth
```

```ts
// apps/admin/src/shared/lib/auth/auth.ts
import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'

export const auth = betterAuth({
  // BETTER_AUTH_URL は共有ドメイン（例 https://example.com）
  // basePath は admin が専有する /admin 配下に置く（後述）
  basePath: '/admin/api/auth',
  emailAndPassword: { enabled: true },
  // database: 下記 2.3 の通り Supabase Postgres を Drizzle adapter で指定
  plugins: [
    // 認可: admin / organization プラグイン等（下記 2.4）
    nextCookies(), // ← 必ず配列の最後
  ],
})
```

**b. Next.js ルートハンドラ（admin が専有する `/admin/*` 配下に置く）**

Vercel Microfrontends では admin は `/admin/:path*` を専有する。Better Auth の API も**その配下**に出す必要があるため、**Better Auth の `basePath` を `/admin/api/auth`** にし、ルートハンドラも同じパスに置く。

```ts
// apps/admin/app/admin/api/auth/[...all]/route.ts
import { auth } from '@/shared/lib/auth/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

> **重要**: ここでいう Better Auth の `basePath` は**認証 API のルートプレフィックス**であり、Next.js の `basePath`（Vercel Microfrontends が非対応）とは**別物**。admin アプリ自体は Next.js `basePath` を設定しない。`/admin/api/auth/*` は `microfrontends.json` の `routing.paths: ["/admin/:path*"]` に既に含まれるため、追加の routing 登録は不要。

**c. クライアント**

```ts
// apps/admin/src/shared/lib/auth/auth-client.ts
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  basePath: '/admin/api/auth', // サーバの basePath と揃える
})
```

### 2.3 データベース（Supabase Postgres を Drizzle で共有）

Better Auth は**同じ Supabase Postgres** を利用してよい（別 DB は不要）。本リポジトリは **DB スキーマ / マイグレーションは Drizzle が source of truth**（`.claude/rules/database.md` / `auto-generated.md`）なので、以下の流れに従う:

1. Better Auth を Drizzle adapter または `pg.Pool` に接続。**Drizzle adapter のインポートパスはバージョン依存**（v1.x 系は `better-auth/adapters/drizzle`、main では `@better-auth/drizzle-adapter`）なので、**pin するバージョンの公式ドキュメントで必ず確認**すること。
2. Better Auth のテーブル（`user` / `session` / `account` / `verification` など）は `npx @better-auth/cli generate`（Drizzle スキーマを生成）→ **Drizzle のスキーマ（`drizzle/schema/`）に取り込んでマイグレーション**する（`devenv tasks run app:migrate-dev`、本番はユーザー承認必須）。
3. Better Auth の cookie は署名付きセッションで、Supabase のトークンとは独立。RLS を使う Supabase 側テーブルとは別系統として扱う。

> **注**: Better Auth の `@better-auth/cli migrate` は Kysely 専用。Drizzle 構成では `generate` でスキーマを出し、**Drizzle 経由でマイグレーションを一元管理**する（このリポジトリの DB ポリシー）。生成スキーマの取り込み方は `drizzle` Skill を参照。

### 2.4 認可（authz）は Better Auth 側で完結

admin の認可（管理者ロール・権限）は Better Auth のプラグインで実装する:

- **`admin` プラグイン**: 管理者ロール・ユーザー管理（ban / impersonate 等）。
- **`organization` プラグイン**: マルチテナント・チーム・RBAC（ロール/権限）。

ページガードはサーバー側でセッションを検証する:

```ts
// apps/admin/src/shared/lib/auth/guard.ts
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from './auth'

export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect('/admin/login')
    return
  }

  // 認可: 管理者ロールの検証（admin / organization プラグインのロール設計に合わせる）
  if (session.user.role !== 'admin') {
    redirect('/admin/login')
    return
  }

  return session
}
```

### 2.5 環境変数・CSRF

- `BETTER_AUTH_SECRET`（32 文字以上、`openssl rand -base64 32`）と `BETTER_AUTH_URL`（= 共有ドメイン）を設定。**Secret は Doppler 管理**（`.claude/rules/mcp-doppler.md`、値をチャット/コミットに出さない）。
- Better Auth は `Origin` ヘッダを `trustedOrigins` と照合して CSRF を防ぐ。**`baseURL`（= 共有ドメイン）は自動的に信頼される**ため、単一オリジン構成では追加設定は基本不要。別オリジンからのアクセスを許す場合のみ `trustedOrigins` に追記。
- 本番は `advanced.useSecureCookies`。サブドメインをまたぐ場合のみ `advanced.crossSubDomainCookies`（単一ドメイン合成では不要）。

### （例外）両アプリとも Supabase Auth を使う場合のみ

もし例外的に admin も Supabase Auth を使う構成にする場合に限り、単一オリジンでの cookie 衝突を避けるため `@supabase/ssr` の `createServerClient` / `createBrowserClient` に `cookieOptions: { name: 'sb-admin' }` を渡して cookie 名（= storageKey）を分離する。**ただしこれは基本方針ではない**（本リポジトリは admin に Better Auth を使う）。

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
   → Vercel Microfrontends は Next.js basePath 非対応。パス割り当ては microfrontends.json の
      routing.paths で行う（Better Auth の basePath は認証 API プレフィックスで別物、こちらは使う）。

❌ 認証・認可を Supabase Auth 単独でアプリ間分離しようとする
   → 基本方針は「アプリごとに認証スタックを分ける」。admin は Better Auth を追加する。
      Supabase の cookieOptions.name 分離は、例外的に両アプリとも Supabase を使う場合のみ。

❌ Better Auth の認証 API を admin 専有パスの外（/api/auth など）に置く
   → admin は /admin/* を専有するので basePath を /admin/api/auth にし、
      route handler も app/admin/api/auth/[...all]/ に置く。

❌ Better Auth のテーブルを @better-auth/cli migrate で直接 DB に当てる
   → DB は Drizzle が source of truth。generate でスキーマ化 → drizzle migration で一元管理。

❌ microfrontends.json を child（admin）側にも置く
   → default app（web）にのみ置く。child は routing を持たず web の設定に従う。

❌ admin 専用の UI / feature / ロジックを packages/ に置く
   → admin でしか使わないものは apps/admin/src/shared|features|entities/ に置く（FSD）。
      複数アプリで実際に共有することが確定してから packages/ に昇格する（design-principles.md）。
```

---

## 5. 参考（一次情報）

- 調査レポート（Vercel Microfrontends）: [`docs/_research/2026-07-07-vercel-microfrontends.md`](../../../docs/_research/2026-07-07-vercel-microfrontends.md)
- 調査レポート（Better Auth × admin MFE）: [`docs/_research/2026-07-07-better-auth-admin-microfrontend.md`](../../../docs/_research/2026-07-07-better-auth-admin-microfrontend.md)
- Vercel Microfrontends 概要 / 課金: https://vercel.com/docs/microfrontends
- Quickstart（`microfrontends.json` / `withMicrofrontends` / パッケージ）: https://vercel.com/docs/microfrontends/quickstart
- Configuration（スキーマ / `packageName`）: https://vercel.com/docs/microfrontends/configuration
- Path Routing（path 式 / assetPrefix / flag）: https://vercel.com/docs/microfrontends/path-routing
- Local Development（proxy / Turborepo / polyrepo）: https://vercel.com/docs/microfrontends/local-development
- Better Auth × Next.js: https://better-auth.com/docs/integrations/next
- Better Auth Cookies（`better-auth.session_token` / `advanced.cookiePrefix`）: https://better-auth.com/docs/concepts/cookies
- Better Auth Options（`basePath` / `baseURL` / `trustedOrigins`）: https://better-auth.com/docs/reference/options
- Supabase SSR client（web 側）: https://supabase.com/docs/guides/auth/server-side/creating-a-client

---

## 関連ドキュメント・スキル

- [アーキテクチャ設計図](./architecture.md)
- [設計原則](./design-principles.md) — **必読**（packages/ と apps/ の責務分担）
- [新しいアプリの追加方法](./adding-apps.md) — admin を追加する具体手順
- [設定ファイルガイド](./configuration-guide.md)
- Better Auth Skill: `.claude/skills/better-auth-best-practices/` / `.claude/skills/better-auth-security-best-practices/` / `.claude/skills/two-factor-authentication-best-practices/`
- Supabase / Drizzle Skill: `.claude/skills/supabase/` / `.claude/skills/drizzle/`
