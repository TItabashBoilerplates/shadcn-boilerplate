# デスクトップアプリ リリース runbook（Web 配布 + 自動更新）

**これが正本。** デスクトップ（Tauri / `frontend/apps/desktop`）を Windows / macOS 向けに
Web 経由で配布し、配布済みアプリを自動更新するための配線と手順。

> **`mode: boilerplate` の間**（`PROJECT.md`）は、配布先の Supabase project も
> 署名証明書も**まだ無い**のが正しい状態。仕組みだけ入っていて、§2 の一度きりの準備を
> 通した時点で動き始める。`desktop.policy.test.ts` の「プロダクト固有の値」の検査も
> `mode: product` から有効になる。

## 全体像

```
main への push で tauri.conf.json の version が上がったとき（自動）
  / gh workflow run desktop-release.yml（= devenv script `desktop-release`。手動）
  └ .github/workflows/desktop-release.yml（gate → matrix 2 本 → publish-manifest）
      ├ macos-apple-silicon … aarch64 DMG。Developer ID 署名 + 公証 + staple
      └ windows-x64         … NSIS -setup.exe（既定は未署名）
          ↓ それぞれ scripts/desktop/upload-release.mjs
      Supabase Storage public バケット `releases`
          ├ desktop/v<version>/<成果物名>   … 不変（過去版の保全 + updater の payload）
          └ desktop/latest/<固定名>         … 安定 URL（upsert。Web が指す）
          ↓ 最後に scripts/desktop/publish-manifest.mjs
      desktop/latest/latest.json（両 OS の署名を束ねたもの）
          ├→ https://<app>/download（apps/web の公開ページ。リリースごとの再デプロイ不要）
          └→ 配布済みアプリの tauri-plugin-updater（起動時 + 1 時間ごと）
```

- **GitHub Releases を使わない理由**: リポジトリが private だと Release のダウンロード URL は
  未認証ユーザーに公開されない。public バケットには**ビルド済みインストーラだけ**を置く
  （ソースは何も公開されない）。
- **パス規約の正本は `scripts/desktop/release-paths.mjs`**。Web 側
  （`apps/web/src/views/download/model/downloadLinks.ts`）との一致は単体テストが固定している。
- **macOS は既定で Apple Silicon（aarch64）のみ**。Intel Mac も配るなら 3 か所だけ変える:
  workflow の matrix / `release-paths.mjs` の `LATEST_ARTIFACT_NAMES` と `classifyArtifact` /
  Web 側の定数（テストが教えてくれる）。universal 1 本にしないのは、arch ぶんダウンロードが
  重くなるうえ sidecar を持つと lipo 手順が増えるため。

## 1. リリース手順（準備が済んだあと）

1. **バージョンを上げる**: `frontend/apps/desktop/src-tauri/tauri.conf.json` の `version`。
   **`package.json` と `src-tauri/Cargo.toml` の `version` も同じ値に揃える**
   （`desktop.policy.test.ts` が一致を検査する。ズレると更新が届かない）。
2. PR → main へマージ。**マージで自動的にリリースが走る**（gate job が公開済み latest.json の
   version と比べ、上がっていれば build。同じ版なら何もしない）。
3. 手動で走らせるとき（**初回の配布** / 同じ版の再実行 / 障害時の復旧）: `desktop-release`
   （= `gh workflow run desktop-release.yml --ref main`。version を見ずに走る）。
   3 job 合計 15〜30 分（公証の待ちを含む）。
4. **確認**:
   - workflow が 3 job とも緑（macOS job は `stapler validate` / `spctl --assess` まで通っている）
   - ダウンロード URL が新しいバイナリを返す。**latest/ の CDN 伝播は最大 60 秒**
     （Supabase の Smart CDN。焦って 404 / 旧版と誤認しない）
   - `/download` の「最新版 vX.Y.Z」が上がっている（= latest.json が公開できている）
   - 配布済みの旧版を起動して、右下に更新通知が出る

安定 URL（`<SUPABASE_URL>` = 本番プロジェクトの URL、`<Product>` = `tauri.conf.json` の `productName`）:

```
<SUPABASE_URL>/storage/v1/object/public/releases/desktop/latest/<Product>-apple-silicon.dmg
<SUPABASE_URL>/storage/v1/object/public/releases/desktop/latest/<Product>-setup.exe
<SUPABASE_URL>/storage/v1/object/public/releases/desktop/latest/latest.json
```

## 2. 一度きりの準備（`mode: product` にしたら順にやる）

| # | 何 | どうやって | 無いとどうなるか |
|---|---|---|---|
| 1 | **アプリの identity を決める** | `tauri.conf.json` の `productName` / `identifier`（逆ドメイン）/ ウィンドウ `title`。`package.json` と `Cargo.toml` の `version` も揃える | 「App」という名前と `com.example.*` で配布される。**identifier は後から変えるとインストール済みアプリと別物になる** |
| 2 | **`releases` バケット**（public / 1GiB） | `supabase/config.toml` に下記を書き → `ENV=production devenv tasks run -P production deploy:buckets` | アップロードが `Bucket not found` で落ちる |
| 3 | **自動更新の鍵と endpoint** | `desktop-updater-keygen --supabase-url https://<ref>.supabase.co`（Doppler `all/all` に鍵を保管 → GitHub Repository secret → `tauri.conf.json` に公開鍵と endpoint を焼く）。**出力された `tauri.conf.json` をコミットする** | 署名付き payload を作れず CI が落ちる。endpoint が無ければ gate job も落ちる |
| 4 | **Storage への書き込み資格情報** | Doppler `<app>/prd` に **`SB_URL` / `SB_SECRET_KEY`**（= Supabase の secret key）を入れる。Doppler → GitHub Environment `production` の既存 sync が届ける。`SUPABASE_PROJECT_REF` は Terraform が Environment **variable** に書く | アップロード step が「ペアが必要です」で落ちる |
| 5 | **Apple の署名・公証**（macOS を配るなら） | Developer ID Application 証明書（.p12）と ASC API キーを Doppler `all/all` に入れ、`desktop-wire-signing` を実行 | macOS job が guard step で止まる（**止めないと未署名のまま成功してしまう**ため意図的） |
| 6 | **Windows の署名**（任意） | Azure Trusted Signing 等を契約し `tauri.windows.conf.json` に設定を足す | SmartScreen の警告が出る（`/download` に案内あり） |

### 2-1. `supabase/config.toml` の宣言（#2）

```toml
# デスクトップアプリ（Tauri）の配布物（.dmg / .exe / latest.json）。Web からの直接
# ダウンロードで配るため **意図的に public**（`.claude/rules/supabase-first.md` の例外 2）。
# 書き込みは CI が secret key で行い、匿名からは読み取りのみ
# （public バケットでも INSERT には RLS ポリシーが要るため、追加ポリシー無し = 読み取り専用）。
# パス規約は scripts/desktop/release-paths.mjs が正本。
[storage.buckets.releases]
public = true
file_size_limit = "1GiB"
```

### 2-2. Doppler に入れるキー（#4 / #5）

| config | キー | 使うところ |
|---|---|---|
| `<app>/prd` | `SB_URL` / `SB_SECRET_KEY` | CI から Storage へ書き込む。**`SUPABASE_` prefix は Doppler の予約 prefix に当たるので `SB_` で持つ**（`.claude/rules/env-naming.md`） |
| `all/all` | `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PUBLIC_KEY` | 自動更新の署名（`desktop-updater-keygen` が登録） |
| `all/all` | `APPLE_CERTIFICATE`（base64 .p12）/ `APPLE_CERTIFICATE_PASSWORD` / `APPLE_SIGNING_IDENTITY` / `APPLE_API_KEY` / `APPLE_API_ISSUER` / `APPLE_API_KEY_P8` | macOS の署名と公証 |

**証明書の API 発行はできない**（Apple 公式: Developer ID は Web / Xcode のみ・Account Holder 限定）。
期限 5 年。**失効させると配布済みアプリが全ユーザーで起動不能になるので revoke しない。**

## 3. 自動更新（tauri-plugin-updater）

インストール済みのアプリは**起動時と 1 時間ごとに** `desktop/latest/latest.json` を読み、
自分より新しい版があれば右下に通知を出す（`features/app-update`）。ユーザーが
「更新して再起動」を押すと、署名付き payload をダウンロード → 公開鍵で検証 →
インストール → 再起動する。**勝手には入れ替えない**（作業中の内容を飛ばさないため）。

デスクトップアプリは開きっぱなしで使われるので、**起動時 1 回だけの確認では配信が届かない**
（次に立ち上げ直すまで気づけない）。間隔は `UPDATE_CHECK_INTERVAL_MS`。
「あとで」で閉じた版はそのセッションでは出し直さず、より新しい版が出れば再び通知する。

| 部品 | 場所 |
|---|---|
| endpoint / 公開鍵 / Windows の installMode | `src-tauri/tauri.conf.json` の `plugins.updater` |
| 署名付き payload の生成（CI だけ） | `src-tauri/tauri.release.conf.json`（`createUpdaterArtifacts: true`。`--config` で重ねる） |
| 秘密鍵 | Doppler `all/all` の `TAURI_SIGNING_PRIVATE_KEY` → `desktop-wire-signing` で Repository secret へ |
| payload のアップロードと断片 | `scripts/desktop/upload-release.mjs --platform … --manifest-out …`（OS ごとの job） |
| `latest.json` の公開 | `scripts/desktop/publish-manifest.mjs`（両 OS の断片を束ねる最終 job） |
| UI | `frontend/apps/desktop/src/features/app-update/`（Storybook: Apps/Desktop/Features） |
| 配線の検査 | `src/shared/config/desktop.policy.test.ts`「自動更新」 |

**守ること:**

- **秘密鍵は永続。** 公開鍵が配布物に焼き込まれているので、鍵を変えると配布済みアプリは
  以後の更新を検証できない（手動で入れ直してもらうしかない）。`desktop-updater-keygen` は
  登録済みなら再生成しない。`--force` は事故時だけ。
- **endpoint も永続。** 配布済みアプリはその URL しか見ない。配布先を変えると旧版は
  永久に更新されなくなる（`desktop-updater-keygen` は変更時に確認を出す）。
- **リリースごとに `version` を上げる**（3 か所一致）。同じ版は更新扱いにならない。
- **updater を入れる前に配った版には届かない。** その利用者は `/download` から一度だけ入れ直す。
- Windows が未署名のままなら、updater がインストーラを起動するときも SmartScreen の警告は出る。
- `latest.json` は両 OS 分が揃わないと公開されない（`buildUpdaterManifest` が落とす）。
  片方の job が失敗したら `publish-manifest` も走らず、前の版の manifest が残る（安全側）。

## 4. ローカルでの確認

```bash
dev-desktop                 # Vite だけ（ブラウザで UI を見る。Rust 不要）
desktop-run                 # ネイティブウィンドウ（既定は本番バックエンド）
desktop-run --env local     # ローカル Supabase / backend に向ける
desktop-run --build         # 配布物を作る（**署名も公証もしない**。動作確認用）
```

`--build` に `tauri.release.conf.json` を掛けていないのは意図的で、
**秘密鍵を持たないローカルでビルドが落ちないようにするため**。
署名付きの成果物が要るなら CI（`desktop-release`）で作る。

## 5. トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| gate job が「公開済みの latest.json を読めません」で落ちる | まだ一度も公開していない（初回）か Storage の障害。**初回と復旧は `desktop-release`（手動実行）**で走らせる |
| gate job が「endpoint が未設定」で落ちる | `desktop-updater-keygen --supabase-url …` を実行していない（§2 の #3） |
| macOS job が guard step で落ちる | `APPLE_*` Repository secrets が無い → `desktop-wire-signing` |
| 公証が `Invalid` で落ちる | `xcrun notarytool log <submission-id>` で理由を見る |
| アップロードが `Bucket not found` | `releases` バケット未作成（§2 の #2） |
| アップロードが 403 `Invalid Compact JWS` | 新形式キー（`sb_secret_…`）は JWT ではない。`storage.mjs` は `apikey` ヘッダを併送しているので、落ちるならキーそのものを確認する |
| ダウンロードが 404 | パス規約のズレ（`downloadLinks.test.ts` / `release-paths.test.ts` が落ちていないか） |
| latest が旧版を返す | Smart CDN の伝播待ち（≤60 秒）。超えて続くなら upload step のログを確認 |
| 更新通知が出ない | ① version を上げ忘れ ② endpoint が違う ③ 公開鍵と秘密鍵が対応していない ④ 開発ビルド（`shouldCheckForUpdates` が false）。いずれも**エラーが出ない**ので順に潰す |
| 配布物がローカル Supabase を向いている | ビルド時の `NEXT_PUBLIC_*` が焼き込まれる。workflow の guard step が止めるはずなので、guard を外していないか確認 |
| **署名済みビルドでだけ**アプリが起動しない | sidecar（`externalBin`）を足したなら hardened runtime の entitlements が要る。`bundle.macOS.entitlements` に plist を配線する（Tauri はこの plist を**メインと sidecar の両方**に適用して署名する）。開発ビルドでは hardened runtime が無いので**再現しない** |

## 6. コストの目安

配布は Supabase の egress 課金（Pro: cached 250GB/月 込み、超過 $0.03/GB）。
DMG 約 60MB × 1,000 DL/月 ≒ 60GB。ダウンロード数が数千/月を超えたら
egress 無料の置き場（Cloudflare R2 等）への移行を検討する。
**移行するときは endpoint が変わる**ので §3 の「endpoint も永続」を読むこと。

## 参考

- [Tauri: Updater plugin](https://v2.tauri.app/plugin/updater/) — 静的 JSON マニフェストの形式・`createUpdaterArtifacts`
- [Tauri: Code signing (macOS)](https://v2.tauri.app/distribute/sign/macos/) — `APPLE_*` env / notarytool
- [Tauri: Code signing (Windows)](https://v2.tauri.app/distribute/sign/windows/)
- [Supabase: Storage](https://supabase.com/docs/guides/storage) — public バケットのオブジェクト URL / `?download=`
- `.claude/skills/tauri/` / `.claude/rules/env-naming.md` / `.claude/rules/supabase-config.md`
