# AGENT.md

このファイルは Google Antigravity Agent がコードベースで作業する際のガイダンスを提供します。

## CRITICAL - 推測実装の完全禁止

- **推測・記憶・一般知識に基づく実装は一切禁止**
- 実装前に必ず公式ドキュメントを確認すること
- ライブラリの API、設定ファイル形式、CLI 構文は**必ずファクトを調査**してから使用
- 「たぶんこうだろう」「以前こうだった」という推測での実装は**絶対に行わない**
- **モジュール・パッケージは必ず最新バージョンを調査し、最新のAPIを使用すること**
- **ビルド・テスト・リント等は必ず Makefile のコマンドを使用すること**

## 会話言語

- 常に日本語で会話する

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

### Package Management

| Component                                 | Package Manager |
| ----------------------------------------- | --------------- |
| Frontend Web (`frontend/apps/web/`)       | **Bun**         |
| Frontend Mobile (`frontend/apps/mobile/`) | **Bun**         |
| Backend Python (`backend-py/`)            | **uv**          |
| Drizzle (`drizzle/`)                      | **Bun**         |
| Edge Functions (`supabase/functions/`)    | **Deno**        |

---

## Core Policies (MANDATORY)

以下のポリシーは**必須**です。詳細は `.agent/rules/` の各ファイルを参照：

| ポリシー | 説明 | ファイル |
|---------|------|---------|
| **Research-First** | 実装前に公式ドキュメント確認必須 | `research-first.md` |
| **TDD** | テスト駆動開発、All Green必須 | `testing.md` |
| **Commands** | Makefileコマンド使用必須 | `command-guidelines.md` |
| **Auto-Generated** | 自動生成ファイル編集禁止 | `auto-generated.md` |
| **Supabase-First** | supabase-js優先、バックエンドは最終手段 | `supabase-config.md` |
| **i18n** | 多言語対応必須（en, ja） | `i18n.md` |
| **DateTime** | UTC保存、Frontend変換 | `date-time-handling.md` |
| **Clean Code** | 後方互換禁止、重複禁止 | `clean-code.md` |
| **UI Testing** | UI は Storybook、単体テスト不要 | `ui-testing.md` |

---

## Development Commands

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

---

## Environment Configuration

```
env/
├── backend/local.env         # Backend service
├── frontend/local.env        # Frontend (Next.js)
├── migration/local.env       # Database migration
├── secrets.env               # Secrets (.gitignore)
└── secrets.env.example       # Template
```

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

## Domain Documentation

| ドメイン          | ドキュメント                                                       |
| ----------------- | ------------------------------------------------------------------ |
| Frontend (Web)    | [`frontend/README.md`](frontend/README.md)                         |
| Frontend (Mobile) | [`frontend/apps/mobile/README.md`](frontend/apps/mobile/README.md) |
| Database Schema   | [`drizzle/README.md`](drizzle/README.md)                           |
| Backend Python    | [`backend-py/README.md`](backend-py/README.md)                     |
| Edge Functions    | [`supabase/functions/README.md`](supabase/functions/README.md)     |

---

## AI/ML Features

- **Vector Search**: pgvector
- **LLM Orchestration**: LangChain/LangGraph
- **Providers**: OpenAI, Anthropic, Replicate, FAL
- **Real-time**: LiveKit

→ 詳細は [`backend-py/README.md`](backend-py/README.md)

---

## Rules Reference

詳細なルールは `.agent/rules/` を参照：

- `index.md` - ルール一覧とナビゲーション
- `architecture.md` - アーキテクチャ概要
- `code-style.md` - コードスタイル
- `testing.md` - テスト方針（TDD）
- `clean-code.md` - クリーンコード
- `ui-testing.md` - UIテスト（Storybook）
