# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**CRITICAL - 推測実装の完全禁止**:

- **推測・記憶・一般知識に基づく実装は一切禁止**
- 実装前に必ず **Context7 MCP** または **WebSearch/WebFetch** で公式ドキュメントを確認すること
- ライブラリの API、設定ファイル形式、CLI 構文は**必ずファクトを調査**してから使用
- 「たぶんこうだろう」「以前こうだった」という推測での実装は**絶対に行わない**
- **モジュール・パッケージは必ず最新バージョンを調査し、最新のAPIを使用すること**
- **ビルド・テスト・リント等は必ず Makefile のコマンドを使用すること**（詳細は `.claude/rules/commands.md`）
- 詳細は `.claude/rules/research.md` を参照

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
│   ├── auto-generated.md # 自動生成ファイル編集禁止
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
    ├── shadcn-ui/        # shadcn/ui + TailwindCSS (Web)
    ├── gluestack/        # gluestack-ui + NativeWind (Mobile)
    ├── supabase-test/    # RLS テスト（Frontend）
    ├── python-testing/   # Python単体テスト（外部SDK/TypeError検知）
    ├── i18n/             # next-intl 多言語対応
    └── langchain/        # LangChain/LangGraph/LangSmith
```

## Domain Documentation

詳細なドメイン情報は各 README を参照：

| ドメイン          | ドキュメント                                                       |
| ----------------- | ------------------------------------------------------------------ |
| Frontend (Web)    | [`frontend/README.md`](frontend/README.md)                         |
| Frontend (Mobile) | [`frontend/apps/mobile/README.md`](frontend/apps/mobile/README.md) |
| Database Schema   | [`drizzle/README.md`](drizzle/README.md)                           |
| Backend Python    | [`backend-py/README.md`](backend-py/README.md)                     |
| Edge Functions    | [`supabase/functions/README.md`](supabase/functions/README.md)     |

---

## Architecture Overview

Full-stack application boilerplate with multi-platform frontend and backend services.

### Tech Stack

| Layer                 | Technology                                       |
| --------------------- | ------------------------------------------------ |
| **Frontend (Web)**    | Next.js 16, React 19, TypeScript, Bun            |
| **Frontend (Mobile)** | Expo 55, React Native, TypeScript                |
| **UI (Web)**          | shadcn/ui, Radix UI, TailwindCSS 4               |
| **UI (Mobile)**       | gluestack-ui, NativeWind 5, TailwindCSS 4        |
| **State**             | TanStack Query (server), Zustand (global)        |
| **Architecture**      | Feature Sliced Design (FSD)                      |
| **i18n**              | next-intl (en, ja)                               |
| **Backend**           | FastAPI (Python), Supabase Edge Functions (Deno) |
| **Database**          | PostgreSQL, Drizzle ORM, pgvector                |
| **Auth**              | Supabase Auth                                    |

**MANDATORY**: すべてのユーザー向けテキストは多言語対応（i18n）必須。詳細は `.claude/skills/i18n/` を参照。

**MANDATORY**: すべての実装はテスト駆動開発（TDD）を厳守。**作業終了時は必ず All Green（全テスト通過）を確認**。詳細は `.claude/rules/tdd.md` を参照。

**MANDATORY**: 単体テストでは**外部SDK（pipモジュール）を丸ごとMockしない**。本物のSDKを使い、I/O層（HTTP/DB）のみ差し替えることで、**TypeError・ValueError・RuntimeError を単体テスト時点で検知**し、型安全で堅牢な状態を維持する。詳細は `.claude/rules/backend-py.md` および `.claude/skills/python-testing/` を参照。

### Package Management

| Component                                 | Package Manager |
| ----------------------------------------- | --------------- |
| Frontend Web (`frontend/apps/web/`)       | **Bun**         |
| Frontend Mobile (`frontend/apps/mobile/`) | **Bun**         |
| Backend Python (`backend-py/`)            | **uv**          |
| Drizzle (`drizzle/`)                      | **Bun**         |
| Edge Functions (`supabase/functions/`)    | **Deno**        |

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

| ni              | Bun equivalent       |
| --------------- | -------------------- |
| `ni`            | `bun install`        |
| `ni package`    | `bun add package`    |
| `ni -D package` | `bun add -d package` |
| `nr script`     | `bun run script`     |
| `nlx command`   | `bunx command`       |

---

## Supabase Configuration

| Setting                | Location                       |
| ---------------------- | ------------------------------ |
| Auth (OAuth, JWT, MFA) | `supabase/config.toml`         |
| Storage buckets        | `supabase/config.toml`         |
| API settings           | `supabase/config.toml`         |
| Tables                 | `drizzle/schema/`              |
| RLS policies           | `drizzle/schema/`              |
| Realtime               | `drizzle/config/functions.sql` |

---

## AI/ML Features

- **Vector Search**: pgvector
- **LLM Orchestration**: LangChain/LangGraph
- **Providers**: OpenAI, Anthropic, Replicate, FAL
- **Real-time**: LiveKit

→ 詳細は [`backend-py/README.md`](backend-py/README.md)
