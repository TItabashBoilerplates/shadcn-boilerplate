# Backend Python Guidelines

## Architecture

- Clean Architecture layers
- SQLModel for sync implementation

## Patterns

- Gateway pattern for DRY
- Type hints required

## Formatting

- **Ruff format** for code formatting (replaces Black)
- **Ruff** for linting
- **MyPy** for type checking (strict mode)

## Commands

すべて devenv の **scripts** (PATH 直結) を使用する。Makefile は **deprecated**（削除済み）。直接 `uv run ruff` / `uv run mypy` / `uv run pytest` での実行は禁止。

```bash
lint-backend-py           # Ruff lint (auto-fix)
format-backend-py         # Ruff format (auto-fix)
type-check-backend-py     # MyPy (strict mode)
test-backend-py           # pytest
```

正典: `/.claude/rules/commands.md`

## Auto-Generated

`src/domain/entity/models.py` is auto-generated on container startup.
DO NOT edit manually.
