# shadcn-boilerplate

## Description

This is a full-stack application boilerplate with a multi-platform frontend and backend services:
- **Frontend**: Next.js 16, shadcn/ui, TailwindCSS 4, Bun
- **Backend**: FastAPI (Python) with Supabase Edge Functions
- **Database**: PostgreSQL with Drizzle ORM for schema management and pgvector extension

## Project Structure Highlights

### Monorepo Configuration

このプロジェクトは**ルートにpackage.jsonを持たない**独立型モノレポ構成です：

- **`drizzle/`**: データベーススキーマ管理（独立パッケージ、Bun管理）
- **`frontend/`**: Next.js 16モノレポ（Bun workspace、Turbo build system）
- **`backend-py/`**: Python FastAPI（uv管理、独立）

各ディレクトリが独自の依存関係とnode_modules/を持ち、クリーンに分離されています。

### Package Managers

用途に応じて最適なパッケージマネージャーを使用：

- **Frontend**: Bun 1.2.8（高速、Node.js互換）
- **Backend Python**: uv（Rust製、高速な依存関係管理）
- **Drizzle**: Bun（frontendと同様）
- **Edge Functions**: Deno（組み込みパッケージマネージャー）

### Unified Code Quality

全プロジェクトで統一されたコード品質管理：

- **Frontend & Drizzle**: Biome（ESLint + Prettierの高速な代替）
- **Backend Python**: Ruff（lint） + MyPy（型チェック）
- **Edge Functions**: Deno native tools
- **統合コマンド**: `make lint`, `make format`, `make ci-check`

## Development Environment

For this project, we recommend the following development setup:

- Frontend: Utilize Visual Studio Code's workspace feature
- Backend: Use Visual Studio Code's devcontainer functionality

By adopting these environments, we can ensure efficient development and maintain consistency across the team.

## Architecture

### Frontend Architecture
- **Application**: Next.js 16 with App Router and Turbopack for development
- **Architecture**: Feature-Sliced Design (FSD) methodology with strict layer organization
- **UI Framework**: shadcn/ui components built on Radix UI with TailwindCSS 4
- **Tech Stack**: React 19, TypeScript, Bun package manager
- **Build System**: Turbo for monorepo management

### Backend Architecture
- **Python Backend**: FastAPI application in `backend-py/` using clean architecture patterns
- **Edge Functions**: Supabase Edge Functions using Deno's native `Deno.serve` API for lightweight serverless functions
- **Database**: PostgreSQL with **Drizzle ORM** for schema management, includes pgvector extension for embeddings
- **Infrastructure**: Supabase for auth/database, Docker containerization

#### Configuration Management
- **Supabase Services** (`supabase/config.toml`): Auth, Storage, API settings, service-level configurations
- **Database Schema** (`drizzle/`): Tables, RLS policies, Realtime publications, functions, triggers managed with Drizzle ORM

### Key Features
- Multi-client architecture with corporate users, general users, and virtual users
- Chat system with rooms, messages, and user relationships
- Vector embeddings for AI/ML features
- Clean separation between user types and permissions

## Requirements

Ensure the following are installed:

- [Docker](https://www.docker.com/)
- [asdf](https://asdf-vm.com/)
- [Supabase CLI](https://supabase.com/)
- Make

The following tools will be automatically installed via asdf during `make init`:

- **Node.js 22.9.0** (managed via asdf) - for frontend and Drizzle
- **Python 3.12.9** (managed via asdf) - for backend development
- **Deno 2.5.6** (managed via asdf) - for Edge Functions
- **Bun 1.2.8** (installed via asdf nodejs plugin) - for frontend package management

asdf plugins (nodejs, python, deno) will be automatically added during initialization.

## Setup

To set up the project environment, follow these steps:

1. **Initialize the Project**:
   Run the following command to initialize the project:

   ```bash
   make init
   ```

   This command will automatically perform the following steps:

   1. Add asdf plugins (nodejs, python, deno) if not already added
   2. Install tools via asdf based on `.tool-versions`
   3. Install dotenvx globally for environment variable management
   4. Create `.env` file for Docker Compose (PROJECT_NAME configuration)
   5. Log in to Supabase CLI and initialize Supabase
   6. Start Supabase local development environment
   7. Copy `env/secrets.env.example` to `env/secrets.env` (if not exists)
   8. Install frontend dependencies with Bun
   9. Run initial database migration and type generation

2. **Environment Variable Setup**:

   Environment variables are organized by component in the `env/` directory:

   ```
   env/
   ├── backend/local.env         # Backend service (Supabase URL, etc.)
   ├── frontend/local.env        # Frontend (Next.js environment variables)
   ├── migration/local.env       # Database migration (DATABASE_URL)
   ├── secrets.env               # Secrets (.gitignore, created from example)
   └── secrets.env.example       # Template for secrets
   ```

   After `make init`, open `env/secrets.env` and update the necessary environment variables:

   ```
   SUPABASE_URL=your_supabase_project_id
   SUPABASE_ANON_KEY=your_supabase_api_key
   # Other necessary environment variables
   ```

   Note: `secrets.env` contains sensitive information and is git-ignored.

3. **Database Setup**:
   The initial migration is performed as part of the `make init` command. If you need to run migrations separately, use:

   ```bash
   make migration      # Alias for migrate-dev
   make migrate-dev    # Generate + Apply migrations + Generate types (local only)
   ```

## Execution

After successfully completing the setup, you can start the application using one of the following commands:

### Backend Services
- Start backend services with Docker:
  ```bash
  make run
  ```

- Stop all services:
  ```bash
  make stop
  ```

### Frontend Development
- Start web frontend (Next.js):
  ```bash
  make frontend
  ```

- Or directly inside `frontend/` directory:
  ```bash
  cd frontend
  bun run dev    # Next.js development server with Turbopack
  bun run build  # Build production application
  bun run start  # Start production server
  bun run lint   # Run ESLint
  ```

## Additional Commands

### Code Quality Management

このプロジェクトでは、全コンポーネント（Frontend, Drizzle, Backend Python, Edge Functions）で統一されたコード品質管理を実現しています。

#### Unified Commands (推奨)

全プロジェクトを一括で管理するコマンド：

```bash
make lint           # 全プロジェクトのlint（自動修正）
make format         # 全プロジェクトのformat（自動修正）
make format-check   # 全プロジェクトのformatチェック（CI用、修正なし）
make type-check     # 全プロジェクトの型チェック
make ci-check       # CI用の全チェック（lint + format + type-check）
```

#### Frontend Specific (Biome)

```bash
make lint-frontend           # Biome lint（自動修正）
make lint-frontend-ci        # Biome lint（CI用、修正なし）
make format-frontend         # Biome format（自動修正）
make format-frontend-check   # Biome formatチェック（チェックのみ）
make type-check-frontend     # TypeScript型チェック
```

#### Drizzle Specific (Biome)

```bash
make lint-drizzle            # Biome lint（自動修正）
make lint-drizzle-ci         # Biome lint（CI用、修正なし）
make format-drizzle          # Biome format（自動修正）
make format-drizzle-check    # Biome formatチェック（チェックのみ）
```

#### Backend Python Specific (Ruff + MyPy)

```bash
make lint-backend-py         # Ruff lint（自動修正）
make lint-backend-py-ci      # Ruff lint（CI用、修正なし）
make format-backend-py       # Ruff format（自動修正）
make format-backend-py-check # Ruff formatチェック（チェックのみ）
make type-check-backend-py   # MyPy型チェック（strict mode）
```

#### Edge Functions Specific (Deno)

```bash
make lint-functions          # Deno lint
make format-functions        # Deno format（自動修正）
make format-functions-check  # Deno formatチェック（チェックのみ）
make check-functions         # Deno型チェック（全関数自動検出）
```

### Development Tools

#### Other Tools
- Check services status:
  ```bash
  make check
  ```

- Build frontend:
  ```bash
  make build-frontend
  ```

### Database Operations

このプロジェクトはDrizzle ORMでデータベーススキーマを管理しています。

**開発環境（ローカル）**:
```bash
# マイグレーション生成 + 適用 + 型生成（推奨）
make migrate-dev
# または短縮形
make migration

# スキーマを直接DBにプッシュ（プロトタイピング用）
make drizzle-push

# Drizzle Studio起動（GUI）
make drizzle-studio

# スキーマ検証
make drizzle-validate
```

**本番環境（リモート）**:
```bash
# マイグレーションファイルを適用のみ（型生成は行わない）
make migrate-deploy

# ステージング環境
ENV=staging make migrate-deploy

# 本番環境
ENV=production make migrate-deploy
```

**コマンドの使い分け**:
- `make migration` / `make migrate-dev`: ローカル開発用。スキーマ変更→マイグレーション生成→適用→型生成を一括実行
- `make migrate-deploy`: リモート環境用。既存のマイグレーションファイルを適用するのみ
- `make drizzle-push`: マイグレーションファイルを生成せずにスキーマを直接プッシュ（実験・プロトタイピング用）

詳細は `CLAUDE.md` の「Drizzle Schema Management」セクションを参照してください。

### Model Generation
- Build Supabase types for frontend:
  ```bash
  make build-model-frontend
  ```

- Build types for Edge Functions:
  ```bash
  make build-model-functions
  ```

- Build all models:
  ```bash
  make build-model
  ```

### Edge Functions
- Deploy Edge Functions:
  ```bash
  make deploy-functions
  ```

# Development Guidelines

## Code Quality
- **Frontend**: Biome for linting and formatting (all-in-one toolchain, replaces ESLint + Prettier), TypeScript strict mode
- **Backend**: Ruff for linting (line length: 88), MyPy for type checking
- **Edge Functions**: Deno native tools, `npm:` prefix for dependencies (not JSR or HTTP imports)
- **UI Design**: shadcn/ui components (Radix UI) with TailwindCSS 4 and CSS variables
- **Package Manager**: Bun for fast dependency management
- **Build System**: Turbo for efficient monorepo builds

## Architecture Patterns
- **Frontend**: Feature-Sliced Design (FSD) with strict layer hierarchy (app → pages → widgets → features → entities → shared)
- **Backend**: Clean architecture with Controllers, Use Cases, Gateways, and Infrastructure
- **Database**: Multi-client architecture with proper separation of concerns

## Integrated Tools

The project includes integrations for:

- **[Next.js 16](https://nextjs.org/)**: React framework with App Router and Turbopack
- **[shadcn/ui](https://ui.shadcn.com/)**: UI component library built on Radix UI
- **[TailwindCSS 4](https://tailwindcss.com/)**: Utility-first CSS framework
- **[Supabase](https://supabase.com/)**: Authentication, database, and Edge Functions
- **[Drizzle ORM](https://orm.drizzle.team/)**: TypeScript ORM with declarative schema management
- **[FastAPI](https://fastapi.tiangolo.com/)**: Python backend framework
- **[Bun](https://bun.sh/)**: Fast package manager and JavaScript runtime
- **[Turbo](https://turbo.build/)**: High-performance build system for monorepos
- **[Docker](https://docker.com/)**: Containerization for consistent development environments

### AI Coding Assistants

このプロジェクトは、主要なAIコーディングアシスタントに最適化されています：

- **[Claude Code](https://claude.com/claude-code)**: `CLAUDE.md` で詳細なガイドラインを提供
- **[Cursor](https://cursor.com/)**: `.cursorrules` ファイルでプロジェクト固有のルールを定義
- **[OpenAI Codex](https://openai.com/codex)**: `AGENTS.md` を自動検出し、`gpt-5-codex` モデルを使用
  - セットアップガイド: `docs/codex-setup.md`
  - 設定例: `.codex/config.toml.example`
- **GitHub Copilot**: `AGENTS.md` でプロジェクトコンテキストを提供

各AIアシスタントは、プロジェクトのアーキテクチャ、コーディング規約、ベストプラクティスを自動的に理解します。

## Future Considerations

The following tools are being considered for implementation:

- **[Resend](https://resend.com/)**: Email delivery service
- **[Sentry](https://sentry.io/)**: Application monitoring and error tracking
- **[Stripe](https://stripe.com/)**: Payment processing platform
- **[RevenueCat](https://www.revenuecat.com/)**: Subscription management for mobile apps
