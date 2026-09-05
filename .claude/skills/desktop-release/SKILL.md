---
name: desktop-release
description: デスクトップアプリ（Tauri / frontend/apps/desktop）を Web 経由で配布し、配布済みアプリを自動更新するための手順。ビルド → macOS 署名/公証 → Supabase Storage へのアップロード → latest.json の公開（GitHub Actions desktop-release.yml）と、tauri-plugin-updater による自動更新の配線を扱う。「デスクトップアプリを配布したい」「dmg / exe を配りたい」「インストーラを作って」「自動更新を入れたい」「アップデート通知」「バージョンを上げてリリース」「ダウンロードページ」「署名 / 公証 / notarize」「SmartScreen の警告」「更新が届かない」「配布済みアプリを更新できない」「desktop-release」「desktop-updater-keygen」といった話題が出たら、ユーザーが Tauri の名前を出していなくても必ず最初に起動すること。**鍵と endpoint は永続で、間違えると配布済みアプリが二度と更新できなくなる**ため、推測で進めてはならない領域。
---

# デスクトップ配布 + 自動更新（Tauri v2）

**手順の正本は [`docs/desktop/release-runbook.md`](../../../docs/desktop/release-runbook.md)。**
このスキルは「エージェントが何を、どの順で、どう判断してやるか」を定める。
実装そのもの（Rust コマンド / capabilities / CSP / Vite との配線）は `tauri` スキル。

---

## 0. 最初に確認する 3 つ

| # | 確認 | どこを見る | 未了ならどうする |
|---|---|---|---|
| 1 | `PROJECT.md` の `mode` | frontmatter | **`boilerplate` なら配布先も証明書も無いのが正しい**。「設定が無い」を不備として報告しない。§1 は `mode: product` にしてから |
| 2 | `distribution` にデスクトップが含まれるか | `PROJECT.md` | 決まっていないなら**ユーザーに確認**（配布するかどうかはプロダクトの判断） |
| 3 | 一度きりの準備が済んでいるか | 下の §1 のチェック | 済んでいないものから順に。**飛ばして `desktop-release` を叩かない** |

```bash
# 準備の進み具合を機械的に見る（値は出さない）
node -p 'JSON.parse(require("fs").readFileSync("frontend/apps/desktop/src-tauri/tauri.conf.json","utf8")).plugins?.updater?.endpoints?.[0] ?? "(未設定)"'
grep -q '\[storage.buckets.releases\]' supabase/config.toml && echo "bucket: 宣言あり" || echo "bucket: 未宣言"
gh secret list --app actions | grep -E 'TAURI_SIGNING_PRIVATE_KEY|APPLE_' || echo "signing secrets: 未配線"
```

---

## 1. 一度きりの準備（順序が意味を持つ）

**この順でやる。** 3 は 2 に依存し（バケットが無いと最初のアップロードで落ちる）、
5 は 3 と同じ script を再利用する。

| # | やること | コマンド / 編集先 |
|---|---|---|
| 1 | **identity を決める** — `productName` / `identifier`（逆ドメイン）/ ウィンドウ `title`、`version` を 3 か所一致 | `src-tauri/tauri.conf.json` / `package.json` / `src-tauri/Cargo.toml` |
| 2 | **`releases` バケットを作る**（public / 1GiB） | `supabase/config.toml` に `[storage.buckets.releases]` → `ENV=production devenv tasks run -P production deploy:buckets` |
| 3 | **自動更新の鍵と endpoint を配線** | `desktop-updater-keygen --supabase-url https://<ref>.supabase.co` → 出力された `tauri.conf.json` を**コミット** |
| 4 | **Storage への書き込み資格情報** | Doppler `<app>/prd` に `SB_URL` / `SB_SECRET_KEY`（doppler MCP。値は表示しない） |
| 5 | **Apple の署名・公証**（macOS を配るなら） | Doppler `all/all` に `APPLE_*` 6 キー → `desktop-wire-signing` |

### エージェントがやってよいこと / ユーザーに任せること

| | |
|---|---|
| **やってよい** | `tauri.conf.json` 等の編集、`supabase/config.toml` への宣言追加、Doppler へのキー投入（**doppler MCP 経由・フェーズ制に従う**）、`desktop-release` の起動 |
| **必ずユーザーに任せる** | **Apple Developer Program での証明書発行**（API では不可。Web / Xcode のみ・Account Holder 限定）、**証明書の .p12 書き出しとパスワード**、Windows のコード署名証明書の契約 |
| **絶対にやらない** | `desktop-updater-keygen --force`（明示的な承認なし）、endpoint の変更（同上）、証明書の revoke |

---

## 2. リリースの回し方

```bash
# 1. version を上げる（3 か所一致。policy test が検査する）
#    frontend/apps/desktop/src-tauri/tauri.conf.json  ← ここが正本
#    frontend/apps/desktop/package.json
#    frontend/apps/desktop/src-tauri/Cargo.toml

# 2. main へマージ → 自動で走る（gate が公開済み latest.json と比べる）

# 3. 手動で走らせる（初回 / 同じ版の再実行 / 障害復旧）
desktop-release
gh run watch
```

**完了報告は「workflow が緑」で終わらせない。** 次の 3 つを確認してから完了と言う:

1. `/download` の「最新版 vX.Y.Z」が上がっている（= latest.json が公開できた）
2. 安定 URL が新しいバイナリを返す（**CDN 伝播は最大 60 秒**。焦って 404 と誤認しない）
3. 旧版を起動して右下に更新通知が出る（自動更新の経路が生きている）

---

## 3. 絶対に壊してはいけない不変条件

**すべて「壊してもビルド・型・lint・テストが通る」。** 気づけるのは配布したあと。
`frontend/apps/desktop/src/shared/config/desktop.policy.test.ts` が機械的に守っている
（**このテストを消す・スキップするのは却下**）。

| # | 不変条件 | 外すと |
|---|---|---|
| 1 | **updater の秘密鍵は永続** | 変えると**配布済みアプリは以後の更新を検証できない**（手動で入れ直してもらうしかない） |
| 2 | **endpoint も永続** | 配布済みアプリはその URL しか見ない。変えると旧版は永久に更新されない |
| 3 | **version は 3 か所一致 + リリースごとに上げる** | semver 比較なので「同じ版」= 更新扱いにならない |
| 4 | **`createUpdaterArtifacts` は CI 専用 overlay**（`tauri.release.conf.json`） | base に書くと秘密鍵の無いローカル `--build` が落ちる |
| 5 | **capability に `updater:default` / `process:default`** | 確認も再起動もできない（**エラーは出ない**） |
| 6 | **Rust 側の `.plugin()` 登録** | Cargo に入れただけでは動かない |
| 7 | **定期確認（`UPDATE_CHECK_INTERVAL_MS`）を消さない** | 開きっぱなしのアプリに次の起動まで届かない |
| 8 | **`<UpdateBanner />` をルートに置く** | feature を作っても誰にも通知が出ない |
| 9 | **CI の guard step を外さない** | 署名 env が無くても `tauri build` は**未署名のまま成功**する |
| 10 | **`latest.json` は両 OS 揃ってから公開** | 片方の OS だけ更新が止まる（`buildUpdaterManifest` が落として防いでいる） |

---

## 4. 「更新が届かない」の切り分け（エラーが出ない不具合）

上から順に潰す。**どれもエラーログが出ない**ので、推測で 1 つだけ直して終わりにしない。

```bash
# ① 公開されている版は？（アプリが読むのと同じ URL）
curl -s "$(node -p 'JSON.parse(require("fs").readFileSync("frontend/apps/desktop/src-tauri/tauri.conf.json","utf8")).plugins.updater.endpoints[0]')" | head -20

# ② アプリ側の版は？（3 か所一致しているか）
node -p 'JSON.parse(require("fs").readFileSync("frontend/apps/desktop/src-tauri/tauri.conf.json","utf8")).version'
node -p 'require("./frontend/apps/desktop/package.json").version'
grep -m1 '^version' frontend/apps/desktop/src-tauri/Cargo.toml
```

| 見えたもの | 原因 |
|---|---|
| latest.json の `version` が上がっていない | リリースが走っていない / gate が「配布済み」と判断した |
| `platforms` に片方の OS しか無い | ありえない（`publish-manifest` が落とすはず）。手で書き換えていないか |
| version は正しいのに通知が出ない | ③ 公開鍵と秘密鍵が対応していない（`--force` で鍵を作り直した？）④ 開発ビルドで動かしている（`shouldCheckForUpdates` が false）⑤ endpoint が別のプロジェクトを指している |
| ダウンロードは始まるがインストールで失敗 | 署名検証に落ちている（③ と同じ）／ Windows で SmartScreen に止められている |

---

## 5. 変更を加えるときの判断

| やりたいこと | どうする |
|---|---|
| **Intel Mac も配りたい** | 3 か所: workflow の matrix に `x86_64-apple-darwin` / `release-paths.mjs` の `LATEST_ARTIFACT_NAMES` に `darwin-x64` と `classifyArtifact` の `_x64.dmg` / Web の `downloadLinks.ts`（テストが教えてくれる） |
| **Linux も配りたい** | 同上 + AppImage / deb の targets。**updater の platform key（`linux-x86_64`）を `UPDATER_PLATFORMS` に足すと、揃うまで latest.json が公開されなくなる**ので、workflow の matrix を先に足す |
| **Windows を署名したい** | Azure Trusted Signing 等を契約 → `tauri.windows.conf.json` に設定を足すだけ（インストーラ形式・配布経路の変更は不要） |
| **配布先を Cloudflare R2 等へ移したい** | **endpoint が変わる = 配布済みアプリが更新不能になる**。移行はユーザーに確認し、移行期間は旧 endpoint も生かす |
| **sidecar（externalBin）を足す** | macOS の hardened runtime で `bundle.macOS.entitlements` が要る（bun compile なら JIT 系 5 キー）。Tauri はこの plist を**メインと sidecar の両方**に適用する。**開発ビルドでは再現しない**ので、署名済み実機で必ず確認する |
| **デスクトップからバックエンドを呼ぶ** | `vite.config.ts` の `define` に `NEXT_PUBLIC_*` を足す。**CI の guard step は `vite.config.ts` に `NEXT_PUBLIC_` があるかで自動的に効き始める**（本番値が空 / localhost なら落ちる） |

---

## 6. 関連

| 参照先 | 何が書いてあるか |
|---|---|
| `docs/desktop/release-runbook.md` | **手順の正本**（全体像・一度きりの準備・トラブルシューティング・コスト） |
| `.claude/skills/tauri/` | Tauri 本体の実装（IPC / capabilities / CSP / Vite / Linux 依存） |
| `scripts/desktop/release-paths.mjs` | 配布物のパス規約の**正本**（Web / CI / テストが共有） |
| `.claude/rules/env-naming.md` | `SB_URL` / `SB_SECRET_KEY` にしている理由（`SUPABASE_` は Doppler の予約 prefix） |
| `.claude/rules/mcp-doppler.md` | シークレット投入はフェーズ制・値をログに出さない |
| `.claude/rules/supabase-config.md` | `releases` バケットは `config.toml` が正本 |
| `.claude/rules/ui-testing.md` | 更新通知の UI は Storybook（Apps/Desktop/Features） |
