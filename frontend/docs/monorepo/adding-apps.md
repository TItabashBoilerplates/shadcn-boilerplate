# 新しいアプリの追加方法

このドキュメントでは、モノレポに新しいアプリケーションを追加する手順を解説します。

---

## 📋 概要

このボイラープレートは**単一アプリ**（`apps/web`）として提供されていますが、**複数アプリへの拡張**を前提とした設計になっています。

### 追加できるアプリの種類

- 🔐 **管理画面** (`apps/admin`) - Next.js
- 👤 **ユーザー向けアプリ** (`apps/web`) - 既存
- 📱 **モバイルアプリ** (`apps/mobile`) - React Native / Expo
- 📚 **ドキュメントサイト** (`apps/docs`) - Next.js / Docusaurus
- 🔌 **その他のアプリ**

---

## 🎯 設計原則（重要）

新しいアプリを追加する際は、以下の原則を守ってください：

### ✅ DO（推奨）

1. **FSD構造を維持する**
   - アプリ専用のUIは `src/shared/ui/` に配置
   - アプリ専用のロジックは `src/shared/lib/` に配置

2. **実際に共有されるコードのみ `packages/` に置く**
   - 複数アプリで使うことが確定してから共有化

3. **段階的に共有化する**
   - 最初はアプリ内で実装
   - 必要になったら `packages/` に移行

### ❌ DON'T（非推奨）

1. **アプリ専用パッケージを作らない**
   - `packages/ui-admin/` ← ❌
   - `packages/web-components/` ← ❌

2. **推測で共有化しない**
   - 「将来使うかも」で `packages/` に置かない

3. **FSDを無視しない**
   - アプリ専用コードは `src/shared/` で管理

詳細は [設計原則](./design-principles.md) を参照してください。

---

## 🚀 管理画面の追加

> **前提（必読）**: 管理画面（admin）は **Vercel Microfrontends の child application** として、メインアプリ（web = default application）と**単一ドメイン配下でパス合成**（`/admin/*`）し、**認証・認可は分離**する方針です。合成設定（`microfrontends.json` / `withMicrofrontends`）と Supabase cookie 名スコープによるセッション分離の全体像は先に **[マイクロフロントエンド運用ガイド](./microfrontends.md)** を読んでください。本節はその前提での具体手順です。

### Step 1: アプリのひな形作成

web をベースにディレクトリを作成する（コピー後に admin 固有へ書き換える）:

```bash
cd frontend/apps
cp -r web admin
cd admin
```

> **注**: admin は basePath を使わずルート `/` で実装し、`/admin` への割り当ては後述の `microfrontends.json` で行います（Vercel Microfrontends は `basePath` 非対応）。

### Step 2: `package.json` の編集

```json
{
  "name": "@workspace/admin",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@vercel/microfrontends": "^2.3.6",
    "better-auth": "^1.2.0",
    "@workspace/ui": "workspace:*",
    "@workspace/types": "workspace:*",
    "@workspace/client-supabase": "workspace:*",
    "next": "^16.0.8",
    "next-intl": "^4.4.0",
    "react": "19.2.1",
    "react-dom": "19.2.1"
  }
}
```

**ポイント:**
- `name` を `@workspace/admin` に変更（`microfrontends.json` の application 名 or `packageName` と一致させる）
- `@vercel/microfrontends` を追加（child app として必須）
- **認証は Better Auth**（`better-auth`）。Supabase の認証専用パッケージ（`@workspace/auth`）は admin では使わない
- `@workspace/client-supabase` は admin が Supabase の**データ**（DB/Storage）にアクセスする場合のみ。認証は Better Auth が担う
- `dev` はローカル proxy とポート同期させる → `"dev": "next dev --port $(microfrontends port)"`

### Step 3: 不要なファイルの削除

```bash
# ユーザー向けコンテンツを削除
rm -rf src/features/landing
rm -rf src/features/pricing

# 管理画面用にディレクトリを作成
mkdir -p src/features/dashboard
mkdir -p src/features/user-management
```

### Step 4: 依存関係のインストール

`devenv shell`（direnv 経由含む）進入時に `setup:install-frontend` task が lockfile 変更を検知して `bun install` を自動実行するため、通常は手動不要。個別追加は `ni`（= `bun add`）を使う（`.claude/rules/commands.md`）。

```bash
cd frontend/apps/admin && ni @vercel/microfrontends
```

### Step 5: 開発サーバーの起動

フロント dev は devenv scripts を使う（`cd frontend && bun run X` の直接実行は禁止）。`devenv.nix` の `frontendApps` に admin を追加すると `dev-admin` / `dev-all` が自動生成される（後述の devenv 連携 / [microfrontends.md §3](./microfrontends.md#3-devenv-との連携プロセススクリプト)）。

```bash
dev-admin        # 軽量セット + admin dev サーバー
dev-all          # 軽量セット + 全 frontendApps（web + admin + mobile）
```

Turborepo が dev タスク実行時に Vercel Microfrontends の local proxy を自動起動する。proxy URL（既定 `http://localhost:3024`）で `/` = web、`/admin` = admin の合成状態を確認できる。

### Step 6: 管理画面専用UIの作成

```typescript
// apps/admin/src/shared/ui/DataTable.tsx
'use client'

export function DataTable<T>({ data, columns }: DataTableProps<T>) {
  // 管理画面専用のデータテーブル実装
  return (
    <div className="rounded-md border">
      {/* テーブル実装 */}
    </div>
  )
}
```

**重要:** 管理画面専用UIは `packages/ui/` ではなく、`apps/admin/src/shared/ui/` に配置してください。

### Step 7: マイクロフロントエンド合成の配線

admin を web（default app）に child として合成する。

**7-1. `next.config` を `withMicrofrontends` でラップ**（basePath は使わない）:

```ts
// apps/admin/next.config.ts
import { withMicrofrontends } from '@vercel/microfrontends/next/config'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/shared/config/i18n/request.ts')
const nextConfig: NextConfig = {}

export default withMicrofrontends(withNextIntl(nextConfig))
```

**7-2. default app（web）の `microfrontends.json` に admin を登録**:

```jsonc
// apps/web/microfrontends.json
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json",
  "applications": {
    "web": { "development": { "fallback": "your-web-app.vercel.app" } },
    "admin": {
      "packageName": "@workspace/admin",
      "routing": [{ "paths": ["/admin/:path*"] }]
    }
  }
}
```

> `microfrontends.json` は **default app（web）にのみ**置く。詳細は [microfrontends.md §1](./microfrontends.md#1-vercel-microfrontends-セットアップ)。

### Step 8: 認証・認可の分離（必須 / Better Auth を追加）

**このリポジトリでは、認証・認可はアプリごとに認証スタック自体を分ける**。メイン（web）は Supabase Auth のまま、**管理者（admin）は Better Auth を追加**する（Supabase Auth 単独でアプリ間分離することは基本しない）。別システム = 別 cookie（web=`sb-<ref>-auth-token` / admin=`better-auth.session_token`）なので単一ドメインでも自然に分離される。全体像・DB・環境変数は [microfrontends.md §2](./microfrontends.md#2-認証認可の分離アプリごとに認証スタックを分ける) を必読。

> 着手前に `better-auth-best-practices` / `better-auth-security-best-practices` Skill を起動し、[better-auth.com/docs](https://better-auth.com/docs) で最新 API を確認すること。

**8-1. Better Auth を導入**

```bash
cd frontend/apps/admin && ni better-auth
```

```ts
// apps/admin/src/shared/lib/auth/auth.ts
import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'

export const auth = betterAuth({
  basePath: '/admin/api/auth', // admin が専有する /admin 配下に置く（Next.js basePath とは別物）
  emailAndPassword: { enabled: true },
  // database: Supabase Postgres を Drizzle adapter で。テーブルは generate → drizzle migration
  plugins: [nextCookies()], // ← 必ず最後
})
```

**8-2. ルートハンドラを admin 専有パス配下に置く**

```ts
// apps/admin/app/admin/api/auth/[...all]/route.ts
import { auth } from '@/shared/lib/auth/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

**8-3. 認可ガード（サーバー側でセッション検証）**

```ts
// apps/admin/src/shared/lib/auth/guard.ts
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './auth'

export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect('/admin/login')
    return
  }
  // 認可: 管理者ロール（admin / organization プラグインの設計に合わせる）
  if (session.user.role !== 'admin') {
    redirect('/admin/login')
    return
  }
  return session
}
```

```ts
// apps/admin/app/admin/dashboard/page.tsx
import { requireAdmin } from '@/shared/lib/auth/guard'

export default async function DashboardPage() {
  const session = await requireAdmin()
  return <div>Admin Dashboard</div>
}
```

**8-4. DB（Drizzle 一元管理）**: Better Auth のテーブル（`user`/`session`/`account`/`verification`）は `npx @better-auth/cli generate` でスキーマ化し、**Drizzle（`drizzle/schema/`）に取り込んでマイグレーション**する（`.claude/rules/database.md`）。`@better-auth/cli migrate` で直接 DB に当てない。

**8-5. 環境変数**: `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`（= 共有ドメイン）/ `trustedOrigins`。**Secret は Doppler 管理**（`.claude/rules/mcp-doppler.md`）。

### Step 9: devenv `frontendApps` に登録

`devenv.nix` の `frontendApps` attrset に 1 行追加すると process / `dev-admin` script / `dev-all` が自動連動する:

```nix
frontendApps = {
  web   = { port = 3000; };
  admin = { port = 3001; };   # ← 追加
  mobile = { port = 8081; ready = "/status"; exec = ''…''; };
};
```

---

## 📱 モバイルアプリの追加

### Step 1: Expoプロジェクトの作成

```bash
cd frontend/apps
bunx create-expo-app mobile
cd mobile
```

### Step 2: ワークスペース依存関係の追加

```json
// apps/mobile/package.json
{
  "name": "@workspace/mobile",
  "dependencies": {
    "@workspace/ui": "workspace:*",
    "@workspace/types": "workspace:*",
    "@workspace/utils": "workspace:*",
    "@workspace/api-client": "workspace:*",
    "expo": "~51.0.0",
    "react": "19.1.0",
    "react-native": "0.75.0"
  }
}
```

### Step 3: FSD構造の作成

```bash
cd apps/mobile
mkdir -p src/{app,features,entities,shared}
mkdir -p src/shared/{ui,lib,api,config}
```

### Step 4: 共有UIコンポーネントの使用

```typescript
// apps/mobile/src/shared/ui/Button.tsx
import { Button as BaseButton } from '@workspace/ui/components/button'

// React Native用にラップ
export function Button(props) {
  return <BaseButton {...props} />
}
```

**注意:** Web用のshadcn/uiコンポーネントは、React Nativeでは**そのまま使えません**。ラッパーを作成するか、モバイル専用UIを `src/shared/ui/` に実装してください。

### Step 5: モバイル専用UIの実装

```typescript
// apps/mobile/src/shared/ui/BottomTab.tsx
import { View, Text, TouchableOpacity } from 'react-native'

export function BottomTab({ items }) {
  // モバイル専用のボトムタブ実装
  return (
    <View>
      {items.map(item => (
        <TouchableOpacity key={item.id}>
          <Text>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
```

---

## 🏗️ 共有コンポーネントの判断

### シナリオ1: Button（全アプリ共通）

```
✅ packages/ui/components/ui/button.tsx

理由: admin、web、mobile全てで使用される
```

### シナリオ2: DataTable（管理画面専用）

```
✅ apps/admin/src/shared/ui/DataTable.tsx

理由: 管理画面でしか使わない
```

### シナリオ3: Hero（ユーザー向けアプリ専用）

```
✅ apps/web/src/shared/ui/Hero.tsx

理由: ユーザー向けアプリでしか使わない
```

### シナリオ4: BottomTab（モバイル専用）

```
✅ apps/mobile/src/shared/ui/BottomTab.tsx

理由: モバイルアプリでしか使わない
```

### シナリオ5: PricingCard（web と admin で使用）

**初期:**
```
apps/web/src/shared/ui/PricingCard.tsx  # web専用
```

**admin でも使うことが確定したら:**
```bash
# packages/ に移行
mv apps/web/src/shared/ui/PricingCard.tsx packages/ui/components/pricing-card.tsx
```

**移行後:**
```typescript
// apps/web & apps/admin
import { PricingCard } from '@workspace/ui/components/pricing-card'
```

---

## ⚙️ デプロイ設定

### Vercel Microfrontends（web + admin）

web と admin は**それぞれ独立した Vercel project** としてデプロイし、同一の microfrontends group に所属させて**単一ドメインでパス合成**する。事前に group を作成し（`vercel microfrontends create-group` または Dashboard の Settings → Microfrontends）、**default application に web** を指定しておく。

#### ユーザー向けアプリ（web = default application）

**Vercel Project Settings:**
- **Root Directory:** `frontend/apps/web`
- **Build Command:** `cd ../.. && turbo build --filter=@workspace/web`
- **Output Directory:** `apps/web/.next`
- **Environment Variables:** `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `microfrontends.json` は **この project にのみ**デプロイされる（合成ルーティングの source of truth）

#### 管理画面（admin = child application）

**Vercel Project Settings:**
- **Root Directory:** `frontend/apps/admin`
- **Build Command:** `cd ../.. && turbo build --filter=@workspace/admin`
- **Output Directory:** `apps/admin/.next`
- **Environment Variables:** `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

> **独立デプロイの注意**: web と admin は lockstep で出ない。`microfrontends.json` のパス割り当てを変える前に受け手アプリが対応済みであることを確認し、まず Preview で検証してから production へ。詳細は [microfrontends.md §1.5](./microfrontends.md#15-デプロイ各アプリ独立の-vercel-project)。

### Expo EAS（モバイル）

```bash
cd apps/mobile
eas init
eas build --platform ios
eas build --platform android
```

---

## 🔧 Turborepo設定

### `turbo.json` に追加

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### フィルタリングコマンド

```bash
# 管理画面のみビルド
turbo build --filter=@workspace/admin

# ユーザー向けアプリのみビルド
turbo build --filter=@workspace/web

# すべてのアプリをビルド
turbo build
```

---

## 🧪 テスト

### アプリが正しく動作するか確認

すべて devenv scripts を使う（`.claude/rules/commands.md`）:

```bash
# 1. 依存関係は devenv shell 進入時に自動同期（setup:install-frontend）

# 2. 品質チェック（型・lint・format）
type-check-frontend
lint-frontend
ci-check                 # 全プロジェクト CI チェック

# 3. ビルド
build-frontend

# 4. 開発サーバー起動（Vercel Microfrontends proxy 込み）
dev-all
```

**確認項目:**
- [ ] すべてのアプリが起動する
- [ ] 共有パッケージが正しくインポートできる
- [ ] 型エラーがない
- [ ] ビルドエラーがない
- [ ] ローカル proxy（`http://localhost:3024`）で `/` = web、`/admin` = admin に合成される
- [ ] web（Supabase Auth）と admin（Better Auth）でセッションが分離している（別 cookie: `sb-*` / `better-auth.session_token`）
- [ ] admin の未認証・非管理者アクセスが `/admin/login` にリダイレクトされる

---

## 📊 ディレクトリ構造（複数アプリ）

```
frontend/
├── apps/
│   ├── admin/                    # 管理画面
│   │   ├── app/
│   │   ├── src/
│   │   │   ├── features/
│   │   │   │   ├── dashboard/
│   │   │   │   └── user-management/
│   │   │   └── shared/
│   │   │       └── ui/          # 管理画面専用UI
│   │   │           ├── DataTable.tsx
│   │   │           └── AnalyticsChart.tsx
│   │   └── package.json
│   │
│   ├── web/                      # ユーザー向けアプリ
│   │   ├── app/
│   │   ├── src/
│   │   │   ├── features/
│   │   │   │   ├── landing/
│   │   │   │   └── pricing/
│   │   │   └── shared/
│   │   │       └── ui/          # Web専用UI
│   │   │           ├── Hero.tsx
│   │   │           └── PricingCard.tsx
│   │   └── package.json
│   │
│   └── mobile/                   # モバイルアプリ
│       ├── src/
│       │   ├── features/
│       │   └── shared/
│       │       └── ui/          # モバイル専用UI
│       │           ├── BottomTab.tsx
│       │           └── SwipeableCard.tsx
│       └── package.json
│
├── packages/
│   ├── ui/                       # 全アプリ共通UIのみ
│   │   └── components/ui/
│   │       ├── button.tsx       # 全アプリで使用
│   │       ├── card.tsx         # 全アプリで使用
│   │       └── dialog.tsx       # 全アプリで使用
│   ├── types/                    # 型定義（全アプリ共通）
│   ├── utils/                    # ユーティリティ（全アプリ共通）
│   └── api-client/               # APIクライアント（全アプリ共通）
│
└── turbo.json
```

---

## ✅ チェックリスト

新しいアプリを追加する前に確認：

- [ ] [設計原則](./design-principles.md) と [マイクロフロントエンド運用ガイド](./microfrontends.md) を読んだ
- [ ] アプリ専用UIは `src/shared/ui/` に配置する
- [ ] アプリ専用パッケージ（`ui-{app}`）は作らない
- [ ] 実際に共有されるコードのみ `packages/` に置く
- [ ] FSD構造を維持する
- [ ] `package.json` の name（`microfrontends.json` の application 名 / `packageName` と一致）を変更する
- [ ] `@vercel/microfrontends` を導入し `next.config` を `withMicrofrontends` でラップした（Next.js basePath は使わない）
- [ ] default app（web）の `microfrontends.json` に child の `routing.paths` を登録した
- [ ] admin は **Better Auth** を追加し、web（Supabase Auth）と認証スタックを分離した
- [ ] Better Auth の `basePath` を `/admin/api/auth` にし、route handler を admin 専有パス配下に置いた
- [ ] Better Auth のテーブルは generate → Drizzle マイグレーションで一元管理した
- [ ] 認可ガードを admin 内に実装し `auth.api.getSession()` で検証している
- [ ] `devenv.nix` の `frontendApps` に登録した
- [ ] Turborepo / デプロイ（Vercel Microfrontends group）設定を確認する

---

## 🔄 既存アプリからの共有化

### Step 1: 複数アプリで使うことが確定

```typescript
// apps/admin と apps/web で PricingCard が必要
```

### Step 2: packages/ に移行

```bash
mv apps/web/src/shared/ui/PricingCard.tsx packages/ui/components/pricing-card.tsx
```

### Step 3: インポートパスを更新

```typescript
// Before
import { PricingCard } from '@/shared/ui/PricingCard'

// After
import { PricingCard } from '@workspace/ui/components/pricing-card'
```

### Step 4: 両アプリで動作確認

```bash
turbo build --filter=@workspace/admin --filter=@workspace/web
```

---

## 📚 関連ドキュメント

- [設計原則](./design-principles.md) - **必読**
- [アーキテクチャ設計図](./architecture.md)
- [設定ファイルガイド](./configuration-guide.md)
- [トラブルシューティング](./troubleshooting.md)

---

**重要:** アプリ追加時は、必ず[設計原則](./design-principles.md)に従ってください。過度な抽象化を避け、実際のニーズに基づいて設計することが成功の鍵です。
