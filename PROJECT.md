---
# PROJECT.md: このリポジトリ固有の決定事項（プロダクト層）
#
# ここは「派生したプロジェクトが所有する」唯一の AI 設定ファイル。
# .claude/CLAUDE.md / .claude/rules/ / .claude/skills/ / AGENTS.md はスタック層（技術規約）で、
# 派生先では原則書き換えない。値の意味と選び方は下の「決定事項の埋め方」を参照。
# mode を product にしたら TODO を残せない（frontend/policy/project-manifest.policy.test.ts が CI で止める）。
mode: boilerplate            # boilerplate | product   ← template から起こした時点で product にする
distribution: TODO           # web | web+mobile | mobile
tenancy: TODO                # personal | organization
locales: [en, ja]
seo_public_pages: TODO       # true | false
supabase_plan: pro           # free | pro | team | enterprise（画像変換 = storage-images.md の前提）
doppler_phase: full-access   # full-access | protected  ← 実ユーザーが付いたら protected にする
services:
  stripe: TODO               # true | false（以下同じ）
  revenuecat: TODO
  resend: TODO
  onesignal: TODO
  livekit: TODO
  fal: TODO
  sentry: TODO
  langchain: TODO
---

# PROJECT.md

このファイルは **このリポジトリ固有の決定事項** を置く場所。スタック規約（`.claude/rules/`）が
「推測せずユーザーに確認せよ」としている論点を、先にここで答えておく。

**エージェントへ**: タスク開始時にまずここを読む。**ここに書かれていない決定は推測せず、
ユーザーに確認する**（`.claude/rules/design-research.md` §3）。`TODO` は「未決定」であって
「好きに決めてよい」ではない。

## このリポジトリの状態（`mode`）

| `mode` | 意味 | エージェントの振る舞い |
|---|---|---|
| `boilerplate` | 雛形そのもの。いろいろなアプリの template として使う | `supabase/config.toml` / bundle id / package name / 収集データの定義は**意図的に無い**。無いことを不備として報告しない。決定事項の `TODO` はそのままでよい |
| `product` | 雛形から起こした実プロジェクト | `TODO` を全部埋め、`supabase/config.toml` を作ってから切り替える。以後、無いものは不備 |

## プロダクト概要

<!-- mode: product にしたら埋める。ドメイン用語は AI が命名に使うので、正式な表記で書く -->

- 何のアプリか: TODO
- 主なユーザー: TODO
- ドメイン用語（英語 / 日本語）: TODO

## 決定事項の埋め方（frontmatter の各キーが何を決めるか）

| キー | 何が決まるか | 参照するルール |
|---|---|---|
| `distribution` | **認証方式**（mobile を含むならメール + パスワード必須。OTP のみ禁止）/ 一覧の既定 UI パターン / ストア審査要件の適用 | `auth.md` §1、`list-pagination.md` §2、`store-review.md` |
| `tenancy` | RLS のテナント境界 / 使用量・監査の**集計軸**（後から列を足しても過去行は埋まらない） | `design-research.md` §0、`rls` skill、`ai-usage-metering` skill |
| `locales` | i18n のメッセージファイルとメールテンプレートの言語 | `i18n.md` |
| `seo_public_pages` | 公開一覧のページング方式（true ならページ番号 + URL 同期。もっと見る / 無限スクロール禁止） | `list-pagination.md` §2 |
| `supabase_plan` | 画像変換（Pro 以上）/ 漏洩パスワード保護（Pro 以上）/ Branching の可否 | `storage-images.md` §1、`auth.md` §3.5 |
| `doppler_phase` | エージェントの Doppler 書き込み許可（`full-access` = 全 config 可 / `protected` = `prd` は明示承認制） | `mcp-doppler.md` |
| `services.*` | **使うもの / 使わないもの**。`false` のサービスは指示が無い限り追加しない。役割が重複するライブラリも持ち込まない | `minimal-implementation.md` §3.4 |

## Supabase / 環境

- project ref と各環境の対応は **`supabase/config.toml` の `[remotes.*]` が正本**（ここに複製しない）。
- Doppler の project 名: TODO（`<app>` に相当する名前。config は `dev` / `stg` / `prd` / `bootstrap`）
- Supabase の環境変数は Doppler に置かない（Vercel Marketplace 連携と Edge Functions の default secrets が供給。`env-naming.md` §2）。

## モバイル（`distribution` に mobile を含む場合。含まなければ `n/a`）

- bundle id / package name は `frontend/apps/mobile/app.json` が正本: TODO
- 審査用アカウントは Doppler の `APPLE_REVIEW_DEMO_ACCOUNT` / `APPLE_REVIEW_DEMO_PASSWORD`（値はここに書かない）。
- 第三者 AI へ送る personal data の有無と送り先（`store-review.md` §1 の開示対象）: TODO
- **推奨 / 強制アップデートのストア URL**（`app_release_policies.store_url`。`mode: product` で必須）: TODO
  - iOS: `https://apps.apple.com/app/id<APP_STORE_ID>`（`APP_STORE_ID` は `scripts/mobile/config.env` の `APPLE_ASC_APP_ID`）
  - Android: `https://play.google.com/store/apps/details?id=<package_name>`
  - 下限バージョンの運用（いつ上げるか）は [`docs/mobile/app-update-runbook.md`](docs/mobile/app-update-runbook.md)、
    判断の正本は `.claude/skills/app-update/`。**`mode: boilerplate` の間は seed のプレースホルダのままでよい**

## デスクトップ（`distribution` にデスクトップ配布を含む場合。含まなければ `n/a`）

`frontend/apps/desktop`（Tauri）を Web 経由で配り、`tauri-plugin-updater` で自動更新する。
手順の正本は [`docs/desktop/release-runbook.md`](docs/desktop/release-runbook.md)、
判断の正本は `.claude/skills/desktop-release/`。

- アプリ名（`productName`）と bundle identifier は `frontend/apps/desktop/src-tauri/tauri.conf.json` が正本: TODO
  （**identifier は配布後に変えるとインストール済みアプリと別物になる**）
- 配布対象の OS / アーキテクチャ（既定は macOS Apple Silicon + Windows x64）: TODO
- Windows のコード署名を行うか（行わないと SmartScreen の警告が出る）: TODO
- 自動更新の endpoint と公開鍵は `tauri.conf.json` の `plugins.updater` が正本
  （`desktop-updater-keygen` が書く。**endpoint と秘密鍵はどちらも永続**で、
  変えると配布済みアプリが以後の更新を検証できない。値はここに複製しない）。

## AI 機能（`services.langchain` / `services.fal` のどちらかが true の場合。どちらも false なら `n/a`）

- 使用量の集計軸（user / organization / feature / conversation）: TODO
- 単価表の置き場（`effective_from` 付きデータ）: TODO
- 円換算方式（社内速報 / 会計確定の別と、継続適用するレート）: TODO

## 意図的な逸脱の記録

スタック規約や一次情報と食い違う設計を**ユーザーが意図的に選んだ**とき、ここに残す
（`.claude/rules/design-research.md` §3。記録があれば、エージェントは同じ指摘を繰り返さない）。

| 日付 | 対象（ルール / 一次情報） | 逸脱の内容 | 理由と決定者 |
|---|---|---|---|
| | | | |
