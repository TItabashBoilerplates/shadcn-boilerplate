# Supabase デプロイコマンド

このドキュメントは Supabase リソースをリモート環境にデプロイするためのコマンドを説明します。

## 概要

`make deploy-supabase` コマンドで、以下のリソースを一括デプロイできます：

| リソース | コマンド | 説明 |
|---------|---------|------|
| Config | `supabase config push` | Auth設定、API設定、Storage設定を反映 |
| Storage Buckets | `supabase seed buckets --linked` | バケット作成・同期 |
| Edge Functions | `supabase functions deploy` | 全Edge Functionsをデプロイ |
| Secrets | `supabase secrets set` | シークレット設定 |

**Note**: マイグレーションは別途 `make migrate-deploy` で実行（Drizzle経由）

---

## コマンド一覧

### 一括デプロイ

```bash
# Staging環境
ENV=stg make deploy-supabase

# Production環境
ENV=prod make deploy-supabase

# ローカル環境（スキップされる）
make deploy-supabase
# ⚠️  deploy-supabase is for remote environments only.
```

### 個別デプロイ

```bash
# リモートプロジェクトへのリンク
ENV=stg make supabase-link

# Config Push（Auth, API設定など）
ENV=stg make deploy-config

# Edge Functions 全デプロイ
ENV=stg make deploy-functions-all

# Secrets 設定
ENV=stg make deploy-secrets

# Storage Buckets 同期
ENV=stg make deploy-buckets
```

---

## スクリプト構成

デプロイロジックは `scripts/supabase/` に配置されています：

```
scripts/supabase/
├── deploy.sh           # 一括デプロイ（他スクリプトを順次実行）
├── link.sh             # supabase link
├── deploy-config.sh    # config push
├── deploy-functions.sh # functions deploy
├── deploy-secrets.sh   # secrets set
└── deploy-buckets.sh   # seed buckets
```

### スクリプトの特徴

- `set -euo pipefail` でエラー時に即座に停止
- `ENV` 変数で環境を判定（local/stg/prod）
- `dotenvx` で環境変数を注入
- ローカル環境では安全にスキップ

---

## 環境変数管理

### env/ ディレクトリ構成

```
env/
├── backend/
│   ├── local.env      # ローカル開発用（Backend, Edge Functions）
│   ├── stg.env        # Staging環境用
│   └── prod.env       # Production環境用
├── frontend/
│   ├── local.env      # ローカル開発用（Next.js）
│   ├── stg.env        # Staging環境用
│   └── prod.env       # Production環境用
├── migration/
│   ├── local.env      # ローカル開発用（Drizzle）
│   ├── stg.env        # Staging環境用
│   └── prod.env       # Production環境用
├── secrets.env        # 機密情報（.gitignore対象）
└── secrets.env.example # secrets.env のテンプレート
```

### 各ファイルの役割

| ファイル | 用途 | Git管理 |
|---------|------|---------|
| `backend/{ENV}.env` | Supabase URL、Project Ref、API設定 | ✅ |
| `frontend/local.env` | Next.js 用 NEXT_PUBLIC_* 変数 | ✅ |
| `migration/local.env` | DATABASE_URL（Drizzle接続） | ✅ |
| `secrets.env` | APIキー、OAuth シークレット等 | ❌ |

### dotenvx による環境変数注入

このプロジェクトでは `dotenvx` を使用して環境変数を注入します。

```bash
# 基本的な使い方
npx dotenvx run -f env/backend/${ENV}.env -- <command>

# 複数ファイルを指定（後のファイルが優先）
npx dotenvx run -f env/backend/${ENV}.env -f env/secrets.env -- <command>
```

### スクリプト内での使用例

```bash
# scripts/supabase/link.sh
npx dotenvx run -f "env/backend/${ENV}.env" -- \
    bash -c 'supabase link --project-ref $SUPABASE_PROJECT_REF'

# scripts/supabase/deploy-functions.sh
npx dotenvx run -f "env/backend/${ENV}.env" -f "env/secrets.env" -- \
    bash -c 'supabase functions deploy --project-ref $SUPABASE_PROJECT_REF'

# scripts/supabase/deploy-secrets.sh
npx dotenvx run -f "env/backend/${ENV}.env" -- \
    bash -c 'supabase secrets set --env-file env/backend/${ENV}.env --project-ref $SUPABASE_PROJECT_REF'
```

### なぜ dotenvx を使うか

1. **ENV による環境切り替え**: `env/backend/${ENV}.env` で stg/prod を動的に選択
2. **シークレット分離**: `secrets.env` を別ファイルで管理し、Git から除外
3. **複数ファイル合成**: `-f` フラグで複数の .env ファイルをマージ
4. **コマンド実行**: `--` 以降のコマンドに環境変数を注入

---

## 必要な環境変数

### env/backend/{ENV}.env

```bash
# Supabase プロジェクト設定
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# デプロイ用（必須）
SUPABASE_PROJECT_REF=abcdefghijklmnop
```

### env/migration/{ENV}.env

```bash
# Drizzle マイグレーション用（直接接続）
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

### env/secrets.env

```bash
# Edge Functions で使用するシークレット
ONE_SIGNAL_APP_ID=xxx
ONE_SIGNAL_API_KEY=xxx

# OAuth プロバイダー
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# AI/ML サービス
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

### 環境別ファイルの作成

```bash
# Staging 環境（backend, frontend, migration すべて）
cp env/backend/local.env env/backend/stg.env
cp env/frontend/local.env env/frontend/stg.env
cp env/migration/local.env env/migration/stg.env
# 各ファイルを Staging 用に編集

# Production 環境
cp env/backend/local.env env/backend/prod.env
cp env/frontend/local.env env/frontend/prod.env
cp env/migration/local.env env/migration/prod.env
# 各ファイルを Production 用に編集
```

---

## config push で反映される設定

`supabase config push` は `supabase/config.toml` の設定をリモートに反映します：

| セクション | 内容 |
|-----------|------|
| `[auth]` | site_url, redirect_urls, jwt_expiry, enable_signup |
| `[auth.external.*]` | OAuth プロバイダー設定 |
| `[api]` | schemas, max_rows |
| `[storage]` | file_size_limit |

### OAuth シークレットの注意

config.toml で `env()` 関数を使用している場合：

```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
```

デプロイ先で環境変数が利用可能である必要があります。

---

## 事前準備

### 1. Supabase CLI ログイン

```bash
supabase login
```

### 2. プロジェクトリファレンスの確認

Supabase ダッシュボードの Project Settings → General から取得

### 3. 環境変数の設定

```bash
# env/backend/stg.env
SUPABASE_PROJECT_REF=abcdefghijklmnop
```

---

## デプロイフロー

### 推奨順序

1. **マイグレーション適用**
   ```bash
   ENV=stg make migrate-deploy
   ```

2. **Supabase リソースデプロイ**
   ```bash
   ENV=stg make deploy-supabase
   ```

### deploy-supabase の内部フロー

```
1. supabase link      # リモートプロジェクトにリンク
       ↓
2. config push        # config.toml を反映
       ↓
3. seed buckets       # Storage Buckets を同期
       ↓
4. functions deploy   # Edge Functions をデプロイ
       ↓
5. secrets set        # Secrets を設定
```

---

## トラブルシューティング

### supabase link 時にパスワードを求められる

```bash
# パスワード指定でリンク
supabase link --project-ref xxx --password "your-db-password"
```

### config push が一部設定を反映しない

既知の問題として `auth.password_requirements` など一部設定が正しく同期されないバグがあります。
→ [GitHub Issue #3148](https://github.com/supabase/cli/issues/3148)

ダッシュボードから手動設定が必要な場合があります。

### Edge Functions のデプロイに失敗する

1. `supabase login` が完了しているか確認
2. `SUPABASE_PROJECT_REF` が正しいか確認
3. `env/secrets.env` が存在するか確認

---

## 参考リンク

| ドキュメント | URL |
|-------------|-----|
| Supabase CLI Reference | https://supabase.com/docs/reference/cli/start |
| Config Push | https://supabase.com/docs/reference/cli/supabase-config-push |
| Seed Buckets | https://supabase.com/docs/reference/cli/supabase-seed-buckets |
| Functions Deploy | https://supabase.com/docs/reference/cli/supabase-functions-deploy |
| Secrets Set | https://supabase.com/docs/reference/cli/supabase-secrets-set |
| Managing Config | https://supabase.com/docs/guides/local-development/managing-config |
