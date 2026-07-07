# Vercel Microfrontends + Next.js 16 Multi-Zones + Supabase Auth Isolation 調査レポート

## 調査情報

- **調査日**: 2026-07-07
- **調査者**: spec agent
- **対象スタック**: Next.js 16 (App Router) / Bun workspace + Turborepo / Supabase Auth (@supabase/ssr, cookie セッション) / Vercel
- **想定構成**: メインのユーザー向けアプリ + 別の管理者(admin)アプリ。認証/認可を分離。

## バージョン情報（調査時点の実測値）

| パッケージ | 最新 | 備考 |
| --- | --- | --- |
| `@vercel/microfrontends` | **2.3.6** | npm registry `latest`（`curl https://registry.npmjs.org/@vercel/microfrontends/latest`）。asset prefix は `2.0.0` 以降 `/vc-ap-<hash>`（それ以前は `/vc-ap-<app name>`） |
| `@supabase/ssr` | **0.12.0** | `cookieOptions.name` → `storageKey` 派生をサポート |
| Next.js | 16.2.x | Multi-Zones ドキュメントは `version: 16.2.10`, `lastUpdated: 2026-06-23` |
| `turbo` | 2.3.6 / 2.4.2 以降 | Vercel MFE の local proxy 自動起動に必要（[local-development](https://vercel.com/docs/microfrontends/local-development)） |
| Vercel CLI | 44.2.2 以降 | `vercel microfrontends pull`（polyrepo）に必要 |

---

## 1. Vercel Microfrontends（マネージド製品）

### 存在するか → **YES（一般提供・全プランで利用可、プラン別上限あり）**

出典: [vercel.com/docs/microfrontends](https://vercel.com/docs/microfrontends)

> "Microfrontends allow you to split a single application into smaller, independently deployable units that render as one cohesive application ... Vercel handles connecting the microfrontends and routing requests on the global network."

**課金/上限**（[Limits and pricing](https://vercel.com/docs/microfrontends)）:

| | Hobby | Pro | Enterprise |
| --- | --- | --- | --- |
| Included Routing | 50K req/月 | N/A | Custom |
| Additional Routing | - | $2 / 1M req | Custom |
| Included Projects | 2 | 2 | Custom |
| Additional Projects | - | $250/project/月 | Custom |

→ main + admin の 2 プロジェクトなら **Hobby/Pro の無料枠（2 projects）に収まる**。

### 仕組み: ネットワークレベルのパスルーティング（rewrite ではない）

出典: [path-routing](https://vercel.com/docs/microfrontends/path-routing)

> "When Vercel receives a request ... we read the `microfrontends.json` file in the live deployment to decide where to route it. This routing happens within the same request — it is not a rewrite that would result in a second outbound request ... There is no additional network hop, which keeps latency low."

- 各アプリは **それぞれ独立した Vercel project**（monorepo でも polyrepo でも同一挙動）。[microfrontends](https://vercel.com/docs/microfrontends) "Each application is its own Vercel project and deploys on its own."
- **Default app**: `microfrontends.json` を保持し、他のどの MFE にもマッチしないリクエストを処理するアプリ。[quickstart](https://vercel.com/docs/microfrontends/quickstart)
- **Shared domain**: 全 MFE が単一ドメイン配下に出る（相対パスがそのまま各環境に解決）。

### `microfrontends.json` スキーマ（`$schema: https://openapi.vercel.sh/microfrontends.json`）

default app（`web`）のルートに置く（default app のみが保持）。出典: [quickstart](https://vercel.com/docs/microfrontends/quickstart) / [local-development](https://vercel.com/docs/microfrontends/local-development)

```json
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json",
  "applications": {
    "web": {
      "development": {
        "fallback": "your-web-app.vercel.app"
      }
    },
    "admin": {
      "routing": [
        { "paths": ["/admin/:path*"] }
      ],
      "development": { "task": "dev", "local": 3001 },
      "packageName": "admin"
    }
  },
  "options": {
    "localProxyPort": 3024
  }
}
```

- **application 名は Vercel project 名と一致**させる（不一致時は `packageName` で package.json 名を橋渡し）。[local-development](https://vercel.com/docs/microfrontends/local-development)
- **default app には `routing` を書かない**（他にマッチしない全部を受ける）。
- **path 式**（[path-routing 抜粋](https://vercel.com/docs/microfrontends/path-routing)）: `/:path`（1 セグメント）, `/prefix/:path*`（0+）, `/prefix/:path+`（1+）, `/:path(a|b)`, `/:path((?!a|b).*)` 等。**重複/オーバーラップするパスは不可**（一意にマップ必須）。末尾以外での複数セグメントワイルドカードは不可。
- **assetPrefix**: `withMicrofrontends` が自動で `/vc-ap-<hash>`（2.0.0+）を付与。人間可読にしたい場合は `"assetPrefix": "marketing-assets"` を application に指定。`public/` 配下は手動で asset prefix サブディレクトリへ移す必要あり。

### `@vercel/microfrontends` パッケージの配線

**全ての MFE アプリ**（default/child とも）に `@vercel/microfrontends` を入れる（bun 可）。出典: [quickstart](https://vercel.com/docs/microfrontends/quickstart)

```bash
bun i @vercel/microfrontends
```

`next.config.js`（各 Next.js アプリ）に `withMicrofrontends` を巻く:

```js
// next.config.js
const { withMicrofrontends } = require('@vercel/microfrontends/next/config');

/** @type {import('next').NextConfig} */
const nextConfig = { /* ... */ };

module.exports = withMicrofrontends(nextConfig);
```

- App Router + Pages Router 混在時のみ `withMicrofrontends(nextConfig, { supportPagesRouter: true })`。
- **⚠️ 重要な制約**: 「**`basePath` を使う Next.js アプリは現状サポートされない**」（[quickstart](https://vercel.com/docs/microfrontends/quickstart)）
  > "Next.js applications that use `basePath` are not supported right now."
  → asset prefix は `withMicrofrontends` が自動管理する前提のため。**admin を `/admin` に出したい場合、Next.js の `basePath` ではなく `microfrontends.json` の `routing.paths` でパスを割り当てる**（各アプリ側は basePath なしのルート `/` で書き、Vercel 側でパスを合成する）。

### flag ベースの段階的ルーティング（default app のみ middleware）

`microfrontends.json` の routing group に `"flag": "name"` を付与し、default app に:

```ts
// middleware.ts (default app only)
import { runMicrofrontendsMiddleware } from '@vercel/microfrontends/next/middleware';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = await runMicrofrontendsMiddleware({
    request,
    flagValues: { 'name-of-feature-flag': async () => true },
  });
  if (response) return response;
}

export const config = {
  matcher: [
    '/.well-known/vercel/microfrontends/client-config', // prefetch 最適化に必須
    '/flagged/path',
  ],
};
```

### 独立デプロイ

各 MFE は自分の Vercel project として独立ビルド/デプロイ/rollback（[Instant Rollback](https://vercel.com/docs/instant-rollback) 連動）。production ドメインは各 project の current production deployment にルート。**別々の MFE の変更は lockstep で出ない**ため、`microfrontends.json` を変える前に受け手アプリが対応済みであること（または flag で保護）。[path-routing](https://vercel.com/docs/microfrontends/path-routing)

### ローカル開発プロキシ

出典: [local-development](https://vercel.com/docs/microfrontends/local-development)

- `microfrontends` CLI が local proxy を提供。**単一 MFE だけローカルで動かし、他は production fallback にルート**（`development.fallback` URL）。
- **Turborepo 統合**: `turbo run dev --filter=web` で dev サーバ + proxy が自動起動（turbo 2.3.6 / 2.4.2+）。turbo 未設定でも `microfrontends.json` から設定を推論。
- port 同期: `dev` スクリプトを `next dev --port $(microfrontends port)` にする。
- Turborepo 無しの手動:
  ```json
  "scripts": {
    "dev": "next dev --port $(microfrontends port)",
    "proxy": "microfrontends proxy microfrontends.json --local-apps web"
  }
  ```
- proxy URL（既定 `http://localhost:3024`）にアクセスして全体を確認。`options.localProxyPort` で変更可。
- **Polyrepo**: `microfrontends.json` は default app のリポジトリにしか無いので、他リポジトリは `vercel microfrontends pull`（CLI 44.2.2+）か `VC_MICROFRONTENDS_CONFIG=/path/to/microfrontends.json` を設定。ビルド時も config が見つからないと **build error**。

---

## 2. Plain Next.js Multi-Zones（ベンダー中立の代替）

出典: [nextjs.org/docs/app/guides/multi-zones](https://nextjs.org/docs/app/guides/multi-zones)（v16.2.10, 2026-06-23 更新）

複数の独立した Next.js アプリを 1 ドメイン配下のパス集合に割り当てる方式。zone 内は soft navigation、zone 間は **hard navigation**（`<Link>` ではなく `<a>` を使う）。

### child zone（admin）側 `next.config.js`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: '/admin-static',
}
```

> "Next.js 15 以降、静的アセット用の追加 rewrite は不要"（15 未満のみ `beforeFiles` rewrite が必要）。

### default/router zone（web）側 `next.config.js` — rewrites でルーティング

```js
async rewrites() {
  return [
    { source: '/admin',            destination: `${process.env.ADMIN_DOMAIN}/admin` },
    { source: '/admin/:path+',     destination: `${process.env.ADMIN_DOMAIN}/admin/:path+` },
    { source: '/admin-static/:path+', destination: `${process.env.ADMIN_DOMAIN}/admin-static/:path+` },
  ];
}
```

- `destination` は scheme + domain を含む（production ドメイン、ローカルは localhost）。
- パスは zone 間で一意（両方が `/admin` を出すと衝突）。
- 動的判断が要る場合（feature flag 等）は `proxy.js`（middleware）で `NextResponse.rewrite`。
- **Server Actions**: `experimental.serverActions.allowedOrigins: ['your-production-domain.com']` を明示。

### マネージド製品とのトレードオフ

| | Vercel MFE（マネージド） | Multi-Zones（素の Next.js） |
| --- | --- | --- |
| ルーティング | Vercel network で同一リクエスト内（追加ホップ無し） | rewrite = 追加の outbound リクエスト（proxy zone 経由） |
| 設定 | `microfrontends.json` 一元 + `withMicrofrontends` | 各アプリの `next.config.js`（assetPrefix + rewrites 手書き） |
| asset prefix | 自動（`/vc-ap-<hash>`） | 手動（`assetPrefix` を自分で命名し衝突回避） |
| ローカル proxy | `@vercel/microfrontends` の proxy（他 app は prod fallback） | 全 zone を自前で起動 or rewrite 先を localhost に |
| prefetch 最適化/soft nav 跨ぎ | client-config well-known で最適化 | zone 跨ぎは常に hard navigation |
| basePath | **非対応** | 併用可（ただし後述の注意） |
| ロックイン | Vercel 前提 | どの host でも可 |

---

## 3. 共有ドメインでの MFE 間 Auth 分離（Supabase cookie セッション）

### 前提: 既定の cookie 名は `sb-<project_ref>-auth-token`

出典: [creating-a-client](https://supabase.com/docs/guides/auth/server-side/creating-a-client)。同一 Supabase project を web/admin が共有すると、**既定 cookie 名が同一 → 同一ドメインでセッションが相互に見える**。分離するには cookie の **name（storageKey）** か **domain/path** をずらす。

### 手段 A: `cookieOptions.name` で cookie 名 = storageKey を分離（推奨・確実）

`@supabase/ssr` 0.12.0 の `createServerClient` / `createBrowserClient` は `cookieOptions?: CookieOptionsWithName` を受ける。型（[src/types.ts](https://github.com/supabase/ssr/blob/main/src/types.ts)）:

```ts
export type CookieOptions = Partial<SerializeOptions>; // domain, path, maxAge, sameSite, secure, httpOnly ...（cookie パッケージ由来）
export type CookieOptionsWithName = { name?: string } & CookieOptions;
```

`createServerClient` の実装（[src/createServerClient.ts](https://github.com/supabase/ssr/blob/main/src/createServerClient.ts)）で **name → storageKey が派生**:

```ts
// 抜粋
createServerClient(url, key, {
  cookieOptions?: CookieOptionsWithName;
  cookies: CookieMethodsServer;
  cookieEncoding?: "raw" | "base64url";
})
// 内部: options?.cookieOptions?.name ? { storageKey: options.cookieOptions.name } : null
```

→ **admin アプリだけ cookie 名を変える**ことで、同一親ドメイン上でも web と admin のセッションが物理的に別 cookie になる:

```ts
// admin: shared/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: 'sb-admin' }, // ← storageKey も 'sb-admin' に
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)),
      },
    },
  )
}
```

web 側は既定（`sb-<ref>-auth-token`）のまま。ブラウザ側 `createBrowserClient` も同じ `cookieOptions.name` を渡して揃える。

> 注: セッション分離の観点で、同じ storageKey を使う別 client は次回 read でそのセッションを拾う。厳密分離が必要なら storageKey（= cookie name）を変えるのが公式挙動（[supabase/ssr discussion](https://github.com/orgs/supabase/discussions/27037)）。

### 手段 B: cookie の path scoping（同一ホスト・パス分割時）

admin を `/admin` 配下に出すなら `cookieOptions: { path: '/admin' }` で cookie をそのパスに限定 → web 側 `/` には送られない。ただし **MFE 間で prefetch/soft-nav する構成では path scope が扱いづらい**ため、name 分離（手段 A）の方が堅牢。

### 手段 C: サブドメイン分離（最も単純で強い分離）

`admin.example.com` と `app.example.com` に分ける。cookie は既定でホスト単位（domain 未指定なら発行ホストにのみ送出）→ **設定不要で完全分離**。逆に共有したい場合のみ `cookieOptions: { domain: '.example.com' }` を明示（[supabase discussion #5742](https://github.com/orgs/supabase/discussions/5742)）。この場合 Vercel MFE の「shared domain」パスルーティングは使わず、独立ドメイン運用になる。

### Supabase の公式スタンス

- 複数アプリでセッション**共有**したい → cookie `domain` を親ドメイン（`.example.com` / dev は `.localhost`）に設定（[discussion #5742](https://github.com/orgs/supabase/discussions/5742)）。
- セッション**分離**の明示的な単一推奨はドキュメント化されていないが、`cookieOptions.name`（→ storageKey）の分離が実装上の正攻法。`SameSite` は `Lax` が良い既定（[advanced-guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)）。**ログアウト/セッション終了の確認は必ず `getUser()`** で行う（`Max-Age`/`Expires` に依存しない）。

---

## 4. `basePath` の相互作用

### Vercel MFE では basePath 非対応 → basePath は Multi-Zones/独立ドメイン時のみ

（[quickstart](https://vercel.com/docs/microfrontends/quickstart) の "applications that use basePath are not supported"）

Multi-Zones で admin に `basePath: '/admin'` を使う場合の各層への影響:

1. **Supabase middleware matcher**: `matcher` はアプリの basePath を**自動で prepend**する（Next.js の middleware は basePath 起点で動く）。matcher パターン自体には `/admin` を書かない（basePath 込みで解釈される）。中身の `updateSession` は変更不要。
2. **cookie path**: `cookieOptions.path` を未指定にすると `/` になり basePath 外にも送出される。admin を basePath に閉じたいなら `path: '/admin'` を明示（手段 B）。ただし前述の通り name 分離（手段 A）の方が MFE で安全。
3. **next-intl ルーティング**: `createMiddleware` は「middleware 設定（`domains`/`pathnames`/**`basePath`**）を自動で取り込む」（[next-intl routing/middleware](https://next-intl.dev/docs/routing/middleware)）。Next の `basePath` を設定すれば next-intl の生成リンク/matcher もそれに追従する。`localePrefix: 'as-needed' | 'never'` はアプリ側の判断。matcher は `api`/`_next`/`_vercel`/ドット付きファイルを除外する標準パターンを使う。
   - **注意**: Supabase middleware（`updateSession`）と next-intl middleware を**同一 `middleware.ts` にチェーン**する場合、両者の matcher と basePath の解釈を一本化する（basePath 込みで一度だけ解決）。

---

## 5. このスタックでの推奨マトリクス（main + admin / Supabase cookie auth / Bun+Turborepo / Vercel）

| 観点 | (A) Vercel Microfrontends（マネージド） | (B) Plain Multi-Zones | (C) 完全別ドメイン（サブドメイン） |
| --- | --- | --- | --- |
| (a) Vercel 機能メリット | ◎ network ルーティング/追加ホップ無/Toolbar/Instant Rollback 連動/prefetch 最適化 | △ rewrite の追加ホップ、Vercel 固有機能は乗らない | △ 単なる別 project、MFE 合成なし |
| (b) auth 分離の容易さ | △ 共有ドメイン → cookie **name(storageKey) 分離が必須**。basePath 不可 | △ 共有ドメイン → 同様に name/path 分離が必要 | ◎ ホスト単位で cookie が自然分離、設定ほぼ不要 |
| (c) monorepo dev 体験 | ◎ Turborepo と一級統合、`turbo run dev --filter` で proxy 自動 | ○ Turborepo で並列起動可だが proxy/rewrite は自前 | ○ 各アプリ独立起動（合成デバッグは弱い） |
| (d) ベンダーロックイン | ✕ Vercel 前提（`microfrontends.json`/`@vercel/microfrontends`） | ◎ 素の Next.js、どの host でも可 | ◎ 完全に中立 |

### 結論（このリポジトリ向け）

- **admin を「別サブドメイン（`admin.example.com`）で完全分離」** が、Supabase cookie auth の分離コストが最小・ロックイン無し・実装が最も素直。main と admin は Bun workspace + Turborepo の別 `apps/*` として各自 Vercel project にデプロイ。**認証は cookie がホスト単位で自然分離**され、`cookieOptions.name` すら不要。
- **1 ドメイン配下の統合 UX（`/admin` パス合成）が要件で、かつ Vercel 継続前提** なら **(A) Vercel Microfrontends**。ただし **Next.js `basePath` は使えない**ため admin 側はルート `/` で実装し `microfrontends.json` の `routing.paths: ["/admin/:path*"]` で合成、**Supabase の cookie は `cookieOptions.name: 'sb-admin'` で必ず分離**する。2 project なので Hobby/Pro の無料枠内。
- **ロックインを避けつつ 1 ドメイン合成したい** なら **(B) Multi-Zones**。`assetPrefix` を手動命名し、web を router zone にして rewrites で admin へ。auth 分離は同じく `cookieOptions.name` 分離。zone 跨ぎは `<a>` タグ。

> 本リポジトリの既存方針（Supabase-first / FSD / devenv コマンド / monorepo は Bun workspace + Turborepo）と最も摩擦が少ないのは **(C) サブドメイン分離**。Vercel の MFE 合成が明確な要件になった時点で (A) に切り替える判断が妥当。

---

## 参考リンク（一次情報）

- Vercel Microfrontends 概要/課金: https://vercel.com/docs/microfrontends
- Quickstart（microfrontends.json / withMicrofrontends / package）: https://vercel.com/docs/microfrontends/quickstart
- Path Routing（path 式 / assetPrefix / flag）: https://vercel.com/docs/microfrontends/path-routing
- Local Development（proxy / Turborepo / polyrepo）: https://vercel.com/docs/microfrontends/local-development
- Next.js Multi-Zones: https://nextjs.org/docs/app/guides/multi-zones
- Next.js assetPrefix: https://nextjs.org/docs/app/api-reference/config/next-config-js/assetPrefix
- Next.js basePath: https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath
- Supabase SSR client 作成: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase SSR advanced guide（cookie/SameSite/getUser）: https://supabase.com/docs/guides/auth/server-side/advanced-guide
- @supabase/ssr 型定義（CookieOptionsWithName）: https://github.com/supabase/ssr/blob/main/src/types.ts
- @supabase/ssr createServerClient（name→storageKey）: https://github.com/supabase/ssr/blob/main/src/createServerClient.ts
- Supabase サブドメイン間セッション共有 discussion: https://github.com/orgs/supabase/discussions/5742
- @supabase/ssr v1.0 ロードマップ discussion: https://github.com/orgs/supabase/discussions/27037
- next-intl middleware（basePath 自動取り込み）: https://next-intl.dev/docs/routing/middleware
- next-intl routing 設定（localePrefix）: https://next-intl.dev/docs/routing/configuration
- npm @vercel/microfrontends: https://www.npmjs.com/package/@vercel/microfrontends
