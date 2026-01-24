---
name: debugging
description: デバッグ手順ガイダンス。コンテナログ確認、コンテナ内でのデバッグ、Supabase ローカル環境のトラブルシューティングについての質問に使用。必ず docker ps でコンテナ名を確認してから操作を行う。原則 Makefile コマンドを使用。
---

# デバッグスキル

このプロジェクトのデバッグ方法を説明します。

**CRITICAL**: デバッグ時は原則 `make` コマンドを使用してください。

## 基本原則

1. **コンテナ操作前に必ず `docker ps` で正しいコンテナ名を確認**
2. **Makefile コマンドを優先使用**
3. **ログは構造化ログ（JSON/Pretty）で出力される**

---

## サービス状態確認

### 全体の状態確認

```bash
# サービス状態を確認
make check

# Docker コンテナの状態を確認（必須: コンテナ名を取得）
docker ps

# 停止中のコンテナも含めて確認
docker ps -a
```

### Supabase ローカル環境

```bash
# Supabase の状態確認
npx dotenvx run -f env/backend/local.env -- supabase status
```

---

## コンテナログ確認

### STEP 1: コンテナ名の確認（必須）

```bash
# 必ず最初に実行してコンテナ名を確認
docker ps
```

**主要なコンテナ名**（環境によって異なる場合がある）:

| サービス | コンテナ名（目安） |
|----------|-------------------|
| Backend Python | `backend_app_py` |
| Storybook | `storybook` |
| Supabase DB | `supabase_db_*` |
| Supabase Auth | `supabase_auth_*` |
| Supabase REST | `supabase_rest_*` |
| Supabase Edge Functions | `supabase_edge_runtime_*` |
| Supabase Studio | `supabase_studio_*` |

### STEP 2: ログの確認

```bash
# コンテナログを確認（リアルタイム）
docker logs -f <container_name>

# 最後の100行を表示
docker logs --tail 100 <container_name>

# タイムスタンプ付きで表示
docker logs -t <container_name>

# 特定時間以降のログ
docker logs --since 5m <container_name>
```

### Backend Python ログ例

```bash
# docker ps でコンテナ名を確認後
docker logs -f backend_app_py

# エラーのみ抽出
docker logs backend_app_py 2>&1 | grep -i error
```

### Supabase ログ例

```bash
# DB ログ
docker logs -f supabase_db_<project_name>

# Auth ログ（認証問題のデバッグ）
docker logs -f supabase_auth_<project_name>

# Edge Functions ログ
docker logs -f supabase_edge_runtime_<project_name>
```

---

## コンテナ内でのデバッグ

### STEP 1: コンテナ名の確認（必須）

```bash
docker ps
```

### STEP 2: コンテナにアタッチ

```bash
# シェルに入る（bash）
docker exec -it <container_name> bash

# シェルに入る（sh - bash がない場合）
docker exec -it <container_name> sh
```

### Backend Python でのデバッグ

```bash
# コンテナに入る
docker exec -it backend_app_py bash

# Python REPL を起動
uv run python

# 特定のスクリプトを実行
uv run python -c "from src.infra.logging import get_logger; print('OK')"

# テストを実行
uv run pytest src/tests/ -v

# 依存関係の確認
uv pip list
```

### Supabase DB でのデバッグ

```bash
# PostgreSQL に接続（コンテナ名は docker ps で確認）
docker exec -it supabase_db_<project_name> psql -U postgres

# SQL 実行例
SELECT * FROM auth.users LIMIT 5;
\dt public.*
\q
```

---

## フロントエンドデバッグ

### 開発サーバー起動

```bash
# フロントエンド起動（推奨）
make frontend

# ブラウザで確認: http://localhost:3000
```

### ビルドエラーの確認

```bash
# 型チェック
make type-check-frontend

# lint
make lint-frontend

# ビルド
make build-frontend
```

### Storybook デバッグ

```bash
# Storybook 起動（Docker）
make storybook

# ログ確認
docker logs -f storybook
```

---

## Supabase ローカル環境デバッグ

### 状態確認

```bash
# Supabase サービス状態
npx dotenvx run -f env/backend/local.env -- supabase status
```

### 再起動

```bash
# 停止
make stop

# 起動
make run
```

### DB リセット

```bash
# ローカル DB を完全リセット（データ消失注意）
npx dotenvx run -f env/backend/local.env -- supabase db reset

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
# 全体の lint
make lint

# 全体の format
make format

# 全体の型チェック
make type-check

# CI チェック（lint + format + type）
make ci-check

# テスト実行
make test                 # 全テスト
make test-frontend        # フロントエンドのみ
make test-backend-py      # Backend Python のみ
```

---

## トラブルシューティング

### コンテナが起動しない

```bash
# 1. コンテナの状態を確認
docker ps -a

# 2. 終了コードを確認
docker inspect <container_name> --format='{{.State.ExitCode}}'

# 3. ログを確認
docker logs <container_name>

# 4. 再起動
make stop
make run
```

### ポートが使用中

```bash
# 使用中のポートを確認
lsof -i :4040   # Backend Python
lsof -i :3000   # Frontend
lsof -i :6006   # Storybook
lsof -i :54321  # Supabase API
lsof -i :54323  # Supabase Studio

# プロセスを終了
kill -9 <PID>
```

### Supabase ネットワークエラー

```bash
# ネットワークを確認
docker network ls | grep supabase

# ネットワークを再作成（停止後）
make stop
docker network rm supabase_network_<project_name>
make run
```

### マイグレーションエラー

```bash
# Drizzle スキーマ検証
make drizzle-validate

# マイグレーション状態確認
cd drizzle && npx dotenvx run -f ../env/migration/local.env -- nr check
```

---

## ログレベル設定

### Backend Python

```bash
# env/backend/local.env で設定
LOG_LEVEL=debug  # debug, info, warn, error
LOG_FORMAT=pretty  # pretty（開発）, json（本番）
```

### Frontend

```bash
# env/frontend/local.env で設定
NEXT_PUBLIC_LOG_LEVEL=debug  # debug, info, warn, error
```

詳細は `.claude/skills/logger/SKILL.md` を参照。

---

## 便利なデバッグコマンド

```bash
# コンテナのリソース使用状況
docker stats

# コンテナ内のプロセス確認
docker top <container_name>

# コンテナの詳細情報
docker inspect <container_name>

# 全コンテナを停止
docker stop $(docker ps -q)

# 全コンテナを削除（停止中のみ）
docker container prune
```
