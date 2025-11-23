# CRITICAL: Development Command Guidelines

**MANDATORY REQUIREMENT**: Always use Makefile commands for development tasks. Direct execution of tools is strictly controlled.

## Command Usage Policy

### 1. Use Makefile Commands (REQUIRED)

**ALWAYS use `make` commands** for the following operations:

- **Linting**: `make lint`, `make lint-frontend`, `make lint-backend-py`, `make lint-functions`, `make lint-drizzle`
- **Formatting**: `make format`, `make format-frontend`, `make format-backend-py`, `make format-functions`, `make format-drizzle`
- **Type Checking**: `make type-check`, `make type-check-frontend`, `make type-check-backend-py`
- **Building**: `make build`, `make build-frontend`, `make build-backend-py`
- **Testing**: `make test`, `make test-frontend`, `make test-backend-py`
- **CI Checks**: `make ci-check` (combines lint + format + type checks)
- **Service Management**: `make run`, `make frontend`, `make stop`

**Examples**:

```bash
# ✅ Good: Use Makefile commands
make lint-frontend        # Lint frontend code
make format               # Format all code
make type-check          # Type check all projects
make ci-check            # Run all CI checks

# ❌ Bad: Direct tool execution
cd frontend && bun run biome check --write  # DO NOT do this
cd backend-py && uv run ruff check          # DO NOT do this
```

### 2. Database Migration Policy (CRITICAL)

**❌ NEVER automatically execute database migrations without explicit user approval.**

**Rules**:

1. **Schema Changes Only**: You may edit schema files (`drizzle/schema/schema.ts`, etc.)
2. **NO Automatic Migration**: Do NOT run `make migrate-dev`, `make migrate-deploy`, or `make migration`
3. **User Confirmation Required**: Always ask the user to review schema changes and execute migration commands manually

**Workflow**:

```bash
# ✅ Good: Proper workflow
# 1. Assistant edits schema
vi drizzle/schema/schema.ts

# 2. Assistant informs user
"スキーマを更新しました。以下のコマンドでマイグレーションを実行してください：
make migrate-dev"

# 3. User executes migration manually
make migrate-dev

# ❌ Bad: Automatic migration execution
# Assistant runs make migrate-dev automatically - DO NOT DO THIS
```

**Why This Policy Exists**:

- Database migrations are **irreversible** operations
- Schema changes affect **production data**
- User must review migration SQL before applying
- Prevents accidental data loss or corruption

### 3. Type Generation Policy

**Type generation is allowed** when it's part of development workflow:

```bash
# ✅ Allowed: Type generation (read-only operations)
make build-model-frontend   # Generate Supabase types
make build-model-functions  # Generate Edge Functions types
make build-model            # Generate all types

# ❌ Prohibited: Migration with type generation
make migrate-dev            # Includes migration execution - requires user approval
```

### 4. Exception Cases

You may execute commands directly **ONLY** in these specific cases:

- **Reading files**: `cat`, `less`, `head`, `tail` (use Read tool instead when possible)
- **Listing files**: `ls`, `find`, `tree` (use Glob tool instead when possible)
- **Git operations**: `git status`, `git diff`, `git log` (read-only)
- **Package info**: `bun list`, `npm list`, `uv pip list` (read-only)

**All other operations MUST use Makefile commands.**

## Enforcement

This command usage policy is **NON-NEGOTIABLE**. Violations may cause:

- ❌ Unintended database schema changes
- ❌ Production data corruption
- ❌ Inconsistent development environment
- ❌ Breaking CI/CD pipelines

**Always ask the user for explicit approval before database operations.**
