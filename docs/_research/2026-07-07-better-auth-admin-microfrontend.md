# Better Auth（Admin マイクロフロントエンド）調査レポート

## 調査情報

- **調査日**: 2026-07-07
- **調査者**: spec agent
- **対象**: Next.js 16 App Router の Admin アプリに Better Auth を導入し、Supabase Auth を使う main アプリと **同一ドメイン（Vercel Microfrontends）** 上で共存させる構成
- **アーキ前提（ユーザー決定事項）**: 認証/認可はアプリごとに **別スタック**で分離する（main = Supabase Auth / admin = Better Auth）。Supabase の cookie 名スコープ変更では分離しない。Admin アプリは Vercel Microfrontends で `/admin/*` プレフィックスを所有する。

---

## サマリ（結論・各主張に出典）

1. **パッケージ**: サーバは `better-auth`、React クライアントは `better-auth/react` の `createAuthClient`。Next.js ハンドラは `better-auth/next-js` の `toNextJsHandler` と `nextCookies()` プラグイン。[docs/integrations/next]
2. **ルート配置**: catch-all ルートは `app/api/auth/[...all]/route.ts` で `export const { GET, POST } = toNextJsHandler(auth)`。サーバ config は `lib/auth.ts`、クライアントは `lib/auth-client.ts`。[docs/integrations/next]
3. **デフォルト cookie 名**: `better-auth.session_token`（`${prefix}.${name}`、prefix 既定 `better-auth`）。`advanced.cookiePrefix` で変更可。[docs/concepts/cookies]
4. **Supabase との非衝突**: Supabase は `sb-<project-ref>-auth-token`、Better Auth は `better-auth.session_token` と **名前空間が完全に別**なので、同一オリジンでも cookie は自然に共存する（衝突なし）。[docs/concepts/cookies + Supabase cookie 命名]
5. **basePath（重要）**: Better Auth の `basePath`（既定 `/api/auth`）は「Better Auth のルートがマウントされるパス」。Vercel MFE で `/admin/*` を所有するので `basePath: "/admin/api/auth"` にし、ルートも `app/admin/api/auth/[...all]/route.ts` に置く。[docs/reference/options]
6. **Next.js basePath とは無関係**: Better Auth の `basePath` は auth API のマウント先であって、Next.js の `next.config` の `basePath`（Vercel MFE が禁止）とは別物。[docs/reference/options + Vercel MFE 制約]
7. **baseURL**: 共有ドメイン（例 `https://app.example.com`）を `baseURL`（env `BETTER_AUTH_URL`）に設定。[docs/reference/options]
8. **DB（Drizzle アダプタ）**: 現行 main（mid-2026）の import は `@better-auth/drizzle-adapter` の `drizzleAdapter(db, { provider: "pg", schema })`。旧 v1.x は `better-auth/adapters/drizzle`（内蔵サブパス）だった点に注意。[github main drizzle.mdx]
9. **スキーマ生成**: `npx @better-auth/cli generate`（= `npx auth@latest generate`）で user/session/account/verification のスキーマを生成。Drizzle では `migrate` は使わず、生成後に drizzle-kit で migration。[docs/concepts/cli + docs/adapters/drizzle]
10. **本リポ規約との整合**: 本リポは DB スキーマ/migration を Drizzle（`drizzle/schema`）が source of truth（`.claude/rules/database.md` / `auto-generated.md`）。Better Auth のテーブルも「生成 → `drizzle/schema` に取り込み → drizzle-kit で migration」に統一する。
11. **同一 Postgres 共有**: Supabase の同一 Postgres に Drizzle 経由で接続すれば、Better Auth テーブルは同 DB に同居（`public` など Supabase 側と衝突しない schema/テーブル名で）。[docs/adapters/drizzle]
12. **CSRF/trustedOrigins**: Better Auth は `Origin` ヘッダを `trustedOrigins` に照合し、未信頼オリジンを拒否。`baseURL` は自動的に信頼される。単一オリジン構成なら共有ドメインのみで足りる。[reference/security]
13. **env**: `BETTER_AUTH_SECRET`（必須、`openssl rand -base64 32`）、`BETTER_AUTH_URL`（= baseURL）。`advanced.useSecureCookies` で全環境 Secure 強制。[docs/reference/options + installation]
14. **crossSubDomainCookies は不要**: サブドメイン跨ぎ共有用（`advanced.crossSubDomainCookies`）。今回は単一オリジンなので有効化しない。[docs/concepts/cookies]
15. **認可（admin）**: `admin()` プラグイン（`better-auth/plugins`）で role/permission。サーバ側ガードは `auth.api.getSession({ headers: await headers() })`、権限は `auth.api.userHasPermission(...)`。組織単位なら `organization()` プラグイン。[docs/plugins/admin, /organization, /integrations/next]

---

## 1. Next.js 統合

**パッケージ**: `better-auth`（コア）/ `better-auth/next-js`（ハンドラ・plugin）/ `better-auth/react`（クライアント）。[docs/integrations/next]

### サーバ config（`lib/auth.ts`）

```ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  // ...config（database / plugins など）
  plugins: [nextCookies()], // 配列の最後に置く（推奨）
});
```

- `nextCookies()` は Server Actions での cookie セットを自動処理する。[docs/integrations/next]

### App Router ルートハンドラ（`app/api/auth/[...all]/route.ts`）

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- ドキュメント原文: "You can change the path on your better-auth configuration but it's recommended to keep it as `/api/auth/[...all]`"。[docs/integrations/next]
- ※ マイクロフロントエンド構成では 3・5 章のとおり `app/admin/api/auth/[...all]/route.ts` に配置し `basePath` を合わせる。

### React クライアント（`lib/auth-client.ts`）

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // client 設定（basePath 等）
});
```

[docs/integrations/next]

---

## 2. デフォルト session cookie 名 & プレフィックス

- cookie 命名パターンは `${prefix}.${cookie_name}`。既定 prefix は **`better-auth`** → **デフォルト session cookie = `better-auth.session_token`**。[docs/concepts/cookies]
- 全 cookie は本番モードで `httpOnly` かつ `secure`。[docs/concepts/cookies]

### プレフィックス変更（`advanced.cookiePrefix`）

```ts
export const auth = betterAuth({
  advanced: {
    cookiePrefix: "admin", // → "admin.session_token"
  },
});
```

[docs/concepts/cookies]

個別 cookie 名は `advanced.cookies.session_token.name` でも上書き可。[docs/concepts/cookies]

### Supabase との非衝突（共有ドメインでの自然な分離）

- Supabase Auth（`@supabase/ssr`）の cookie 名は `sb-<project-ref>-auth-token`（PKCE 分割時は `.0` `.1` サフィックス）。
- Better Auth の cookie 名は `better-auth.session_token`。
- 両者は **名前空間が完全に別**なので、同一オリジン（同一ドメイン）でも cookie が上書き/衝突しない。**Supabase の cookie 名をいじる必要はなく**、別スタック採用だけで自然に分離される。[docs/concepts/cookies]
- 明示的に分けたい場合は admin 側で `cookiePrefix: "admin"` にしてもよいが、必須ではない。

---

## 3. basePath（パス合成マイクロフロントエンドでの auth API 配置）

- Better Auth の `basePath`（既定 `/api/auth`）は「Better Auth のルートがマウントされるパス」を指す。[docs/reference/options]
- Vercel Microfrontends では admin アプリが `/admin/*` を所有する。auth エンドポイントを admin 所有プレフィックス配下に収めるため、`basePath` を `/admin/api/auth` にする。

```ts
// lib/auth.ts（admin app）
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL, // = 共有ドメイン（例 https://app.example.com）
  basePath: "/admin/api/auth",          // admin が所有する /admin/* 配下に auth API を置く
  // ...
});
```

```ts
// app/admin/api/auth/[...all]/route.ts（admin app）
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);
```

```ts
// lib/auth-client.ts（admin app）
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL, // 共有ドメイン
  basePath: "/admin/api/auth",                       // サーバ basePath と一致させる
});
```

### Next.js の basePath とは別物（重要）

- Better Auth の `basePath` は **auth API のマウント先**（アプリの `betterAuth({ basePath })`）。
- Next.js の `next.config.js` の `basePath`（アプリ全体をパスプレフィックス下に置く機能）とは無関係。
- Vercel Microfrontends は「子アプリ側で Next.js の `basePath` を設定しない」ことを要求する（パス所有・ルーティングは MFE 側 routing で行うため）。したがって **Next.js basePath は使わず**、パス所有は Vercel MFE のルーティングで、auth API のプレフィックスは **Better Auth の `basePath`** で表現する。[docs/reference/options + Vercel MFE 制約]

---

## 4. DB（既存 Supabase Postgres + Drizzle）

### アダプタ（現行 mid-2026）

現行 main ブランチのドキュメント（`docs/content/docs/adapters/drizzle.mdx`）では import は次のとおり:

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./drizzle";   // 既存 Drizzle インスタンス（Supabase Postgres 接続）
import { schema } from "./schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      // 既存テーブル名が異なる場合はマッピング（例: user: schema.users）
    },
  }),
});
```

[github main: docs/content/docs/adapters/drizzle.mdx]

> ⚠️ **バージョン注意**: 現行 main（mid-2026）は import が `@better-auth/drizzle-adapter`（別パッケージ）。Better Auth v1.x 系では内蔵サブパス `better-auth/adapters/drizzle` だった。**実際に採用する Better Auth のバージョンで import 元を確認すること**（両方観測されたため、pin したバージョンの公式 docs を必ず参照）。provider は PostgreSQL = `"pg"`。[docs/adapters/drizzle / github main]

- 直接 `pg.Pool` を使う場合は `database: pool`（Kysely 内蔵アダプタ）でも可だが、本リポは Drizzle が DB の source of truth のため **Drizzle アダプタを採用**する。

### スキーマ生成 → drizzle migration

Better Auth が必要とする 4 テーブル **user / session / account / verification**（+ plugin ごとの追加テーブル）を生成する。[docs/adapters/drizzle]

```bash
# 1) Better Auth 設定・プラグインから必要スキーマを生成（Drizzle 向けに schema.ts を出力）
npx @better-auth/cli generate         # = npx auth@latest generate

# 2) Drizzle 側で migration 生成・適用（Drizzle が migration の source of truth）
npx drizzle-kit generate
npx drizzle-kit migrate
```

- CLI `--config` で auth 設定ファイルの場所を指定可（既定探索: `./`, `./utils`, `./lib`）。[docs/concepts/cli]
- **`@better-auth/cli migrate` は内蔵 Kysely アダプタ専用**。Drizzle/Prisma では `generate` のみ使い、適用は各 ORM のマイグレーションツールで行う。[docs/concepts/cli]

### 本リポ規約との整合（重要）

- 本リポは **DB スキーマ/RLS/migration を Drizzle（`drizzle/schema/*.ts`）が source of truth**（`.claude/rules/database.md` / `supabase-config.md` / `auto-generated.md`）。
- したがって Better Auth テーブルは「`@better-auth/cli generate` で生成 → 出力を `drizzle/schema` の Drizzle スキーマとして取り込み → `devenv tasks run app:migrate-dev` で migration 適用（本番は承認必須）」というフローに乗せる。
- Supabase の同一 Postgres に同居させる（Supabase Auth の `auth.users` とは別テーブル群。Better Auth は独自の `user`/`session`/`account`/`verification` を持つ）。名前衝突を避けるため、必要なら Better Auth テーブルにプレフィックス（`schema` マッピング）を付けることを検討。

---

## 5. CSRF / trustedOrigins / env

### env（必須）

```bash
BETTER_AUTH_SECRET=<openssl rand -base64 32 で生成した 32+ 文字>   # 必須（署名/暗号/ハッシュ）
BETTER_AUTH_URL=https://app.example.com                           # = baseURL（共有ドメイン）
```

- `secret` の env フォールバックは `BETTER_AUTH_SECRET` → `AUTH_SECRET`。本番は明示設定必須。[docs/reference/options + installation]
- `baseURL` の env フォールバックは `BETTER_AUTH_URL`。[docs/reference/options]
- 本リポではシークレットは **Doppler 管理**（`.claude/rules/mcp-doppler.md`）。`BETTER_AUTH_SECRET` は Doppler に登録し、`env/*/.env.local` には非機密のみ。

### CSRF / trustedOrigins

- Better Auth は各リクエストの **`Origin` ヘッダを検証**し、アプリまたは明示的に信頼したソース以外を **拒否**する（CSRF 保護）。[reference/security]
- `trustedOrigins` は静的配列 / 動的関数 / ワイルドカード（`*`, `**`）に対応。`baseURL` は**自動的に信頼**される。[docs/reference/options]
- **単一オリジン（共有ドメイン）構成**では、`baseURL` = 共有ドメインが自動信頼されるため、通常は追加不要。プレビュー/別ホストから叩く場合のみ `trustedOrigins` に追加。

```ts
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL, // 自動的に trustedOrigins に含まれる
  trustedOrigins: [
    // 必要な場合のみ追加（例: プレビュー環境）
    // "https://*.example.com",
  ],
  advanced: {
    useSecureCookies: true, // 全環境で Secure を強制（本番前提。ローカル http では無効化検討）
  },
});
```

### crossSubDomainCookies（今回は不要）

- `advanced.crossSubDomainCookies`（`enabled` / `domain` / `additionalCookies`）は **サブドメイン跨ぎで cookie 共有**する場合の設定。[docs/concepts/cookies]
- 今回は main/admin が **同一オリジン（同一ホスト＋パス分割）** なので、サブドメイン共有は発生せず **有効化しない**。

---

## 6. Admin の認可（authz）

### admin プラグイン

```ts
// lib/auth.ts（server）
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [admin(/* { adminRoles: ["admin", "superadmin"], defaultRole: "user", adminUserIds: [...] } */)],
});
```

```ts
// lib/auth-client.ts（client）
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [adminClient()],
});
```

- 既定 role は `admin`（全権）/ `user`（権限なし）。[docs/plugins/admin]
- カスタム権限は `createAccessControl`（`better-auth/plugins/access`）で `statement` を定義し、`ac.newRole({...})` で role を作成、server/client 双方の `admin({ ac, roles })` に渡す。[docs/plugins/admin]
- `admin({ adminRoles, defaultRole, adminUserIds })` で admin 判定を設定。[docs/plugins/admin]

### サーバ側の session ガード（admin ページ保護の基本パターン）

```ts
// app/admin/(protected)/layout.tsx など Server Component
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/sign-in");
  // 追加: role/permission チェック
  return <>{children}</>;
}
```

[docs/integrations/next]

### 権限チェック

```ts
// サーバ側（権限確認）
await auth.api.userHasPermission({
  body: { userId: "id", permissions: { project: ["create"] } },
});

// クライアント側
const canCreate = await authClient.admin.hasPermission({
  permissions: { project: ["create"] },
});

// role の静的チェック
authClient.admin.checkRolePermission({ role: "admin", permissions: { user: ["delete"] } });
```

[docs/plugins/admin]

### organization プラグイン（マルチテナント/組織単位の authz が必要な場合）

```ts
// server
import { organization } from "better-auth/plugins";
export const auth = betterAuth({ plugins: [organization()] });

// client
import { organizationClient } from "better-auth/client/plugins";
export const authClient = createAuthClient({ plugins: [organizationClient()] });
```

- 既定 role: **owner**（全権）/ **admin**（削除・所有権移譲以外）/ **member**（読み取り中心）。組織/メンバー/招待スコープの権限を持つ。カスタム権限は access control で定義。[docs/plugins/organization]
- 単純な「管理者 vs 一般」の admin アプリなら `admin()` プラグインで十分。テナント/組織境界が要る場合に `organization()` を追加検討。

---

## 参考リンク

- [Next.js Integration](https://www.better-auth.com/docs/integrations/next)
- [Cookies](https://www.better-auth.com/docs/concepts/cookies)
- [Options Reference](https://www.better-auth.com/docs/reference/options)
- [Drizzle Adapter](https://www.better-auth.com/docs/adapters/drizzle) / [github main drizzle.mdx](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/adapters/drizzle.mdx)
- [CLI](https://www.better-auth.com/docs/concepts/cli)
- [Admin Plugin](https://www.better-auth.com/docs/plugins/admin)
- [Organization Plugin](https://www.better-auth.com/docs/plugins/organization)
- [Installation](https://www.better-auth.com/docs/installation)
- [llms.txt](https://www.better-auth.com/llms.txt)

## 未解決事項 / 要確認

- **Drizzle アダプタの import 元**: 現行 main は `@better-auth/drizzle-adapter`、旧 v1.x は `better-auth/adapters/drizzle`。**採用バージョンの公式 docs で最終確認**すること（実装時に pin したバージョンで再取得）。
- Vercel Microfrontends の「子アプリで Next.js `basePath` 不可」は Vercel MFE 側のドキュメント制約であり Better Auth の仕様ではない。MFE ルーティング設定（`microfrontends.json` / パス所有）は別途 Vercel 公式で確認。
