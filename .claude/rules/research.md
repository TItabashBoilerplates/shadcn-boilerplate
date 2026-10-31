# Research-First Development Policy

**MANDATORY**: Before starting any implementation or planning, you MUST conduct thorough research.

> **設計フェーズには上位ルールがある**: 設計を書き始める前の一次情報の読み方、デザインパターン・DB 設計の
> ベストプラクティス調査、そして**設計書・指示・既存実装との乖離をユーザーに確認する手順**は
> **`.claude/rules/design-research.md`** が正本。本ファイルは実装前の調査を規定する。

## Pre-Implementation Research (REQUIRED)

Before writing any code or creating a plan, you MUST:

1. **Use Context7 MCP** to fetch the latest documentation for all relevant libraries and frameworks
2. **Use WebSearch** to verify current best practices and common pitfalls
3. **Use WebFetch** to read official documentation directly

## What to Research

**ALWAYS research**:
- Library/framework versions and their current APIs
- Deprecated features and their replacements
- Breaking changes in recent versions
- Official recommended patterns and anti-patterns
- TypeScript type definitions and interfaces
- Configuration file formats and schemas
- CLI command syntax and options

**NEVER**:
- Make assumptions based on memory or general knowledge
- Use outdated patterns without verification
- Implement features without checking official docs
- Guess API signatures or parameter types

## Mandatory Research Scenarios

Research is REQUIRED when:
- Using any external library or framework
- Implementing authentication or security features
- Configuring build tools or bundlers
- Setting up database schemas or migrations
- Integrating third-party APIs or services
- Using CLI tools with specific syntax
- Implementing real-time features
- Working with type definitions

## spec サブエージェントとの連携

技術選定や新規モジュールのセットアップ時は、`spec` サブエージェントを積極的に活用してください。

### spec エージェントを使用すべき場面

- 新しいライブラリ/フレームワークの導入
- 既存パッケージのメジャーアップデート
- 設定ファイルの作成・変更
- ビルドツールのセットアップ

### 調査レポートの保存先

spec エージェントは調査結果を `docs/_research/` に保存します：

```
docs/_research/
├── 2024-01-15-tailwindcss-v4.md
├── 2024-01-16-nextjs-16.md
└── ...
```

これらのレポートは将来の参照用に保持され、同じ技術の再調査時に参考にできます。

## 「できない」と結論する前に（必須）

外部サービス連携（Doppler / Vercel / Supabase / Stripe / ストア等）で、「API が無い」「画面でしかできない」
「別の方式にするしかない」と利用者に伝える前に、次をすべて行う。

1. そのサービス自身の**公式ドキュメントの該当ページ**を読む（連携ガイド、API リファレンス、CLI の `--help`）。
   リポジトリ内のルールや過去の記述は一次情報ではない。古い・誤りの可能性があるものとして公式と突き合わせる。
2. **API / CLI の読み取り系を実際に叩いて確認する**。ドキュメントに載っていない操作でも、一覧・取得・削除・作成が
   揃っていれば、代替手順（削除して作り直す等）で実現できることが多い。
3. **公式の推奨構成を先に探す**。回避策（設定を分ける、直接投入する等）を提案するのは、推奨構成で解決できないと
   確認した後にする。
4. 結論には**根拠**（URL、実行したコマンドと結果）を添える。確認していないことを「できない」と断定しない。
   確認できなかった場合は「**未確認**」と書く。

過去の失敗: Doppler の Vercel 同期エラーで、公式の「Dynamic 型 + Unmasked」を読まずに「再有効化の API が無いので
Vercel へ直接設定するしかない」と案内し、利用者に余計な手間と不信を生んだ。実際は CLI の `--visibility` と同期の
API（削除 → 再作成）で解決できた（`env-naming.md` §1.1）。

## Enforcement

This research-first approach is **NON-NEGOTIABLE**. Any implementation without proper research is considered incomplete and must be revised.
