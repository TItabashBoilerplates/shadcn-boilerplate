---
description: "Debugging policy: Use process-compose MCP tools first for frontend/backend debugging"
alwaysApply: true
globs: []
---
# Debugging Policy

**MANDATORY**: フロントエンド・バックエンドのデバッグは **process-compose MCP ツールを最優先**で使用する。

## process-compose MCP ツール（推奨）

process-compose MCP サーバーは port 8090 (SSE) で常時稼働。

| ツール | 用途 | 引数 |
|--------|------|------|
| `get-process-status` | 全サービス死活確認 | なし |
| `get-process-logs` | ログ取得 | `process_name` (backend/storybook/web), `lines` |
| `restart-process` | プロセス再起動 | `process_name` |
| `start-process` | プロセス起動 | `process_name` |

## デバッグフロー

```
1. get-process-status      → 全サービスの死活を確認
2. get-process-logs        → 問題プロセスのログを確認
3. restart-process         → 必要なら再起動
4. get-process-logs (再度) → 再起動後のログ確認
```

## CLI フォールバック（MCP が使えない場合のみ）

```bash
# ログ確認
process-compose logs --tail 100 backend

# 全サービス再起動
make stop && make run
```

## Supabase ログ（MCP 対象外）

```bash
docker logs -f supabase_db_<project_name>
docker logs -f supabase_auth_<project_name>
docker logs -f supabase_edge_runtime_<project_name>
```
