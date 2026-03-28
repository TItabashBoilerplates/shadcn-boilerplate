---
name: debugging
description: デバッグ手順ガイダンス。プロセスログ確認、Supabase ローカル環境のトラブルシューティングについての質問に使用。backend-py は devenv（process-compose）で管理、Supabase は Docker で管理。ログ確認・状態確認・プロセス再起動はまず process-compose MCP ツールを使用する。
---

# デバッグスキル

このプロジェクトのデバッグ方法を説明します。

## CRITICAL: デバッグの最優先手段 — process-compose MCP

**フロントエンド・バックエンドのログ確認・状態確認・プロセス再起動は、まず process-compose MCP ツールを使用する。**

process-compose MCP サーバーは port 8090 (SSE) で常時稼働しており、Claude Code から直接呼び出せる。
CLI コマンドを使う前に、以下の MCP ツールを優先すること。

### 利用可能な MCP ツール

| ツール | 用途 | 主な引数 |
|--------|------|---------|
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
2. get-process-logs        → 問題プロセスのログを確認
3. restart-process         → クラッシュしていれば再起動
4. get-process-logs (再度) → 再起動後のログを確認
```

### MCP ツールが使えない場合

process-compose が停止している場合は CLI にフォールバック（後述）。

---

## サービス構成

| サービス | 管理方法 | 起動コマンド |
|----------|----------|-------------|
| backend-py (FastAPI) | devenv / process-compose | `devenv up` |
| Storybook | devenv / process-compose | `devenv up` |
| Next.js (web) | devenv / process-compose | `devenv up` |
| Supabase | Docker | `make run` |

---

## サービス状態確認

### MCP（推奨）

MCP ツール `get-process-status` を呼び出す。

### CLI（フォールバック）

```bash
# process-compose TUI で全プロセス確認
devenv up

# Supabase の状態確認
dotenvx run -f env/backend/.env.local -- supabase status
```

---

## ログ確認

### MCP（推奨）

MCP ツール `get-process-logs` で `process_name` と `lines` を指定して呼び出す。

```
例: process_name=backend, lines=50
例: process_name=web, lines=100
例: process_name=storybook, lines=30
```

### CLI（フォールバック）

```bash
# process-compose のログを確認（リアルタイム）
process-compose logs -f backend

# 直近のログのみ
process-compose logs --tail 100 backend

# ログファイルを直接確認
tail -f .devenv/state/process-compose/process-compose.log
```

---

## プロセス再起動

### MCP（推奨）

MCP ツール `restart-process` で `process_name` を指定して呼び出す。

### CLI（フォールバック）

```bash
# 全サービス再起動
make stop
make run

# process-compose TUI から個別再起動も可能
devenv up
```

---

## Supabase ログ確認

Supabase は Docker で管理しているため MCP 対象外。CLI を使用する。

```bash
# コンテナ名を確認
docker ps

# DB ログ
docker logs -f supabase_db_<project_name>

# Auth ログ（認証問題のデバッグ）
docker logs -f supabase_auth_<project_name>

# Edge Functions ログ
docker logs -f supabase_edge_runtime_<project_name>
```

**主要な Supabase コンテナ名**:

| サービス | コンテナ名（目安） |
|----------|-------------------|
| Supabase DB | `supabase_db_*` |
| Supabase Auth | `supabase_auth_*` |
| Supabase REST | `supabase_rest_*` |
| Supabase Edge Functions | `supabase_edge_runtime_*` |
| Supabase Studio | `supabase_studio_*` |

---

## backend-py 内でのデバッグ

```bash
# backend-py ディレクトリで直接 Python REPL
cd backend-py/app
uv run python

# 特定のスクリプトを実行
uv run python -c "from src.infra.logging import get_logger; print('OK')"

# テストを実行
uv run pytest src/tests/ -v

# 依存関係の確認
uv pip list
```

### Supabase DB へのデバッグ接続

```bash
# PostgreSQL に接続（ポート 54322）
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

# SQL 実行例
SELECT * FROM auth.users LIMIT 5;
\dt public.*
\q
```

---

## フロントエンドデバッグ

### ログ確認（推奨: MCP）

MCP ツール `get-process-logs` で `process_name=web` を指定。

### 開発サーバー起動

```bash
# Storybook + Next.js 同時起動
make frontend

# ブラウザで確認
# Next.js:   http://localhost:3000
# Storybook: http://localhost:6006
```

### ビルドエラーの確認

```bash
make type-check-frontend
make lint-frontend
make build-frontend
```

---

## Supabase ローカル環境デバッグ

### 状態確認・再起動

```bash
# 状態確認
dotenvx run -f env/backend/.env.local -- supabase status

# 停止 → 起動（Supabase + backend-py）
make stop
make run
```

### DB リセット

```bash
# ローカル DB を完全リセット（データ消失注意）
dotenvx run -f env/backend/.env.local -- supabase db reset

# マイグレーション再適用
make migrate-deploy
```

### Edge Functions デバッグ

```bash
# Edge Functions のログ確認
docker logs -f supabase_edge_runtime_<project_name>

# 特定の関数を手動で呼び出し
curl -i --location 'http://localhost:54321/functions/v1/<function_name>' \
  --header 'Authorization: Bearer <anon_key>'
```

---

## 品質チェックコマンド

```bash
make lint           # 全体の lint
make format         # 全体の format
make type-check     # 全体の型チェック
make ci-check       # CI チェック（lint + format + type）
make test           # 全テスト
make test-frontend  # フロントエンドのみ
make test-backend-py # Backend Python のみ
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

CLI フォールバック:
```bash
process-compose list
process-compose logs --tail 100 backend
make stop && make run
```

### Next.js が起動しない

```
1. MCP: get-process-status でポート競合確認
2. MCP: get-process-logs (web, 50) でエラー内容確認
3. MCP: restart-process (web) で再起動
```

### ポートが使用中

```bash
lsof -i :4040   # Backend Python
lsof -i :3000   # Next.js
lsof -i :6006   # Storybook
lsof -i :54321  # Supabase API
lsof -i :54323  # Supabase Studio

kill -9 <PID>
```

### マイグレーションエラー

```bash
# Drizzle スキーマ検証
make drizzle-validate

# マイグレーション状態確認
cd drizzle && dotenvx run -f ../env/migration/.env.local -- nr check
```

---

## ログレベル設定

### Backend Python

```bash
# env/backend/.env.local で設定
LOG_LEVEL=debug    # debug, info, warn, error
LOG_FORMAT=pretty  # pretty（開発）, json（本番）
```

### Frontend

```bash
# env/frontend/.env.local で設定
NEXT_PUBLIC_LOG_LEVEL=debug  # debug, info, warn, error
```

詳細は `.claude/skills/logger/SKILL.md` を参照。
