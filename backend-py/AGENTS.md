# Backend Python Guidelines

## Architecture

- Clean Architecture layers (apps/api 内)
- SQLModel for sync implementation
- uv workspace モノレポ（`apps/{api,mcp}` + `packages/core`）

## Patterns

- Gateway pattern for DRY
- Type hints required
- 共有基盤 (logger / supabase client / 共通例外) は `packages/core` に集約
- サービス固有のドメイン (entity / 固有例外) は `apps/<service>/src/<service>/domain/`

## Formatting

- **Ruff format** for code formatting (replaces Black)
- **Ruff** for linting
- **ty** for type checking, with Ruff enforcing required annotations

設定は workspace root `backend-py/pyproject.toml` で一元管理。member 個別の設定は持たない。

## Commands

すべて devenv の **scripts** (PATH 直結) を使用する。Makefile は **deprecated**（削除済み）。直接 `uv run ruff` / `uv run ty` / `uv run pytest` での実行は禁止。

```bash
lint-backend-py           # Ruff lint (workspace 全体, auto-fix)
format-backend-py         # Ruff format (workspace 全体, auto-fix)
type-check-backend-py     # ty (全 member の production src)
test-backend-py           # pytest-xdist（workspace 全体、既定2 worker）
test-backend-py -n2       # pytest-xdist、2 worker で並列実行
test-backend-py -n0       # worker を使わず実行（デバッグ用）
```

正典: `/.claude/rules/commands.md`

## Test Workers

- ユーザー決定により並列実行を優先する。現在の58テストでは直列が速かったが、並列候補で最速だった2 worker を既定にする。
- AI エージェントはタスクの規模、CPU・空きメモリ、他の検査の並列負荷を確認し、標準の xdist 引数で worker 数を選ぶ。
- 例: `test-backend-py -n4`、`test-backend-py -n auto --maxprocesses=4`。独自の自動選択機構は追加しない。
- `-n0` はデバッグ時に使用できる。通常検証で速度だけを理由に直列へ切り替えない。

## Auto-Generated

`apps/api/src/api/domain/entity/models.py` is auto-generated on container startup.
DO NOT edit manually.
