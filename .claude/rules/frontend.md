---
paths: frontend/**/*.{ts,tsx,js,jsx}
---

# Frontend Code Standards

## Architecture

- **Pattern**: Feature Sliced Design (FSD)
- **State Management**: TanStack Query for server state, Zustand for global state

### Web (`apps/web/`)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 with App Router |
| UI Library | shadcn/ui (Radix UI + TailwindCSS 4) |
| i18n | next-intl |

### Mobile (`apps/mobile/`)

| Layer | Technology |
|-------|------------|
| Framework | Expo 57, React Native |
| UI Library | gluestack-ui + NativeWind 5 |
| Styling | tva (Tailwind Variant Authority) |
| Icons | @expo/vector-icons / expo-symbols |

## Monorepo Structure

このプロジェクトは Bun workspace によるモノレポ構成：

```
frontend/
├── apps/
│   ├── web/              # Next.js Web アプリ
│   └── mobile/           # Expo React Native アプリ
└── packages/
    ├── tokens/           # ★ デザインシステムの正本 (色 / 角丸 / API 契約)
    ├── ui/               # shadcn/ui + MagicUI (Web / Desktop 用)
    ├── native-ui/        # gluestack-ui + NativeWind (Native 用)
    ├── client/supabase/  # Supabase クライアント
    └── query/            # TanStack Query 設定
```

## Design System Sharing (MANDATORY)

**`@workspace/tokens` がデザインシステムの single source of truth。**

### 何を共有し、何を共有しないか

shadcn/ui の設計思想は「コンポーネントはセマンティックな CSS 変数トークンを参照する。
変数を変えれば全コンポーネントが変わる」であり、**共有されるのはトークンと API であって
クラス文字列ではない**。React Native 側の正統ポートである react-native-reusables も
同じモデル（同じコンポーネント名・同じトークン、コードはプラットフォーム別）を取る。
本リポジトリもこれに従う。

| 層 | 共有 | 実体 | 消費側 |
|----|------|------|--------|
| トークン正本 (OKLCh) | ✅ | `packages/tokens/src/colors.ts` `radius.ts` | 全プラットフォーム |
| CSS 変数 (Web / Desktop) | ✅ | `packages/tokens/web.css`（`.dark` クラス） | `@workspace/ui` |
| CSS 変数 (Native) | ✅ | `packages/tokens/native.css`（`prefers-color-scheme`） | `apps/mobile/global.css` |
| JS 解決値 (hex) | ✅ | `packages/tokens/src/oklch.ts` の `resolvedColors` | react-navigation 等 hex しか受けない API |
| **API 契約**（バリアント名 / サイズ名 / 既定値 / 要求トークン） | ✅ | `packages/tokens/src/contract.ts` | Web / Native 双方の実装 |
| **Tailwind クラス文字列** | ❌ | `packages/ui/src/components/*`<br>`packages/native-ui/components/*` | 各プラットフォーム専用 |

クラス文字列を共有しない理由: Web は `hover:` / `focus-visible:` / `shadow-xs` / `[&_svg]`
を必要とし、React Native はそれらを表現できない。共有すると**最小公倍数まで Web を劣化させる**。

CSS は生成物。手で書き換えず `bun run tokens:build` で再生成する。

### 逸脱を止める仕組み（追加時はこれに倣うこと）

| 逸脱 | 検知 |
|------|------|
| 片方だけにバリアント / サイズを足す・消す | **コンパイル時**。実装側の `satisfies Record<ButtonVariant, string>` が型エラーになる |
| 契約が要求するセマンティックトークンを使っていない | ユニットテスト（`BUTTON_SEMANTICS` 照合） |
| 生パレット（`bg-zinc-900` / `text-white`）を使う | ユニットテスト（`RAW_COLOR_PATTERN`） |

テストは各プラットフォームのパッケージが自分で持つ（依存の向きを `ui`/`native-ui` → `tokens`
の一方向に保つため、`tokens` から実装を import してはいけない）:

- `packages/ui/src/components/__tests__/button.test.tsx`
- `packages/native-ui/components/button/__tests__/variants.test.ts`

### 新しいコンポーネントを両プラットフォームに追加するとき

1. `packages/tokens/src/contract.ts` に名前・既定値・要求セマンティックトークンを追加
2. 各プラットフォームで実装し、variants マップに `satisfies Record<XxxVariant, string>` を付ける
3. 双方に適合テストを追加する

### 新しいアプリ（デスクトップ等）を足すとき

Web 技術ベースのホスト（Electron / Tauri / 別 Next.js アプリ）は、CSS エントリで
共有スタイルを import し、自分のソースパスだけ `@source` で足せばよい。
`@workspace/ui` にアプリ固有パスを書き込んではいけない（パッケージが特定アプリに結合する）。

```css
/* apps/<new-app>/src/app/styles/globals.css */
@import "@workspace/ui/styles/globals.css";

@source "../../../app";
@source "../../../src";
```

### 禁止事項

- `packages/tokens` の外で色を定義する（`Colors` 定数の再定義、CSS への :root 直書き）
- `bg-zinc-900` `text-white` `#0a7ea4` のような生のパレット / hex 指定
- Web と Native で別々のバリアント名を持つ（`variant="solid"` vs `variant="default"` のような分岐）

## DRY Principle (MANDATORY)

**重複実装は徹底的に排除し、コードをクリーンに保つ。**

### 共通化の原則

| 対象 | 配置場所 | 例 |
|------|---------|-----|
| **Web / Desktop UI コンポーネント** | `packages/ui/` | Button, Card, Input (shadcn/ui) |
| **Mobile UI コンポーネント** | `packages/native-ui/` | Button, Card (gluestack-ui) |
| **デザイントークン / コンポーネント API 契約** | `packages/tokens/` | colors, radius, contract (BUTTON_VARIANTS 等), web.css, native.css |
| **Supabase クライアント** | `packages/client-supabase/` | createClient, types |
| **TanStack Query 設定** | `packages/query/` | QueryClient, hooks |
| **型定義** | `packages/*/types/` | 共通インターフェース |
| **ユーティリティ** | `packages/ui/lib/` or app の `shared/lib/` | cn, formatDate |

### 禁止事項

```typescript
// ❌ Bad: 各アプリで同じコンポーネントを実装
// apps/web/src/shared/ui/button.tsx
// apps/mobile/components/ui/button.tsx (同じロジック)

// ✅ Good: packages で共通化（プラットフォーム別）
// packages/ui/components/button.tsx (Web)
// packages/native-ui/components/button/ (Mobile)
import { Button } from '@workspace/ui/components/button' // Web
import { Button } from '@workspace/native-ui/components/button' // Mobile
```

```typescript
// ❌ Bad: Supabase クライアントを各アプリで個別定義
// apps/web/src/shared/lib/supabase/client.ts
// apps/mobile/lib/supabase.ts

// ✅ Good: packages で共通化
// packages/client-supabase/src/client.ts
import { createBrowserClient } from '@workspace/client-supabase'
```

```typescript
// ❌ Bad: シングルトンインスタンスの重複
const queryClient = new QueryClient() // apps/web
const queryClient = new QueryClient() // apps/mobile

// ✅ Good: 共通設定を packages で管理
// packages/query/src/client.ts
import { queryClient, defaultOptions } from '@workspace/query'
```

### チェックリスト

新しいコードを書く前に確認：

1. **既存の packages に同様の機能があるか？** → あれば再利用
2. **他のアプリでも使う可能性があるか？** → あれば packages に実装
3. **ビジネスロジックが重複していないか？** → 共通化を検討
4. **型定義が重複していないか？** → 共通の types パッケージを使用

## Code Style

- **Linting & Formatting**: Biome
- **Indentation**: 2 spaces
- **Line Width**: 100 characters
- **Quotes**: Single quotes
- **Semicolons**: As needed
- **TypeScript**: Strict mode enabled

## Import Organization

```typescript
// 1. External packages
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Workspace packages
import { Button } from '@workspace/ui/components/button' // Web
import { Button } from '@workspace/native-ui/components/button' // Mobile
import { colors } from '@workspace/tokens'
import { createClient } from '@workspace/client-supabase/client'

// 3. FSD layers (top to bottom)
import { Header } from '@/widgets/header'
import { LoginForm } from '@/features/auth'
import { useUserStore } from '@/entities/user'
import { cn } from '@/shared/lib/utils'

// 4. Relative imports
import { SomeComponent } from './SomeComponent'
```

## CSS/Styling Rules

**MANDATORY**: Use CSS variables, never hardcode colors.

```typescript
// ✅ Good: CSS variables
<Card className="border-border bg-background">
  <h2 className="text-foreground">Title</h2>
  <p className="text-muted-foreground">Description</p>
</Card>

// ❌ Bad: Hardcoded colors
<Card className="border-gray-200 bg-white">
  <h2 className="text-black">Title</h2>
</Card>
```

## Date/Time Handling

To prevent hydration errors:

- **DB Storage**: `toISOString()` for UTC format
- **Server → Client**: Pass ISO string (not Date object)
- **Timezone Conversion**: Only in `useEffect` on client side

```typescript
// ✅ Good
<DateDisplay utcDate={event.date.toISOString()} />

// ❌ Bad: Date object as prop
<DateDisplay utcDate={new Date()} />

// ❌ Bad: toLocaleString in Server Component
const formatted = new Date(utcDate).toLocaleString('ja-JP')
```

## Testing

- **Framework**: Vitest with jsdom environment
- **RLS Testing**: pgTAP via `supabase test db` — tests live in `supabase/tests/*.sql`
- **TDD**: Write failing tests first, then implement
