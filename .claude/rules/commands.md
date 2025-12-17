# Development Command Policy

**MANDATORY**: Always use Makefile commands for development tasks. Direct execution of tools is strictly controlled.

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

## Prohibited Direct Commands

```bash
# ❌ DO NOT execute directly
cd frontend && bun run biome check --write
cd backend-py && uv run ruff check
npx tsc --noEmit

# ✅ Use Makefile instead
make lint-frontend
make lint-backend-py
make type-check-frontend
```

## Exceptions

Direct command execution is allowed ONLY for:
- **Reading files**: `cat`, `less`, `head`, `tail` (prefer Read tool)
- **Listing files**: `ls`, `find`, `tree` (prefer Glob tool)
- **Git operations**: `git status`, `git diff`, `git log` (read-only)
- **Package info**: `bun list`, `npm list`, `uv pip list` (read-only)

## Enforcement

This command usage policy is **NON-NEGOTIABLE**. Violations may cause:
- Unintended side effects
- Inconsistent development environment
- Breaking CI/CD pipelines
