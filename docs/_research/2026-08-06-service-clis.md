# 外部サービス CLI / Agent Skill 導入調査（2026-08-06）

本リポジトリで使用中・導入予定の外部サービスについて、**公式 CLI の有無**・**nixpkgs 収録状況**・
**公式 Agent Skill の有無**を調査し、devenv への導入方針を決めた記録。

判断のルール:

- CLI は **公式が提供しているもののみ**採用（非公式ラッパーは採らない）
- nixpkgs にあれば `packages` に入れて**バージョンを固定**する
- nixpkgs に無い公式 CLI は `scripts` で **bunx 経由**（`uipro` script の既存パターンに合わせる）
- Skill は `skills-lock.json` 管理（`npx skills add <owner>/<repo> --skill <name> --agent universal --agent claude-code`）

---

## 1. 結論一覧

| サービス | 公式 CLI | nixpkgs | 導入方法 | Skill |
|---|---|---|---|---|
| **Stripe**（決済） | ✅ `stripe` | ✅ `stripe-cli` 1.37.1 | `packages` に追加 | `stripe-best-practices`（既存）+ **`stripe-docs`** / **`upgrade-stripe`** を追加 |
| **Resend**（メール） | ✅ `resend`（npm `resend-cli`） | ❌ | `scripts.resend` = `bunx resend-cli` | `resend` / `resend-cli` / `react-email` / `send-email` / `email-best-practices` / `agent-email-inbox`（**すべて導入済み**） |
| **Sentry**（監視） | ✅ `sentry-cli` | ✅ `sentry-cli` 2.58.2 | `packages` に追加 | **`sentry-get-started` / `sentry-instrument` / `sentry-debug-issue` / `sentry-fix-stack-traces` / `sentry-setup-releases`** を追加 |
| **LiveKit**（RTC） | ✅ `lk` | ✅ `livekit-cli` 2.16.2 | `packages` に追加 | 公式 Skill なし |
| **Adapty**（モバイル課金） | ✅ `adapty`（npm `adapty`） | ❌ | `scripts.adapty` = `bunx adapty` | **`adapty-cli`** を追加 |
| **fal.ai**（生成 AI 推論） | ✅ `fal`（PyPI `fal`） | ❌ | `scripts.fal` = `uvx fal` | 公式 Skill なし（**MCP は `.mcp.json` に導入済み**） |
| **RevenueCat**（モバイル課金） | ❌ 公式 CLI なし（MCP を提供） | ❌ | CLI は導入しない | **`revenuecat` 他 9 種**を追加 |
| **OneSignal**（プッシュ通知） | ⚠️ beta / 用途不一致 | ❌ | **導入しない**（§3） | 公式 Skill なし |
| **Expo EAS** | ✅ `eas` | ⚠️ 18.7.0（npm は 21.6.0） | **nix で固定しない**（§3） | `expo/skills` 各種（導入済み） |
| **Vercel** | ✅ `vercel` | ❌ | **導入しない**（既存方針: REST API 直叩き） | `vercel-*` skills（導入済み） |
| **Supabase / Doppler / GitHub / Maestro** | — | ✅ | **導入済み** | 導入済み |

---

## 2. 導入したもの

### 2.1 `packages`（nixpkgs 収録・バージョン固定）

| package | version | 主な用途 |
|---|---|---|
| `pkgs.stripe-cli` | 1.37.1 | `stripe login` / `stripe listen --forward-to <edge function>` で Webhook をローカル転送、`stripe trigger <event>` でイベント再現 |
| `pkgs.sentry-cli` | 2.58.2 | source map / debug file のアップロード、release / deploy の作成。CI からも同じバイナリを使う |
| `pkgs.livekit-cli` | 2.16.2 | `lk token create` / `lk room list`。backend-py の AI/ML 機能が LiveKit を使う |

いずれも `lib.optionals (!config.container.isBuilding)` の開発専用ブロックに入れている
（backend コンテナイメージには含めない）。

### 2.2 `scripts`（nixpkgs 未収録 → bunx 経由）

| script | 実体 | 備考 |
|---|---|---|
| `resend` | `bunx resend-cli` | npm パッケージ名 `resend-cli` / bin 名 `resend`。Node >= 22（本リポジトリは nodejs_22） |
| `adapty` | `bunx adapty` | npm パッケージ名も bin 名も `adapty`。Node >= 18。認証は OAuth device flow → `~/.config/adapty/config.json`（Doppler 管理外） |
| `fal` | `uvx fal` | PyPI パッケージ名も コマンド名も `fal`（1.79.1）。**Python 製なので bunx ではなく uvx**。認証は `fal auth login` か `FAL_KEY`（`.mcp.json` の fal-ai MCP と同じキー） |

**バージョンを固定しない理由**: いずれもリモート API を叩く運用ツールで、CLI を古いまま固定すると
サーバ側の API 変更に追従できなくなる。bunx / uvx のキャッシュが効くので 2 回目以降のオーバーヘッドは無い。
script 名はいずれも bash 組み込みと衝突しない（`.claude/rules/commands.md` の命名規約）。

**`fal` を backend-py の dependency-group に入れなかった理由**: fal は運用ツールであって
アプリの実行時依存ではない。`[dependency-groups].dev` に入れると `uv sync --all-packages --group dev`
（`setup:install-backend` task / backend process の起動時）と CI の両方でインストール時間が増える。

### 2.3 Skill

| repo | 追加した skill |
|---|---|
| `stripe/ai` | `stripe-docs` / `upgrade-stripe` |
| `getsentry/sentry-for-ai` | `sentry-get-started` / `sentry-instrument` / `sentry-debug-issue` / `sentry-fix-stack-traces` / `sentry-setup-releases` |
| `adaptyteam/adapty-cli` | `adapty-cli` |
| `RevenueCat/ai-toolkit` | `revenuecat` / `create-revenuecat-project` / `integrate-revenuecat` / `revenuecat-entitlements-gate` / `revenuecat-paywall` / `revenuecat-purchase-flow` / `revenuecat-identify-user` / `revenuecat-testing-setup` / `revenuecat-troubleshoot` |

**選定でわざと外したもの**（セッション開始時のコンテキストを無駄に食うため）:

- `stripe/ai` の `connect-recommend` / `stripe-directory` / `stripe-projects`
  → マーケットプレイス・サービスプロビジョニング用途で本リポジトリの構成と合わない
- `RevenueCat/ai-toolkit` の `rc-*` 系 26 種
  → Android ネイティブ（Kotlin + Play Billing）専用。本リポジトリの mobile は Expo / React Native
- `getsentry/sentry-for-ai` の `sentry-otel-exporter-setup` / `sentry-snapshots-cocoa` / `sentry-create-alert`
  → OTel Collector / Apple ネイティブのスナップショットテストは現状の構成外

インストール先は既存の慣習どおり **`.agents/skills/<name>` が実体、`.claude/skills/<name>` はそこへの
symlink**（`--agent universal --agent claude-code`）。

---

## 3. 導入しなかったもの（理由つき）

### OneSignal CLI — 導入しない

`OneSignal/cli` は存在するが、以下の理由で本リポジトリでは役に立たない:

- **Ruby gem / Homebrew 配布**（`brew tap OneSignal/cli`）で nix にも npm にも無い
- **macOS のみ公式サポート**（Linux / CI では動かない）
- **Beta** 扱い
- 機能が `onesignal install-sdk`（iOS / Android ネイティブへの SDK 追加）に限られ、
  **React Native / Expo は非対応**。本リポジトリの OneSignal 連携は
  `supabase/functions/onesignal-*`（REST API 直叩き）と `frontend/packages/onesignal` にあるので、
  この CLI が触る領域が無い

公式 Agent Skill も存在しない。OneSignal の運用が増えたら
`.claude/skills/` 配下に独自 Skill を書くのが現実的（`skills-lock.json` 管理外）。

### RevenueCat CLI — 存在しない

RevenueCat は CLI を出しておらず、代わりに **公式 MCP サーバ**（`https://mcp.revenuecat.ai/mcp`）と
AI Toolkit（Skill 群）を提供している。検索で出てくる `revcat` / `rc-cli` / `revenuecat-cli` は
いずれも**サードパーティ製**なので採用しない。

> RevenueCat を実際に導入する段になったら、`.mcp.json` に MCP サーバを追加して `mcp-sync` を流す。
> `revenuecat-troubleshoot` / `integrate-revenuecat` skill は MCP がある前提で書かれている。

### Expo EAS CLI — nix で固定しない

`pkgs.eas-cli` は **18.7.0** だが npm の最新は **21.6.0**（メジャー 3 つ遅れ）。
EAS はクラウド側 API との組み合わせで動くため、古い CLI を固定するとビルドが弾かれる。
既存の `nlx eas ...`（= 常に最新を取得）のままにする。

### Vercel CLI — 導入しない

既存方針どおり（`devenv.nix` のコメント）。CLI のバグ回避のため REST API を curl で直叩きしている。

---

## 4. 出典

- [Stripe CLI](https://docs.stripe.com/stripe-cli) / [stripe/ai](https://github.com/stripe/ai)
- [Resend CLI](https://resend.com/docs/cli) / [resend/resend-cli](https://github.com/resend/resend-cli)
- [Sentry CLI](https://docs.sentry.io/cli/) / [getsentry/sentry-for-ai](https://github.com/getsentry/sentry-for-ai) / [skills.sentry.dev](https://skills.sentry.dev)
- [LiveKit CLI](https://docs.livekit.io/home/cli/cli-setup/)
- [Adapty Developer CLI](https://adapty.io/docs/developer-cli) / [adaptyteam/adapty-cli](https://github.com/adaptyteam/adapty-cli)
- [RevenueCat AI Toolkit](https://github.com/RevenueCat/ai-toolkit) / [RevenueCat MCP Server Setup](https://www.revenuecat.com/docs/tools/mcp/setup)
- [OneSignal/cli](https://github.com/OneSignal/cli)
- [eas-cli (npm)](https://www.npmjs.com/package/eas-cli)
