# shadcn-boilerplate

## Description

This is a full-stack application boilerplate with a multi-platform frontend and backend services:

- **Frontend (Web)**: Next.js 16, React 19, shadcn/ui, TailwindCSS 4, Bun
- **Frontend (Mobile)**: Expo 55, React Native 0.82, gluestack-ui, NativeWind 5
- **Backend**: FastAPI (Python) with Supabase Edge Functions (Deno)
- **Database**: PostgreSQL with Drizzle ORM for schema management and pgvector extension

## Tech Stack

| Layer                 | Technology                                       |
| --------------------- | ------------------------------------------------ |
| **Frontend (Web)**    | Next.js 16, React 19, TypeScript, Bun            |
| **Frontend (Mobile)** | Expo 55, React Native 0.82, TypeScript           |
| **UI (Web)**          | shadcn/ui, MagicUI, Radix UI, TailwindCSS 4      |
| **UI (Mobile)**       | gluestack-ui, NativeWind 5, TailwindCSS 4        |
| **State**             | TanStack Query v5 (server), Zustand (global)     |
| **Architecture**      | Feature Sliced Design (FSD)                      |
| **i18n**              | next-intl (en, ja)                               |
| **Backend**           | FastAPI (Python), Supabase Edge Functions (Deno) |
| **Database**          | PostgreSQL, Drizzle ORM, pgvector                |
| **Auth**              | Supabase Auth                                    |

## Project Structure Highlights

### Monorepo Configuration

This project uses an **independent monorepo structure without a root package.json**:

- **`drizzle/`**: Database schema management (independent package, Bun)
- **`frontend/`**: Next.js 16 + Expo monorepo (Bun workspace, Turbo build system)
- **`backend-py/`**: Python FastAPI (uv, independent)

Each directory has its own dependencies and node_modules/, cleanly separated.

### Package Managers

Using optimal package managers for each component:

- **Frontend**: Bun 1.2.8 (fast, Node.js compatible)
- **Backend Python**: uv (Rust-based, fast dependency management)
- **Drizzle**: Bun (same as frontend)
- **Edge Functions**: Deno 2.5.6 (built-in package manager)

### Frontend Packages

The frontend monorepo (`frontend/packages/`) contains the following shared packages:

| Package | Description |
|---------|-------------|
| `@workspace/ui-web` | shadcn/ui + MagicUI components for web |
| `@workspace/ui-mobile` | gluestack-ui components for mobile |
| `@workspace/types` | Supabase types (auto-generated) |
| `@workspace/api-client` | Backend API client (Hey API + TanStack Query) |
| `@workspace/auth` | Authentication utilities |
| `@workspace/tokens` | Design tokens (colors, spacing) |
| `@workspace/query` | TanStack Query configuration |
| `@workspace/client` | Supabase client (@supabase/ssr) |
| `@workspace/logger` | Logging (Pino) |
| `@workspace/polar` | Polar.sh payment integration |
| `@workspace/onesignal` | OneSignal push notifications |
| `@workspace/utils` | Utility functions |

### Unified Code Quality

Unified code quality management across all projects:

- **Frontend & Drizzle**: Biome (fast ESLint + Prettier alternative)
- **Backend Python**: Ruff (lint) + MyPy (type check)
- **Edge Functions**: Deno native tools
- **Unified Commands**: `make lint`, `make format`, `make ci-check`

## Development Environment

For this project, we recommend the following development setup:

- Frontend: Utilize Visual Studio Code's workspace feature
- Backend: Use Visual Studio Code's devcontainer functionality

By adopting these environments, we can ensure efficient development and maintain consistency across the team.

## Architecture

### Frontend Architecture

- **Web Application**: Next.js 16 with App Router and Turbopack for development
- **Mobile Application**: Expo 55 with React Native 0.82 and Expo Router
- **Architecture**: Feature-Sliced Design (FSD) methodology with strict layer organization
- **UI Framework (Web)**: shadcn/ui + MagicUI components built on Radix UI with TailwindCSS 4
- **UI Framework (Mobile)**: gluestack-ui components with NativeWind 5 (TailwindCSS for React Native)
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

### Frontend Development (Web)

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
  bun run lint   # Run Biome lint
  ```

### Frontend Development (Mobile)

- Start mobile frontend (Expo):

  ```bash
  cd frontend/apps/mobile
  bun run start    # Start Expo development server
  bun run ios      # Start iOS simulator
  bun run android  # Start Android emulator
  ```

## Additional Commands

### Code Quality Management

This project implements unified code quality management across all components (Frontend, Drizzle, Backend Python, Edge Functions).

#### Unified Commands (Recommended)

Commands to manage all projects at once:

```bash
make lint           # Lint all projects (auto-fix)
make format         # Format all projects (auto-fix)
make format-check   # Format check all projects (CI, no fix)
make type-check     # Type check all projects
make ci-check       # CI checks (lint + format + type-check)
```

#### Frontend Specific (Biome)

```bash
make lint-frontend           # Biome lint (auto-fix)
make lint-frontend-ci        # Biome lint (CI, no fix)
make format-frontend         # Biome format (auto-fix)
make format-frontend-check   # Biome format check
make type-check-frontend     # TypeScript type check
```

#### Drizzle Specific (Biome)

```bash
make lint-drizzle            # Biome lint (auto-fix)
make lint-drizzle-ci         # Biome lint (CI, no fix)
make format-drizzle          # Biome format (auto-fix)
make format-drizzle-check    # Biome format check
```

#### Backend Python Specific (Ruff + MyPy)

```bash
make lint-backend-py         # Ruff lint (auto-fix)
make lint-backend-py-ci      # Ruff lint (CI, no fix)
make format-backend-py       # Ruff format (auto-fix)
make format-backend-py-check # Ruff format check
make type-check-backend-py   # MyPy type check (strict mode)
```

#### Edge Functions Specific (Deno)

```bash
make lint-functions          # Deno lint
make format-functions        # Deno format (auto-fix)
make format-functions-check  # Deno format check
make check-functions         # Deno type check (all functions auto-detected)
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

This project manages database schema with Drizzle ORM.

**Development (Local)**:

```bash
# Generate + Apply migration + Generate types (recommended)
make migrate-dev
# Or shorthand
make migration

# Push schema directly to DB (for prototyping)
make drizzle-push

# Start Drizzle Studio (GUI)
make drizzle-studio

# Validate schema
make drizzle-validate
```

**Production (Remote)**:

```bash
# Staging environment
ENV=stg make migrate-deploy

# Production environment
ENV=prod make migrate-deploy
```

**Command Usage**:

- `make migration` / `make migrate-dev`: For local development. Schema changes → Generate migration → Apply → Generate types in one go
- `make migrate-deploy`: For remote environments. Only apply existing migration files
- `make drizzle-push`: Push schema directly without generating migration files (for experimentation/prototyping)

For details, see the "Drizzle Schema Management" section in `CLAUDE.md`.

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

- Deploy single Edge Function:
  ```bash
  make deploy-functions FUNCTION=function-name
  ```

### Deployment (Remote)

Deploy Supabase resources to remote environments (stg/prod):

```bash
# 1. Supabase platform settings (Config, Buckets, Functions, Secrets)
ENV=stg make deploy-supabase

# 2. DB migration
ENV=stg make migrate-deploy
```

**What deploy-supabase applies**:
- Config (Auth settings, API settings) - `supabase config push`
- Storage Buckets - `supabase seed buckets`
- Edge Functions (all functions) - `supabase functions deploy`
- Secrets - `supabase secrets set`

For details, see `.claude/skills/supabase/deploy.md`.

# Development Guidelines

## Code Quality

- **Frontend**: Biome for linting and formatting (all-in-one toolchain, replaces ESLint + Prettier), TypeScript strict mode
- **Backend**: Ruff for linting (line length: 88), MyPy for type checking
- **Edge Functions**: Deno native tools, `npm:` prefix for dependencies (not JSR or HTTP imports)
- **UI Design (Web)**: shadcn/ui + MagicUI components (Radix UI) with TailwindCSS 4 and CSS variables
- **UI Design (Mobile)**: gluestack-ui components with NativeWind 5
- **Package Manager**: Bun for fast dependency management
- **Build System**: Turbo for efficient monorepo builds

## Architecture Patterns

- **Frontend**: Feature-Sliced Design (FSD) with strict layer hierarchy (app → pages → widgets → features → entities → shared)
- **Backend**: Clean architecture with Controllers, Use Cases, Gateways, and Infrastructure
- **Database**: Multi-client architecture with proper separation of concerns

## Integrated Tools

The project includes integrations for:

- **[Next.js 16](https://nextjs.org/)**: React framework with App Router and Turbopack
- **[Expo 55](https://expo.dev/)**: React Native development platform
- **[shadcn/ui](https://ui.shadcn.com/)**: UI component library built on Radix UI (Web)
- **[MagicUI](https://magicui.design/)**: Animated UI components (Web)
- **[gluestack-ui](https://gluestack.io/)**: UI component library (Mobile)
- **[NativeWind 5](https://www.nativewind.dev/)**: TailwindCSS for React Native
- **[TailwindCSS 4](https://tailwindcss.com/)**: Utility-first CSS framework
- **[TanStack Query v5](https://tanstack.com/query)**: Server state management
- **[Zustand](https://zustand-demo.pmnd.rs/)**: Global state management
- **[next-intl](https://next-intl-docs.vercel.app/)**: Internationalization (en, ja)
- **[Supabase](https://supabase.com/)**: Authentication, database, and Edge Functions
- **[Drizzle ORM](https://orm.drizzle.team/)**: TypeScript ORM with declarative schema management
- **[FastAPI](https://fastapi.tiangolo.com/)**: Python backend framework
- **[Bun](https://bun.sh/)**: Fast package manager and JavaScript runtime
- **[Turbo](https://turbo.build/)**: High-performance build system for monorepos
- **[Docker](https://docker.com/)**: Containerization for consistent development environments
- **[Polar.sh](https://polar.sh/)**: Payment and subscription management
- **[OneSignal](https://onesignal.com/)**: Push notification service

### AI Coding Assistants

This project is optimized for major AI coding assistants:

- **[Claude Code](https://claude.com/claude-code)**: Provides detailed guidelines via `CLAUDE.md`
- **[Cursor](https://cursor.com/)**: Defines project-specific rules via `.cursorrules` file
- **[OpenAI Codex](https://openai.com/codex)**: Auto-detects `AGENTS.md`, uses `gpt-5-codex` model
  - Setup guide: `docs/codex-setup.md`
  - Config example: `.codex/config.toml.example`
- **GitHub Copilot**: Provides project context via `AGENTS.md`

Each AI assistant automatically understands the project's architecture, coding conventions, and best practices.

## Future Considerations

The following tools are being considered for implementation:

- **[Resend](https://resend.com/)**: Email delivery service
- **[Sentry](https://sentry.io/)**: Application monitoring and error tracking
- **[Stripe](https://stripe.com/)**: Payment processing platform
- **[RevenueCat](https://www.revenuecat.com/)**: Subscription management for mobile apps
