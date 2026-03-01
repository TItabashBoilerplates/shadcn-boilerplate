# Debugging Policy

**MANDATORY**: フロントエンド・バックエンドのデバッグは **process-compose MCP ツールを最優先**で使用する。

## process-compose MCP ツール（推奨）

process-compose MCP サーバーは port 8090 (SSE) で常時稼働しており、AI エージェントから直接呼び出せる。
CLI コマンドを使う前に、必ず以下の MCP ツールを試みること。

### 利用可能な MCP ツール

| ツール | 用途 | 引数 |
|--------|------|------|
| `get-process-status` | 全サービス死活確認（backend/storybook/web/supabase） | なし |
| `get-process-logs` | 指定プロセスの最新ログ取得 | `process_name`, `lines` |
| `restart-process` | クラッシュ・停止プロセスの再起動 | `process_name` |
| `start-process` | 停止中プロセスの起動 | `process_name` |

### 対象プロセス名

| プロセス名 | サービス | ポート |
|-----------|----------|-------|
| `backend` | FastAPI バックエンド | 4040 |
| `storybook` | Storybook | 6006 |
| `web` | Next.js | 3000 |

## 典型的なデバッグフロー

```
1. get-process-status      → 全サービスの死活を確認
2. get-process-logs        → 問題プロセスのログを確認（lines: 50〜100 推奨）
3. restart-process         → クラッシュしていれば再起動
4. get-process-logs (再度) → 再起動後のログを確認
```

## CLI フォールバック（MCP が使えない場合のみ）

```bash
# ログ確認
process-compose logs --tail 100 backend
tail -f .devenv/state/process-compose/process-compose.log

# 全サービス再起動
make stop && make run
```

## Supabase ログ（MCP 対象外 → Docker）

Supabase は Docker で管理しているため MCP ツール対象外。

```bash
docker logs -f supabase_db_<project_name>
docker logs -f supabase_auth_<project_name>
docker logs -f supabase_edge_runtime_<project_name>
```

## 品質チェック

```bash
make lint
make type-check
make test
make ci-check
```
