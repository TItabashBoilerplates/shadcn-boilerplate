# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Research-First Development Approach

**MANDATORY REQUIREMENT**: Before starting any implementation or planning, you MUST conduct thorough research using available tools.

### Research Protocol (MUST FOLLOW)

#### 1. Pre-Implementation Research (REQUIRED)

Before writing any code or creating a plan, you MUST:

1. **Use Context7 MCP** to fetch the latest documentation for all relevant libraries and frameworks
2. **Use WebSearch** to verify current best practices and common pitfalls
3. **Use WebFetch** to read official documentation directly

#### 2. What to Research

**ALWAYS research**:
- Library/framework versions and their current APIs
- Deprecated features and their replacements
- Breaking changes in recent versions
- Official recommended patterns and anti-patterns
- TypeScript type definitions and interfaces
- Configuration file formats and schemas
- CLI command syntax and options

**NEVER**:
- Make assumptions based on memory or general knowledge
- Use outdated patterns without verification
- Implement features without checking official docs
- Guess API signatures or parameter types

#### 3. When Research is Required

**MANDATORY research scenarios**:
- Using any external library or framework
- Implementing authentication or security features
- Configuring build tools or bundlers
- Setting up database schemas or migrations
- Integrating third-party APIs or services
- Using CLI tools with specific syntax
- Implementing real-time features
- Working with type definitions

### Enforcement

This research-first approach is **NON-NEGOTIABLE**. Any implementation without proper research is considered incomplete and must be revised.

---

## CRITICAL: Development Command Guidelines

**MANDATORY REQUIREMENT**: Always use Makefile commands for development tasks. Direct execution of tools is strictly controlled.

### Command Usage Policy

#### 1. Use Makefile Commands (REQUIRED)

**ALWAYS use `make` commands** for the following operations:

- **Linting**: `make lint`, `make lint-frontend`, `make lint-backend-py`, `make lint-functions`, `make lint-drizzle`
- **Formatting**: `make format`, `make format-frontend`, `make format-backend-py`, `make format-functions`, `make format-drizzle`
- **Type Checking**: `make type-check`, `make type-check-frontend`, `make type-check-backend-py`
- **Building**: `make build`, `make build-frontend`, `make build-backend-py`
- **Testing**: `make test`, `make test-frontend`, `make test-backend-py`
- **CI Checks**: `make ci-check` (combines lint + format + type checks)
- **Service Management**: `make run`, `make frontend`, `make stop`

#### 2. Database Migration Policy (CRITICAL)

**❌ NEVER automatically execute database migrations without explicit user approval.**

**Rules**:

1. **Schema Changes Only**: You may edit schema files (`drizzle/schema/schema.ts`, etc.)
2. **NO Automatic Migration**: Do NOT run `make migrate-dev`, `make migrate-deploy`, or `make migration`
3. **User Confirmation Required**: Always ask the user to review schema changes and execute migration commands manually

**Why This Policy Exists**:

- Database migrations are **irreversible** operations
- Schema changes affect **production data**
- User must review migration SQL before applying
- Prevents accidental data loss or corruption

#### 3. Type Generation Policy

**Type generation is allowed** when it's part of development workflow:

```bash
# ✅ Allowed: Type generation (read-only operations)
make build-model-frontend   # Generate Supabase types
make build-model-functions  # Generate Edge Functions types
make build-model            # Generate all types

# ❌ Prohibited: Migration with type generation
make migrate-dev            # Includes migration execution - requires user approval
```

### Enforcement

This command usage policy is **NON-NEGOTIABLE**. Violations may cause:

- ❌ Unintended database schema changes
- ❌ Production data corruption
- ❌ Inconsistent development environment
- ❌ Breaking CI/CD pipelines

**Always ask the user for explicit approval before database operations.**

---

## Domain-Specific Documentation

For detailed information about each domain, refer to the following documentation:

- **Frontend**: [`frontend/README.md`](frontend/README.md) - Next.js 16, React 19, Feature-Sliced Design, shadcn/ui
- **Database Schema**: [`drizzle/README.md`](drizzle/README.md) - Drizzle ORM, RLS policies, migrations, pgvector
- **Backend Python**: [`backend-py/README.md`](backend-py/README.md) - FastAPI, Clean Architecture, AI/ML integration
- **Edge Functions**: [`supabase/functions/README.md`](supabase/functions/README.md) - Deno, Drizzle integration, type safety

---

## Skills Reference

詳細なガイダンスは `.claude/skills/` のスキルを参照してください：

| スキル | 用途 |
|--------|------|
| **fsd** | Feature Sliced Design アーキテクチャ |
| **monorepo** | Bun workspace + FSD 構成 |
| **tanstack-query** | TanStack Query v5 サーバー状態管理 |
| **supabase** | Supabase 認証・RLS・クライアント |
| **drizzle** | Drizzle ORM スキーマ管理 |
| **datetime** | 日時処理・ハイドレーション対策 |
| **shadcn-ui** | shadcn/ui + TailwindCSS 4 |
| **supabase-test** | supabase-test による RLS テスト |

---

## Architecture Overview

This is a full-stack application boilerplate with a multi-platform frontend and backend services.

### Frontend Architecture

- **Framework**: Next.js 16 with App Router
- **UI Library**: shadcn/ui (Radix UI + TailwindCSS 4)
- **Tech Stack**: React 19, TypeScript, Bun package manager
- **Build System**: Turbo for monorepo management
- **Architecture Pattern**: Feature-Sliced Design (FSD)

**→ 詳細は `fsd`、`monorepo`、`shadcn-ui` スキルを参照**

### State Management

| 状態タイプ | 管理方法 |
|-----------|----------|
| **ローカルUI状態** | `useState` |
| **グローバル共有状態** | Zustand (`@workspace/auth`) |
| **サーバー状態** | TanStack Query (`@workspace/query`) |

**→ 詳細は `tanstack-query` スキルを参照**

### Frontend Testing

Supabase 連携のテストには **supabase-test** を使用。RLS ポリシーのテストを TDD で実装。

**→ 詳細は `supabase-test` スキルを参照**

### Backend Architecture

- **Python Backend**: FastAPI application in `backend-py/` using clean architecture patterns
- **Edge Functions**: Supabase Edge Functions using Deno's native `Deno.serve` API
- **Database**: PostgreSQL with Drizzle ORM, includes pgvector extension

**→ 詳細は [`backend-py/README.md`](backend-py/README.md)、[`supabase/functions/README.md`](supabase/functions/README.md) を参照**

### Database Schema

Drizzle ORM でスキーマ管理。RLS ポリシーもコードで定義。

**→ 詳細は `drizzle` スキルと [`drizzle/README.md`](drizzle/README.md) を参照**

---

## Package Management

**重要**: このプロジェクトは**ルートに package.json を持たない**独立型モノレポ構成です。

| コンポーネント | パッケージマネージャー |
|--------------|---------------------|
| Frontend (`frontend/`) | **Bun** |
| Backend Python (`backend-py/`) | **uv** |
| Drizzle (`drizzle/`) | **Bun** |
| Edge Functions (`supabase/functions/`) | **Deno** |

**→ 詳細は `monorepo` スキルを参照**

### ni (パッケージマネージャー抽象化)

[ni](https://github.com/antfu-collective/ni) でパッケージマネージャーコマンドを統一。

| ni コマンド | Bun 変換結果 |
|---|---|
| `ni` | `bun install` |
| `ni package` | `bun add package` |
| `ni -D package` | `bun add -d package` |
| `nr script` | `bun run script` |
| `nlx command` | `bunx command` |

---

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
# 統合コマンド（推奨）
make lint                    # 全体のlint
make format                  # 全体のformat（自動修正）
make type-check              # 全体の型チェック
make ci-check                # CI用の全チェック

# 個別コマンド
make lint-frontend           # Frontend lint
make format-frontend         # Frontend format
make type-check-frontend     # Frontend 型チェック
```

### Database Operations

```bash
# 開発用マイグレーション（ユーザー承認必須）
make migrate-dev           # マイグレーション生成 + 適用 + 型生成

# 型生成（自動実行可）
make build-model           # Supabase型とSQLModelを生成
make build-model-frontend  # Frontend用型生成
make build-model-functions # Edge Functions用型生成
```

---

## Code Style and Quality

### Frontend

- **Linting & Formatting**: Biome
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: TailwindCSS 4 with CSS variables
- **TypeScript**: Strict mode enabled

**→ 詳細は `shadcn-ui` スキルを参照**

### Date and Time Handling

日時処理はハイドレーションエラーを防ぐため、以下の原則に従う：

- **DB 保存**: `toISOString()` で UTC 形式
- **Server → Client**: ISO 文字列（`string`）で props を渡す
- **タイムゾーン変換**: `useEffect` 内でクライアント側のみで実行

**→ 詳細は `datetime` スキルを参照**

### Backend Python

- **Package Manager**: uv
- **Linting**: Ruff（行長: 88）
- **Type Checking**: MyPy（strict mode）
- **Code Style**: Google-style docstrings, Clean architecture

### Edge Functions

- Native `Deno.serve` API
- TypeScript strict mode
- `npm:` プレフィックスで npm パッケージをインポート
- `deno.json` の `imports` フィールドで依存関係を管理

---

## Supabase Configuration Management

### Configuration Responsibilities

| 設定対象 | 管理場所 |
|---------|---------|
| 認証（OAuth, JWT, MFA） | `supabase/config.toml` |
| Storage バケット | `supabase/config.toml` |
| API 設定 | `supabase/config.toml` |
| テーブル定義 | `drizzle/schema/` |
| RLS ポリシー | `drizzle/schema/` |
| Realtime Publications | `drizzle/config/functions.sql` |

**→ 詳細は `drizzle`、`supabase` スキルを参照**

---

## Environment Configuration

Environment files are organized by component in the `env/` directory:

```
env/
├── backend/local.env         # Backend service
├── frontend/local.env        # Frontend (Next.js)
├── migration/local.env       # Database migration
├── secrets.env               # Secrets (.gitignore)
└── secrets.env.example       # Template for secrets
```

---

## Special Notes

### Type Generation

Drizzle スキーマから各プラットフォーム向けに型を生成：

- **Frontend**: `make build-model-frontend`
- **Backend Python**: SQLModel（sqlacodegen で生成）
- **Edge Functions**: `make build-model-functions`

### AI/ML Features

- **Vector Search**: pgvector
- **LLM Orchestration**: LangChain/LangGraph
- **LLM Providers**: OpenAI, Anthropic, Replicate, FAL
- **Real-time Communication**: LiveKit

**→ 詳細は [`backend-py/README.md`](backend-py/README.md) を参照**

### Authentication

- Supabase auth integration
- JWT token verification middleware
- `getUser()` を使用（`getSession()` は使用禁止）

**→ 詳細は `supabase` スキルを参照**
