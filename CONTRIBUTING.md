# Contributing to shadcn-boilerplate

shadcn-boilerplateへのコントリビューションに興味を持っていただきありがとうございます！

## 開発環境のセットアップ

### 必要な環境

- [Docker](https://www.docker.com/)
- [asdf](https://asdf-vm.com/)
- [Supabase CLI](https://supabase.com/)
- Make

### セットアップ手順

1. リポジトリをクローン
   ```bash
   git clone https://github.com/[your-org]/shadcn-boilerplate.git
   cd shadcn-boilerplate
   ```

2. 初期セットアップを実行
   ```bash
   make init
   ```

3. 環境変数を設定
   ```bash
   # env/secrets.env を編集して必要な環境変数を設定
   vi env/secrets.env
   ```

4. バックエンドとフロントエンドを起動
   ```bash
   # ターミナル1: バックエンド
   make run

   # ターミナル2: フロントエンド
   make frontend
   ```

## コードスタイル

### Frontend & Drizzle

- **Linter/Formatter**: Biome
- **Architecture**: Feature-Sliced Design (FSD)
- **Style**: 2-space indentation, single quotes

```bash
# Lint & Format
make lint-frontend
make format-frontend
make type-check-frontend
```

### Backend Python

- **Linter**: Ruff（line length: 88）
- **Type Checker**: MyPy（strict mode）
- **Architecture**: Clean Architecture

```bash
# Lint & Format
make lint-backend-py
make format-backend-py
make type-check-backend-py
```

### Edge Functions

- **Runtime**: Deno
- **Linter/Formatter**: Deno native tools

```bash
# Lint & Format
make lint-functions
make format-functions
make check-functions
```

### 統合コマンド

全プロジェクトを一括でチェック:

```bash
make lint           # 全体のlint
make format         # 全体のformat
make ci-check       # CI用の全チェック
```

## テスト

### Frontend

```bash
cd frontend
bun run test
bun run test:coverage
```

### Backend

```bash
cd backend-py/app
uv run pytest
uv run pytest --cov
```

## コミット前の確認

プルリクエストを作成する前に、必ず以下を実行してください:

```bash
make ci-check
```

このコマンドは以下を実行します:
- Lint（全プロジェクト）
- Format check（全プロジェクト）
- Type check（全プロジェクト）

## プルリクエストの作成

1. feature branchを作成
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. 変更をコミット
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. `make ci-check`を実行してすべてのチェックをパス

4. プッシュしてプルリクエストを作成
   ```bash
   git push origin feature/your-feature-name
   ```

5. GitHub上でプルリクエストを作成し、詳細な説明を記載

## コミットメッセージのガイドライン

Conventional Commits形式を推奨します:

- `feat:` 新機能追加
- `fix:` バグ修正
- `docs:` ドキュメント変更
- `style:` コードスタイルの変更（機能に影響なし）
- `refactor:` リファクタリング
- `test:` テストの追加・修正
- `chore:` ビルドプロセスやツールの変更

例:
```
feat: add user authentication with Supabase Auth
fix: resolve hydration error in DateDisplay component
docs: update setup instructions in README
```

## 質問や問題がある場合

- GitHub Issuesで質問を作成してください
- 既存のIssuesを確認して、同じ質問がないか確認してください

## ライセンス

このプロジェクトにコントリビュートすることで、あなたの貢献がMITライセンスの下でライセンスされることに同意したものとみなされます。
