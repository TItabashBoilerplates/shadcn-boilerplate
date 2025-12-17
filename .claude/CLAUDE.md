# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Memory Structure

このプロジェクトは `.claude/` ディレクトリでメモリを構造化しています：

```
.claude/
├── rules/          # 常に適用されるポリシー・制約
│   ├── tdd.md            # テスト駆動開発（TDD）必須
│   ├── research.md       # Research-First ポリシー
│   ├── supabase-first.md # Supabase優先アーキテクチャ
│   ├── commands.md       # Makefile コマンド必須
│   ├── database.md       # マイグレーション承認必須
│   ├── frontend.md       # Frontend コード規約
│   ├── backend-py.md     # Python コード規約
│   ├── edge-functions.md # Edge Functions 規約
│   └── i18n.md           # 多言語対応（必須）
│
└── skills/         # 質問時に参照するガイダンス
    ├── fsd/              # Feature Sliced Design
    ├── monorepo/         # Bun workspace 構成
    ├── tanstack-query/   # TanStack Query v5
    ├── supabase/         # Supabase 認証・RLS
    ├── drizzle/          # Drizzle ORM スキーマ
    ├── datetime/         # 日時処理
    ├── shadcn-ui/        # shadcn/ui + TailwindCSS
    ├── supabase-test/    # RLS テスト
    ├── i18n/             # next-intl 多言語対応
    └── langchain/        # LangChain/LangGraph/LangSmith
```

## Domain Documentation

詳細なドメイン情報は各 README を参照：

| ドメイン | ドキュメント |
|---------|-------------|
| Frontend | [`frontend/README.md`](frontend/README.md) |
| Database Schema | [`drizzle/README.md`](drizzle/README.md) |
| Backend Python | [`backend-py/README.md`](backend-py/README.md) |
| Edge Functions | [`supabase/functions/README.md`](supabase/functions/README.md) |

---

## Architecture Overview

Full-stack application boilerplate with multi-platform frontend and backend services.

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Bun |
| **UI** | shadcn/ui, Radix UI, TailwindCSS 4 |
| **State** | TanStack Query (server), Zustand (global) |
| **Architecture** | Feature Sliced Design (FSD) |
| **i18n** | next-intl (en, ja) |
| **Backend** | FastAPI (Python), Supabase Edge Functions (Deno) |
| **Database** | PostgreSQL, Drizzle ORM, pgvector |
| **Auth** | Supabase Auth |

### Package Management

| Component | Package Manager |
|-----------|----------------|
| Frontend (`frontend/`) | **Bun** |
| Backend Python (`backend-py/`) | **uv** |
| Drizzle (`drizzle/`) | **Bun** |
| Edge Functions (`supabase/functions/`) | **Deno** |

---

## Quick Reference

### Development Commands

```bash
# Setup
make init                    # Full project initialization

# Services
make run                     # Start backend (Docker)
make frontend                # Start frontend dev server
make stop                    # Stop all services

# Quality
make lint                    # Lint all
make format                  # Format all
make type-check              # Type check all
make ci-check                # CI checks (lint + format + type)

# Database (user approval required)
make migrate-dev             # Generate + apply migration
make build-model             # Generate types only
```

### Environment Configuration

```
env/
├── backend/local.env         # Backend service
├── frontend/local.env        # Frontend (Next.js)
├── migration/local.env       # Database migration
├── secrets.env               # Secrets (.gitignore)
└── secrets.env.example       # Template
```

### ni Commands (Package Manager Abstraction)

| ni | Bun equivalent |
|----|----------------|
| `ni` | `bun install` |
| `ni package` | `bun add package` |
| `ni -D package` | `bun add -d package` |
| `nr script` | `bun run script` |
| `nlx command` | `bunx command` |

---

## Supabase Configuration

| Setting | Location |
|---------|----------|
| Auth (OAuth, JWT, MFA) | `supabase/config.toml` |
| Storage buckets | `supabase/config.toml` |
| API settings | `supabase/config.toml` |
| Tables | `drizzle/schema/` |
| RLS policies | `drizzle/schema/` |
| Realtime | `drizzle/config/functions.sql` |

---

## AI/ML Features

- **Vector Search**: pgvector
- **LLM Orchestration**: LangChain/LangGraph
- **Providers**: OpenAI, Anthropic, Replicate, FAL
- **Real-time**: LiveKit

→ 詳細は [`backend-py/README.md`](backend-py/README.md)
