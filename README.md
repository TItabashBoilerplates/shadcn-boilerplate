# shadcn-boilerplate

## Description

This is a full-stack application boilerplate with a multi-platform frontend and backend services:
- **Frontend**: Next.js 16, shadcn/ui, TailwindCSS 4, Bun
- **Backend**: FastAPI (Python) with Supabase Edge Functions
- **Database**: PostgreSQL with Atlas (HCL-based schema management) and pgvector extension

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
- **Edge Functions**: Supabase Edge Functions using Hono framework for serverless APIs
- **Database**: PostgreSQL with **Atlas** for schema management (HCL-based), includes pgvector extension for embeddings
- **Infrastructure**: Supabase for auth/database, Docker containerization

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
- [Bun](https://bun.sh/) (for frontend package management)
- [Node.js](https://nodejs.org/) (managed via asdf)
- [Python 3.12+](https://python.org/) (for backend development)
- Make

## Setup

To set up the project environment, follow these steps:

1. **Initialize the Project**:
   Run the following command to initialize the project:

   ```bash
   make init
   ```

   This command will:
   - Check for necessary tools
   - Install asdf dependencies
   - Log in to Supabase and initialize it
   - Start Supabase
   - Set up environment variables
   - Install frontend dependencies with Bun
   - Perform initial database migration
   - Build necessary models

2. **Environment Variable Setup**:
   Open the `env/secrets.env` file and update the necessary environment variables. Ensure the following variables are set correctly:

   ```
   SUPABASE_URL=your_supabase_project_id
   SUPABASE_ANON_KEY=your_supabase_api_key
   // Other necessary environment variables
   ```

   Note: This file contains sensitive information, so do not commit it to your version control system.

3. **Database Setup**:
   The initial migration is performed as part of the `make init` command. If you need to run migrations separately, use:

   ```bash
   make migration
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

### Development Tools
- Check services status:
  ```bash
  make check
  ```

- Build frontend:
  ```bash
  make build-frontend
  ```

- Lint frontend code:
  ```bash
  make lint-frontend
  ```

### Database Operations (Atlas-based)

**開発環境**:
```bash
# マイグレーション生成 + 適用 + 型生成（Prismaの migrate dev 相当）
make migrate-dev
# または短縮形
make migration
```

**本番環境**:
```bash
# マイグレーションファイルを適用（Prismaの migrate deploy 相当）
make migrate-deploy

# ステージング環境
ENV=staging make migrate-deploy

# 本番環境
ENV=production make migrate-deploy
```

**スキーマ検証**:
```bash
# スキーマ検証
make atlas-validate

# マイグレーションLintチェック
make atlas-lint
```

詳細は `atlas/README.md` および `CLAUDE.md` の「Atlas Schema Management」セクションを参照してください。

### Model Generation
- Build Supabase types for frontend:
  ```bash
  make build-model-frontend-supabase
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
- **[Atlas](https://atlasgo.io/)**: Database schema management with HCL-based declarative migrations
- **[FastAPI](https://fastapi.tiangolo.com/)**: Python backend framework
- **[Bun](https://bun.sh/)**: Fast package manager and JavaScript runtime
- **[Turbo](https://turbo.build/)**: High-performance build system for monorepos
- **[Docker](https://docker.com/)**: Containerization for consistent development environments

## Future Considerations

The following tools are being considered for implementation:

- **[Resend](https://resend.com/)**: Email delivery service
- **[Sentry](https://sentry.io/)**: Application monitoring and error tracking
- **[Stripe](https://stripe.com/)**: Payment processing platform
- **[RevenueCat](https://www.revenuecat.com/)**: Subscription management for mobile apps
