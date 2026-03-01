# デバッグスキル

## CRITICAL: デバッグの最優先手段 — process-compose MCP

**フロントエンド・バックエンドのログ確認・状態確認・プロセス再起動は、まず process-compose MCP ツールを使用する。**

process-compose MCP サーバーは port 8090 (SSE) で常時稼働しており、AI エージェントから直接呼び出せる。
CLI コマンドを使う前に、以下の MCP ツールを優先すること。

### 利用可能な MCP ツール

| ツール | 用途 | 引数 |
|--------|------|------|
| `get-process-status` | 全プロセスの死活確認（backend/storybook/web/supabase） | なし |
| `get-process-logs` | 指定プロセスの最新ログ取得 | `process_name`, `lines` |
| `restart-process` | クラッシュ・停止プロセスの再起動 | `process_name` |
| `start-process` | 停止中プロセスの起動 | `process_name` |

### 対象プロセス名

| プロセス名 | サービス | ポート |
|-----------|----------|-------|
| `backend` | FastAPI バックエンド | 4040 |
| `storybook` | Storybook | 6006 |
| `web` | Next.js | 3000 |

### 典型的なデバッグフロー

```
1. get-process-status      → 全サービスの生死を即確認
2. get-process-logs        → 問題プロセスのログを確認（lines: 50〜100 推奨）
3. restart-process         → クラッシュしていれば再起動
4. get-process-logs (再度) → 再起動後のログを確認
```

---

## サービス構成

| サービス | 管理方法 | 起動コマンド |
|----------|----------|-------------|
| backend-py (FastAPI) | devenv / process-compose | `devenv up` |
| Storybook | devenv / process-compose | `devenv up` |
| Next.js (web) | devenv / process-compose | `devenv up` |
| Supabase | Docker | `make run` |

---

## CLI フォールバック（MCP が使えない場合のみ）

```bash
# process-compose ログ確認
process-compose logs --tail 100 backend
process-compose logs -f storybook

# ログファイル直接確認
tail -f .devenv/state/process-compose/process-compose.log

# 全サービス再起動
make stop && make run
```

---

## Supabase ログ確認（MCP 対象外 → Docker）

```bash
docker ps
docker logs -f supabase_db_<project_name>
docker logs -f supabase_auth_<project_name>
docker logs -f supabase_edge_runtime_<project_name>
```

---

## 品質チェック

```bash
make lint
make format
make type-check
make ci-check
make test
```

---

## トラブルシューティング

### backend-py が起動しない

```
1. MCP: get-process-status で状態確認
2. MCP: get-process-logs (backend, 100) でエラーログ確認
3. MCP: restart-process (backend) で再起動
4. MCP: get-process-logs (backend, 50) で再起動後のログ確認
```

### ポートが使用中

```bash
lsof -i :4040   # Backend Python
lsof -i :3000   # Next.js
lsof -i :6006   # Storybook
lsof -i :54321  # Supabase API
kill -9 <PID>
```
