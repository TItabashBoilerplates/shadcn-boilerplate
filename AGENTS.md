# AGENTS.md

This file provides guidance to AI coding assistants (Cursor, GitHub Copilot, etc.) when working with code in this repository.

**Note**: For Claude Code specific guidance, see `CLAUDE.md`.

## Project Overview

shadcn-boilerplateは、最新のフルスタック技術を統合したエンタープライズグレードのボイラープレートです。

### Tech Stack

- **Frontend**: Next.js 16, React 19, shadcn/ui, TailwindCSS 4, Bun
- **Backend**: FastAPI (Python) with Clean Architecture, uv package manager
- **Database**: PostgreSQL with Drizzle ORM (TypeScript), pgvector
- **Edge Functions**: Supabase Edge Functions (Deno runtime)
- **Infrastructure**: Supabase, Docker, Turbo monorepo

## Architecture Principles

### 1. Independent Monorepo Structure

**IMPORTANT**: このプロジェクトはルートにpackage.jsonを持たない独立型モノレポです。

```
/
├── drizzle/          # Database schema (独立パッケージ、Bun)
├── frontend/         # Next.js 16 (Bun workspace)
├── backend-py/       # FastAPI (uv管理)
└── supabase/         # Edge Functions (Deno)
```

### 2. Code Quality Tools

- **Frontend & Drizzle**: Biome (ESLint + Prettierの高速な代替)
- **Backend Python**: Ruff (lint) + MyPy (type check)
- **Edge Functions**: Deno native tools

```bash
# 統合コマンド（推奨）
make lint           # 全プロジェクトのlint
make format         # 全プロジェクトのformat
make ci-check       # CI用の全チェック
```

### 3. Test-Driven Development

原則としてTDDで進める：
1. テストを先に書く
2. テストが失敗することを確認
3. 実装する
4. すべてのテストが通るまで繰り返す

- **Frontend**: Vitest + @testing-library/react
- **Backend**: pytest + pytest-asyncio

## Frontend Development (Next.js 16)

### Feature-Sliced Design (FSD)

厳格なレイヤーベースのアーキテクチャ：

```
src/
├── app/          # Application layer (providers, global styles)
├── views/        # Views layer (full page components)
├── widgets/      # Widgets layer (composite UI blocks)
├── features/     # Features layer (business features)
├── entities/     # Entities layer (domain models)
└── shared/       # Shared layer (reusable code)
```

**Import Rules**:
- 下位レイヤーのみインポート可能: `app` → `views` → `widgets` → `features` → `entities` → `shared`
- 同レイヤー間のインポート禁止
- 上位レイヤーへのインポート厳禁

### Rendering Strategy (Next.js Official Best Practices)

**CRITICAL**: Always follow Next.js official rendering patterns

1. **Public Pages (No Auth)**: **Server Component (SSR/SSG)** - MANDATORY
   ```typescript
   // ✅ Good
   import { getTranslations } from 'next-intl/server'

   export default async function HomePage() {
     const t = await getTranslations('HomePage')
     return <h1>{t('title')}</h1>
   }
   ```

2. **Authenticated Pages**: **Hybrid (SSR + CSR)** - RECOMMENDED
   ```typescript
   // ✅ Good: Server Component wrapper
   import { createClient } from '@/shared/lib/supabase/server'
   import { redirect } from 'next/navigation'

   export default async function DashboardPage() {
     const supabase = createClient()
     const { data: { user }, error } = await supabase.auth.getUser()

     if (error || !user) redirect('/login')

     return <Dashboard user={user} />
   }
   ```

3. **Interactive Components**: **Client Component**
   ```typescript
   'use client'

   export function UserSettings() {
     const [settings, setSettings] = useState(initialData)
     // Interactive logic...
   }
   ```

### Supabase Integration (Security Critical)

**🔒 SECURITY REQUIREMENT**: Always use `supabase.auth.getUser()`, NEVER `getSession()` in server code

```typescript
// ✅ Good: Secure authentication check
const { data: { user }, error } = await supabase.auth.getUser()

// ❌ Bad: Cookie-based (can be spoofed)
const { data: { session } } = await supabase.auth.getSession()
```

### UI Components

**Component Selection Priority**:
1. **First**: MagicUI components (modern, animated)
2. **Second**: shadcn/ui components (fallback)
3. **Last**: Custom components (only if necessary)

```bash
# Add shadcn/ui components
cd frontend
bun run ui:add button card input
```

**Styling Rules**:
- ✅ TailwindCSS utility classes only
- ✅ CSS variables for theming
- ❌ NO custom CSS files
- ❌ NO hardcoded colors

```typescript
// ✅ Good: CSS variables
<Card className="border-border bg-background">
  <h2 className="text-foreground">Title</h2>
</Card>

// ❌ Bad: Hardcoded colors
<Card className="border-gray-200 bg-white">
  <h2 className="text-black">Title</h2>
</Card>
```

## Backend Development (FastAPI)

### Clean Architecture

```
src/
├── controller/       # HTTP handlers only (no business logic)
├── usecase/          # Business logic
├── gateway/          # Data access interfaces
├── domain/           # Entities & models (sqlacodegen generated)
├── infra/            # External dependencies (DB, APIs)
└── middleware/       # Auth, CORS, logging
```

**Dependency Rules**:
- Controllers → Use Cases → Gateways → Domain
- Controllers: HTTP handling only
- Use Cases: Business logic, no HTTP dependencies
- Gateways: Interface definitions
- Infrastructure: Implementations

### Code Quality Standards

```python
# ✅ Good: Type annotations, async, docstrings
async def get_user(user_id: str) -> User | None:
    """Retrieve user by ID.

    Args:
        user_id: User's unique identifier.

    Returns:
        User object if found, None otherwise.
    """
    return await user_repository.get(user_id)

# ❌ Bad: No types, no async, no docstring
def get_user(user_id):
    return user_repository.get(user_id)
```

**Requirements**:
- ✅ Type annotations on all functions
- ✅ Google-style docstrings
- ✅ Async/await for I/O operations
- ✅ Error handling with proper exceptions
- ❌ NO blocking I/O (use async)
- ❌ NO functions with McCabe complexity > 3

### AI/ML Integration

包括的なAI/ML機能:

- **LLM**: LangChain, LangGraph, OpenAI, Anthropic
- **Deep Learning**: PyTorch, Diffusers, Transformers
- **Real-time**: LiveKit (WebRTC), aiortc
- **Voice**: Cartesia
- **Vector Search**: pgvector

```python
from langchain_openai import ChatOpenAI

async def generate_response(prompt: str) -> str:
    """Generate AI response."""
    llm = ChatOpenAI(model="gpt-4")
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    return response.content
```

## Edge Functions Development (Deno)

### Deno.serve API

```typescript
// ✅ Good: Native Deno.serve
Deno.serve(async (req) => {
  const { pathname } = new URL(req.url)

  if (pathname === '/health') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response('Not Found', { status: 404 })
})
```

### Import Management

**IMPORTANT**: Use `npm:` prefix, NOT JSR or HTTP imports

```json
// deno.json
{
  "imports": {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@^2",
    "drizzle-orm": "npm:drizzle-orm@^0.44"
  }
}
```

### Type Safety & Error Handling

```typescript
// ✅ Good: Type-safe with error guards
interface RequestBody {
  userId: string
}

Deno.serve(async (req) => {
  try {
    const body: RequestBody = await req.json()
    // Process...
  } catch (error) {
    if (error instanceof Error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return new Response('Unknown error', { status: 500 })
  }
})
```

## Database Management (Drizzle ORM)

### Schema Management

**IMPORTANT**: このプロジェクトはDrizzle ORMでデータベーススキーマを管理しています（Atlas/Prismaから移行済み）。

```
drizzle/
├── schema/
│   ├── schema.ts             # テーブル + RLS定義
│   ├── types.ts              # Enum定義
│   └── index.ts              # Public API
├── config/
│   └── functions.sql         # カスタムSQL（関数・トリガー）
└── migrate.ts                # カスタムSQL実行スクリプト
```

### Development Workflow

```bash
# ローカル開発
make migration      # マイグレーション生成 + 適用 + 型生成

# 本番環境
make migrate-deploy # マイグレーション適用のみ
```

### RLS Policy Management

RLSポリシーはDrizzle ORMの`pgPolicy`で宣言的に管理：

```typescript
import { pgTable, uuid, text, pgPolicy } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// テーブル定義
export const generalUsers = pgTable('general_users', {
  id: uuid('id').primaryKey(),
  accountName: text('account_name').notNull().unique(),
}).enableRLS()

// RLSポリシー（同じファイルに配置）
export const selectOwnUser = pgPolicy('select_own_user', {
  for: 'select',
  to: ['anon', 'authenticated'],
  using: sql`true`,
}).link(generalUsers)
```

## Development Commands

### 初期化・実行

```bash
make init              # プロジェクト初期化（初回のみ）
make run               # バックエンドサービス起動
make frontend          # フロントエンド起動
make stop              # 全サービス停止
```

### コード品質管理

```bash
# 統合コマンド（推奨）
make lint              # 全プロジェクトのlint
make format            # 全プロジェクトのformat
make type-check        # 全プロジェクトの型チェック
make ci-check          # CI用の全チェック

# プロジェクト別
make lint-frontend
make lint-backend-py
make lint-functions
```

### テスト

```bash
# Frontend
cd frontend
bun run test

# Backend
cd backend-py/app
uv run pytest
```

### データベース

```bash
# 開発環境
make migration         # マイグレーション生成 + 適用 + 型生成

# 本番環境
ENV=production make migrate-deploy
```

## Important Files

- `README.md` - プロジェクト概要、セットアップ手順
- `CLAUDE.md` - Claude Code向け詳細ガイド（最も包括的）
- `AGENTS.md` - このファイル（AI assistants向けガイド）
- `CONTRIBUTING.md` - コントリビューションガイド
- `SECURITY.md` - セキュリティポリシー

## Directory-Specific Rules

各ディレクトリに`.cursorrules`ファイルがあります：

- `.cursorrules` - プロジェクト全体のルール
- `frontend/.cursorrules` - Next.js/React開発
- `backend-py/app/.cursorrules` - Python/FastAPI開発
- `supabase/functions/.cursorrules` - Deno Edge Functions開発

## Commit Guidelines

### 1. Pre-commit Checks

```bash
make ci-check          # 必須
```

### 2. Commit Message Format

Conventional Commits形式を推奨：

```
feat: add user authentication
fix: resolve hydration error in DateDisplay
docs: update setup instructions
style: format code with Biome
refactor: simplify user service logic
test: add tests for button component
chore: update dependencies
```

### 3. Testing

- 新機能には必ずテストを追加
- すべてのテストが通ることを確認
- カバレッジを維持

## Security Guidelines

### 1. Environment Variables

- ❌ NO hardcoded secrets
- ✅ Use `env/secrets.env` (git-ignored)
- ✅ Validate environment variables

### 2. Authentication

- ✅ Use `getUser()` in server components
- ❌ NEVER use `getSession()` in server code
- ✅ JWT token verification for APIs

### 3. Database

- ✅ RLS policies on all tables
- ✅ Parameterized queries only
- ❌ NO SQL injection vulnerabilities

## Best Practices Summary

### Frontend
- ✅ Server Components for public pages
- ✅ Hybrid (SSR + CSR) for authenticated pages
- ✅ FSD layer hierarchy
- ✅ TailwindCSS CSS variables only
- ❌ NO custom CSS files
- ❌ NO hardcoded colors

### Backend
- ✅ Clean Architecture
- ✅ Type annotations on all functions
- ✅ Async/await for I/O
- ✅ Google-style docstrings
- ❌ NO blocking I/O
- ❌ NO complex functions (McCabe > 3)

### Edge Functions
- ✅ Deno.serve native API
- ✅ `npm:` prefix for imports
- ✅ Type guards for error handling
- ❌ NO JSR or HTTP imports
- ❌ NO `getSession()` usage

### Database
- ✅ Drizzle ORM TypeScript schema
- ✅ Declarative RLS with `pgPolicy`
- ✅ Migration-based workflow
- ❌ NO manual SQL files
- ❌ NO schema drift

## License

MIT License - See LICENSE file for details
