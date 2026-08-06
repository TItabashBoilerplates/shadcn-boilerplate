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
| **LiveKit**（RTC） | ✅ `lk` | ✅ `livekit-cli` 2.16.2 | `packages` に追加 | 公式 Skill なし → **自作 `.claude/skills/livekit/`** |
| **Adapty**（モバイル課金） | ✅ `adapty`（npm `adapty`） | ❌ | `scripts.adapty` = `bunx adapty` | **`adapty-cli`** を追加 |
| **fal.ai**（生成 AI 推論） | ✅ `fal`（PyPI `fal`） | ❌ | `scripts.fal` = `uvx fal` | 公式 Skill なし → **自作 `.claude/skills/fal/`**（MCP は `.mcp.json` に導入済み） |
| **RevenueCat**（モバイル課金） | ❌ 公式 CLI なし（MCP を提供） | ❌ | CLI は導入しない | **`revenuecat` 他 9 種**を追加 |
| **OneSignal**（プッシュ通知） | ⚠️ beta / 用途不一致 | ❌ | **導入しない**（§3） | 公式 Skill なし → **自作 `.claude/skills/onesignal/`** |
| **Expo EAS** | ✅ `eas`（npm `eas-cli`） | ⚠️ 18.7.0（npm は 21.6.0） | **nix で固定しない**・`nlx eas-cli`（§3） | `expo/skills` 各種（導入済み） |
| **Vercel** | ✅ `vercel` | ❌ | `scripts.vercel` = `bunx vercel`（**日常運用のみ**。provisioning は REST API のまま） | `vercel-*` skills（導入済み） |
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
| `fal` | `uvx fal` | PyPI パッケージ名も コマンド名も `fal`（1.79.1）。**Python 製なので bunx ではなく uvx**。**CLI の認証は `fal auth login`（Auth0 device flow の OAuth）**で、`fal_client` / `fal-ai` MCP が使う API キー `FAL_KEY` とは別系統（後述の罠あり） |
| `vercel` | `bunx vercel` | **日常運用専用**（logs / env pull / inspect / 手動 deploy）。provisioning は引き続き REST API（§3）。CLI は実行ディレクトリに依存するので script 内で `cd` しない |

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

### 2.4 自作 Skill（公式 Skill が存在しないサービス）

公式 Skill が無い 3 サービスは `.claude/skills/` 直下に自作した（`skills-lock.json` 管理外）。

| skill | 根拠にしたもの | 核になっている判断 |
|---|---|---|
| `onesignal` | **本リポジトリの既存実装**（`supabase/functions/shared/onesignal/`、`onesignal-send`、`onesignal-webhooks`、`frontend/packages/onesignal`、`OneSignalInitializer.tsx`）を読んで記述 | `external_id` = Supabase `auth.users.id` に揃える設計が背骨。クライアントのメソッドは 5 つだけ／`sendToUsers` は 2,000 件上限／Webhook は署名ではなく共有シークレット検証／Provider が SSR 対策で mount 前 `null` を返す、といった**実装を読まないと分からない事実**を明文化した |
| `livekit` | 公式ドキュメント + Context7（`livekit.api.AccessToken().with_identity().with_grants(VideoGrants(...)).to_jwt()` / `api.LiveKitAPI(...)`）。**実装コードはまだ無い** | **トークン発行は API Secret 署名なのでサーバ側限定**。`NEXT_PUBLIC_`/`EXPO_PUBLIC_` を付けてよいのは `LIVEKIT_URL` だけ。トークン発行・room 操作は Edge Function、音声 AI エージェントだけが backend-py（supabase-first のエスカレーション条件に該当） |
| `fal` | 公式ドキュメント + Context7（`fal_client` の `subscribe` / `submit` / `run` / `stream`、`webhook_url`、`fal auth login` / `fal keys create --scope {ADMIN,API}` / 資格情報の優先順位）。**実装コードはまだ無い** | `FAL_KEY` は課金直結なのでサーバ経由が既定。**「待たせるか投げっぱなしか」で Edge Function / backend-py が決まる**。加えて**認証 2 系統の罠**（下記） |

#### fal の認証は 2 系統 — devenv 固有の罠がある

当初「CLI の認証は `fal auth login` か `FAL_KEY`」と並列に書いていたが、これは不正確だった。

| 経路 | 資格情報 |
|---|---|
| `fal_client`（アプリコード） | **API キー** `FAL_KEY`（`key_id:key_secret` 形式） |
| `fal-ai` MCP | **同じく API キー**（`.mcp.json` が `Authorization: Bearer ${FAL_KEY}` で送る静的トークン） |
| **`fal` CLI** | **OAuth**（Auth0 device authorization flow / RFC 8628）。`fal auth login` → GitHub / Google / SSO。資格情報はローカル保存で他マシンへ持ち出せない |
| `fal` CLI（CI） | **ADMIN スコープ**の API キー（`fal keys create --scope ADMIN`）。CI はブラウザが無いので OAuth 不可 |

**罠**: fal の資格情報解決には優先順位があり、**`FAL_KEY` が env にあると `fal auth login` の OAuth トークンより優先される**
（`FAL_FORCE_AUTH_BY_USER=1` のときだけ逆転）。本リポジトリは `devenv shell` 進入時に `loadDopplerByEnv` が
**Doppler のシークレットを丸ごと env へ export する**ため、Doppler に `FAL_KEY` を置くと
**devenv shell 内では `fal auth login` 済みでも常にその API キーで動く**。
`fal deploy` が権限エラーになる（API スコープのキーでは deploy できない）、意図しない principal で動く、といった形で出る。

対処は `FAL_FORCE_AUTH_BY_USER=1 fal ...` / `env -u FAL_KEY fal ...` / `fal profile`。
また **アプリ用（API スコープ）と CI 用（ADMIN スコープ）を 1 つの `FAL_KEY` で兼ねない**
（ADMIN キーはアカウント全体を操作できるのでランタイムへ配らない。CI 用は `FAL_ADMIN_KEY` 等の別名にする）。
詳細は `.claude/skills/fal/SKILL.md` §3。

いずれも「一般論のコピー」ではなく、**このリポジトリのルール
（supabase-first のエスカレーション判断 / env-naming の予約 prefix / mcp-doppler の値非露出 /
python-monorepo の `--package` と import shadow / error-handling / ui-testing）に接続した形**で書いてある。
`.claude/rules/skills-first.md` のトリガー表と `.claude/CLAUDE.md` の Skill ツリーにも登録済み。

> 📌 `onesignal` skill の執筆中に「`supabase/config.toml` が無い」ことを不備として一度報告したが、
> **これは誤り。本リポジトリは boilerplate なので config.toml は不要**というのがオーナーの方針。
> `.claude/rules/supabase-config.md` は**この boilerplate から派生した実プロジェクト**に適用されるルールで、
> `project_id` / `[remotes.*]` は派生先ごとに異なるため boilerplate 本体には置けない。
> 同じ誤報告が繰り返されないよう、`.claude/rules/supabase-config.md` §0 に適用範囲を明記した。

---

## 3. 導入しなかったもの（理由つき）

### OneSignal CLI — 導入しない（**REST API 連携は現状のままが正**）

まず前提として、**Edge Functions から OneSignal REST API を呼ぶ現状の実装
（`supabase/functions/onesignal-send` / `onesignal-webhooks` / `shared/onesignal`）は正しい**。
`.claude/rules/supabase-first.md` の「バックエンド処理の既定は Edge Functions」と
「外部 API 連携（単発・短時間で完結するもの）」にそのまま合致する。
`.claude/rules/mcp-supabase.md` が禁止しているのは **エージェントが Supabase インフラを
調査・操作するときに Bash で `curl` / `psql` を叩くこと**であって、アプリケーションコードから
外部 SaaS の REST API を呼ぶことではない（同ルールが冒頭で明示的に対象外としている）。

そのうえで `OneSignal/cli` を入れないのは、**CLI 側に本リポジトリで使える機能が無い**ため:

- **Ruby gem / Homebrew 配布**（`brew tap OneSignal/cli`）で nix にも npm にも無い
- **macOS のみ公式サポート**（Linux / CI では動かない）
- **Beta** 扱い
- 機能が `onesignal install-sdk`（iOS / Android **ネイティブプロジェクト**への SDK 追加）に
  限られ、**React Native / Expo は非対応**。通知の送信・セグメント操作・テンプレート管理といった
  運用コマンドは持っていないので、REST API を置き換えられない

公式 Agent Skill も存在しない。OneSignal の運用が増えたら
`.claude/skills/` 配下に独自 Skill を書くのが現実的（`skills-lock.json` 管理外）。

### RevenueCat CLI — 存在しない

RevenueCat は CLI を出しておらず、代わりに **公式 MCP サーバ**（`https://mcp.revenuecat.ai/mcp`）と
AI Toolkit（Skill 群）を提供している。検索で出てくる `revcat` / `rc-cli` / `revenuecat-cli` は
いずれも**サードパーティ製**なので採用しない。

> RevenueCat を実際に導入する段になったら、`.mcp.json` に MCP サーバを追加して `mcp-sync` を流す。
> `revenuecat-troubleshoot` / `integrate-revenuecat` skill は MCP がある前提で書かれている。

### Expo EAS CLI — nix でも devDependency でも固定しない（**バージョン pin は `eas.json`**）

`pkgs.eas-cli` は **18.7.0** だが npm の最新は **21.6.0**（メジャー 3 つ遅れ）。
EAS はクラウド側 API との組み合わせで動くため、古い CLI を固定するとビルドが弾かれる。

「では package.json の devDependencies に入れて lockfile で固定すれば？」も **公式が明確に非推奨**:

> Installing `eas-cli` into project dependencies is strongly discouraged because it can cause
> dependency conflicts that are difficult to debug.
> — [EAS CLI reference](https://docs.expo.dev/eas/cli/)

公式が用意している pin の正規経路は **`eas.json` の `cli.version`**（例 `">=21.0.0"`）で、
これなら CI 再現性を確保しつつ CLI 本体は最新パッチを取れる。
→ よって `nlx eas-cli ...`（= 常に最新を取得）+ `eas.json` の `cli.version` が正しい組み合わせ。
本リポジトリは `frontend/apps/mobile/eas.json` を**まだ作っていない**（ビルドプロファイルは
プロジェクト固有のため）。EAS ビルドを実際に使う段階で `cli.version` ごと作成すること。

#### ⚠️ 併せて修正したバグ: `nlx eas` → `nlx eas-cli`

npm パッケージ名は **`eas-cli`**（bin 名が `eas`）。`nlx eas` と書くと bunx は
npm 上の**無関係な `eas` パッケージ**（"Embedded Async Simple Javascript templating" v0.1.0 /
bin 無し）を解決してしまい、EAS ビルドが起動しない。
`build-mobile-ios` / `build-mobile-android` / `build-mobile-android-local` の 3 script を修正した。

### Vercel CLI — provisioning には使わない（日常運用向けには導入する）

`scripts/infra/vercel.sh` が REST API を直叩きしているのは、**CLI 全般が使えないからではなく
プロビジョニング固有の 2 点**が理由:

1. `vercel env add <name> preview` が `--yes` / `--force` / `--non-interactive` を付けても
   git branch を対話で聞いてくる（[vercel/vercel#15763](https://github.com/vercel/vercel/issues/15763)、
   2026-08 時点 **open**。CLI 50.37.3 で報告、公式 issue 上の回避策も「REST API を使う」）
2. `rootDirectory` を設定する CLI フラグが無い

逆に `vercel logs` / `vercel env pull` / `vercel inspect` / `vercel microfrontends pull` /
手動 deploy といった**日常運用は CLI のほうが素直**で、`frontend/README.md` も CLI 手順を
載せていた（`bun add -g vercel` によるグローバル導入）。nixpkgs に derivation が無いので
`scripts.vercel` = `bunx vercel` として提供し、グローバルインストール手順を置き換えた。
provisioning が REST API のままである点は変更していない。

---

## 4. 出典

- [Stripe CLI](https://docs.stripe.com/stripe-cli) / [stripe/ai](https://github.com/stripe/ai)
- [Resend CLI](https://resend.com/docs/cli) / [resend/resend-cli](https://github.com/resend/resend-cli)
- [Sentry CLI](https://docs.sentry.io/cli/) / [getsentry/sentry-for-ai](https://github.com/getsentry/sentry-for-ai) / [skills.sentry.dev](https://skills.sentry.dev)
- [LiveKit CLI](https://docs.livekit.io/home/cli/cli-setup/)
- [Adapty Developer CLI](https://adapty.io/docs/developer-cli) / [adaptyteam/adapty-cli](https://github.com/adaptyteam/adapty-cli)
- [RevenueCat AI Toolkit](https://github.com/RevenueCat/ai-toolkit) / [RevenueCat MCP Server Setup](https://www.revenuecat.com/docs/tools/mcp/setup)
- [OneSignal/cli](https://github.com/OneSignal/cli)
- [eas-cli (npm)](https://www.npmjs.com/package/eas-cli) / [EAS CLI reference](https://docs.expo.dev/eas/cli/) / [eas.json reference](https://docs.expo.dev/eas/json/)
- [vercel/vercel#15763](https://github.com/vercel/vercel/issues/15763)（preview env の対話プロンプト、open）
- fal: [CLI `fal auth`](https://fal.ai/docs/api-reference/cli/auth) / [`fal keys`](https://fal.ai/docs/api-reference/cli/keys) / [`fal profile`](https://fal.ai/docs/api-reference/cli/profile) / [Installation & Authentication](https://docs.fal.ai/serverless/getting-started/installation) / [Authentication and Credentials（資格情報の優先順位）](https://deepwiki.com/fal-ai/fal/3.3-authentication-and-credentials)
