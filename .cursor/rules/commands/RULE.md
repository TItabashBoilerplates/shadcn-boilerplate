---
description: "Makefile commands policy: Always use make commands for development tasks"
alwaysApply: true
globs: []
---
# Development Command Policy

**MANDATORY**: 開発タスクには必ず Makefile コマンドを使用すること。

## 必須コマンド

| 操作 | コマンド |
|------|---------|
| Lint | `make lint`, `make lint-frontend`, `make lint-backend-py` |
| Format | `make format`, `make format-frontend`, `make format-backend-py` |
| Type Check | `make type-check`, `make type-check-frontend` |
| Build | `make build`, `make build-frontend` |
| Test | `make test`, `make test-frontend`, `make test-backend-py` |
| CI | `make ci-check` |

## 禁止されるコマンド

```bash
# DO NOT
cd frontend && bun run biome check --write
cd backend-py && uv run ruff check
npx tsc --noEmit

# USE INSTEAD
make lint-frontend
make lint-backend-py
make type-check-frontend
```

## 許可される直接実行

- ファイル読み取り: `cat`, `ls`, `tree`
- Git操作: `git status`, `git diff` (読み取りのみ)
- パッケージ情報: `bun list`, `uv pip list`

