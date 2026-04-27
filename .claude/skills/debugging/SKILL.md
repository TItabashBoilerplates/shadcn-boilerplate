---
name: debugging
description: デバッグ手順ガイダンス。プロセスログ確認、Supabase ローカル環境のトラブルシューティングについての質問に使用。devenv 2.0 が backend + Storybook を管理し、Supabase は CLI で独立管理する。devenv の TUI を主インターフェースとする。
---

# デバッグスキル

このプロジェクトのデバッグ方法を説明します。

## CRITICAL: デバッグの最優先手段 — devenv 2.0 TUI

**backend + Storybook の監視・ログ閲覧・再起動は、devenv 2.0 の native process manager が提供する TUI（Terminal UI）を使用する。** process-compose への依存は 2026-04 に完全撤去済み。

**Supabase は devenv 管理対象外**。Docker コンテナ群の起動・停止は Supabase CLI（`make supabase-start` / `make supabase-stop`）で独立管理する。devenv プロセスにぶら下げると trap・ready probe・依存順序などの管理が複雑になるため意図的に分離している。

`devenv up` を対話端末で実行すると、Rust 製 native process manager の TUI が自動起動し、以下を一画面で扱える:

- 全プロセスの状態（pending / running / ready / failed）
- 各プロセスのリアルタイムログ
- 個別プロセスの再起動・起動・停止

devenv が管理するプロセスは以下の通り（Supabase は含まれない）:

1. `backend` — uvicorn 起動。`/healthcheck` 200 で ready。**前提として Supabase が起動済みであること**
2. `storybook` — DB 非依存、独立起動。`/` 200 で ready

`make run` は内部で `make supabase-start`（Supabase Docker 起動）→ `devenv up`（backend + storybook）の順で実行する。

### 実在する CLI サブコマンド

native manager は TUI が主なので、CLI サブコマンドは少ない。

| コマンド | 用途 |
|---------|------|
| `devenv up` | フォアグラウンド起動（TUI 付き） |
| `devenv up <name>` | 指定プロセスのみ起動（例: `devenv up supabase`） |
| `devenv up -d` | バックグラウンド起動（TUI なし） |
| `devenv up --no-tui` | TUI を明示的に無効化（プレーンログ出力） |
| `devenv processes down` | detached で動いているプロセスを停止 |
| `devenv processes wait` | 全プロセスが ready になるまで待機（CI で使う） |
| `devenv up --strict-ports` | ポート衝突時に自動リトライせずエラー終了 |

**`devenv processes status/logs/restart` は存在しない**。これらの操作は TUI 内のキーボードで行う。

### 典型的なデバッグフロー

```bash
# 1. TUI で全プロセスの状態を俯瞰する
devenv up

# 2. TUI 上で問題プロセスを選択してログを確認する
#    （TUI のキーバインドでナビゲーション・再起動が可能）

# 3. 必要なら TUI を Ctrl-C で終了して再起動
devenv up
```

### TUI を使わない運用（CI / detached）

detached 起動した場合は TUI がないため、CLI での運用になる:

```bash
# detached で起動
devenv up -d

# 準備完了を待つ
devenv processes wait

# 停止
devenv processes down
```

ログは `.devenv/state/` 配下に保存されるが、レイアウトは manager 実装により変わり得るため、インタラクティブ確認には `devenv up`（フォアグラウンド + TUI）を使うのが確実。

---

## サービス構成

| サービス | 管理方法 | 起動コマンド |
|----------|----------|-------------|
| Supabase（Docker 群） | **devenv 外** | `make supabase-start` / `make supabase-stop`（Supabase CLI 経由） |
| backend-py (FastAPI) | devenv / native process manager | `devenv up` |
| Storybook | devenv / native process manager | `devenv up` |
| Next.js (web) | **devenv 外** | `make frontend`（モノレポのスコープ分割のため） |
| Mobile (Expo) | **devenv 外** | `make mobile` / `make mobile-ios` / `make mobile-android` / `make mobile-web` |
| 一括起動 | — | `make run`（Supabase 起動 → `devenv up`） |

---

## サービス状態確認

```bash
# 主: TUI で俯瞰
devenv up

# 副: Supabase コンテナの詳細状態
dotenvx run -f env/backend/.env.local -- supabase status
```

---

## ログ確認

- **メイン**: `devenv up` を起動して TUI 内でプロセスを選択 → リアルタイムログ
- **detached 時**: `devenv processes down` → `devenv up`（フォアグラウンド）で見直す
- **Supabase コンポーネント単位**: `docker logs -f supabase_db_<project>` など（後述）

---

## プロセス再起動

- **メイン**: TUI 内のキーバインドで個別再起動（backend / storybook）
- **全体再起動**: `devenv up` を Ctrl-C で停止 → 再度 `devenv up`
- **Supabase 再起動**: `make supabase-stop && make supabase-start`（devenv とは独立）

`devenv up` を Ctrl-C で停止しても **Supabase Docker コンテナは落ちない**（独立管理のため）。Supabase を完全に停止するには `make supabase-stop` を明示的に実行するか、`make stop`（devenv + Supabase をまとめて停止）を使う。

---

## Supabase ログ確認（Docker 個別コンテナ）

`supabase` プロセスは `supabase start` のラッパーなので、TUI に表示されるのは CLI のラッパーログ。Supabase の各コンポーネント（DB / Auth / Edge Functions など）のログは Docker コンテナを直接参照する。

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

### Next.js (web)

web は devenv 外。`make frontend` で独立起動している。

```bash
# Next.js 開発サーバー起動（別ターミナル）
make frontend

# ブラウザで確認
# Next.js:   http://localhost:3000
# Storybook: http://localhost:6006（devenv 側）
```

ブラウザコンソール・Network タブ・Next.js のサーバーログ（`make frontend` を実行したターミナル）でデバッグする。

### Storybook

Storybook は devenv 管理下。TUI の `storybook` プロセスを選択してログを見る。再起動も TUI のキーバインドから。

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

# devenv 経由で停止 → 起動（trap により Docker も一緒に落ちる）
# 1. TUI を Ctrl-C で止める
# 2. 再度起動
devenv up
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

### backend が起動しない

1. TUI で `backend` のログを確認する（`devenv up` 起動中）
2. **Supabase が起動しているか確認**（backend は Supabase に接続するため、未起動だと起動失敗する）: `dotenvx run -f env/backend/.env.local -- supabase status`
3. Supabase が未起動なら: `make supabase-start`
4. 個別再起動: TUI のキーバインド、または `devenv up` を一度止めてから再起動
5. supabase の health を直接叩く: `curl -sf http://localhost:54321/rest/v1/`

### Storybook が起動しない

TUI で `storybook` プロセスを選択してログを確認。再起動も TUI から。

### Next.js (web) が起動しない

web は devenv 外なので、`make frontend` を実行したターミナルのログを直接確認する。

```bash
# ポート 3000 が空いているか
lsof -i :3000

# 依存の再インストール
cd frontend && ni

# 直接起動（Makefile が問題な可能性を排除）
cd frontend && dotenvx run -f ../env/frontend/.env.local -- nr dev
```

### ポートが使用中

```bash
lsof -i :4040   # backend (devenv)
lsof -i :3000   # Next.js (make frontend)
lsof -i :6006   # Storybook (devenv)
lsof -i :54321  # Supabase API (Docker, make supabase-start)
lsof -i :54323  # Supabase Studio

kill -9 <PID>
```

`devenv up --strict-ports` でポート衝突を即エラー化することも可能（デフォルトは自動で代替ポートを試す）。

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
