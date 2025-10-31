# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a full-stack application boilerplate with a multi-platform frontend and backend services:

### Frontend Architecture
- **Framework**: Next.js, shadcn/ui, TailwindCSS
- **Tech Stack**: React 19, TypeScript, shadcn/ui library, Turbo for build orchestration
- **Build System**: Ultra-runner for concurrent operations, Turbo for dependency management

### Backend Architecture
- **Python Backend**: FastAPI application in `backend-py/` using clean architecture patterns
- **Edge Functions**: Supabase Edge Functions using Hono framework for serverless APIs
- **Database**: PostgreSQL with **Atlas** for schema management, includes pgvector extension for embeddings
- **Schema Management**: Atlas HCL for declarative schema definitions and migrations
- **Infrastructure**: Supabase for auth/database, Docker containerization
- **AI Integration**: LangChain, OpenAI, multi-modal AI capabilities, vector search

### Database Design
- Multi-client architecture with corporate users, general users, and virtual users
- Chat system with rooms, messages, and user relationships
- Vector embeddings table for AI/ML features
- Clean separation between user types and permissions

## Development Commands

### Initial Setup
```bash
make init                    # Full project initialization (run once)
```

### Running Services
```bash
make run                     # Start backend services with Docker
make frontend                # Start frontend (web) development server
make local-ios-ts           # Start iOS development
make local-android-ts       # Start Android development
make stop                   # Stop all services
```

### Database Operations (Atlas-based, Prisma-style)
```bash
# 開発用マイグレーション（Prismaの migrate dev に相当）
make migrate-dev           # マイグレーション生成 + 適用 + 型生成（ローカル専用）
make migration             # migrate-dev のエイリアス

# 本番用マイグレーション適用（Prismaの migrate deploy に相当）
make migrate-deploy        # マイグレーションファイルを適用（全環境）
ENV=staging make migrate-deploy    # ステージング環境
ENV=production make migrate-deploy # 本番環境

# スキーマ検証・Lint
make atlas-validate        # スキーマ検証
make atlas-lint            # マイグレーションLintチェック

# 型生成（通常は migrate-dev に含まれる）
make build-model           # Supabase型とSQLModelを生成
```

### Model Generation
```bash
make build-model-frontend-supabase  # Generate Supabase types for frontend
make build-model-functions          # Generate types for edge functions
# Note: Prismaクライアント生成は廃止（Atlasに移行済み）
```

### Frontend Development
```bash
cd frontend
yarn web                    # Next.js web development
yarn ios                    # iOS development
yarn android               # Android development
yarn build                 # Build all packages
yarn test                  # Run tests
```

### Backend Development (Python)
Backend follows clean architecture with strict separation of concerns:
- Controllers handle HTTP requests/responses only
- Use cases contain business logic
- Gateways provide data access interfaces
- Infrastructure handles external dependencies

Code quality tools:
- Ruff for linting (line length: 88)
- MyPy for type checking (strict mode)
- Maximum function complexity: 3 (McCabe)

### Edge Functions Development
Edge Functions use Hono framework for serverless API development:
- Built with Deno runtime for TypeScript support
- Hono provides Express-like API with better performance
- Each function should have a `deno.json` with Hono imports
- Import map configuration for dependency management
- Type-safe integration with Supabase client and database schema

### Atlas Schema Management

**IMPORTANT**: このプロジェクトは **Atlas** でデータベーススキーマを管理しています（Prismaから移行済み）。

#### スキーマ構成

スキーマは `atlas/` ディレクトリに HCL 形式で定義されています：

```
atlas/
├── atlas.hcl      # Atlas設定ファイル（環境定義、Lintルール）
├── schema/
│   ├── schema.hcl     # メインスキーマ（テーブル、RLS、check制約を一元管理）
│   ├── functions.hcl  # データベース関数とトリガー
│   └── base.hcl       # 権限設定（GRANT文）
└── migrations/    # 生成されたマイグレーションファイル
```

**重要**: Atlas は2つのデータベースを使用します（Atlasの推奨設計）：
- **dev database** (localhost:5433): マイグレーション生成用の一時DB
  - docker-compose で自動起動される専用PostgreSQL
  - 既存マイグレーションを再生して差分SQLを生成
- **url database** (localhost:54322): 実際のSupabase Local DB
  - 生成されたマイグレーションを適用
  - 開発データが保存される

#### スキーマ変更ワークフロー（Prisma風）

**ローカル開発**:
```bash
# 1. スキーマ編集
vi atlas/schema/schema.hcl

# 2. マイグレーション生成 + 適用 + 型生成（Prismaの migrate dev）
make migrate-dev
# または短縮形
make migration

# 3. 生成されたマイグレーションファイルを確認
cat atlas/migrations/20250131123456_*.sql

# 4. Gitにコミット
git add atlas/migrations/
git commit -m "Add new feature schema"
git push
```

**リモート環境（CI/CD or 手動）**:
```bash
# 1. マイグレーションファイルを取得
git pull

# 2. マイグレーション適用（Prismaの migrate deploy）
ENV=staging make migrate-deploy
# または本番環境
ENV=production make migrate-deploy
```

**Prismaとの比較**:
| 操作 | Prisma | Atlas (このプロジェクト) |
|------|--------|--------------------------|
| ローカル開発 | `prisma migrate dev` | `make migrate-dev` |
| 本番デプロイ | `prisma migrate deploy` | `ENV=production make migrate-deploy` |
| スキーマ定義 | `schema.prisma` | `atlas/schema/*.hcl` |
| マイグレーションファイル | `prisma/migrations/` | `atlas/migrations/` |

#### RLS（Row Level Security）の宣言的管理

**重要**: RLSは完全にAtlas HCLの宣言的構文で管理され、**テーブル定義と同じファイル**（`schema.hcl`）に配置されています。

**テーブル定義とRLSポリシーを一緒に管理**:
```hcl
# テーブル定義
table "general_users" {
  column "id" { type = uuid, null = false }
  column "account_name" { type = text, null = false }
  # ... 他のカラム ...

  # RLS有効化
  row_security {
    enabled = true
  }
}

# 直後にそのテーブルのRLSポリシーを定義
policy "select_own_user" {
  on    = table.general_users
  for   = SELECT
  to    = ["anon", "authenticated"]
  using = "true"
}

policy "edit_policy_general_users" {
  on         = table.general_users
  for        = ALL
  to         = ["authenticated"]
  using      = "(SELECT auth.uid()) = id"
  with_check = "(SELECT auth.uid()) = id"
}
```

**ポリシーパラメータ**:
- **on**: 対象テーブル
- **for**: 操作タイプ（SELECT, INSERT, UPDATE, DELETE, ALL）
- **to**: 適用対象ロール
- **using**: 閲覧・編集可能な行の条件
- **with_check**: 挿入・更新時の検証条件

**メリット**:
- テーブルとそのRLSポリシーを同じ画面で確認可能
- 認知負荷が低い（ファイル間を移動する必要がない）
- 変更時にテーブルとポリシーを一緒に編集できる

#### マイグレーション管理

- Atlas は自動的にマイグレーションSQLを生成
- 破壊的変更は `atlas lint` で事前検出
- マイグレーション履歴は `atlas/migrations/` に保存
- ロールバックは手動でマイグレーションファイルを削除して再適用

詳細は `atlas/README.md` を参照してください。

## Code Style and Quality

### Frontend
- Biome for linting and formatting
- 2-space indentation, 100-character line width
- TypeScript strict mode
- Import type enforced for type-only imports

### Date and Time Handling (Supabase + Database Best Practices)

日時処理に関する重要な原則とベストプラクティス:

#### データベース設定

1. **Atlas Schema**:
   - 全ての日時カラムに `timestamptz(3)` 型を使用
   - PostgreSQL の `TIMESTAMP WITH TIME ZONE` 型にマップされる
   - ミリ秒精度(3)はJavaScriptの `Date` オブジェクトと完全互換

2. **Supabase/PostgreSQL**:
   - データベースのタイムゾーンは UTC を維持（Supabaseデフォルト）
   - タイムゾーン付きで挿入されたデータも内部的には UTC で保存
   - 一貫性のため、全ての日時データを UTC として扱う

#### クライアント実装の原則

1. **クライアントコンポーネントで処理**:
   - 日時の表示・フォーマットは必ずクライアントコンポーネント（`'use client'`）で行う
   - Next.js のサーバーコンポーネントで日時をフォーマットしない
   - SSR とクライアントのタイムゾーン不一致によるハイドレーションエラーを防ぐ

2. **データベース保存時**:
   - JavaScript の `Date` オブジェクトを `toISOString()` で ISO 8601 形式に変換
   - データベースは自動的に UTC として保存
   - `Date.now()` は使用しない（Unix タイムスタンプはエラーになる）

3. **クライアント表示時**:
   - 必ずクライアントのタイムゾーンに変換して表示
   - `Intl.DateTimeFormat` を使用（ブラウザのタイムゾーン設定を尊重）
   - date-fns や dayjs などのライブラリも活用可能

#### Next.js SSR/CSR ハイドレーション対策

Next.js公式ドキュメントでは、`Date()` コンストラクタなど時間依存のAPIを使用するとハイドレーションエラーが発生すると明記されています。以下の方法で対処します:

**重要な前提知識**:
1. **Client Componentでも初期レンダリング（SSR）はサーバー側で実行される**
   - `'use client'` を付けても、最初のレンダリングはサーバーで行われる
   - クライアント側でハイドレーション（再レンダリング）が行われる
   - サーバーとクライアントで異なる結果を返すとハイドレーションエラーが発生

2. **ブラウザAPIを使う処理は必ず`useEffect`内で実行**
   - `Intl.DateTimeFormat().resolvedOptions().timeZone` などのブラウザAPIは`useEffect`内で使用
   - `useEffect`はクライアント側でのみ実行されるため、SSRとの不一致が起きない

3. **Server→Client Componentへのpropsは必ずシリアライズ可能な値のみ**
   - `Date` オブジェクトはシリアライズ不可能なため、ISO文字列（`string`）で渡す
   - `toISOString()` で変換してから渡す

4. **タイムゾーン変換は必ずクライアント側で行う**
   - サーバー（UTC）とクライアント（ローカルタイムゾーン）で結果が異なるため
   - `useEffect`内でタイムゾーン変換を実行

1. **推奨パターン: `useEffect` を使用**（最も信頼性が高い）:
   - セマンティックな `<time>` 要素を使用
   - 初回レンダリングでは空文字またはプレースホルダーを表示
   - `useEffect` でクライアント側タイムゾーンに変換して状態を更新
   - サーバーとクライアントで異なるコンテンツをレンダリングする場合のみ `suppressHydrationWarning` を追加

2. **代替パターン1: Dynamic Import with SSR無効化**:
   ```typescript
   import dynamic from 'next/dynamic'

   const DateDisplay = dynamic(() => import('./DateDisplay'), {
     ssr: false,
     loading: () => <time>読み込み中...</time>
   })
   ```

3. **代替パターン2: next-intl を使用**（国際化対応が必要な場合）:
   - `useNow()` / `getNow()` で安定した時刻取得
   - サーバーとクライアント間で一貫性のある時刻処理

4. **Cookie ベースの最適化**（オプション）:
   - Cookie にタイムゾーンを保存して2回目以降の訪問で使用
   - 初回訪問時はデフォルトタイムゾーン（UTC または地域デフォルト）を使用

**重要な注意点**:
- `suppressHydrationWarning` は App Router で再レンダリングを防ぐ場合があるため、主に静的な datetime 属性に使用
- 動的にコンテンツが変わる場合は `useEffect` パターンを優先
- Next.js 公式ドキュメント: https://nextjs.org/docs/messages/react-hydration-error

#### 実装例

```typescript
// ✅ Good: 推奨パターン - useEffect を使用したクライアントコンポーネント
'use client'

import { useEffect, useState } from 'react'

interface DateDisplayProps {
  utcDate: string  // 必ずISO文字列で受け取る（Dateオブジェクトはシリアライズ不可）
  className?: string
}

export function DateDisplay({ utcDate, className }: DateDisplayProps) {
  const [formattedDate, setFormattedDate] = useState<string>('')
  const [isoDate, setIsoDate] = useState<string>('')

  useEffect(() => {
    // すべての日時処理をuseEffect内で実行（ブラウザAPIを使用するため）
    const date = new Date(utcDate)

    // ISO形式（datetime属性用）
    setIsoDate(date.toISOString())

    // ユーザーのタイムゾーンでフォーマット（ブラウザAPI使用）
    const formatted = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }).format(date)
    setFormattedDate(formatted)
  }, [utcDate])

  // ハイドレーションエラーを防ぐため、初回は空を表示
  // SSRでは空文字、クライアントでuseEffectが実行されて値が設定される
  if (!formattedDate) {
    return <time className={className}>読み込み中...</time>
  }

  return (
    <time dateTime={isoDate} className={className}>
      {formattedDate}
    </time>
  )
}

// Server Componentから使用する場合
// app/page.tsx
import { DateDisplay } from '@/components/DateDisplay'

export default async function Page() {
  // DBから取得したDateオブジェクトをISO文字列に変換
  const eventDate = new Date('2025-01-15T10:30:00Z')

  return (
    <div>
      {/* 必ずISO文字列で渡す */}
      <DateDisplay utcDate={eventDate.toISOString()} />
    </div>
  )
}

// ✅ Good: Dynamic Import でSSRを無効化（代替パターン）
// app/page.tsx
import dynamic from 'next/dynamic'

const DateDisplay = dynamic(() => import('@/components/DateDisplay'), {
  ssr: false,
  loading: () => <time>読み込み中...</time>
})

export default function Page() {
  return <DateDisplay utcDate="2025-01-15T10:30:00Z" />
}

// ✅ Good: next-intl を使用（国際化対応アプリの場合）
'use client'

import { useFormatter, useNow } from 'next-intl'

export function InternationalizedDateDisplay({ utcDate }: { utcDate: string }) {
  const format = useFormatter()
  const now = useNow() // サーバーとクライアントで一貫した時刻
  const date = new Date(utcDate) // ISO文字列からDateオブジェクトに変換

  return (
    <time dateTime={utcDate}>
      {format.dateTime(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}
    </time>
  )
}

// ✅ Good: Supabase へのデータ保存
const saveEvent = async (eventDate: Date) => {
  await supabase.from('events').insert({
    event_date: eventDate.toISOString() // ISO 8601 形式でUTCとして保存
  })
}

// ✅ Good: ユーザー入力からの日時保存
const saveEventFromUserInput = async (year: number, month: number, day: number) => {
  // ユーザーのローカルタイムゾーンで Date オブジェクトを作成
  const userDate = new Date(year, month - 1, day)

  // toISOString() で UTC に変換して保存
  await supabase.from('events').insert({
    event_date: userDate.toISOString()
  })
}

// ❌ Bad: Dateオブジェクトをpropsで渡す（シリアライズ不可）
export default function BadPage() {
  const eventDate = new Date('2025-01-15T10:30:00Z')
  // Dateオブジェクトはシリアライズできないため、エラーになる
  return <DateDisplay utcDate={eventDate} />
}

// ❌ Bad: サーバーコンポーネントでタイムゾーン変換
export function ServerDateDisplay({ utcDate }: { utcDate: string }) {
  // サーバー側でローカライズすると、クライアントとタイムゾーンが異なる
  // ハイドレーションエラーが発生する
  const formatted = new Date(utcDate).toLocaleString('ja-JP')
  return <time>{formatted}</time>
}

// ❌ Bad: useEffect外でブラウザAPIを使用
'use client'
export function BadClientDateDisplay({ utcDate }: { utcDate: string }) {
  // Intl.DateTimeFormat().resolvedOptions() はブラウザAPIなので
  // SSR時にはundefinedになる可能性がある
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const formatted = new Date(utcDate).toLocaleString('ja-JP', { timeZone: timezone })
  return <time>{formatted}</time>
}

// ❌ Bad: Date.now() の使用
const badSave = async () => {
  await supabase.from('events').insert({
    event_date: Date.now() // エラー: Unix タイムスタンプは受け付けられない
  })
}
```

#### Atlas Schema の例

```hcl
table "events" {
  schema = schema.public

  column "id" {
    type = text
    null = false
  }

  column "title" {
    type = text
    null = false
  }

  column "event_date" {
    type    = timestamptz(3)
    null    = false
    comment = "イベント日時（UTC、ミリ秒精度）"
  }

  column "created_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  column "updated_at" {
    type    = timestamptz(3)
    null    = false
    default = sql("CURRENT_TIMESTAMP")
  }

  primary_key {
    columns = [column.id]
  }
}
```

#### 重要なポイント

- **一貫性**: DB は常に UTC、表示時のみユーザータイムゾーン
- **精度**: `timestamptz(3)` でミリ秒精度を確保
- **ハイドレーション**: クライアントコンポーネントで日時処理
- **ISO 8601**: `toISOString()` で標準形式に変換
- **型安全性**: Supabase CLI で型を自動生成

この実装により、タイムゾーン関連のバグとハイドレーションエラーを防ぎ、グローバルなアプリケーションでも一貫した日時処理が可能になります。

### UI Design System
- **Design Language**: Unified design system based on Material Design 3 principles
- **Theme System**: Use Material Design 3 compliant themes defined in `frontend/packages/config/src/material-theme.ts`
- **Typography**: Material Design 3 typography system defined in `frontend/packages/config/src/material-text.tsx`
- **Color Tokens**: Use only the predefined tokens below:
  - **Base Colors**: `$color`, `$background`, `$borderColor`, `$placeholderColor`, `$outlineColor`
  - **Material Design 3 Colors**: `$primary`, `$secondary`, `$tertiary`, `$error`
  - **State Colors**: `$red`, `$green`, `$blue`, `$yellow` (each with 1-12 gradations)
  - **Text Colors**: `$color1-12` (contrast gradations)
  - **Shadow Colors**: `$shadow1-6`, `$shadowColor`
  - **Monochrome Colors**: `$white1-12`, `$black1-12`

### UI Implementation Guidelines
1. **Theme Usage**: Always use `material_light` or `material_dark` themes
2. **Typography**: Use Material Design 3 text components:
   - Display: `DisplayLarge`, `DisplayMedium`, `DisplaySmall`
   - Headline: `HeadlineLarge`, `HeadlineMedium`, `HeadlineSmall`
   - Title: `TitleLarge`, `TitleMedium`, `TitleSmall`
   - Body: `BodyLarge`, `BodyMedium`, `BodySmall`
   - Label: `LabelLarge`, `LabelMedium`, `LabelSmall`
   - Aliases: `H1-H6`, `Body1-2`, `Subtitle1-2`, `Caption`, `Overline`
3. **Color Token Usage**: Only use predefined color tokens, avoid hardcoded color values
4. **Accessibility**: Follow Material Design 3 accessibility guidelines
5. **Responsive Design**: Consider cross-platform compatibility

### Example: Correct UI Implementation
```typescript
// ✅ Good example: Material Design 3 compliant
<Theme name="material_light">
  <Card padding="$4" borderColor="$outlineColor">
    <TitleLarge color="$primary">Title</TitleLarge>
    <BodyMedium color="$color">Body text</BodyMedium>
    <Button theme="primary">Action</Button>
  </Card>
</Theme>

// ❌ Bad example: Hardcoded color values
<Card padding="16" borderColor="#cccccc">
  <Text fontSize="22" color="#6442d6">Title</Text>
  <Text fontSize="14" color="#333333">Body text</Text>
</Card>
```

### Backend Python
- Ruff with comprehensive rule set (pyproject.toml)
- Google-style docstrings
- All functions must have type annotations
- Async/await for all I/O operations
- Clean architecture dependency rules enforced

### Edge Functions
- Hono framework for routing and middleware
- TypeScript strict mode with proper type annotations
- Deno formatting and linting standards
- Import maps for clean dependency management

## Environment Configuration

Environment files are in `env/` directory:
- `env/secrets.env` - Copy from `env/secrets.env.example` and configure
- `env/frontend/local.env` - Frontend environment variables
- `env/migration/local.env` - Database migration settings

## Special Notes

### Type Generation
Atlas スキーマから各プラットフォーム向けに型を生成：
- **Frontend**: Supabase TypeScript 型生成（`make build-model-frontend-supabase`）
- **Backend Python**: SQLModel（sqlacodegen でデータベースから直接生成）
- **Edge Functions**: Supabase TypeScript 型生成（`make build-model-functions`）

注意: Prismaクライアント生成は廃止されました（Atlas移行済み）

### AI/ML Features
- Vector embeddings with pgvector
- LangChain integration for complex AI workflows
- Multiple LLM providers supported (OpenAI, Anthropic)
- RAG (Retrieval Augmented Generation) capabilities

### Authentication
- Supabase auth integration
- JWT token verification middleware
- User context properly typed throughout application

### Development Workflow
- Use `make` commands for consistency across team
- Environment variables managed through dotenvx
- Docker compose for service orchestration
- Supports multiple development environments (local, staging, production)

## Important Notes for UI Implementation

### Material Design 3 Theme Verification
When implementing frontend UI, always follow these steps:

1. **Check Theme Files**
   - `frontend/packages/config/src/material-theme.ts` - Color token definitions
   - `frontend/packages/config/src/material-text.tsx` - Typography components
   - `frontend/packages/config/src/material-fonts.ts` - Font configurations

2. **Reference Demo Pages**
   - `http://localhost:3001/typography-example` - Typography system demo
   - `http://localhost:3001/theme-example` - Theme and color system demo

3. **Available Components**
   ```typescript
   // Material Design 3 Typography Components
   import {
     DisplayLarge, HeadlineLarge, TitleLarge, BodyLarge, LabelLarge,
     H1, H2, H3, H4, H5, H6, Body1, Body2, Caption
   } from '@my/config'

   // Theme Usage
   import { Theme } from '@my/ui'
   <Theme name="material_light">
     <TitleLarge color="$primary">Title</TitleLarge>
   </Theme>
   ```

4. **Strict Color Token Usage**
   - Hardcoded color values (`#ffffff`, `rgb(255,255,255)`, etc.) are prohibited
   - Always use predefined color tokens (`$primary`, `$color`, `$background`, etc.)
   - When new colors are needed, add them to theme files following Material Design 3 guidelines

5. **Accessibility Compliance**
   - Follow Material Design 3 contrast ratio standards
   - Consider color vision deficiency (don't rely solely on color for information)
   - Support screen readers

This implementation ensures a unified, accessible, and maintainable UI system.
