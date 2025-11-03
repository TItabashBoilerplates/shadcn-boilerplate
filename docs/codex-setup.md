# Codex Setup Guide

このガイドでは、shadcn-boilerplateプロジェクトでOpenAI Codexを使用するためのセットアップ方法を説明します。

## 前提条件

- OpenAI API アクセス
- Codex IDE拡張機能（VS Code/Cursor等）

## セットアップ手順

### 1. Codex設定ファイルのコピー

プロジェクトの推奨設定をホームディレクトリにコピーします：

```bash
# ホームディレクトリに .codex ディレクトリを作成
mkdir -p ~/.codex

# プロジェクトの設定例をコピー
cp .codex/config.toml.example ~/.codex/config.toml

# エディタで編集（必要に応じて）
vi ~/.codex/config.toml
```

### 2. OpenAI API キーの設定

環境変数にOpenAI API キーを設定します：

```bash
# ~/.bashrc または ~/.zshrc に追加
export OPENAI_API_KEY="your-api-key-here"

# または .env ファイルに追加（プロジェクトルート）
echo "OPENAI_API_KEY=your-api-key-here" >> .env
```

### 3. 設定の確認

Codex設定が正しく読み込まれているか確認：

```bash
# Codex CLIで確認
codex --help

# 設定を表示
cat ~/.codex/config.toml
```

## 推奨設定

### デフォルト設定（開発用）

```toml
model = "gpt-5-codex"
model_provider = "openai"
approval_policy = "untrusted"
sandbox_mode = "workspace-write"
```

**説明**:
- **model**: `gpt-5-codex` を使用（最新かつ最強のモデル）
- **approval_policy**: `untrusted` - 信頼されていないコマンドのみ承認が必要
- **sandbox_mode**: `workspace-write` - ワークスペース内のみ書き込み可能

### プロフィール別設定

#### 開発用 (dev)

```bash
codex --profile dev
```

- 最も柔軟な設定
- コマンド実行前に承認を求める
- ワークスペース内の書き込み可能

#### 本番用 (prod)

```bash
codex --profile prod
```

- より慎重な設定
- 失敗時のみ承認を求める
- 読み取り専用モード

#### レビュー用 (review)

```bash
codex --profile review
```

- コードレビュー専用
- 承認なしで実行
- 読み取り専用モード

## AGENTS.md の自動検出

このプロジェクトは `AGENTS.md` ファイルをルートディレクトリに配置しています。

Codexは自動的に以下のファイルを検出し、プロジェクトコンテキストとして使用します：

- `AGENTS.md` - AIアシスタント向けガイド（推奨）
- `CLAUDE.md` - Claude Code向け詳細ガイド
- `.cursorrules` - Cursor IDE向けルール

**重要**: AGENTS.mdが存在する場合、Codexは自動的にそれを読み込みます。追加の設定は不要です。

## 使用方法

### 基本的な使い方

```bash
# デフォルト設定で起動
codex

# 特定のプロフィールで起動
codex --profile dev

# モデルを指定して起動
codex --model gpt-5-codex

# 承認ポリシーを変更
codex --ask-for-approval on-request
```

### プロジェクトでの推奨フロー

1. **開発時**: `codex --profile dev`
   - 新機能実装
   - バグ修正
   - リファクタリング

2. **コードレビュー時**: `codex --profile review`
   - コード品質チェック
   - ベストプラクティス確認
   - セキュリティレビュー

3. **本番デプロイ前**: `codex --profile prod`
   - 最終チェック
   - ドキュメント生成
   - テストカバレッジ確認

## IDE統合

### VS Code / Cursor

1. Codex拡張機能をインストール
2. 右上の歯車アイコン → "Codex Settings" → "Open config.toml"
3. 設定を編集

### コマンドパレット

- `Cmd/Ctrl + Shift + P` → "Codex: Settings"

## プロジェクト固有のコンテキスト

Codexは以下の情報を自動的に理解します：

### Frontend開発
- Next.js 16 + React 19
- Feature-Sliced Design (FSD)
- shadcn/ui + TailwindCSS 4
- Rendering Strategy（SSR/CSR/Hybrid）

### Backend開発
- FastAPI + Clean Architecture
- Type annotations必須
- Async/await for I/O
- AI/ML統合（LangChain, OpenAI, etc.）

### Edge Functions
- Deno runtime
- Deno.serve API
- `npm:` prefix imports

### Database
- Drizzle ORM
- RLS policies
- Migration-based workflow

## トラブルシューティング

### API キーが認識されない

```bash
# 環境変数を確認
echo $OPENAI_API_KEY

# シェルを再起動
exec $SHELL

# または Codex を再起動
```

### AGENTS.md が検出されない

```bash
# ファイルの存在確認
ls -la AGENTS.md

# パーミッション確認
chmod 644 AGENTS.md

# Codex を再起動
```

### 設定が反映されない

```bash
# 設定ファイルのシンタックスチェック
cat ~/.codex/config.toml

# Codex をデバッグモードで起動
codex --verbose
```

## 参考リンク

- [Codex公式ドキュメント](https://developers.openai.com/codex/local-config/)
- [AGENTS.md](../AGENTS.md) - このプロジェクトのAIアシスタント向けガイド
- [CLAUDE.md](../CLAUDE.md) - 詳細な開発ガイドライン

## サポート

問題が発生した場合：

1. GitHub Issues で報告
2. AGENTS.md と CLAUDE.md を確認
3. 設定ファイル（config.toml）を再確認

---

**Note**: Codexは `AGENTS.md` を自動検出するため、追加の設定なしでプロジェクト固有のコンテキストを理解します。
