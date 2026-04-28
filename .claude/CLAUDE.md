# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**CRITICAL - 推測実装の完全禁止**:

- **タスク開始前に、必ず利用可能な Skill を確認し、該当するものがあれば最初に `Skill` ツールで起動すること**（詳細は `.claude/rules/skills-first.md`）
- **推測・記憶・一般知識に基づく実装は一切禁止**
- 実装前に必ず **Context7 MCP** または **WebSearch/WebFetch** で公式ドキュメントを確認すること
- ライブラリの API、設定ファイル形式、CLI 構文は**必ずファクトを調査**してから使用
- 「たぶんこうだろう」「以前こうだった」という推測での実装は**絶対に行わない**
- **モジュール・パッケージは必ず最新バージョンを調査し、最新のAPIを使用すること**
- **ビルド・テスト・リント等は必ず devenv のコマンド（scripts または `devenv tasks run`）を使用すること**（詳細は `.claude/rules/commands.md`）
- **Supabase 上のインフラ（DB / Storage / Auth / Edge Functions / Logs / Migrations / Advisors）を調査・操作する場合は、必ず `supabase` MCP（ローカル）または `supabase-prod` MCP（本番、read-only）を使用すること**（`psql` / `curl` / `supabase` CLI を Bash で直接叩くのは禁止。詳細は `.claude/rules/mcp-supabase.md`）
- 詳細は `.claude/rules/research.md` を参照

## Memory Structure

このプロジェクトは `.claude/` ディレクトリでメモリを構造化しています：

```
.claude/
├── rules/          # 常に適用されるポリシー・制約
│   ├── skills-first.md   # タスク開始前に Skill 確認・起動を必須化
│   ├── tdd.md            # テスト駆動開発（TDD）必須
│   ├── research.md       # Research-First ポリシー
│   ├── supabase-first.md # Supabase優先アーキテクチャ
│   ├── commands.md       # Makefile コマンド必須
│   ├── database.md       # マイグレーション承認必須
│   ├── auto-generated.md # 自動生成ファイル編集禁止
│   ├── clean-code.md     # クリーンコード（後方互換禁止・重複禁止）
│   ├── frontend.md       # Frontend コード規約
│   ├── backend-py.md     # Python コード規約
│   ├── edge-functions.md # Edge Functions 規約
│   ├── i18n.md           # 多言語対応（必須）
│   ├── ui-testing.md     # UIテスト（Storybook必須・単体テスト不要）
│   ├── render-optimization.md # 再描画最小化（FSDスライス単位のステート局所化）
│   ├── error-handling.md     # エラーハンドリング（握りつぶし禁止・フォールバック最小化）
│   ├── page-navigation.md    # ページ遷移（loading.tsx + Suspense によるストリーミング必須）
│   └── mcp-supabase.md       # Supabase インフラ操作は MCP（supabase / supabase-prod）必須
│
└── skills/         # 質問時に参照するガイダンス
    ├── fsd/              # Feature Sliced Design
    ├── monorepo/         # Bun workspace 構成
    ├── tanstack-query/   # TanStack Query v5
    ├── supabase/         # Supabase 認証・RLS
    ├── drizzle/          # Drizzle ORM スキーマ
    ├── rls/              # RLS パフォーマンス・ベストプラクティス（必読）
    ├── datetime/         # 日時処理
    ├── debugging/        # デバッグ手順（devenv 2.0 native CLI 優先・Supabase）
    ├── shadcn-ui/        # shadcn/ui + TailwindCSS (Web)
    ├── gluestack/        # gluestack-ui + NativeWind (Mobile)
    ├── storybook/        # Storybook 10 コンポーネントカタログ
    ├── pgtap/            # RLS・DB 関数テスト（pgTAP + supabase test db）
    ├── python-testing/   # Python単体テスト（外部SDK/TypeError検知）
    ├── i18n/             # next-intl 多言語対応
    ├── langchain/        # LangChain/LangGraph/LangSmith
    └── maestro/          # Maestro E2Eテスト
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

**MANDATORY**: 調査・実装・レビュー・デバッグなど、**あらゆるタスクを開始する前に必ず利用可能な Skill 一覧を確認**し、該当するものがあれば**最初に `Skill` ツールで起動**すること。Next.js / Supabase / Drizzle / FSD / shadcn / gluestack / Better Auth / Stripe / Resend / Maestro / LangChain / TanStack Query 等、本リポジトリで使用する主要技術には Skill が用意されている。Skill を確認せずに着手する実装はやり直しとなる。詳細は `.claude/rules/skills-first.md` を参照。

**MANDATORY**: すべてのユーザー向けテキストは多言語対応（i18n）必須。詳細は `.claude/skills/i18n/` を参照。

**MANDATORY**: すべての実装はテスト駆動開発（TDD）を厳守。**作業終了時は必ず All Green（全テスト通過）を確認**。詳細は `.claude/rules/tdd.md` を参照。

**MANDATORY**: 単体テストでは**外部SDK（pipモジュール）を丸ごとMockしない**。本物のSDKを使い、I/O層（HTTP/DB）のみ差し替えることで、**TypeError・ValueError・RuntimeError を単体テスト時点で検知**し、型安全で堅牢な状態を維持する。詳細は `.claude/rules/backend-py.md` および `.claude/skills/python-testing/` を参照。

**MANDATORY**: コードは常にクリーンな状態を維持。後方互換コード・重複コード・未使用コードは残さない（明示的な指示がある場合を除く）。詳細は `.claude/rules/clean-code.md` を参照。

**MANDATORY**: コンポーネントの再描画は必要最小限に抑える。FSD のスライス単位でステートを局所化し、状態変更の影響範囲をそのスライス内に閉じ込める。TanStack Query の invalidation はピンポイント、Zustand は必ずセレクター使用、Widget/View にビジネスステートを持たせない。詳細は `.claude/rules/render-optimization.md` を参照。

**MANDATORY**: エラーは握りつぶさず適切にエラーとして処理する。不必要なフォールバック処理は禁止。catch したら必ずログ出力 + リスロー or 明示的 Result 型。supabase-js の `{ error }` は必ずチェック。フォールバックは付随的処理（analytics等）のみ許容。詳細は `.claude/rules/error-handling.md` を参照。

**MANDATORY**: フロントエンド・バックエンドのデバッグは **devenv 2.0 の native process manager の TUI** を主インターフェースとして使用する。`devenv up` を対話端末で実行すると TUI が自動起動し、プロセス一覧・ログ閲覧・再起動がキーボード操作で可能。詳細は `.claude/skills/debugging/SKILL.md` を参照。

**MANDATORY**: Supabase 上のインフラ（DB / Storage / Auth / Edge Functions / Logs / Migrations / Advisors / 設定）を**調査・操作**する場合は、必ず **`supabase` MCP**（ローカル）または **`supabase-prod` MCP**（本番、read-only）を使用する。`psql` / `curl` / `supabase` CLI を Bash で直接叩くのは禁止。本番への書き込みが必要な場合は必ずユーザーに判断をあおぐこと。詳細は `.claude/rules/mcp-supabase.md` を参照。

**Supabase の Docker コンテナ自体は Supabase CLI が所有**（devenv の native process supervisor は backend / storybook のみ監視）。**起動連動**: `supabase:start` task が backend の `before` に登録されているため `devenv up` 起動時は Supabase → backend の順で立ち上がる。**停止は手動運用**: devenv 2.0 native process manager は task の `after` も `process.manager.after` も動作しない（前者は shutdown 時に cancel、後者は assertion でブロック、native の Rust shutdown パスに task runner 呼び出しが無いため）。auto-stop の中途半端な実装は持たず、停止は `supabase-stop` / `stop` script で明示的に行う運用に統一している。`stop` script は devenv プロセスと Supabase 両方を停止する。

`devenv shell` 進入時 (direnv 経由含む) に `setup:install-*` task が lockfile 変更を検知して `bun install` / `uv sync` を自動同期する (`--frozen-lockfile` / `--frozen` 使用)。

| コマンド | 用途 |
|---------|------|
| `supabase-start` (script) | Supabase ローカル起動（Docker） + Storage Buckets シード |
| `supabase-stop` (script) | Supabase ローカル停止 |
| `devenv up` | **軽量セット**: Supabase + backend + storybook を起動（TUI 付き）。**終了時に Supabase は自動停止しない** → `stop` または `supabase-stop` で手動停止 |
| `devenv up web` | web アプリ単独起動（同様に `devenv up backend storybook web` のような任意組み合わせも可） |
| `dev-web` (script) | 軽量セット + Next.js (web) 一括起動 |
| `dev-mobile` (script) | 軽量セット + Expo Metro (mobile, non-interactive) |
| `dev-all` (script) | 軽量セット + 全フロントエンドアプリ一括起動 |
| `devenv up -d` | バックグラウンド（detached）起動。TUI なし |
| `devenv processes down` | detached で動いているプロセスの停止（**Supabase は残る** → `stop` または `supabase-stop` で別途停止） |
| `devenv processes wait` | 全プロセスが ready になるまで待機（CI で使用） |
| `stop` (script) | devenv プロセス + Supabase の両方を停止 |
| `frontend` (script) | モノレポ全体 (`turbo dev` = web + mobile 並列、devenv 外、重い) |
| `mobile` / `mobile-ios` / `mobile-android` / `mobile-web` (script) | Expo 対話的 TUI (devenv 外) |

TUI が主なので、ログ閲覧・個別プロセス再起動・状態確認は TUI 内のキーバインドで操作する（`devenv up` を実行するだけで使える）。

`frontend/apps/<name>` 配下のアプリは **opt-in process** (`start.enable = false`) なので、`devenv up` 単体では起動しない。明示指定または `dev-<name>` script を使う。新規アプリ追加時は `devenv.nix` の `frontendApps` attrset に 1 行追加するだけで、process / `dev-<name>` script / `dev-all` がすべて自動連動する。

> Profile: **local が既定**（base enterShell で env がロードされる）なので `-P local` は不要。`dev` / `staging` / `production` profile は `devenv up -P dev` / `devenv tasks run -P production deploy:functions` のように `-P` 指定で env を上書きする。env ファイル (`env/<service>/.env.<profile>`) は未配置でも profile アクティベーションは成功する（後置き OK）。

> Makefile は **deprecated**。すべて devenv のコマンドへ移行済み。`make X` を叩くと案内メッセージのみ出力する。

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

すべて devenv shell (direnv 経由) で PATH 上に存在する **scripts** か、`devenv tasks run <name>` で起動する **tasks**。`make X` は使わない。

```bash
# Setup
# `devenv shell` 進入 (direnv 経由含む) で setup:* タスクが自動実行:
#   - setup:secrets         → env/.env.secrets を雛形からコピー (無ければ)
#   - setup:install-frontend → bun install (frontend) ※ lockfile 変更検知時のみ
#   - setup:install-drizzle  → bun install (drizzle)
#   - setup:install-backend  → uv sync (backend-py/app)
# 明示的なブートストラップタスクは不要。

# Services
supabase-start                # Supabase (Docker) のみ起動
supabase-stop                 # Supabase (Docker) のみ停止
devenv up                     # 軽量セット: Supabase + backend + Storybook
dev-web                       # 軽量セット + Next.js (web)
dev-mobile                    # 軽量セット + Expo Metro (mobile, non-interactive)
dev-all                       # 軽量セット + 全 frontendApps
devenv up backend web         # 任意組み合わせ
mobile-ios / mobile-android / mobile-web   # Expo 対話的 TUI (devenv 外、別ターミナル)
stop                          # devenv プロセス + Supabase をすべて停止

# Quality
# 公式推奨の 2 段階構成:
#   - コミット時 → git-hooks (biome/ruff/ruff-format/mypy/denofmt/denolint) が変更ファイルだけ実行 (<200ms)
#   - CI / 手動 → `devenv test` (= ci:check aggregator) が execIfModified キャッシュで incremental skip
lint                         # 全プロジェクトの lint (auto-fix、シンプル sequential)
format                       # 全プロジェクトの format (auto-fix)
format-check                 # 各 sub-project の format-check sequential
type-check                   # 各 sub-project の type-check sequential
ci-check                     # = `devenv test`、ci:check aggregator 経由 (キャッシュ込み)
devenv test                  # ci-check と同等。ローカル/CI で同じコマンド

# 個別サブプロジェクト
lint-frontend / lint-drizzle / lint-backend-py / lint-functions / lint-fsd
format-frontend / format-drizzle / format-backend-py / format-functions
type-check-frontend / type-check-mobile / type-check-backend-py / check-functions

# Tests
test                          # 全 unit test (frontend + backend-py)
test-frontend                 # Vitest
test-backend-py               # pytest
test-db                       # pgTAP DB tests
e2e / e2e-web / e2e-mobile    # Maestro E2E

# Database
# ローカルは AI 自動実行可、本番 / staging (`db:migrate-deploy`) はユーザー承認必須。詳細は .claude/rules/database.md
devenv tasks run app:migrate-dev   # ローカル: Generate + apply migration + type 生成（フルフロー、AI 実行可）
devenv tasks run db:migrate-dev    # ローカル: マイグレーション生成 + 適用のみ（AI 実行可）
devenv tasks run model:build       # 型のみ再生成（AI 実行可）
devenv tasks run -P production db:migrate-deploy   # 本番: ⚠️ ユーザー承認必須

# Task graph 確認 (依存・実行順序を可視化)
devenv tasks list                          # 全 task の階層表示
devenv tasks list --mode before app:migrate-dev   # 上流依存の確認
devenv tasks list --mode after  supabase:start    # 下流影響の確認
```

### Environment Configuration

```
env/
├── backend/.env.local         # Backend service
├── frontend/.env.local        # Frontend (Next.js)
├── migration/.env.local       # Database migration
├── .env.secrets               # Secrets (.gitignore)
└── .env.secrets.example       # Template
```

### ni Commands (Package Manager Abstraction)

このプロジェクトでは [ni](https://github.com/antfu-collective/ni) を使用してパッケージマネージャーを抽象化しています。

| ni              | Bun equivalent       | 説明                           |
| --------------- | -------------------- | ------------------------------ |
| `ni`            | `bun install`        | 依存関係をインストール         |
| `ni package`    | `bun add package`    | パッケージを追加               |
| `ni -D package` | `bun add -d package` | 開発依存として追加             |
| `nr script`     | `bun run script`     | package.json のスクリプト実行  |
| `nlx command`   | `bunx command`       | パッケージを一時的に実行       |

**重要**: `nr` コマンドは package.json の scripts を実行する際に使用します。

```bash
# 例: frontend/apps/web/ で開発サーバーを起動
cd frontend/apps/web && nr dev

# 例: テストを実行
nr test

# 例: ビルドを実行
nr build
```

---

## Supabase Configuration

| Setting                | Location                                |
| ---------------------- | --------------------------------------- |
| Auth (OAuth, JWT, MFA) | `supabase/config.toml`                  |
| Storage buckets        | `supabase/config.toml`                  |
| API settings           | `supabase/config.toml`                  |
| Tables                 | `drizzle/schema/`                       |
| RLS policies           | `drizzle/schema/`                       |
| Realtime               | `drizzle/config/post-migration/`        |
| Migrations             | `drizzle/migrations/` (drizzle-kit 出力) |

> **マイグレーションは Drizzle に集約**: 出力先は `drizzle/migrations/`（v3 フォルダ形式）。`supabase/migrations/` は使用せず、Supabase の GitHub 連携によるマイグレーション自動適用も利用しない（GitHub 連携自体は Edge Functions / config 同期のため維持）。

---

## AI/ML Features

- **Vector Search**: pgvector
- **LLM Orchestration**: LangChain/LangGraph
- **Providers**: OpenAI, Anthropic, Replicate, FAL
- **Real-time**: LiveKit

→ 詳細は [`backend-py/README.md`](backend-py/README.md)
