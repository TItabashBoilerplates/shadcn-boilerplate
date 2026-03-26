---
name: make コマンド必須
description: 品質チェック（lint, format, type-check, test, build）は必ず make コマンドを使用。直接コマンド実行は禁止。
type: feedback
---

品質チェック（lint, format, type-check, test, build）は**必ず `make` コマンドを使用**すること。

**Why:** ユーザーが明示的に強調。直接コマンド実行は環境差異やCI不整合の原因になる。

**How to apply:** コード変更後の品質確認時、`bun run biome`, `uv run ruff`, `npx tsc` 等を直接実行せず、必ず `make lint`, `make format`, `make type-check`, `make test` 等の Makefile コマンドを使う。
