---
name: mobile-release
description: Expo / EAS のモバイルリリース手順（iOS TestFlight / Android Play 内部テスト）。クラウドビルド（expo.dev）とローカルビルド（--local）の両方に対応。「アプリをリリースして」「TestFlight に上げて」「Play に出して」「ビルドして提出して」「EAS でビルド」「mobile-release-ios」「起動直後にクラッシュする（EXPO_PUBLIC_* が焼き込まれていない）」といった指示・症状が出たら必ず最初に起動する。資格情報の扱い、eas.json への一時注入と復元、EAS への env push、既知のビルド失敗の回避策を提供する。
---

# モバイルリリース（EAS）

**リリースを指示されたら、手で `eas build` / `eas submit` を叩く前に必ず下記 script を使うこと。**
資格情報の復元・eas.json の注入と復元・env の push・既知バグの回避が全部入っている。

```bash
mobile-release-ios                 # expo.dev（EAS クラウド）でビルド → TestFlight
mobile-release-ios --local         # ローカルビルド（macOS + Xcode。ビルド枠を消費しない）
mobile-release-android             # expo.dev でビルド → Play 内部テスト
mobile-release-android --local     # ローカルビルド（要 devenv shell -P android）

mobile-release-ios --dry-run       # 何を実行するかだけ表示（ビルドも提出もしない）
mobile-metadata                    # store.config.js を App Store Connect へ同期するだけ
sync-eas-env production            # EXPO_PUBLIC_* を EAS へ同期するだけ
```

実体は `scripts/mobile/release-ios.sh` / `release-android.sh` / `sync-eas-env.sh`（共通部は `lib.sh`）。

---

## ⚠️ 資格情報は Doppler が唯一のソース（最初に理解すること）

**Apple / Google / Expo の資格情報はすべて Doppler にある。** ファイルにも `config.env` にも
コードにも置かない。**`eas login` も不要**（`EXPO_TOKEN` で認証する）。

各 script は起動時に **`doppler run` で自分自身を再実行**してシークレットを env に載せる
（`mobile_doppler_reexec`）。つまり **呼び出す側は何も準備しなくてよい**し、
逆に「手で `eas build` を叩く」と資格情報が無くて必ず失敗する。

```
mobile-release-ios
  └─ doppler run [--project <tokens>] -- doppler run --config <env> -- 自分自身を再実行
        └─ EXPO_TOKEN / APPLE_* / PLAY_* / EXPO_PUBLIC_* が env に載った状態で本編が動く
```

| 層 | Doppler の config | 中身 |
|---|---|---|
| アカウント共通トークン（任意） | `MOBILE_TOKENS_PROJECT` / `MOBILE_TOKENS_CONFIG` | `EXPO_TOKEN` / `APPLE_*` / `PLAY_SERVICE_ACCOUNT_JSON` を別 project にまとめている場合 |
| アプリの環境別の値 | `ENV` に対応（`prd` / `stg` / `dev`） | `EXPO_PUBLIC_*` |

単一 project 運用（`doppler.yaml` の既定）なら上段は不要で、自動的に 1 段だけになる。

### 守ること

- **値をチャット / ログ / コミット / PR に出さない**（会話はキー名だけ）。
  script も**キー名とファイルパスしか出力しない**。
- `.p8` / サービスアカウント JSON は **実行中だけ** `credentials/` に展開し、
  **`trap` で必ず消す**（`.gitignore` 済み・`chmod 600`）。
- **Doppler への書き込みは `doppler` MCP 経由**・フェーズ制に従う（`.claude/rules/mcp-doppler.md`）。
  Bash の `doppler secrets set` を直接叩かない。
- **`SUPABASE_` / `VERCEL_` / `GITHUB_` prefix のキーは Doppler に作れない**
  （sync が予約値違反で壊れる。`.claude/rules/env-naming.md`）。
  モバイルが参照するのは `EXPO_PUBLIC_SUPABASE_*` なので先頭一致せず問題ない。

**非機密の設定だけが `scripts/mobile/config.env`**（アプリのパス / `APPLE_ASC_APP_ID` /
プロファイル名）。ここにシークレットを書いたらレビューで却下。

---

## 0. クラウド（expo.dev）とローカルのどちらを使うか

| | クラウド（既定） | ローカル（`--local`） |
|---|---|---|
| コマンド | `mobile-release-ios` | `mobile-release-ios --local` |
| 実体 | `eas build`（expo.dev のビルダー） | `eas build --local`（同じ設定で手元の Xcode / Gradle を回す） |
| EAS のビルド枠 | **消費する** | **消費しない** |
| 所要 | ~20-30 分（キュー待ち含む） | ~20-40 分（マシン依存） |
| 必要な環境 | 無し（Linux でも可） | iOS = macOS + Xcode / Android = JDK 17 + Android SDK |
| 成果物 | クラウドから .ipa / .aab をダウンロード | `--output` に直接生成 |

**成果物は同等**（同じ設定・同じ credentials を使う）。枠を節約したいときや、キューが
詰まっているときにローカルへ切り替える。判断がつかないときは既定（クラウド）でよい。

> ローカルビルドの公式な制約: プラットフォームを 1 つに絞る必要がある（`all` 不可）、
> キャッシュ無し、EAS の **secret 型** 環境変数は使えない、Windows 非対応。

---

## 1. 一度だけ必要な手作業（公開 API では自動化できない）

| プラットフォーム | やること |
|---|---|
| iOS | Apple Developer で Bundle ID を登録 → **App Store Connect にアプリレコードを作成** → 採番された **ASC App ID** を `scripts/mobile/config.env` の `APPLE_ASC_APP_ID` に記入 |
| Android | Play Console にアプリを作成 → サービスアカウントに権限を付与 |

`APPLE_ASC_APP_ID` が未設定だと `No suitable application records found` で落ちる。
これは App Store の URL（`apps.apple.com/app/id<数字>`）に出る**公開値**なので、
Doppler ではなく非機密の `config.env` に置く。

### 設定ファイル

```bash
cp scripts/mobile/config.example.env scripts/mobile/config.env   # gitignore 済み
```

### 必要なシークレット（Doppler。**値をチャット / ログ / コミットに出さない**）

| キー | 用途 |
|---|---|
| `EXPO_TOKEN` | EAS の認証（`eas login` は不要） |
| `APPLE_API_KEY` | App Store Connect API の **Key ID** |
| `APPLE_API_ISSUER` | 同 **Issuer ID** |
| `APPLE_API_KEY_P8` | 同 **秘密鍵(.p8)**。base64 でも PEM そのままでも可 |
| `APPLE_TEAM_ID` | Apple Developer の Team ID（ASC API キーからは自動検出できない） |
| `PLAY_SERVICE_ACCOUNT_JSON` | Play のサービスアカウント鍵。base64 でも生 JSON でも可 |
| `EXPO_PUBLIC_*` | アプリに焼き込む公開値（§3） |

書き込みは **`doppler` MCP 経由**・フェーズ制に従う（`.claude/rules/mcp-doppler.md`）。

---

## 2. script が行うこと（＝手でやる場合の正しい順序）

1. **Doppler の secrets を自己注入**（`doppler run` で自分自身を再実行）
2. **資格情報を実行中だけ復元** — `.p8` / サービスアカウント JSON を
   `frontend/apps/mobile/credentials/`（gitignore 済み・`chmod 700`）へ。**trap で必ず消す**
3. **eas.json へ ASC 資格情報を注入**（iOS のみ。§4）
4. **`EXPO_PUBLIC_*` を EAS の Environment Variables へ push**（§3）
5. **ビルド**（クラウド or ローカル）
6. **提出** — iOS は `eas submit`（`--submit-via altool` で Apple 公式 CLI）、Android は `eas submit`
7. **メタデータ同期** — `store.config.js` があれば `eas metadata:push`

---

## 3. `EXPO_PUBLIC_*` の EAS への push は必須

Doppler は Vercel / Supabase へはネイティブ連携があるが **EAS には無い**。
一方 `eas.json` の各ビルドプロファイルは `"environment": "production"` で **EAS 側の**
Environment Variables を参照する。橋渡ししないと `EXPO_PUBLIC_SUPABASE_URL` 等が
バンドルに入らず、**ビルドしたアプリが起動直後にクラッシュする**。

- 対象は env にある **`EXPO_PUBLIC_*` 全部**。この prefix は「バンドルに出てよい公開値」を
  意味するので、prefix 自体が安全性の判定条件になっている。
  **`EXPO_PUBLIC_` の付かないサーバ側 secret を EAS へ送ってはならない**
  （バンドルから読み出せるため）。
- **EAS は空文字の変数を拒否する**（`Variable value can not be empty`）。script は空値を
  push しないが、**落としたキーは必ず表示する**（黙って減らさない）。
- ENV → Doppler config → EAS environment の対応:

| `ENV` | Doppler config | EAS environment | eas.json profile |
|---|---|---|---|
| `production` | `prd` | `production` | `production` |
| `staging` | `stg` | `preview` | `preview` |
| `dev` | `dev` | `development` | `development` |

---

## 4. eas.json は「コミット対象なのに実行中だけ汚す」— 復元を必ず守る

`eas submit` に ASC 資格情報を渡す **CLI フラグは無く**、**eas.json は環境変数展開にも
対応していない**。したがって実行中だけ注入するしかない。

script は次の順で安全を担保している。**手で真似するときも同じ順序を守ること**:

1. **バックアップを取る前に、まず注入の残骸を洗う**
   （前回 SIGKILL 等で trap が走らなかった内容をそのまま backup すると
   「復元しても汚れたまま」が恒久化する。実際にそうなった事例がある）
2. `cp` でバックアップ
3. 注入 → ビルド / 提出
4. `trap` で復元。復元後にまだ汚染キーが残っていたら `git checkout` で戻す

注入されるキー: `ascApiKeyPath` / `ascApiKeyId` / `ascApiKeyIssuerId` / `ascAppId` /
`credentialsSource`。**コミット版の eas.json にこれらが 1 つでもあったら汚染**なので、
`git diff frontend/apps/mobile/eas.json` は毎回確認する。

---

## 5. 既知のビルド失敗と回避策（すべて script に入っている）

| 症状 | 原因 / 回避策 |
|---|---|
| iOS ローカルビルドが `-index-store-path` 等で落ちる | devenv(Nix) の C/リンカ env が `xcodebuild` に干渉する。`SDKROOT` / `LDFLAGS` / `NIX_*` を `env -u` で外し、`DEVELOPER_DIR` を Xcode に固定する |
| iOS ローカルビルドが原因不明の "unknown error" | fastlane の `xcodebuild -showBuildSettings` が既定 3 秒 × 4 回で足りない。`FASTLANE_XCODEBUILD_SETTINGS_TIMEOUT=180` / `..._RETRIES=5` |
| Android ローカルビルドが `ninja: error: ... libworklets.so ... missing` | macOS の `/tmp` は `/private/tmp` へのシンボリックリンクで、CMake と Ninja が論理/物理パスを取り違える（expo/expo#42893, reanimated#9151）。`EAS_LOCAL_BUILD_WORKINGDIR` をリンクを経由しない場所にする |
| Android ビルドが Gradle の分かりにくいエラーで落ちる | JDK が 17 でない / `platforms/android-<targetSdkVersion>` が無い。script は先に検査して落とす |
| クラウドビルド後に `.ipa` の URL が取れない | `--json` の成果物 URL は `artifacts.applicationArchiveUrl`（トップレベルではない） |
| `No suitable application records found` | App Store Connect のアプリレコード未作成 / `APPLE_ASC_APP_ID` が違う |
| 初回ビルドが対話を要求して非対話で失敗 | 配布証明書が未作成。`credentials.json` があれば `credentialsSource: local` を注入（script が自動判定）。無い場合は一度だけ対話実行する |
| `eas submit` がキューで滞留する（iOS） | `--submit-via altool` で Apple 公式 CLI から直接送る（macOS + Xcode 必要） |
| altool が正常な .ipa を ITMS-90207 と誤判定 | Xcode 26.x の新アップローダの既知バグ。Apple 公式フラグ `--use-old-altool` で回避（script は常に付ける） |

---

## 6. 配布は自動で始まらない（意図的）

- **iOS**: アップロード後、Apple の Processing（数分〜30 分）を経て TestFlight に出る。
  内部テスターへの配布は App Store Connect で行う。
- **Android**: `eas.json` の submit プロファイルが `releaseStatus: "draft"` なので
  **Play Console でリリースを手動開始するまでテスターへ配られない**。
  いきなり配布したい場合だけ `completed` に変える（変更はレビュー対象）。

---

## 6.5. ストア掲載用スクリーンショット（`screenshots-mobile`）

```bash
# 実機描画（simulator / emulator）
screenshots-mobile                      # 撮って検証（アップロードしない）
screenshots-mobile --platform android   # Android だけ（Linux はこちらのみ）
screenshots-mobile --skip-capture       # 撮影済み画像を検証だけ
screenshots-mobile --upload             # ★ ストアへ送信（明示指定が必要）

# Storybook から（ネイティブビルド不要。多ロケール × 多サイズの量産向き）
build-storybook && screenshots-storybook
screenshots-storybook --devices iphone-6-9 --locales ja
screenshots-storybook --allow-fidelity-warnings   # 忠実度警告を承知で続行

# 検証だけ単体で
screenshots-validate --platform ios fastlane/screenshots
```

撮影対象は `scripts/mobile/storybook-shots.config.mjs`（story id / 端末 / ロケール）で宣言する。

### 撮影経路は 2 つある。画面ごとに選ぶ

| 経路 | コマンド | 何を撮るか |
|---|---|---|
| **実機描画** | `screenshots-mobile` | simulator / emulator の実キャプチャ。**ネイティブ部品・shadow/elevation・セーフエリアが写る画面はこちら必須** |
| **Storybook** | `screenshots-storybook` | react-native-web の描画。**到達しづらい状態**（空・エラー・特定データ）や**多ロケール × 多サイズの量産**に強い。ネイティブビルド不要 |

Apple のガイドライン 2.3.3 が求めるのは「アプリが**使用されている状態**を示すこと」であって、
生のデバイスキャプチャであることではない（掲載画像は合成が主流）。
問題になるのは**実機と見た目が食い違うこと**なので、そこだけを機械的に検出する方針にしてある:
`screenshots-storybook` は撮影後に DOM を検査し、以下を見つけたら**警告して exit 1** する。

| 検出 | なぜ危険か |
|---|---|
| `native-control` | `input`/`textarea`/`select`/switch/slider/progressbar は RN では OS 提供の部品になり見た目が別物 |
| `shadow` | CSS `box-shadow` と iOS `shadow*` / Android `elevation` は描画が一致しない |
| `broken-image` | 撮ってから気づくと痛い |
| `theme-decorator` | 下記の既知バグ |

警告が出た画面は `screenshots-mobile` で撮り直す。意図的に許容するなら
`--allow-fidelity-warnings` を付ける。**どちらの経路も出力先・検証・アップロードは共通**。

> ⚠️ **既知バグ: reanimated の CSS アニメーションを含む story はテーマ切替が効かない**
> `HelloWave` のような reanimated CSS アニメーションを含む story では、
> addon-themes の `withThemeByClassName` の effect が実行されず、
> **Storybook 上でダークに切り替えても light のまま**になる（HomeScreen も HelloWave を含むため該当）。
> 撮影スクリプトは `<html>` のクラスを**強制適用したうえで検証**するので撮影結果は正しくなるが、
> `theme-decorator` 警告が出る。**Storybook を目視でデバッグするときはテーマ切替が効かない**点に注意。

### 絶対に間違えてはいけない 2 点

| # | 注意 |
|---|---|
| 1 | **Play の「最大辺 ≤ 最小辺 × 2」**。最近の Android 既定プロファイル（Pixel 7 = 1080x2400 = 2.22 倍）は**そのままだと弾かれる**。実機撮影なら 1080x1920 (16:9) の AVD を `ANDROID_SCREENSHOT_AVD` に指定する（Storybook 経路は 360x640 @3x = 1080x1920 で撮るので既に適合） |
| 2 | **実機撮影には simulator/emulator 用のビルドが要る**。ストア提出用の `.ipa` / `.aab` はインストールできない。`eas build --profile development-simulator --platform ios --local`（iOS）/ `--profile preview --platform android --local`（Android）。Storybook 経路はビルド不要 |

### なぜ fastlane なのか（EAS ではない）

**EAS Metadata はスクリーンショットを扱えず、Google Play のストア掲載情報にも対応しない**
（[公式](https://docs.expo.dev/eas/metadata/) の対応表で "Upload screenshots ✗"）。
`mobile-release-ios` が使う `eas metadata:push` は**テキストメタデータ専用**。
したがって画像のアップロードは `deliver`（ASC）/ `supply`（Play）しか経路が無い。

fastlane は Ruby 一式を引き込むので **opt-in profile** にしてある:

```bash
devenv shell -P store-screenshots -- screenshots-mobile --upload
```

### パイプライン

```
1. simulator/emulator 起動 + アプリインストール
2. Maestro (.maestro/store/screenshots.yaml) をロケール分だけ実行
   └ ロケール切替は端末設定ではなく **アプリ内の LocaleSwitcher をタップ**する方式
3. fastlane のディレクトリ構成へ配置
   iOS     : fastlane/screenshots/<locale>/          （deliver は解像度で端末種別を推定）
   Android : fastlane/metadata/android/<locale>/images/phoneScreenshots/
4. ストア要求を検証 ← ここで落ちたら 5 に進まない
5. --upload 時のみ deliver / supply で送信
```

出力物は `.gitignore` 済み（撮影→検証→送信を 1 回で回す前提）。

### 撮影対象を増やすとき

`.maestro/store/screenshots.yaml` に `takeScreenshot` を足す。
ロケール依存の文言は env（`HOME_TAB` / `EXPLORE_TAB` 等）で渡しているので、
**アプリの翻訳を変えたら `scripts/mobile/screenshots.sh` の `locale_meta()` も直す**
（ズレるとフローが要素を見つけられずタイムアウトする）。

---

## 7. リリース前に必ず通すこと

1. `ci-check`（lint / format / type-check）
2. `unit-test`
3. アプリ側の回帰テスト（`frontend/apps/mobile/src/shared/config/` 配下の検査があれば）
4. `mobile-release-ios --dry-run` で注入内容と push 対象キーを目視

**All Green でないままリリースしない**（`.claude/rules/tdd.md`）。

---

## 8. 完了報告に必ず含めること

- ビルドモード（クラウド / ローカル）と **profile**
- EAS へ push した **EXPO_PUBLIC_* のキー名**と、空値で落としたキー（値は出さない）
- 成果物のサイズ、提出先（TestFlight / Play の track）
- **eas.json が git のクリーンな状態に戻っていること**
- 残っている手作業（TestFlight のテスター配布 / Play のリリース開始）

---

## 参照

- EAS のビルドプロファイル・提出設定: `expo-deployment` / `expo-cicd-workflows` skill
- Expo のアップグレード: `upgrading-expo` skill
- シークレットの扱い: `.claude/skills/doppler/SKILL.md` / `.claude/rules/mcp-doppler.md`
- 公式: [Local builds](https://docs.expo.dev/build-reference/local-builds/) /
  [Environment variables](https://docs.expo.dev/eas/environment-variables/) /
  [Submit to the App Store](https://docs.expo.dev/submit/ios/) /
  [eas.json reference](https://docs.expo.dev/eas/json/)
