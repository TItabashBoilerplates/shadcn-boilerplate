# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a full-stack application boilerplate with a multi-platform frontend and backend services:

### Frontend Architecture

- **Framework**: Next.js 16 with App Router
- **UI Library**: shadcn/ui (Radix UI + TailwindCSS 4)
- **Tech Stack**: React 19, TypeScript, Bun package manager
- **Build System**: Turbo for monorepo management
- **Architecture Pattern**: Feature-Sliced Design (FSD)

### Backend Architecture

- **Python Backend**: FastAPI application in `backend-py/` using clean architecture patterns
- **Edge Functions**: Supabase Edge Functions using Deno's native `Deno.serve` API for serverless functions
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
make stop                    # Stop all services
```

### Lint & Format

```bash
# フロントエンド（Biome）
make lint-frontend           # Biome lint（自動修正）
make lint-frontend-ci        # Biome lint（CI用、修正なし）
make format-frontend         # Biome format（自動修正）
make format-frontend-check   # Biome formatチェック（チェックのみ）
make type-check-frontend     # TypeScript型チェック

# Edge Functions（Deno）
make lint-functions          # Deno lint
make format-functions        # Deno format（自動修正）
make format-functions-check  # Deno formatチェック（チェックのみ）
make check-functions         # Deno型チェック

# 統合コマンド（推奨）
make lint                    # 全体のlint（Frontend + Edge Functions）
make format                  # 全体のformat（自動修正）
make format-check            # 全体のformatチェック（CI用）
make type-check              # 全体の型チェック
make ci-check                # CI用の全チェック（lint + format + type）
```

### Database Operations (Drizzle-based, Prisma-style)

```bash
# 開発用マイグレーション（Prismaの migrate dev に相当）
make migrate-dev           # マイグレーション生成 + 適用 + 型生成（ローカル専用）
make migration             # migrate-dev のエイリアス

# 本番用マイグレーション適用（Prismaの migrate deploy に相当）
make migrate-deploy        # マイグレーションファイルを適用（全環境）
ENV=staging make migrate-deploy    # ステージング環境
ENV=production make migrate-deploy # 本番環境

# 型生成（通常は migrate-dev に含まれる）
make build-model           # Supabase型とSQLModelを生成
```

### Model Generation

```bash
make build-model-frontend-supabase  # Generate Supabase types for frontend
make build-model-functions          # Generate types + copy Drizzle schema for Edge Functions
# Note: Prismaクライアント生成は廃止（Drizzleに移行済み）
```

**Edge Functions 用に生成されるもの**:

- `supabase/functions/shared/types/supabase/schema.ts` - Supabase TypeScript 型
- `supabase/functions/shared/drizzle/` - Drizzle スキーマ（TypeScript）

### Frontend Development

```bash
cd frontend
bun run dev                 # Next.js web development (Turbo)
bun run build              # Build all packages
bun run lint               # Run Biome lint (auto-fix)
bun run format             # Format code with Biome
bun run type-check         # TypeScript type checking
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

Edge Functions use Deno's native `Deno.serve` API for serverless API development:

- Built with Deno runtime for TypeScript support
- Native `Deno.serve` API for lightweight, efficient serverless functions
- Each function should have a `deno.json` with import map configuration
- **IMPORTANT**: 原則として `npm:` プレフィックスを使用して npm パッケージをインポート
  - JSR (`jsr:`) は特別な理由がない限り使用しない
  - 例: `"@supabase/supabase-js": "npm:@supabase/supabase-js@^2"`
- Type-safe integration with Supabase client and database schema
- Proper error handling with TypeScript type guards (`error instanceof Error`)

#### Edge Functions で Drizzle スキーマを使用

Edge Functions でも Drizzle スキーマを直接使用できます：

```typescript
// supabase/functions/example/index.ts
import type { InferSelectModel, InferInsertModel } from "npm:drizzle-orm";
import { generalUsers, generalUserProfiles } from "../shared/drizzle/index.ts";

// 型を推論
type User = InferSelectModel<typeof generalUsers>;
type NewUser = InferInsertModel<typeof generalUsers>;
type UserProfile = InferSelectModel<typeof generalUserProfiles>;

Deno.serve(async (req) => {
  const user: User = {
    id: crypto.randomUUID(),
    displayName: "John Doe",
    accountName: "johndoe",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return new Response(JSON.stringify({ user }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**メリット**:

- TypeScript の型安全性を享受
- スキーマ変更時に型が自動更新される（`make build-model` 実行時）
- Supabase 生成型と Drizzle 型の両方を使い分け可能

### Drizzle Schema Management

**IMPORTANT**: このプロジェクトは **Drizzle ORM** でデータベーススキーマを管理しています（Atlas/Prisma から移行済み）。

#### スキーマ構成

スキーマは `drizzle/` ディレクトリに TypeScript 形式で定義されています：

```
drizzle/
├── drizzle.config.ts         # Drizzle Kit設定ファイル
├── migrate.ts                # カスタムSQL実行スクリプト（プログラマティック実行）
├── schema/
│   ├── schema.ts             # メインスキーマ（テーブル、RLS、check制約を一元管理）
│   ├── types.ts              # Enum定義
│   └── index.ts              # Public API（スキーマのエクスポート）
├── config/
│   └── functions.sql         # カスタムSQL（関数・トリガー・拡張）
└── (migrations stored in supabase/migrations/)
```

**重要**: `drizzle/`ディレクトリは独立したパッケージとして管理されており、独自の`package.json`と依存関係を持っています。プロジェクトルートはクリーンに保たれています。

**モノレポ構成**:

```
/
├── package.json              # ワークスペース定義（drizzle, frontendを含む）
├── drizzle/
│   ├── package.json          # Drizzle専用の依存関係とスクリプト
│   ├── node_modules/         # Drizzle専用の依存関係
│   ├── drizzle.config.ts
│   └── ...
└── frontend/
    ├── package.json          # フロントエンド専用の依存関係とスクリプト
    └── ...
```

**重要**: Drizzle Kit は 1 つのデータベースのみを使用：

- **url database** (localhost:54322): Supabase Local DB
  - スキーマ定義からマイグレーション SQL を自動生成
  - 生成されたマイグレーションを適用
  - 開発データが保存される

#### スキーマ変更ワークフロー（Prisma 風）

**ローカル開発**:

```bash
# 1. スキーマ編集
vi drizzle/schema/schema.ts

# 2. マイグレーション生成 + 適用 + 型生成（Prismaの migrate dev）
make migrate-dev
# または短縮形
make migration

# 3. 生成されたマイグレーションファイルを確認
cat supabase/migrations/0000_*.sql

# drizzle/ディレクトリ内で直接実行する場合
cd drizzle
bun run generate  # マイグレーション生成
bun run migrate   # マイグレーション適用
bun run check     # スキーマ検証
bun run studio    # Drizzle Studio起動

# 4. Gitにコミット
git add supabase/migrations/
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

**Prisma との比較**:
| 操作 | Prisma | Drizzle (このプロジェクト) |
|------|--------|--------------------------|
| ローカル開発 | `prisma migrate dev` | `make migrate-dev` |
| 本番デプロイ | `prisma migrate deploy` | `ENV=production make migrate-deploy` |
| スキーマ定義 | `schema.prisma` | `drizzle/schema/*.ts` |
| マイグレーションファイル | `prisma/migrations/` | `supabase/migrations/` |

#### RLS（Row Level Security）の宣言的管理

**重要**: RLS は完全に Drizzle ORM の `pgPolicy` 関数で管理され、**テーブル定義と同じファイル**（`schema.ts`）に配置されています。

**テーブル定義と RLS ポリシーを一緒に管理**:

```typescript
import { pgTable, uuid, text, pgPolicy } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// テーブル定義
export const generalUsers = pgTable("general_users", {
  id: uuid("id").primaryKey(),
  accountName: text("account_name").notNull().unique(),
  // ... 他のカラム ...
}).enableRLS(); // RLS有効化

// 直後にそのテーブルのRLSポリシーを定義
export const selectOwnUser = pgPolicy("select_own_user", {
  for: "select",
  to: ["anon", "authenticated"],
  using: sql`true`,
}).link(generalUsers);

export const editPolicyGeneralUsers = pgPolicy("edit_policy_general_users", {
  for: "all",
  to: "authenticated",
  using: sql`(SELECT auth.uid()) = id`,
  withCheck: sql`(SELECT auth.uid()) = id`,
}).link(generalUsers);
```

**ポリシーパラメータ**:

- **for**: 操作タイプ（`'select'`, `'insert'`, `'update'`, `'delete'`, `'all'`）
- **to**: 適用対象ロール（配列または文字列）
- **using**: 閲覧・編集可能な行の条件（`sql` タグ付きテンプレート）
- **withCheck**: 挿入・更新時の検証条件（`sql` タグ付きテンプレート）

**メリット**:

- TypeScript の型安全性を享受
- テーブルとその RLS ポリシーを同じファイルで確認可能
- 認知負荷が低い（ファイル間を移動する必要がない）
- 変更時にテーブルとポリシーを一緒に編集できる

#### マイグレーション管理

- Drizzle Kit は自動的にマイグレーション SQL を生成
- マイグレーション履歴は `supabase/migrations/` に保存
- ロールバックは手動でマイグレーションファイルを削除して再適用

**カスタム SQL（関数・トリガー・拡張）の管理**:

カスタム SQL（pgvector 拡張、認証フック、トリガーなど）は `drizzle/config/functions.sql` で管理し、**プログラマティック**に実行されます：

```typescript
// drizzle/migrate.ts - カスタムSQL実行スクリプト
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

// functions.sqlを読み込んで実行
const customSql = readFileSync("drizzle/config/functions.sql", "utf-8");
await db.execute(sql.raw(customSql));
```

**実行タイミング**:

- `make migrate-dev`: マイグレーション適用後に自動実行
- `make migrate-deploy`: マイグレーション適用後に自動実行（全環境）

**メリット**:

- CLI ツール（`psql`）に依存しない
- TypeScript で型安全に実行
- エラーハンドリングが統一的
- 環境変数管理がシンプル

詳細は Drizzle 公式ドキュメントを参照してください。

## Code Style and Quality

### Frontend

- **Linting & Formatting**: Biome (高速なオールインワンツールチェーン)
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: TailwindCSS 4 with CSS variables
- **Code Style**: 2-space indentation, 100-character line width, single quotes, semicolons as needed
- **TypeScript**: Strict mode enabled
- **Import Organization**: Auto-organize imports with type-only import enforcement

### Date and Time Handling (Supabase + Database Best Practices)

日時処理に関する重要な原則とベストプラクティス:

#### データベース設定

1. **Atlas Schema**:

   - 全ての日時カラムに `timestamptz(3)` 型を使用
   - PostgreSQL の `TIMESTAMP WITH TIME ZONE` 型にマップされる
   - ミリ秒精度(3)は JavaScript の `Date` オブジェクトと完全互換

2. **Supabase/PostgreSQL**:
   - データベースのタイムゾーンは UTC を維持（Supabase デフォルト）
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

Next.js 公式ドキュメントでは、`Date()` コンストラクタなど時間依存の API を使用するとハイドレーションエラーが発生すると明記されています。以下の方法で対処します:

**重要な前提知識**:

1. **Client Component でも初期レンダリング（SSR）はサーバー側で実行される**

   - `'use client'` を付けても、最初のレンダリングはサーバーで行われる
   - クライアント側でハイドレーション（再レンダリング）が行われる
   - サーバーとクライアントで異なる結果を返すとハイドレーションエラーが発生

2. **ブラウザ API を使う処理は必ず`useEffect`内で実行**

   - `Intl.DateTimeFormat().resolvedOptions().timeZone` などのブラウザ API は`useEffect`内で使用
   - `useEffect`はクライアント側でのみ実行されるため、SSR との不一致が起きない

3. **Server→Client Component への props は必ずシリアライズ可能な値のみ**

   - `Date` オブジェクトはシリアライズ不可能なため、ISO 文字列（`string`）で渡す
   - `toISOString()` で変換してから渡す

4. **タイムゾーン変換は必ずクライアント側で行う**

   - サーバー（UTC）とクライアント（ローカルタイムゾーン）で結果が異なるため
   - `useEffect`内でタイムゾーン変換を実行

5. **推奨パターン: `useEffect` を使用**（最も信頼性が高い）:

   - セマンティックな `<time>` 要素を使用
   - 初回レンダリングでは空文字またはプレースホルダーを表示
   - `useEffect` でクライアント側タイムゾーンに変換して状態を更新
   - サーバーとクライアントで異なるコンテンツをレンダリングする場合のみ `suppressHydrationWarning` を追加

6. **代替パターン 1: Dynamic Import with SSR 無効化**:

   ```typescript
   import dynamic from "next/dynamic";

   const DateDisplay = dynamic(() => import("./DateDisplay"), {
     ssr: false,
     loading: () => <time>読み込み中...</time>,
   });
   ```

7. **代替パターン 2: next-intl を使用**（国際化対応が必要な場合）:

   - `useNow()` / `getNow()` で安定した時刻取得
   - サーバーとクライアント間で一貫性のある時刻処理

8. **Cookie ベースの最適化**（オプション）:
   - Cookie にタイムゾーンを保存して 2 回目以降の訪問で使用
   - 初回訪問時はデフォルトタイムゾーン（UTC または地域デフォルト）を使用

**重要な注意点**:

- `suppressHydrationWarning` は App Router で再レンダリングを防ぐ場合があるため、主に静的な datetime 属性に使用
- 動的にコンテンツが変わる場合は `useEffect` パターンを優先
- Next.js 公式ドキュメント: https://nextjs.org/docs/messages/react-hydration-error

#### 実装例

```typescript
// ✅ Good: 推奨パターン - useEffect を使用したクライアントコンポーネント
"use client";

import { useEffect, useState } from "react";

interface DateDisplayProps {
  utcDate: string; // 必ずISO文字列で受け取る（Dateオブジェクトはシリアライズ不可）
  className?: string;
}

export function DateDisplay({ utcDate, className }: DateDisplayProps) {
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [isoDate, setIsoDate] = useState<string>("");

  useEffect(() => {
    // すべての日時処理をuseEffect内で実行（ブラウザAPIを使用するため）
    const date = new Date(utcDate);

    // ISO形式（datetime属性用）
    setIsoDate(date.toISOString());

    // ユーザーのタイムゾーンでフォーマット（ブラウザAPI使用）
    const formatted = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).format(date);
    setFormattedDate(formatted);
  }, [utcDate]);

  // ハイドレーションエラーを防ぐため、初回は空を表示
  // SSRでは空文字、クライアントでuseEffectが実行されて値が設定される
  if (!formattedDate) {
    return <time className={className}>読み込み中...</time>;
  }

  return (
    <time dateTime={isoDate} className={className}>
      {formattedDate}
    </time>
  );
}

// Server Componentから使用する場合
// app/page.tsx
import { DateDisplay } from "@/components/DateDisplay";

export default async function Page() {
  // DBから取得したDateオブジェクトをISO文字列に変換
  const eventDate = new Date("2025-01-15T10:30:00Z");

  return (
    <div>
      {/* 必ずISO文字列で渡す */}
      <DateDisplay utcDate={eventDate.toISOString()} />
    </div>
  );
}

// ✅ Good: Dynamic Import でSSRを無効化（代替パターン）
// app/page.tsx
import dynamic from "next/dynamic";

const DateDisplay = dynamic(() => import("@/components/DateDisplay"), {
  ssr: false,
  loading: () => <time>読み込み中...</time>,
});

export default function Page() {
  return <DateDisplay utcDate="2025-01-15T10:30:00Z" />;
}

// ✅ Good: next-intl を使用（国際化対応アプリの場合）
("use client");

import { useFormatter, useNow } from "next-intl";

export function InternationalizedDateDisplay({ utcDate }: { utcDate: string }) {
  const format = useFormatter();
  const now = useNow(); // サーバーとクライアントで一貫した時刻
  const date = new Date(utcDate); // ISO文字列からDateオブジェクトに変換

  return (
    <time dateTime={utcDate}>
      {format.dateTime(date, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </time>
  );
}

// ✅ Good: Supabase へのデータ保存
const saveEvent = async (eventDate: Date) => {
  await supabase.from("events").insert({
    event_date: eventDate.toISOString(), // ISO 8601 形式でUTCとして保存
  });
};

// ✅ Good: ユーザー入力からの日時保存
const saveEventFromUserInput = async (
  year: number,
  month: number,
  day: number
) => {
  // ユーザーのローカルタイムゾーンで Date オブジェクトを作成
  const userDate = new Date(year, month - 1, day);

  // toISOString() で UTC に変換して保存
  await supabase.from("events").insert({
    event_date: userDate.toISOString(),
  });
};

// ❌ Bad: Dateオブジェクトをpropsで渡す（シリアライズ不可）
export default function BadPage() {
  const eventDate = new Date("2025-01-15T10:30:00Z");
  // Dateオブジェクトはシリアライズできないため、エラーになる
  return <DateDisplay utcDate={eventDate} />;
}

// ❌ Bad: サーバーコンポーネントでタイムゾーン変換
export function ServerDateDisplay({ utcDate }: { utcDate: string }) {
  // サーバー側でローカライズすると、クライアントとタイムゾーンが異なる
  // ハイドレーションエラーが発生する
  const formatted = new Date(utcDate).toLocaleString("ja-JP");
  return <time>{formatted}</time>;
}

// ❌ Bad: useEffect外でブラウザAPIを使用
("use client");
export function BadClientDateDisplay({ utcDate }: { utcDate: string }) {
  // Intl.DateTimeFormat().resolvedOptions() はブラウザAPIなので
  // SSR時にはundefinedになる可能性がある
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatted = new Date(utcDate).toLocaleString("ja-JP", {
    timeZone: timezone,
  });
  return <time>{formatted}</time>;
}

// ❌ Bad: Date.now() の使用
const badSave = async () => {
  await supabase.from("events").insert({
    event_date: Date.now(), // エラー: Unix タイムスタンプは受け付けられない
  });
};
```

#### Drizzle Schema の例

```typescript
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  // イベント日時（UTC、ミリ秒精度）
  eventDate: timestamp("event_date", {
    withTimezone: true,
    precision: 3,
  }).notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    precision: 3,
  })
    .notNull()
    .defaultNow(),
});
```

#### 重要なポイント

- **一貫性**: DB は常に UTC、表示時のみユーザータイムゾーン
- **精度**: `timestamptz(3)` でミリ秒精度を確保
- **ハイドレーション**: クライアントコンポーネントで日時処理
- **ISO 8601**: `toISOString()` で標準形式に変換
- **型安全性**: Supabase CLI で型を自動生成

この実装により、タイムゾーン関連のバグとハイドレーションエラーを防ぎ、グローバルなアプリケーションでも一貫した日時処理が可能になります。

### UI Design System

このプロジェクトは **shadcn/ui + TailwindCSS 4** を使用した統一的なデザインシステムを採用しています。

#### shadcn/ui Components

- **基盤**: Radix UI primitives（アクセシビリティ対応）
- **スタイル**: TailwindCSS 4 with CSS variables
- **カスタマイズ**: `frontend/apps/web/components.json` で管理
- **共有コンポーネント**: `frontend/packages/ui/components/` に配置

#### UI Implementation Guidelines

1. **shadcn/ui コンポーネントの使用**:

   ```bash
   # 新しいコンポーネントを追加
   cd frontend
   bun run ui:add button card input
   ```

2. **TailwindCSS CSS 変数の使用**:

   ```typescript
   // ✅ Good: CSS変数を使用
   <Card className="border-border bg-background">
     <h2 className="text-foreground">Title</h2>
     <p className="text-muted-foreground">Description</p>
   </Card>

   // ❌ Bad: ハードコードされた色
   <Card className="border-gray-200 bg-white">
     <h2 className="text-black">Title</h2>
     <p className="text-gray-600">Description</p>
   </Card>
   ```

3. **色の管理**:

   - TailwindCSS CSS 変数を使用（`--background`, `--foreground`, `--primary`, etc.）
   - テーマファイル: `frontend/apps/web/app/globals.css`
   - ダークモード対応: `dark:` プレフィックスで自動切り替え

4. **アクセシビリティ**:

   - Radix UI のアクセシビリティ機能を活用
   - ARIA 属性は自動で付与される
   - キーボードナビゲーション対応

5. **レスポンシブデザイン**:
   - TailwindCSS のレスポンシブユーティリティを使用
   - `sm:`, `md:`, `lg:`, `xl:` プレフィックス

### Backend Python

- Ruff with comprehensive rule set (pyproject.toml)
- Google-style docstrings
- All functions must have type annotations
- Async/await for all I/O operations
- Clean architecture dependency rules enforced

### Edge Functions

- Native `Deno.serve` API for lightweight serverless functions
- TypeScript strict mode with proper type annotations
- Proper error handling with type guards (`error instanceof Error`)
- Deno formatting and linting standards
- **Import Management**:
  - 原則として `npm:` プレフィックスを使用（例: `npm:@supabase/supabase-js@^2`）
  - JSR (`jsr:`) は特別な理由がない限り使用しない
  - `deno.json` の `imports` フィールドで依存関係を管理
  - HTTP インポート（`https://deno.land/x/...`）は使用しない

## Environment Configuration

Environment files are in `env/` directory:

- `env/secrets.env` - Copy from `env/secrets.env.example` and configure
- `env/frontend/local.env` - Frontend environment variables
- `env/migration/local.env` - Database migration settings

## Special Notes

### Type Generation

Drizzle スキーマから各プラットフォーム向けに型を生成：

- **Frontend**: Supabase TypeScript 型生成（`make build-model-frontend-supabase`）
- **Backend Python**: SQLModel（sqlacodegen でデータベースから直接生成）
- **Edge Functions**:
  - Supabase TypeScript 型生成（`supabase gen types typescript`）
  - **NEW**: Drizzle スキーマを `supabase/functions/shared/drizzle/` にコピー（`make build-model-functions`）
  - `InferSelectModel` / `InferInsertModel` で型推論可能

注意: Prisma クライアント生成は廃止されました（Drizzle 移行済み）

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

### shadcn/ui + TailwindCSS 4 Guidelines

フロントエンド UI を実装する際は、以下の手順に従ってください：

1. **コンポーネント設定の確認**

   - `frontend/apps/web/components.json` - shadcn/ui 設定ファイル
   - `frontend/apps/web/app/globals.css` - TailwindCSS CSS 変数定義
   - `frontend/packages/ui/components/` - 共有コンポーネント

2. **利用可能なコンポーネント**

   ```typescript
   // shadcn/uiコンポーネントのインポート
   import { Button } from "@/components/ui/button";
   import {
     Card,
     CardContent,
     CardDescription,
     CardHeader,
     CardTitle,
   } from "@/components/ui/card";
   import { Input } from "@/components/ui/input";
   import { Label } from "@/components/ui/label";
   import {
     Dialog,
     DialogContent,
     DialogDescription,
     DialogHeader,
     DialogTitle,
     DialogTrigger,
   } from "@/components/ui/dialog";

   // 使用例
   <Card>
     <CardHeader>
       <CardTitle>タイトル</CardTitle>
       <CardDescription>説明文</CardDescription>
     </CardHeader>
     <CardContent>
       <Button variant="default">ボタン</Button>
     </CardContent>
   </Card>;
   ```

3. **新しいコンポーネントの追加**

   ```bash
   cd frontend
   bun run ui:add <component-name>
   # 例: bun run ui:add table select checkbox
   ```

4. **色の使用ルール**

   - ハードコードされた色（`#ffffff`, `rgb(255,255,255)`, `gray-500`など）は禁止
   - 必ず CSS 変数を使用（`text-foreground`, `bg-background`, `border-border`, `text-primary`など）
   - 新しい色が必要な場合は `app/globals.css` の CSS 変数に追加

5. **アクセシビリティ対応**
   - Radix UI のアクセシビリティ機能を活用
   - コントラスト比の基準に従う
   - 色のみに依存しない情報伝達
   - スクリーンリーダー対応

この実装により、統一的でアクセシブル、メンテナンス可能な UI システムが実現できます。
