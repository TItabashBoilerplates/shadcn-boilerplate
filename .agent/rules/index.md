# Claude Code Guidelines - Overview

This directory contains guidelines for Claude Code when working in this repository.

## Documentation Structure

### Critical Guidelines (MANDATORY)

1. **[Research-First Development Approach](./research-first.md)** ⚠️ **MUST READ**
   - Pre-implementation research protocol
   - Using Context7 MCP, WebSearch, WebFetch
   - Research checklist

2. **[Development Command Guidelines](./command-guidelines.md)** ⚠️ **MUST READ**
   - Makefile command usage policy
   - Database migration policy
   - Type generation policy

### Architecture and Project Structure

3. **[Architecture Overview](./architecture.md)**
   - Frontend Architecture (Next.js 16, React 19, FSD)
   - Backend Architecture (FastAPI, Edge Functions, Drizzle ORM)
   - AI/ML Integration

4. **[Package Management](./package-management.md)**
   - Independent monorepo structure
   - Bun, uv, Deno usage patterns

### Development Workflow

5. **[Development Commands](./development-commands.md)**
   - Initial setup
   - Running services
   - Lint & Format
   - Database operations

6. **[Supabase Configuration Management](./supabase-config.md)**
   - Supabase Service Configuration (config.toml)
   - Database Schema Management (Drizzle)
   - RLS, Realtime Publications

### Coding Standards

7. **[Code Style and Quality](./code-style.md)**
   - Frontend (Biome, TailwindCSS 4)
   - Backend Python (Ruff, MyPy)
   - Edge Functions (Deno)

8. **[Date and Time Handling](./date-time-handling.md)**
   - Database configuration
   - Client implementation principles
   - Next.js SSR/CSR hydration strategies

9. **[UI Implementation Guidelines](./ui-implementation.md)**
   - shadcn/ui + TailwindCSS 4
   - Component usage
   - Accessibility compliance

### Environment Configuration

10. **[Environment Configuration](./environment.md)**
    - Environment variable management
    - dotenvx usage

11. **[Special Notes](./special-notes.md)**
    - Type generation
    - AI/ML features
    - Authentication
    - Development workflow

## Domain-Specific Documentation

For detailed information, refer to the following documentation:

- **Frontend**: [`frontend/README.md`](../../frontend/README.md) - Next.js 16, React 19, Feature-Sliced Design, shadcn/ui
- **Database Schema**: [`drizzle/README.md`](../../drizzle/README.md) - Drizzle ORM, RLS policies, migrations, pgvector
- **Backend Python**: [`backend-py/README.md`](../../backend-py/README.md) - FastAPI, Clean Architecture, AI/ML integration
- **Edge Functions**: [`supabase/functions/README.md`](../../supabase/functions/README.md) - Deno, Drizzle integration, type safety

## Core Principles

### Non-Negotiable Policies

1. **Pre-implementation research is mandatory** - No implementation based on assumptions
2. **Use Makefile commands** - Do not execute tools directly
3. **Database migrations require manual approval** - No automatic execution
4. **Use TailwindCSS CSS variables** - No hardcoded colors
