---
name: app-update
description: モバイルアプリの「推奨アップデート（後で可）」と「強制アップデート（ブロッキング）」の設計・実装・運用の正本。最小サポートバージョンを決める / 上げる、古い版のユーザーをストアへ誘導する、アップデート案内の UI を作る、`app_release_policies` を触る、といった作業で必ず最初に起動する。「強制アップデート」「force update」「最小バージョン」「サポート終了したバージョン」「古いアプリを使わせたくない」「アップデートを促したい」「更新を必須にしたい」「バージョンチェック」「起動時にストアへ飛ばす」「in-app updates」「Play の即時更新」「不具合版を回収したい」といった話題が出たら、ユーザーが機能名を出していなくても対象。**誤発動すると全ユーザーとストア審査担当者がアプリを起動できなくなり、こちらから復旧させる手段が無い**ため、推測で進めてよい領域ではない。
---

# 推奨 / 強制アップデート

> **このスキルはモバイル（`frontend/apps/mobile`）専用。**
> デスクトップ（Tauri）にも `frontend/apps/desktop/src/features/app-update/` があるが、
> あちらは `tauri-plugin-updater` が**アプリ自身を更新する**別物で、正本は
> `.claude/skills/desktop-release/` と `.claude/skills/tauri/`。
> ストアを介さないので、ここで扱う「下限バージョンでブロックする」問題は起きない。

**この機能の設計原則は 1 行に尽きる:**

> **判断できない材料が 1 つでもあれば、ブロックしない（フェイルオープン）。**

強制アップデートは**こちらから取り消せない操作**である。誤って発動すると、ユーザーは
アプリを開けず、アプリ内で何かを直させることもできない。サーバ側で戻しても、
すでに「壊れたアプリ」として消されている。一方「強制すべきだったのに強制しなかった」は
次の起動で取り返せる。**被害が非対称なので、迷ったら通す。**

---

## 0. まず状態を確認する（書き換えない）

```sql
-- 現在の方針。何よりも先にこれを見る
select platform, minimum_version, latest_version, store_url, updated_at
from public.app_release_policies;
```

| 見るもの | 意味 |
|---|---|
| `minimum_version` | **これ未満は起動できない**。上げると即座に全ユーザーへ効く |
| `latest_version` | これ未満なら「後で」を選べる案内が出る。ストアで**公開済み**の版を書く |
| `store_url` | 誘導先。`https://` のみ（CHECK 制約） |

判断ロジックは `frontend/apps/mobile/src/features/app-update/model/decide.ts`（純粋関数・テスト済み）。
**ここを読まずに挙動を推測しない。**

---

## 1. 構成（どこに何があるか）

| 対象 | 場所 |
|---|---|
| 方針データ（テーブル + RLS + CHECK 制約） | `drizzle/schema/app-release-policies.ts` |
| RLS / 制約のテスト（pgTAP） | `supabase/tests/app_release_policies_rls.sql` |
| 判断ロジック（純粋関数） | `frontend/apps/mobile/src/features/app-update/model/{decide,version,releaseNote}.ts` |
| 取得（supabase-js。失敗は `null`） | `.../app-update/api/fetchReleasePolicy.ts` |
| ネイティブ実測値 / ストア遷移 | `.../app-update/lib/{runtime,dismissal}.ts` |
| UI（Storybook 必須・単体テスト不要） | `.../app-update/ui/{UpdateRequiredScreen,UpdateAvailableNotice,UpdatePrompt}.tsx` |
| 配線 | `frontend/apps/mobile/src/app/providers/AppUpdateGate.tsx`（`AppProvider` が描画） |
| 配線が消えていないことの検査 | `.../app-update/model/gate.policy.test.ts` |
| 運用手順 | [`docs/mobile/app-update-runbook.md`](../../../docs/mobile/app-update-runbook.md) |
| 調査記録（一次情報の出典つき） | `docs/_research/2026-09-06-force-update.md` |

判定の流れ:

```
起動 / フォアグラウンド復帰
  └ fetchReleasePolicy(supabase, platform)      … 5s でタイムアウト。失敗は null
      └ decideUpdateAction({ currentVersion, policy, dismissedVersion })
          ├ 'forced'      → UpdateRequiredScreen に**差し替え**（children を描かない）
          ├ 'recommended' → UpdateAvailableNotice を**重ねる**（作業は止めない）
          └ 'none'        → 何もしない（初期値もこれ）
```

---

## 2. 不変条件（NON-NEGOTIABLE）

`gate.policy.test.ts` が静的に守っている。**消さない。**

| # | 不変条件 | 破ったときに起きること |
|---|---|---|
| 1 | 方針を取得できなければ `none` | バックエンド障害＝全ユーザーが起動不能。App Store 2.1(a) は "**turn on your back-end service!**" と明記しており、審査担当者も止まる |
| 2 | 自分の版が読めなければ `none` | Expo Go / web / 将来の SDK 変更で `null` になった瞬間に全員ブロック |
| 3 | `minimum > latest` なら**強制に昇格させない** | ストアに存在しない版の要求。**更新しようがない**（DB の CHECK 制約でも二重に防ぐ） |
| 4 | 判定の初期値は `none`。**判定完了を待たない** | 応答が返らない回線（キャプティブポータル・圏内外の境目）でアプリが永久に開かない |
| 5 | 版は `expo-application` の `nativeApplicationVersion` から取る | → §3 |
| 6 | `app_release_policies` に**書き込みポリシーを足さない** | 任意のユーザーが `minimum_version` を吊り上げて全員をブロックできる |
| 7 | 強制画面に閉じる手段（後で / 戻る / ×）を置かない | 下限を上げた意味が消える |
| 8 | 強制の状態を端末ローカル（AsyncStorage 等）に持たない | 端末側で消せる値でブロックが解ける |

---

## 3. 版は `expo-application` から取る（`expo-constants` は使わない）

```ts
import * as Application from 'expo-application'
Application.nativeApplicationVersion   // iOS: CFBundleShortVersionString / Android: versionName
```

Expo 公式が `Constants.platform.ios.buildNumber` の項で明言している:

> This **may differ from** the value in `Constants.expoConfig.ios.buildNumber` **because the
> manifest can be updated**, whereas this value will never change for a given native binary.

つまり **OTA（EAS Update）を当てた瞬間に `expoConfig` 側の版はバイナリとずれる**。
「更新したのに強制アップデートが解けない」「古いのに解ける」という、
**一番デバッグしづらい壊れ方**をする。ネイティブの実測値だけを信じること。

> 本リポジトリは `eas.json` が `appVersionSource: "remote"` + `autoIncrement: true` なので、
> **ビルド番号は `app.json` に書かれない**（EAS 側が正本）。`expo-constants` からは
> そもそも取れない。

### 何と比較するか — マーケティング版（`x.y.z`）

| | 値 | 使う？ |
|---|---|---|
| マーケティング版 | iOS `CFBundleShortVersionString` / Android `versionName` | **これを使う**。ユーザーとストアに見える値で、運用者が「1.2.0 以上」と言える |
| ビルド番号 | iOS `CFBundleVersion` / Android `versionCode` | 使わない。EAS の `autoIncrement` で毎ビルド動き、**iOS / Android で独立採番**され、ストア掲載にも出ない |

**前提と、その前提が崩れる条件（重要）**:

- Apple は `CFBundleShortVersionString` を「**3 つのピリオド区切り整数**・数字とピリオドのみ」と規定しており、プレリリースタグは仕様上入らない。
- **Google の `versionName` は「絶対的または相対的なバージョン識別子であれば何でもよい」自由文字列**で、機械的比較は仕様上保証されていない。
- 本リポジトリでは **`app.json` の `expo.version` が両プラットフォームの正本**なので `x.y.z` が保証される。
  **派生プロジェクトで Android の `versionName` を別管理にすると、この前提が崩れる。**
  その場合でも `parseVersion` が `null` を返してフェイルオープンするので**ブロックはされない**が、
  **強制アップデートが効かなくなる**（静かに無効化される）。versionName を変えるなら、
  `app_release_policies` をビルド番号ベースに設計し直すこと。
- 同じマーケティング版の別ビルドは区別できない（1.2.0 build 41 と 42）。
  **不具合版を止めたいときは patch を上げて出し直す**のが正しい手順。

比較は `model/version.ts`（自前・テスト済み）。semver ライブラリを入れないのは、
比較対象が semver ではなくストアのマーケティング版だから（プレリリース比較が要らない）。

---

## 4. ストアへの誘導は `https://` をそのまま開く

| プラットフォーム | 使う URL |
|---|---|
| iOS | `https://apps.apple.com/app/id<APP_STORE_ID>` |
| Android | `https://play.google.com/store/apps/details?id=<package_name>` |

**`itms-apps://` / `market://` を使わない。** 一次情報で裏が取れないため:

- Apple 自身のサンプルコード（StoreKit "Requesting App Store reviews"）は
  `https://apps.apple.com/app/id...` を使っている。**`itms-apps://` は
  developer.apple.com に記載を確認できなかった。**
- Google の現行ドキュメントが挙げる製品ページ URL は https 形式のみで、
  **`market://details?id=` は現行ドキュメントに記載を確認できなかった**
  （アプリ内からの公式手段は `Intent.ACTION_VIEW` + `setPackage("com.android.vending")` だが、
  React Native の `Linking` に `setPackage` 相当は無い）。

https ならストアアプリが在ればそこへ吸われ、無ければブラウザで開く。
**どの端末でも出口が残る**のが利点でもある。

---

## 5. ストア審査との関係（ここで落ちる）

### 5.1 Apple — 禁止条項は無い。危ないのは運用のほう

App Store Review Guidelines 全文に **「強制アップデート」「最小サポートバージョン」を
禁止・許可した条項は無い**。リスクは間接的で、**2 つだけ**:

1. **審査担当者が強制アップデート画面に止められる。** 審査対象は「新しく提出したビルド」なので、
   **`minimum_version` が審査中のビルドより上**のときだけ起きる。
2. **方針の取得に失敗したときにブロックする実装。** 2.1(a) の
   "include demo account info (**and turn on your back-end service!**)" に直撃する。

対策は運用ルール 1 本:

> **`minimum_version` を上げるのは、その版が「ストアで公開開始された後」。**
> ビルド作成時でも、審査提出時でもない。

`decideUpdateAction` は「自分の版が `latest` より新しい」ときも `none` を返すので、
**審査中の版（＝ストアの最新より新しい）には推奨も出ない。**

> 4.2（Minimum Functionality）については、4.2.3(i) が禁じているのは「**別アプリの**
> インストール要求」であって、App Store（OS 標準機能）での自己更新は該当しないと読める。
> ただし **Apple がこの解釈を明示した記述は確認できなかった**（未確認）。
> だからこそ「審査担当者をこの画面に到達させない」が唯一の確実な対策になる。

**Apple に「更新を促す公式 API」は無い**（`SKStoreReviewController` は評価専用で
365 日に最大 3 回、`SKOverlay` は**別アプリ**の推奨用）。iOS は自前比較 + 自前 UI しかない。

### 5.2 Google Play — 独自ブロッキング画面は可。ただし「更新の実行」は Play 経由のみ

Device and Network Abuse ポリシー:

> An app distributed via Google Play **may not modify, replace, or update itself using any
> method other than Google Play's update mechanism.**

| やること | 可否 |
|---|---|
| 自前フルスクリーンでブロックして Play の製品ページへ送る | **可** |
| Play の In-app updates（Immediate / Flexible） | **可**（Google 公式の手段） |
| 自前で APK / dex / .so を落として更新 | **不可** |

---

## 6. Play の In-app updates を採用するかどうか（現状: 採用していない）

Google 公式の Android 専用機構。`com.google.android.play:app-update` が要る。

| フロー | 公式定義 |
|---|---|
| **Flexible** | ダウンロード中も**アプリを使い続けられる**。「コア機能に必須ではない」更新向け |
| **Immediate** | **全画面。更新して再起動しないと使い続けられない**。「コア機能に必須」な更新向け |

**本リポジトリは採用していない。** 理由（`.claude/rules/minimal-implementation.md` §1 / §3）:

- 価値があるのは **Android 側だけ**。iOS はどのライブラリも「App Store を開く」だけで、
  それは `Linking.openURL` 1 行で足りる。
- 主要ライブラリ（`expo-in-app-updates` / `sp-react-native-in-app-updates`）は
  **iOS で全クライアントから `itunes.apple.com/lookup` を叩く**。Apple は Search API を
  「**おおよそ毎分 20 呼び出し**」に制限しており、本番アプリの全起動で叩くのは
  レート制限・利用条件の両面でリスクがある。
- **ネイティブモジュールなので development build が必須**、かつ
  **`inAppUpdatePriority` は internal app sharing で動かない**ため、
  EAS の internal distribution APK や `expo run:android` では検証できない。

**採用する場合の判断材料**（2026-09-06 時点の実測。再確認してから決めること）:

| パッケージ | 最新 | 週次 DL | License | 備考 |
|---|---|---|---|---|
| `expo-in-app-updates` | 0.12.0 (2026-06) | 36,545 | MIT | runtime 依存なし。0.10.0 で約 14 か月停滞した実績あり |
| `sp-react-native-in-app-updates` | 2.0.0 (2026-07) | 44,387 | MIT | `react-native-device-info` が必要 |

採用しても **iOS 側は本 feature の実装がそのまま必要**なので、
「Android だけ公式フローに置き換える」形になる。

### `updatePriority` は**ロールアウト後に変更できない**

Play Developer API `Edits.tracks.releases` の `inAppUpdatePriority`（0〜5）は公式に
「**can not be updated once the release is rolled out**」。
「出してから緊急度を上げる」ことはできない。→ §7。

---

## 7. 出してしまった不具合版を回収する（Android の公式手段）

Play Console の **Recovery tools**（「Prompt users to update」）/ Play Developer API の
**`apprecovery`** リソース。

- **コード変更不要**。`app-update` ライブラリも不要
- 特定の **versionCode 範囲**（`versionRange` / `versionList`）を狙える
- UX は全画面ダイアログ。**ブロッキングではない**が、閉じても**コールドリスタートのたびに再表示**
- 前提: **Play App Signing 登録 + AAB 公開**
- API: `create`（DRAFT）→ `deploy`（ACTIVE）。`cancel` / `addTargeting` / `list` あり

**`minimum_version` を上げるより先にこちらを検討する**（ブロックせずに更新を促せる）。
iOS に同等の仕組みは無い。

---

## 8. OTA（EAS Update）との役割分担

**本リポジトリは `expo-updates` を導入していない**（`package.json` に無い）。導入する場合:

| 直したいもの | 手段 |
|---|---|
| JS / スタイル / 画像 | **OTA**。強制アップデートは要らない |
| ネイティブコード・依存の変更、**権限の変更**、Expo SDK 更新 | 新バイナリ → ストア更新。ここで初めて強制を検討する |

> **原則: 強制アップデートは「OTA では直せないもの」のためだけに使う。**
> OTA で直せるものを強制すると、審査リスクとユーザーの離脱だけが増える。

`runtimeVersion` policy は `appVersion` / `nativeVersion` / `fingerprint` の 3 つ。
本リポジトリは `appVersionSource: "remote"` + `autoIncrement` なので、
**`nativeVersion` は相性が悪い**（ビルドごとに runtimeVersion が変わり、OTA の配信先が毎回分断される）。
`fingerprint` か `appVersion` を選ぶこと。

App Store 2.5.2 は「バンドル外から**機能を追加・変更するコード**をダウンロード・実行してはならない」
と規定している。EAS Update の運用はこの条文と隣り合わせなので、OTA を入れるなら
`expo-deployment` skill と公式ドキュメントを読んだうえで設計すること。

---

## 9. 実装・変更したら必ず

| # | 確認 |
|---|---|
| 1 | `unit-test`（`decide` / `version` / `releaseNote` / `fetchReleasePolicy` / `gate.policy`）が緑か |
| 2 | `test-db`（`app_release_policies_rls.sql`）が緑か |
| 3 | Storybook で強制画面に**閉じる手段が無い**ことを目で見たか（`.claude/rules/ui-testing.md`） |
| 4 | 文言が en / ja 両方にあるか（`appUpdate.*`） |
| 5 | 取得失敗・タイムアウト・版が読めない場合に **`none` になる**か |
| 6 | `minimum_version` を上げるなら、その版が**ストアで公開開始済み**か |
| 7 | `store_url` が実在のアプリを指しているか（`mode: boilerplate` の間はプレースホルダ） |
| 8 | OTA で直せる内容を強制しようとしていないか |

---

## 10. 禁止パターン

```ts
// ❌ 方針を取得できなかったらブロックする（フェイルクローズ）
if (!policy) return <UpdateRequiredScreen />          // 2.1(a) 直撃。障害＝全員起動不能

// ❌ 判定が終わるまでスプラッシュで待つ
if (loading) return <Splash />                        // 応答が返らない回線で永久に開かない

// ❌ expo-constants の版で判定する
const current = Constants.expoConfig?.version         // OTA でバイナリとずれる

// ❌ 文字列比較
if (currentVersion < policy.minimumVersion) block()   // "1.10.0" < "1.9.0" が true

// ❌ 強制画面に逃げ道を付ける
<UpdateRequiredScreen onDismiss={...} />

// ❌ 強制の解除状態を端末に持つ
AsyncStorage.setItem('force-update-skipped', '1')

// ❌ app_release_policies に書き込みポリシーを足す
pgPolicy('update_app_release_policies', { for: 'update', to: 'authenticated', ... })

// ❌ 審査に出した直後に minimum_version をその版へ上げる
// ❌ ストアに存在しない版を minimum_version にする（CHECK 制約が止めるが、そもそもやらない）
// ❌ 起動のたびに itunes.apple.com/lookup を叩いて最新版を調べる（Search API は毎分約 20 回）
```

---

## 参考（一次情報）

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 2.1(a) / 2.5.2 / 4.2
- [Requesting App Store reviews](https://developer.apple.com/documentation/storekit/requesting-app-store-reviews) — `https://apps.apple.com/app/id...` を使う根拠
- [CFBundleShortVersionString](https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleshortversionstring) — 3 つのピリオド区切り整数
- [In-app updates (Android)](https://developer.android.com/guide/playcore/in-app-updates) / [Test in-app updates](https://developer.android.com/guide/playcore/in-app-updates/test)
- [Edits.tracks](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks) — `inAppUpdatePriority` はロールアウト後変更不可
- [apprecovery](https://developers.google.com/android-publisher/api-ref/rest/v3/apprecovery) / [Prompt users to update](https://support.google.com/googleplay/android-developer/answer/13812041)
- [Device and Network Abuse policy](https://support.google.com/googleplay/android-developer/answer/9888379)
- [Version your app (Android)](https://developer.android.com/studio/publish/versioning) — `versionName` は自由文字列
- [Link to your products (Google Play)](https://developer.android.com/distribute/marketing-tools/linking-to-google-play)
- [expo-application](https://docs.expo.dev/versions/latest/sdk/application/) / [expo-constants](https://docs.expo.dev/versions/latest/sdk/constants/)
- [App version management (EAS)](https://docs.expo.dev/build-reference/app-versions/) / [Runtime versions and updates](https://docs.expo.dev/eas-update/runtime-versions/)
- 調査記録（未確認事項も明記）: `docs/_research/2026-09-06-force-update.md`
- 関連: `.claude/rules/store-review.md` / `.claude/skills/mobile-release/` / `.claude/skills/rls/`
