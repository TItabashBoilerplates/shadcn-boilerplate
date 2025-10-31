# Atlas Schema Management

このディレクトリはAtlasを使用したデータベーススキーマ管理を行います。

## ディレクトリ構造

```
atlas/
├── atlas.hcl         # Atlas設定ファイル（環境定義、Lintルール）
├── schema/           # スキーマ定義（HCL形式）
│   ├── schema.hcl    # メインスキーマ（テーブル定義 + RLS + チェック制約）
│   ├── base.hcl      # 権限設定（GRANT文）
│   └── functions.hcl # データベース関数とトリガー
└── migrations/       # 生成されたマイグレーションファイル
```

## スキーマファイルの説明

### schema.hcl
**メインスキーマ定義ファイル** - すべてをこのファイルで一元管理

**Atlas HCLの宣言的構文**を使用：
- **テーブル定義**: `table`, `column`, `index`, `foreign_key`
- **RLS有効化**: 各テーブルの `row_security { enabled = true }` ブロック
- **RLSポリシー**: テーブル定義の直後に `policy` ブロックを配置
- **チェック制約**: `check` ブロックで制約を定義
- 完全にHCL形式で記述（executeブロック不使用）

**構成例**:
```hcl
# テーブル定義
table "general_users" {
  column "id" { type = uuid }
  # ... 他のカラム ...

  row_security {
    enabled = true
  }
}

# 直後にそのテーブルのRLSポリシーを定義
policy "select_own_user" {
  on    = table.general_users
  for   = SELECT
  to    = ["authenticated"]
  using = "(SELECT auth.uid()) = id"
}
```

**メリット**:
- テーブルとそのRLSポリシーを同じ画面で確認可能
- 認知負荷が低い
- 変更時にテーブルとポリシーを一緒に編集できる

### functions.hcl
PostgreSQL関数とトリガー定義。**functionとtriggerブロック**を使用：
- **function**ブロックで関数を宣言的に定義
- **trigger**ブロックでトリガーを宣言的に定義
- `handle_new_user`: 新規ユーザー作成時のAuth Hook
- `match_documents`: ベクトル検索関数（pgvector）
- `match_documents_with_rls`: RLS対応のベクトル検索関数
- executeブロック不使用（関数参照時のみexecute使用）

### base.hcl
Supabaseロール（anon, authenticated, service_role）への権限設定。
- **注意**: GRANT文はHCLに対応する宣言的構文が存在しないため、executeブロックを使用
- これはexecuteブロックの適切な使用例です

## コマンド使用方法（Prisma風）

### 開発用マイグレーション（Prismaの migrate dev）

```bash
# マイグレーション生成 + 適用 + 型生成を一括実行（ローカル専用）
make migrate-dev

# または短縮形
make migration
```

このコマンドは以下を自動実行します：
1. Supabase起動
2. マイグレーション生成（`atlas migrate diff`）
3. ローカルDBに適用（`atlas migrate apply`）
4. 型定義を再生成（`make build-model`）

### 本番用マイグレーション適用（Prismaの migrate deploy）

```bash
# ローカル環境
make migrate-deploy

# ステージング環境
ENV=staging make migrate-deploy

# 本番環境
ENV=production make migrate-deploy
```

このコマンドは既存のマイグレーションファイルを適用するだけです（生成は行いません）。

### スキーマ検証

```bash
# スキーマの妥当性チェック
atlas schema validate --env local

# マイグレーションのLintチェック
atlas migrate lint --env local
```

## スキーマ変更ワークフロー（Prisma風）

### ローカル開発環境（Prismaの migrate dev）

```bash
# 1. スキーマ編集
vi atlas/schema/schema.hcl

# 2. マイグレーション生成 + 適用 + 型生成（一括実行）
make migrate-dev

# 3. マイグレーションファイルを確認
ls atlas/migrations/

# 4. Gitにコミット
git add atlas/migrations/
git commit -m "Add users table"
git push
```

### リモート環境（Prismaの migrate deploy）

```bash
# 1. マイグレーションファイルを取得
git pull

# 2. マイグレーション適用（staging）
ENV=staging make migrate-deploy

# または本番環境
ENV=production make migrate-deploy
```

### Prismaとの対応表

| 操作 | Prisma | Atlas (このプロジェクト) |
|------|--------|--------------------------|
| ローカル開発 | `prisma migrate dev --name xxx` | `make migrate-dev` |
| 本番デプロイ | `prisma migrate deploy` | `ENV=production make migrate-deploy` |
| スキーマリセット | `prisma migrate reset` | (未実装) |

### 重要事項

- ⚠️ **`make migrate-dev` はローカル環境専用**（ENV指定でエラー）
- **`make migrate-deploy` は全環境で使用可能**（既存ファイルの適用のみ）
- マイグレーションファイルは必ずGitで管理
- **ローカル環境では `dev` と `url` が同じDB（Supabase Local）を使用**
  - 追加のDockerコンテナ不要でシンプル
  - HCLスキーマと現在のDB状態を比較してマイグレーション生成
- `atlas.hcl` の `dev` パラメータは local 環境にのみ定義されており、リモート環境での誤操作を防止

## 注意事項

- Atlasはスキーマ定義のみを管理し、データは保持されます
- マイグレーションは`atlas/migrations/`に自動生成されます
- RLSポリシーはスキーマと一緒にバージョン管理されます
- Supabase CLIと並行して使用可能（互いに干渉しません）
