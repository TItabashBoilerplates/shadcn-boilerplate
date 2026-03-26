# Development Command Policy

**CRITICAL / NON-NEGOTIABLE**: Always use Makefile commands for development tasks. Direct execution of tools is **strictly prohibited**.

**特に品質チェック（lint, format, type-check, test, build）は例外なく `make` コマンドを使用すること。**

## Required Makefile Commands

**ALWAYS use `make` commands** for the following operations:

| Operation | Commands |
|-----------|----------|
| **Linting** | `make lint`, `make lint-frontend`, `make lint-backend-py`, `make lint-functions`, `make lint-drizzle` |
| **Formatting** | `make format`, `make format-frontend`, `make format-backend-py`, `make format-functions`, `make format-drizzle` |
| **Type Checking** | `make type-check`, `make type-check-frontend`, `make type-check-backend-py` |
| **Building** | `make build`, `make build-frontend`, `make build-backend-py` |
| **Testing** | `make test`, `make test-frontend`, `make test-backend-py` |
| **CI Checks** | `make ci-check` |
| **Services** | `make run`, `make frontend`, `make stop` |

## Prohibited Direct Commands (品質チェック)

以下のような直接実行は**絶対に禁止**。必ず対応する `make` コマンドを使うこと：

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

# ✅ 必ず Makefile を使用
make lint                    # 全体 lint
make lint-frontend           # Frontend lint
make lint-backend-py         # Backend lint
make format                  # 全体 format
make format-frontend         # Frontend format
make format-backend-py       # Backend format
make type-check              # 全体型チェック
make type-check-frontend     # Frontend 型チェック
make type-check-backend-py   # Backend 型チェック
make test                    # 全体テスト
make test-frontend           # Frontend テスト
make test-backend-py         # Backend テスト
make ci-check                # CI チェック (lint + format + type)
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

**違反は一切許容しない。**
