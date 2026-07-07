---
name: monorepo
description: Frontend モノレポ + FSD アーキテクチャガイダンス。Bun workspace構成、apps/packages、@workspace/* インポート、FSDレイヤーとの関係についての質問に使用。共有パッケージとFSD層の責務分担、新しいパッケージ追加の実装支援を提供。
---

# Frontend モノレポ + FSD アーキテクチャ

このプロジェクトは **Bun workspace モノレポ** と **Feature Sliced Design (FSD)** を組み合わせた構成です。Web は **Vercel Microfrontends（マネージド製品）でマイクロフロントエンドとして運用**します（各 `apps/*` を独立した Vercel project としてデプロイし、単一ドメインでパス合成）。合成方式と**管理者アプリ/メインアプリの認証・認可の分離**は下記「マイクロフロントエンド運用」節と [microfrontends.md](../../../frontend/docs/monorepo/microfrontends.md) を参照。

## 全体構成

```
frontend/
├── apps/                        # アプリケーション
│   ├── web/                     # Next.js 16 Web App
│   │   ├── app/                 # Next.js App Router
│   │   └── src/                 # FSD レイヤー ← ここがFSD
│   │       ├── app/            # FSD Application層
│   │       ├── views/          # FSD Views層
│   │       ├── widgets/        # FSD Widgets層
│   │       ├── features/       # FSD Features層
│   │       ├── entities/       # FSD Entities層
│   │       └── shared/         # FSD Shared層
│   └── mobile/                  # Expo React Native App
│
└── packages/                    # 共有パッケージ（クロスプラットフォーム）
    ├── auth/                    # @workspace/auth - 認証管理
    ├── query/                   # @workspace/query - TanStack Query
    ├── types/                   # @workspace/types - Supabase型
    ├── ui/                      # @workspace/ui - shadcn/ui
    ├── app/                     # @workspace/app - 共有ロジック
    └── client/supabase/         # @workspace/client-supabase
```

## 責務の分担

### packages/ （モノレポ共有）
**Web/Mobile 両方で使用**するコード:
- 認証ストア・プロバイダー (@workspace/auth)
- API クライアント (@workspace/client-supabase)
- 型定義 (@workspace/types)
- UI コンポーネント (@workspace/ui)
- TanStack Query (@workspace/query)

### apps/web/src/ （FSD）
**Web アプリ固有**のコード:
- ページ実装 (views/)
- 複合UI (widgets/)
- ビジネス機能 (features/)
- エンティティ (entities/)
- アプリ固有の共有コード (shared/)

## インポートの階層

```
apps/web/src/ (FSD)
    │
    ├── @/views/*        ← FSD Views層
    ├── @/widgets/*      ← FSD Widgets層
    ├── @/features/*     ← FSD Features層
    ├── @/entities/*     ← FSD Entities層
    ├── @/shared/*       ← FSD Shared層
    │
    └── @workspace/*     ← モノレポ共有パッケージ
        ├── @workspace/auth
        ├── @workspace/query
        ├── @workspace/ui/components
        ├── @workspace/client-supabase
        └── @workspace/types
```

## インポートパターン

```typescript
// モノレポ共有パッケージ（Web/Mobile共通）
import { useAuth, AuthProvider } from '@workspace/auth'
import { useQuery, QueryProvider } from '@workspace/query'
import { Button, Card } from '@workspace/ui/components'
import { createClient } from '@workspace/client-supabase/server'
import type { Tables } from '@workspace/types/schema'

// FSD レイヤー（Web固有）
import { HomePage } from '@/views/home'
import { Header } from '@/widgets/header'
import { LoginForm } from '@/features/auth'
import { useUserStore, UserAvatar } from '@/entities/user'
import { cn } from '@/shared/lib/utils'
```

## パッケージ一覧

| パッケージ | 名前 | 用途 | 利用先 |
|-----------|------|------|--------|
| `packages/auth/` | @workspace/auth | Zustand認証ストア | Web, Mobile |
| `packages/query/` | @workspace/query | TanStack Query wrapper | Web, Mobile |
| `packages/types/` | @workspace/types | Supabase生成型 | Web, Mobile, Edge |
| `packages/ui/` | @workspace/ui | shadcn/ui | Web |
| `packages/app/` | @workspace/app | 共有エンティティ・機能 | Web, Mobile |
| `packages/client/supabase/` | @workspace/client-supabase | Supabaseクライアント | Web, Mobile |

## Workspace Protocol

```json
{
  "dependencies": {
    "@workspace/auth": "workspace:*",
    "@workspace/query": "workspace:*",
    "@workspace/ui": "workspace:*"
  }
}
```

## コマンド

すべて devenv の **scripts** (PATH 直結)。Makefile は **deprecated**（削除済み）、`cd frontend && bun run X` の直接実行も禁止。

```bash
# 開発
dev-all                          # 軽量セット + 全 frontend apps (web + mobile)
dev-web                          # Web のみ + 軽量セット
dev-mobile                       # Mobile (Metro non-interactive) + 軽量セット
frontend                         # `cd frontend && turbo dev` (devenv 外、対話的 TUI)

# ビルド・チェック
build-frontend                   # Next.js production build
type-check-frontend              # TypeScript 型チェック
lint-frontend                    # Biome lint
ci-check                         # 全プロジェクト CI チェック
```

## マイクロフロントエンド運用（Vercel Microfrontends）

Web は **Vercel Microfrontends**（`@vercel/microfrontends` + `microfrontends.json` + `withMicrofrontends`）で運用する。各 `apps/*` は**独立した Vercel project** としてデプロイしつつ、**単一ドメイン配下でパスベース合成**する（`/` = web = default application、`/admin/*` = admin = child application）。

```
example.com
├── /         → apps/web   (default app, project: web, microfrontends.json を保持)
└── /admin/*  → apps/admin (child app,  project: admin)
```

**要点（着手前に必ず守る）:**

| 項目 | ルール |
|------|--------|
| 合成設定 | `microfrontends.json` は **default app（web）にのみ**置く。child は `routing.paths`（例 `["/admin/:path*"]`）で登録 |
| next.config | 各アプリを `withMicrofrontends(...)` でラップ（本リポジトリの web は `withMicrofrontends(withNextIntl(config))`） |
| `basePath` | **使わない**（Vercel Microfrontends 非対応）。パス割り当ては `microfrontends.json` で行う |
| **認証・認可の分離** | **アプリごとに認証スタックを分ける**。メイン(web) = Supabase Auth、管理者(admin) = **Better Auth**（追加）。別システム = 別 cookie（`sb-<ref>-auth-token` / `better-auth.session_token`）で単一ドメインでも自然分離。**Supabase Auth 単独でアプリ間分離することは基本しない** |
| admin の Better Auth | `basePath` を `/admin/api/auth`（admin 専有パス配下）に。route handler は `app/admin/api/auth/[...all]/`。DB は Supabase Postgres を Drizzle で共有（`generate` → drizzle migration）。認可は `admin`/`organization` プラグイン + `auth.api.getSession()` でガード。着手前に `better-auth-best-practices` Skill を起動 |
| ローカル開発 | Turborepo 統合で proxy 自動起動（既定 `http://localhost:3024`）。`dev-web` / `dev-all` を使う |
| devenv | `devenv.nix` の `frontendApps` に 1 行追加すると process / `dev-<name>` / `dev-all` が自動連動 |

**やってはいけないこと:** admin に Next.js `basePath` を設定する（Better Auth の `basePath` は別物で使う）/ 認証を Supabase Auth 単独でアプリ間分離しようとする（admin は Better Auth を追加）/ Better Auth の認証 API を admin 専有パス外に置く / `@better-auth/cli migrate` で DB に直接当てる（Drizzle 経由）/ `microfrontends.json` を child 側にも置く / admin 専用 UI・feature を `packages/` に置く。

→ 詳細・一次情報・コード例は [microfrontends.md](../../../frontend/docs/monorepo/microfrontends.md)、調査ログは [`docs/_research/2026-07-07-vercel-microfrontends.md`](../../../docs/_research/2026-07-07-vercel-microfrontends.md)。

## 新規パッケージ vs FSDスライス

| 追加したいもの | 配置場所 | 理由 |
|---------------|---------|------|
| Web/Mobile共通のロジック | `packages/` | クロスプラットフォーム共有 |
| Webのみのページ | `apps/web/src/views/` | FSD Views層 |
| Webのみの機能 | `apps/web/src/features/` | FSD Features層 |
| Webのみのエンティティ | `apps/web/src/entities/` | FSD Entities層 |
| 共通UIコンポーネント | `packages/ui/` | shadcn/ui管理 |

## 詳細ドキュメント

- パッケージ詳細: [packages.md](packages.md)
- 実装例: [examples.md](examples.md)
- マイクロフロントエンド運用・認証分離: [microfrontends.md](../../../frontend/docs/monorepo/microfrontends.md)
- 新しいアプリの追加手順: [adding-apps.md](../../../frontend/docs/monorepo/adding-apps.md)
- FSD詳細: [../fsd/SKILL.md](../fsd/SKILL.md)
