# Development Command Policy

**CRITICAL / NON-NEGOTIABLE**: Always use **devenv** commands (scripts on PATH or `devenv tasks run <name>`) for development. Direct execution of underlying tools (bun/uv/biome/ruff/tsc/deno/supabase) is **strictly prohibited**.

**Makefile は deprecated**。`make X` は使わない。誤って叩いた場合は案内メッセージのみが出る。

**特に品質チェック（lint, format, type-check, test, build, ci-check）は例外なく devenv のコマンドを使うこと。**

## devenv コマンドの種類

| 種類 | 使い方 | 例 |
|---|---|---|
| **Scripts** (PATH 直結) | コマンド名を直接打つ | `lint`, `format`, `type-check`, `ci-check`, `dev-web`, `dev-mobile`, `dev-all`, `frontend`, `mobile-ios`, `lint-frontend`, `format-backend-py`, `supabase-start`, `stop`, `drizzle-studio` |
| **Tasks** (依存グラフ・pipeline) | `devenv tasks run <namespace:name>` | `devenv tasks run db:migrate-dev`, `devenv tasks run model:build`, `devenv tasks run deploy:functions` |
| **Processes** (常駐サービス) | `devenv up [PROCESSES...]` | `devenv up` (軽量セット), `devenv up web`, `devenv up backend web` |

scripts は devenv shell（direnv 自動アクティベート含む）下で PATH 上に存在する。direnv 未活性のセッションでは `devenv shell -- <command>` 経由で呼び出す。

## Required Commands（品質チェック）

**ALWAYS use** these scripts for the following operations:

| Operation | Command |
|-----------|---------|
| **Linting (all)** | `lint` |
| **Linting (per project)** | `lint-frontend`, `lint-drizzle`, `lint-backend-py`, `lint-functions`, `lint-fsd` |
| **Linting (CI mode)** | `lint-frontend-ci`, `lint-drizzle-ci`, `lint-backend-py-ci`（通常は `ci-check` から呼ばれる） |
| **Formatting (all)** | `format` |
| **Formatting (per project)** | `format-frontend`, `format-drizzle`, `format-backend-py`, `format-functions` |
| **Format check (CI)** | `format-check`（個別: `format-frontend-check`, `format-drizzle-check`, `format-backend-py-check`, `format-functions-check`） |
| **Type check (all)** | `type-check` |
| **Type check (per project)** | `type-check-frontend`, `type-check-mobile`, `type-check-backend-py`, `check-functions` |
| **Build** | `build-frontend`, `build-storybook`, `build-mobile-ios`, `build-mobile-android` |
| **Tests** | `test-db` (pgTAP), `e2e`, `e2e-web`, `e2e-mobile` |
| **CI Check (full gate)** | `ci-check` |
| **Services (軽量)** | `devenv up` (= Supabase + backend + storybook), `stop` (停止), `supabase-start` / `supabase-stop` |
| **Services (frontend apps)** | `dev-web`, `dev-mobile`, `dev-all`, または `devenv up <names...>` |
| **Services (devenv 外)** | `frontend` (turbo dev), `mobile-ios`, `mobile-android`, `mobile-web` (Expo TUI) |

## Required Tasks（pipeline / 依存付き）

| Operation | Command |
|---|---|
| **DB migration (full pipeline)** | `devenv tasks run app:migrate-dev` |
| **DB migration (生成 + 適用のみ)** | `devenv tasks run db:migrate-dev` |
| **DB migration (deploy)** | `devenv tasks run db:migrate-deploy` |
| **Type/Model 生成** | `devenv tasks run model:build` (= model:frontend + model:functions) |
| **Seed (DB + Storage)** | `devenv tasks run seed:all` |
| **Deploy Edge Functions** | `devenv tasks run deploy:functions` |
| **Deploy Supabase 全体** | `devenv tasks run deploy:supabase` |
| **Polar.sh プラン同期** | `devenv tasks run polar:sync-dry` / `polar:sync` |
| **初回ブートストラップ** | 不要（`devenv shell` / `direnv reload` で `setup:*` が自動セットアップ） |

## Prohibited Direct Commands（品質チェック）

以下のような直接実行は**絶対に禁止**。必ず devenv の scripts / tasks を使うこと：

```bash
# ❌ 絶対に直接実行しない
cd frontend && bun run biome check --write
cd frontend && bun run biome format --write
cd frontend && bun run tsc --noEmit
cd frontend && bun run vitest
cd backend-py && uv run ruff check
cd backend-py && uv run ruff format
cd backend-py && uv run mypy
cd backend-py && uv run pytest
cd drizzle && bun run biome check
npx tsc --noEmit

# ❌ Makefile も使わない（deprecated）
make lint
make ci-check
make migrate-dev

# ✅ 必ず devenv scripts または tasks を使用
lint                              # 全体 lint
lint-frontend                     # Frontend lint
lint-backend-py                   # Backend lint
format                            # 全体 format
format-frontend                   # Frontend format
format-backend-py                 # Backend format
type-check                        # 全体型チェック
type-check-frontend               # Frontend 型チェック
type-check-backend-py             # Backend 型チェック
ci-check                          # CI チェック (lint + format + type)
devenv tasks run app:migrate-dev  # マイグレーション (フルフロー)
devenv tasks run model:build      # モデル/型再生成
```

## Exceptions

Direct command execution is allowed ONLY for:
- **Reading files**: `cat`, `less`, `head`, `tail` (prefer Read tool)
- **Listing files**: `ls`, `find`, `tree` (prefer Glob tool)
- **Git operations**: `git status`, `git diff`, `git log` (read-only)
- **Package info**: `bun list`, `npm list`, `uv pip list` (read-only)

## Enforcement

This command usage policy is **CRITICAL and NON-NEGOTIABLE**.

品質チェックを直接コマンドで実行することは、以下の問題を引き起こす：
- 環境依存の差異による不整合
- CI/CD パイプラインとの乖離
- 意図しない副作用（設定差異によるフォーマット崩れ等）
- profile (env) 設定が読み込まれず、本番設定で local 開発するリスク

**違反は一切許容しない。**
