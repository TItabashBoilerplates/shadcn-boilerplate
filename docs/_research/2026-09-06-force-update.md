# モバイルアプリ 強制/推奨アップデート — ストア審査上の制約と実装ベストプラクティス 調査レポート

## 調査情報

- **調査日 / 全 URL のアクセス日**: 2026-09-06
- **調査者**: spec agent
- **対象**: `/home/user/shadcn-boilerplate` の `frontend/apps/mobile`
  （Expo SDK `~57.0.10` / React Native `0.86.2` / EAS `appVersionSource: "remote"` + `autoIncrement: true`）
- **原則**: 各主張に一次情報（Apple / Google / Expo 公式）の URL を付ける。
  一次情報で確認できなかったことは「**未確認**」と明記し、推測で埋めない。

---

## 0. 結論（先に読む）

| 論点 | 結論 |
|---|---|
| Apple は強制アップデートを禁じているか | **禁じる条項も明示的に許す条項も、Review Guidelines には存在しない**（本文全文を検索して確認）。リスクは **2.1(a)（App Completeness）経由の間接的なもの**に限られる |
| 実際に危ないのは何か | **「審査担当者が触っているそのビルド自体を、自前のゲートが弾く」こと**。サーバ側の最小バージョンを「審査中のビルド」より上に設定した瞬間に起きる。回避は「**未知/未来のバージョンは常に通す**」設計（§1.2） |
| iOS に公式の「更新を促す API」はあるか | **無い**。`SKStoreReviewController` は**評価/レビュー専用**、`SKOverlay` は**別アプリ / App Clip の親アプリ推奨専用**。更新用の公式 API は確認できなかった（§1.4） |
| iOS の App Store 誘導 URL | **`https://apps.apple.com/...` を使う**。Apple 自身のサンプルコードがこの形式（§1.3）。`itms-apps://` は **Apple 公式ドキュメントに記載が見つからなかった**（未確認・非公式扱い） |
| Android の公式手段 | **2 つある**。(a) アプリ組み込みの **In-app updates API**（`com.google.android.play:app-update`、Flexible / Immediate）、(b) **コード変更不要の Play Console「Prompt users to update」/ Play Developer API `apprecovery`**（§2.1 / §2.4） |
| Play は独自ブロッキング画面を許すか | **禁止条項は見つからなかった**。ただし **Device and Network Abuse ポリシーにより「更新の実行」自体は Play 経由必須**（自前 APK 配布・自己更新は禁止）。「画面でブロックして Play へ送る」は適合、「自前で更新を配る」は違反（§2.3） |
| Expo でバージョンを読む API | **`expo-application` の `nativeApplicationVersion` / `nativeBuildVersion` を使う。`expo-constants` の `expoConfig` は使わない**（後者は OTA で書き換わりうるため。Expo 公式が明言。§3.2） |
| このリポジトリ特有の注意 | `appVersionSource: "remote"` のため **`app.json` に `ios.buildNumber` / `android.versionCode` が存在しない** → `Constants.expoConfig` からビルド番号は取得不能。`expo-application` 一択（§3.2.3） |
| OTA と強制アップデートの役割分担 | **OTA（EAS Update）は native を変えられない**。「native を含む更新の強制」は必ずストア更新。OTA は「JS だけで直せるものを、ストア更新を待たずに配る」役割（§3.3）。**なお本リポジトリには現時点で `expo-updates` が入っていない**（＝ EAS Update 未配線） |
| 実装の推奨 | **最小バージョンの判定は自前バックエンド（Supabase）で持ち、比較は `nativeBuildVersion`（整数）で行う**。iTunes Lookup API をクライアントから叩く方式は Apple の利用条件とレート制限（約 20 req/min）の点で推奨しない（§4.3 / §5） |

---

## 1. Apple App Store

### 1.1 関係しうる条項（Review Guidelines 全文を検索した結果）

App Store Review Guidelines（<https://developer.apple.com/app-store/review/guidelines/>、アクセス 2026-09-06）の
全文を取得し、`update` / `latest version` / `must be updated` などで検索した。
**「強制アップデート」「最小サポートバージョン」に言及した条項は存在しなかった。**

関係しうるのは以下。

#### 2.1 App Completeness（**最重要**）

> **2.1 (a)** Submissions to App Review, including apps you make available for pre-order, should be final
> versions with all necessary metadata and fully functional URLs included; placeholder text, empty websites,
> and other temporary content should be scrubbed before submission. Make sure your app has been tested
> on-device for bugs and stability before you submit it, and **include demo account info (and turn on your
> back-end service!) if your app includes a login.** ... **We will reject incomplete app bundles and binaries
> that crash or exhibit obvious technical problems.**

強制アップデート機能が 2.1 に触れうる経路は 2 つ。

1. **審査担当者が起動したときにゲートで止まり、アプリの中身を評価できない。**
   ガイドラインは「incomplete」「fully functional」を要求しており、
   起動直後に「アップデートしてください」以外の何も出ない画面は、レビュアーから見れば
   **機能しないアプリ**である。
2. **バックエンドの停止**。`(and turn on your back-end service!)` が明記されているとおり、
   最小バージョンを返す API が落ちていた / 404 だった場合の**フェイルクローズ実装**（＝取得失敗時にブロック）は、
   そのまま「アプリが起動しない」として 2.1 リジェクトの材料になる。
   → **取得失敗時は必ずフェイルオープン（通す）**にする（§5 の実装原則）。

> **注**: 「強制アップデート画面でレビュアーがブロックされ実際に 2.1 でリジェクトされた」という
> **Apple の一次情報での事例記述は見つからなかった（未確認）**。上記は 2.1(a) の条文から導かれる
> リスク評価であり、Apple が明示的にそう述べているわけではない。

#### 4.2 Minimum Functionality

> Your app should include features, content, and UI that elevate it beyond a repackaged website.
> If your app is not particularly useful, unique, or "app-like," it doesn't belong on the App Store.
>
> **4.2.3 (i)** Your app should work on its own without requiring installation of another app to function.

- **4.2 が「強制アップデートそのもの」を禁止する条項ではない**。
- ただし、レビュアーの手元でアプリが**アップデート要求画面しか表示しない**状態は、
  4.2 の「useful / app-like でない」という評価に接続しうる（Apple の明示的言及は無い＝**未確認**）。
- **4.2.3(i)** は「別アプリのインストールを要求してはならない」。強制アップデート画面は
  「**App Store（＝OS 標準機能）で自分自身を更新させる**」ものであり、
  「別アプリを入れないと機能しない」ケースには当たらないと読める。
  ただし Apple がこの解釈を明示した記述は見つからなかった（**未確認**）。

#### 3.1.1 In-App Purchase → **関係しない**

> **3.1.1(a) Link to Other Purchase Methods:** Developers may apply for entitlements to provide a link in
> their app to a website the developer owns or maintains responsibility for **in order to purchase digital
> content or services**. ... apps may not include buttons, external links, or other calls to action that
> **direct customers to purchasing mechanisms other than in-app purchase**.

3.1.1 が規制しているのは **「IAP 以外の購入手段への誘導」**である。
**App Store の自アプリ製品ページへのリンクは購入手段への外部誘導ではない**ため、
アップデート誘導リンクが 3.1.1 に抵触する根拠は条文上見当たらない。
（アップデート画面のついでに「Web で課金すると安い」等を書けば当然 3.1.1 の対象になる。）

#### 2.5.2（OTA を併用するなら必ず読む条項）

> **2.5.2** Apps should be self-contained in their bundles, and may not read or write data outside the
> designated container area, nor may they **download, install, or execute code which introduces or changes
> features or functionality of the app**, including other apps.

EAS Update（OTA）を使う場合に効く条項。Expo 公式も
「**EAS Update のルールの 1 つは、ビルド対象のプラットフォームとストアのルールに従うこと。
更新の内容と使い方の両方が App Store / Play Store のガイドラインに従う必要がある。
通常これは、アプリの挙動の変更はレビューを受ける必要がある、ということを意味する**」
と述べている（<https://docs.expo.dev/eas-update/introduction/>、アクセス 2026-09-06）。

> 原文: "One of the rules of EAS Update is that you need to follow the rules of the platforms and app stores
> you are building for. This means your updates need to follow the App Store and Play Store guidelines,
> including the content of the updates and how you use them. This usually means changes to your app's
> behavior need to be reviewed."

#### 2.5.9（参考）

> **2.5.9** Apps that alter or disable the functions of standard switches ... or other native user interface
> elements or behaviors will be rejected. For example, **apps should not block links out to other apps or
> other features that users would expect to work a certain way.**

「ユーザーが期待する挙動をブロックしてはならない」という趣旨。
強制アップデート画面で **OS の戻る操作やリンクアウトを潰す**ような実装は避けるのが無難
（Apple がこの文脈で言及しているわけではない＝**未確認**）。

### 1.2 「審査中のビルドを弾かない」設計（事故回避の本体）

App Review が触るのは **新しく提出したビルド**であって、古いビルドではない。
したがって事故は「サーバが返す最小バージョンが、審査中のビルドより上になっている」ときだけ起きる。
典型的には次の 2 パターン。

1. **リリース前に最小バージョンを上げてしまう**
   （v1.5.0 を審査に出す前に、サーバの `minSupportedVersion` を `1.5.0` にしてしまう）。
   → v1.5.0 は「自分自身より新しい版が必要」と判定され、**自分で自分をブロックする**。
2. **「知らないバージョンはブロック」というホワイトリスト方式**にしてしまう。
   → 審査中の新ビルドはサーバから見て未知なので弾かれる。

**回避原則（設計の不変条件）**:

| # | 原則 |
|---|---|
| A | **比較は「現在のビルド < 最小要求」のときだけブロック**する。等号・それ以上は必ず通す。「未知だからブロック」を絶対に作らない |
| B | **最小バージョンの引き上げは、そのビルドがストアで配信開始された後**に行う（審査提出時ではない）。CI から自動で上げるなら、トリガーは「審査通過 + リリース」であって「ビルド作成」ではない |
| C | **設定取得に失敗したら通す（フェイルオープン）**。ネットワーク断・API 500・タイムアウトでブロックしない。2.1(a) の "turn on your back-end service!" に直結する |
| D | **ブロック画面でも「アプリの外に出られる」導線を残す**（ストアを開くボタン、後述の問い合わせ導線）。完全な袋小路にしない |
| E | 審査メモに「本アプリは最小バージョンチェックを行うが、審査対象ビルドは常に許可される」旨を 1 行書いておくと、誤解による差し戻しを減らせる（Apple の要求ではない。運用上の推奨） |

### 1.3 App Store へ誘導する URL

- **Apple 自身のサンプルコードが使っている形式**は `https://apps.apple.com/...`。
  StoreKit の「Requesting App Store reviews」ドキュメントのサンプルには
  `https://apps.apple.com/app/idYOURAPPSTOREID?action=write-review` が含まれる
  （<https://developer.apple.com/documentation/storekit/requesting-app-store-reviews>、アクセス 2026-09-06）。
  → **製品ページへは `https://apps.apple.com/app/id<APP_STORE_ID>` を使うのが、一次情報で裏の取れる唯一の形式。**
- **`itms-apps://` について**: developer.apple.com の公式ドキュメントに
  `itms-apps` スキームの記載を見つけられなかった（検索結果は Medium / フォーラム等の第三者情報のみ）。
  **公式に定義された URL スキームかどうかは確認できなかった（未確認）**。
  実務上は動作するが、**一次情報の裏が無い以上、既定は `https://apps.apple.com/...` にすべき**。
  iOS では App Store アプリが `apps.apple.com` を Universal Link として処理するため、
  `Linking.openURL('https://apps.apple.com/app/id...')` で App Store アプリが開く。
- **アプリ内にストアページを出す公式 API**: `SKStoreProductViewController`
  （"A view controller that provides a page where customers can purchase media from the App Store."、
  iOS 6.0+、非推奨マーク無し。<https://developer.apple.com/documentation/storekit/skstoreproductviewcontroller>、
  アクセス 2026-09-06）。ただし**これは「購入/入手」用であり、既にインストール済みのアプリの
  「更新」導線として機能するかは Apple ドキュメント上明記されていない（未確認）**。
  強制アップデートでは素直に App Store アプリへ遷移させるほうが確実。

### 1.4 Apple に「アップデートを促す公式 API」はあるか → **無い**

| API | 公式の定義（アクセス 2026-09-06） | アップデート促進に使えるか |
|---|---|---|
| `SKStoreReviewController` | "An object that controls the process of requesting App Store **ratings and reviews** from customers."（<https://developer.apple.com/documentation/storekit/skstorereviewcontroller>） | **不可**。評価/レビュー専用。しかも「システムは 365 日間で最大 3 回までしか表示しない」("the system displays the review prompt to a user a maximum of three times within a 365-day period") |
| `SKOverlay` | "A class that displays an overlay you can use to **recommend another app** or an App Clip's corresponding full app."（<https://developer.apple.com/documentation/storekit/skoverlay>） | **不可**。**別アプリ**または App Clip の親アプリの推奨専用。自アプリの更新用ではない |
| `SKStoreProductViewController` | "A view controller that provides a page where customers can **purchase media** from the App Store." | 製品ページ表示用。更新導線としての公式言及は無し（**未確認**） |

→ **iOS には Google Play の In-app updates API に相当する公式機構が存在しない。**
`expo-in-app-updates` の README も同じことを述べている:
"on iOS it opens the app in the App Store on a modal to update the app, **since iOS does not have any
in-app update solution**"（<https://www.npmjs.com/package/expo-in-app-updates>、アクセス 2026-09-06）。

→ したがって **iOS 側は「自前でバージョン比較 → 自前 UI → App Store へ遷移」以外の選択肢がない**。

---

## 2. Google Play

### 2.1 In-app updates API — Flexible / Immediate の公式定義

出典: <https://developer.android.com/guide/playcore/in-app-updates>（アクセス 2026-09-06）

> **Flexible updates**: "Flexible updates provide background download and installation with graceful state
> monitoring. This UX flow is appropriate when it's acceptable for the user to use the app while downloading
> the update. For example, you might want to encourage users to try a new feature that's not critical to the
> core functionality of your app."
>
> **Immediate updates**: "Immediate updates are fullscreen UX flows that **require the user to update and
> restart the app in order to continue using it**. This UX flow is best for cases where an update is
> **critical to the core functionality** of your app. After a user accepts an immediate update, Google Play
> handles the update installation and app restart."

適用条件・制約（同ページ）:

| 項目 | 内容 |
|---|---|
| 最低 API レベル | "The in-app updates feature is supported on devices running **Android 5.0 (API level 21) or higher**." |
| 対象デバイス | "in-app updates are only supported for **Android mobile devices, Android tablets, and ChromeOS devices**." |
| 非対応 | "In-app updates are **not compatible with apps that use APK expansion files (`.obb` files)**." |
| 依存関係 | `implementation("com.google.android.play:app-update:2.1.0")` / `app-update-ktx:2.1.0`（<https://developer.android.com/guide/playcore/in-app-updates/kotlin-java>） |

> **重要**: Immediate フローは「**Google Play が提供する公式の強制アップデート UX**」である。
> つまり Android では、独自ブロッキング画面を書く前に**まず Immediate フローを検討すべき**。

### 2.2 `clientVersionStalenessDays` と `updatePriority`

出典: <https://developer.android.com/guide/playcore/in-app-updates/kotlin-java>（アクセス 2026-09-06）

**`clientVersionStalenessDays()`** — `AppUpdateInfo` の**読み取り専用の値**。

> "Use `clientVersionStalenessDays()` to check the number of days since the update became available on the
> Play Store."

- **開発者が設定する値ではない**。Play Store アプリがそのアップデートを認識してからの経過日数。
- 公式が示す使い方は「経過日数に応じて Flexible → Immediate と段階的に強める」:
  「数日待って Flexible で通知し、そのさらに数日後に Immediate を要求する」。
- 実装例（公式）:
  ```kotlin
  if (appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
      && (appUpdateInfo.clientVersionStalenessDays() ?: -1) >= DAYS_FOR_FLEXIBLE_UPDATE
      && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) { /* ... */ }
  ```

**`updatePriority()`** — **開発者が Play Developer API で設定する値**。

> "The Google Play Developer API lets you set the priority of each update... Google Play uses an integer
> value between **0 and 5**, with **0 being the default and 5 being the highest priority**, and you can set
> the priority for an update using the **`inAppUpdatePriority` field under `Edits.tracks.releases`** in the
> Google Play Developer API."

Play Developer API 側の定義（<https://developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks>、
アクセス 2026-09-06）:

> `inAppUpdatePriority`: integer。"In-app update priority of the release. All newly added APKs in the release
> will be considered at this priority. Can take values in the range **[0, 5]**, with 5 the highest priority.
> Defaults to 0. **`inAppUpdatePriority` can not be updated once the release is rolled out.**"

> ⚠️ **後から変更できない**。「リリース後に緊急度を上げる」ことはできないので、
> 提出時に priority を決める必要がある。緊急に強制したくなった場合は §2.4 の app recovery を使う。

**ユーザーが Immediate をキャンセルしたとき**（公式ガイダンス、同ページ）:

- コールバック結果は `RESULT_OK` / `RESULT_CANCELED` / `ActivityResult.RESULT_IN_APP_UPDATE_FAILED`。
- 公式推奨: "**Let the user continue without the update and prompt them again later.**"
  「アップデート無しでは機能しない場合は、更新フローを再開するか終了を促す前に、**説明メッセージを表示する**」。
  → **無言で落とすのは公式に推奨されていない。**

**テスト時の要件**（<https://developer.android.com/guide/playcore/in-app-updates/test>、アクセス 2026-09-06）:

> - "Make sure your test device has a version of your app installed that supports in-app updates and was
>   installed using an **internal app sharing URL**."
> - "**In-app updates are only available to user accounts that own the app.** Make sure the account that
>   you're using has downloaded your app from Google Play at least once."
> - "Make sure that the app that you are using to test in-app updates has the **same application ID and
>   signing key** as the version available from Google Play."
> - "**Google Play can only update an app to a higher version code.**"
> - "The **`inAppUpdatePriority` field is not supported when uploading your app to internal app sharing.**"

> ⚠️ 実務上の含意: **Play からインストールされていないビルド（EAS の internal distribution APK、
> ローカル `expo run:android` など）では In-app updates は動作しない。**
> ここが「実装したのにテストできない」で詰まる最大の箇所。

### 2.3 Play ポリシー上、独自の強制アップデート画面は許容されるか

- **「独自のブロッキング UI を出してはならない」というポリシー条項は見つからなかった（未確認 = 禁止条項は存在しないと読める）。**
- ただし **Device and Network Abuse ポリシー**が「更新の**実行**」を厳格に制限している
  （<https://support.google.com/googleplay/android-developer/answer/9888379>、アクセス 2026-09-06）:

  > "An app distributed via Google Play **may not modify, replace, or update itself using any method other
  > than Google Play's update mechanism**."
  >
  > "an app **may not download executable code (such as dex, JAR, .so files) from a source other than Google
  > Play**."

**したがって切り分けは明快**:

| やること | 可否 |
|---|---|
| 自前のフルスクリーン画面で操作をブロックし、Play ストアの製品ページへ送る | **可**（ポリシー上の禁止条項なし） |
| Play In-app updates の Immediate フローを使う | **可**（Google 公式の推奨手段） |
| 自前で APK / dex / .so をダウンロードして更新・置換する | **不可**（Device and Network Abuse 違反） |
| JS バンドル等の非ネイティブ部分の OTA | Play の DNA ポリシーは「executable code (dex, JAR, .so)」を挙げている。EAS Update の適法性については Expo が「ストアのガイドラインに従う必要がある」としているのみで、**Google が EAS Update 方式を明示的に許可した一次情報は確認できなかった（未確認）** |

### 2.4 コード変更不要の公式手段: Play Console「Prompt users to update」/ `apprecovery` API

出典: <https://support.google.com/googleplay/android-developer/answer/13812041>（アクセス 2026-09-06）

- **何か**: Play Console の **Recovery tools**。「古い、または壊れたバージョンを使っているユーザーに、
  最新の互換バージョンへの更新を促す」。
- **コード変更不要**。`app-update` ライブラリの組み込みも不要。
- **UX**: フルスクリーンのダイアログ。**ブロッキングではなく、ユーザーは閉じられる**。
  ただし「閉じた場合、**アプリのコールドリスタートのたびに再表示される**」。
- **前提条件**: **Play App Signing への登録**と **Android App Bundle（AAB）での公開**が必須。
- **対象外**: Code Transparency / Play Automatic Protections / Key Upgrade を使うアプリ、
  Wear OS / Android TV / Android Automotive OS のリリース。
- **API 経由でも実行可能**: Play Developer API の `apprecovery` リソース
  （<https://developers.google.com/android-publisher/api-ref/rest/v3/apprecovery>、アクセス 2026-09-06）。
  - メソッド: `create`（DRAFT 作成）/ `deploy`（DRAFT → ACTIVE）/ `addTargeting` / `cancel` / `list`
  - `create` の body: `targeting` + union field `recovery_action`。サポートされる型は
    **`remoteInAppUpdate` のみ**で、`isRemoteInAppUpdateRequested: true` を指定
    （<https://developers.google.com/android-publisher/api-ref/rest/v3/apprecovery/create>）
  - `Targeting`（<https://developers.google.com/android-publisher/api-ref/rest/v3/Targeting>）:
    - `versionList`（`AppVersionList.versionCodes[]`, int64）または
      `versionRange`（`versionCodeStart` / `versionCodeEnd`、いずれも inclusive）
    - 併せて `androidSdks` / `regions` / `allUsers`
  - `create` は DRAFT を作るだけで実行しない。`deploy` で ACTIVE になる。

> **設計上の含意**: Android では「リリース時に決めた `inAppUpdatePriority`」が後から変えられないのに対し、
> **`apprecovery` は事後に（コードを変えずに）特定 versionCode 範囲へ更新プロンプトを出せる**。
> 「出してしまった不具合版を回収する」用途はこちらが正しい道具。

### 2.5 Play ストアへ誘導する URL

出典: <https://developer.android.com/distribute/marketing-tools/linking-to-google-play>（アクセス 2026-09-06）

- **公式に記載されている製品ページの形式**:
  ```
  https://play.google.com/store/apps/details?id=<package_name>
  ```
- **アプリ内からの遷移について公式が示す方法**:
  > "If you want to link to your products from an Android app, create an `Intent` that opens a URL. As you
  > configure this intent, pass **`"com.android.vending"` into `Intent.setPackage()`** so that users see your
  > app's details in the Google Play Store app instead of a chooser."
  ```kotlin
  val intent = Intent(Intent.ACTION_VIEW).apply {
      data = Uri.parse("https://play.google.com/store/apps/details?id=com.example.android")
      setPackage("com.android.vending")
  }
  ```
- **`market://details?id=` について**: 現行の当該公式ページ本文を全文検索したが、
  `market://` は **Google Play Instant 用の `market://launch` しか記載されておらず、
  `market://details?id=` の記載は見つからなかった（未確認）**。
  歴史的に広く使われているが、**現行公式ドキュメントに裏付けは無い**。

**React Native / Expo での実務**:

- RN の `Linking.openURL()` には `setPackage()` に相当する引数が無い。
- したがって **`https://play.google.com/store/apps/details?id=<pkg>` を `Linking.openURL` に渡す**のが、
  一次情報に沿った最も無難な選択。Play ストアアプリがこの URL を App Link として処理するため、
  通常はストアアプリが直接開く。
- **Play ストアが無い端末（一部の中国系 ROM 等）では失敗しうる**ため、
  `Linking.openURL` の失敗を catch してログ + ユーザーに URL を提示するフォールバックを置く
  （`.claude/rules/error-handling.md`: catch は握りつぶさない）。

---

## 3. Expo / React Native 側の一次情報

### 3.1 `expo-application`

出典: <https://docs.expo.dev/versions/latest/sdk/application/>（アクセス 2026-09-06）

| API | 公式の定義（原文） | iOS | Android |
|---|---|---|---|
| `Application.nativeApplicationVersion` | "The human-readable version of the native application that may be displayed in the app store. At time when native app is built, on Android, this is the version name set by `version` in app config, and on iOS, the `Info.plist` value for `CFBundleShortVersionString`. On web, this value is `null`." 例: `"2.11.0"` | `CFBundleShortVersionString` | `versionName`（app config の `version`） |
| `Application.nativeBuildVersion` | "The internal build version of the native application that the app stores may use to distinguish between different binaries. At the time when native app is built, On Android, this is the version code set by `android.versionCode` in app config, and on iOS, the `Info.plist` value for `CFBundleVersion` (set with `ios.buildNumber` value in app config in a standalone app). **The return type on Android and iOS is `string`.**" 例: `"114"` | `CFBundleVersion` | `versionCode` |
| `Application.applicationId` | "The ID of the application. On Android, this is the application ID. On iOS, this is the bundle ID." | bundle ID | applicationId |

- 型は両方とも **`string | null`**。**Android の `versionCode` も文字列で返る**ので、
  数値比較する場合は明示的に `Number.parseInt` する（**`nativeBuildVersion` を文字列比較してはならない**）。
- Web では両方 `null`。**Web ビルドを持つ本リポジトリでは `null` 分岐が必須**。
- npm: `expo-application@57.0.2`（published 2026-07-17）、MIT、週次 DL 約 551万
  （<https://registry.npmjs.org/expo-application> / <https://api.npmjs.org/downloads/point/last-week/expo-application>、アクセス 2026-09-06）。

### 3.2 `expo-constants` の `Constants.expoConfig` との違い（**ここが罠**）

出典: <https://docs.expo.dev/versions/latest/sdk/constants/>（アクセス 2026-09-06）

- `Constants.expoConfig` の定義:
  > "The standard Expo config object defined in **app.json** and **app.config.js** files.
  > **For both classic and modern manifests, whether they are embedded or remote.**"
  型は `ExpoConfig & { hostUri: string } | null`。

- **Expo 公式が明示している差分**（`Constants.platform.ios.buildNumber` の説明、原文）:
  > "The build number specified in the embedded **Info.plist** value for `CFBundleVersion` in this app...
  > **This may differ from the value in `Constants.expoConfig.ios.buildNumber` because the manifest can be
  > updated, whereas this value will never change for a given native binary.**"

  → **`expoConfig` は manifest 由来であり、OTA 更新で書き換わりうる。
  バイナリの実バージョンではない。** さらに同ドキュメントは Android の `versionCode` について
  「**Deprecated: Use expo-application's `Application.nativeBuildVersion`.**」と明記している。

**結論: 強制アップデート判定に `Constants.expoConfig.version` を使ってはならない。**
OTA を後から入れた瞬間に、「更新後の manifest の version」を「バイナリの version」として誤判定する。

#### 3.2.3 本リポジトリ固有の事情（`appVersionSource: "remote"`）

出典: <https://docs.expo.dev/build-reference/app-versions/>（アクセス 2026-09-06）

- `cli.appVersionSource: "remote"` のとき:
  > "the remote version source values are set on the native project when running a build, which is
  > considered the **source of truth**"
  > "the build version values stored in app config are **ignored and not updated** when the version is
  > incremented remotely."
- `autoIncrement` の対象は **developer-facing の `versionCode` / `buildNumber` のみ**。
  > "**`autoIncrement` does not support the `version` option**" — ユーザー向け `version` は手動更新。

**このリポジトリの実測**（`frontend/apps/mobile/app.json` / `eas.json`、2026-09-06 時点）:

- `eas.json`: `"appVersionSource": "remote"`、全プロファイルで `"autoIncrement": true`
- `app.json`: `expo.version = "1.0.0"`、**`ios.buildNumber` / `android.versionCode` は存在しない**
- `app.json` に **`runtimeVersion` の設定は無い**
- `package.json` に **`expo-updates` も `expo-application` も無い**（EAS Update 未配線）

→ したがって:

| 取りたい値 | 取得方法 | 備考 |
|---|---|---|
| ユーザー向けバージョン（`1.0.0`） | `Application.nativeApplicationVersion` | `Constants.expoConfig.version` でも今は同じ値になるが、OTA 導入で乖離するので使わない |
| ビルド番号 / versionCode | **`Application.nativeBuildVersion` 一択** | `app.json` に値が無いため `Constants.expoConfig` からは**そもそも取得できない**（EAS がビルド時に native プロジェクトへ書き込む） |

→ **`expo-application` の追加が事実上必須**（`npx expo install expo-application`）。

### 3.3 `expo-updates` / EAS Update と「ストア更新の強制」の役割分担

出典: <https://docs.expo.dev/eas-update/introduction/>（アクセス 2026-09-06）

**OTA で配れるもの**:
> "enabling an app to update its own **non-native pieces (such as JS, styling, and images)** over-the-air"

**新しいバイナリ（＝ストア更新）が必要なもの**（公式の列挙）:
- "Change to native code or native dependencies"
- "Change to app permissions (camera, location, and others)"
- "Update the Expo SDK version"
- "Anything that requires a new app binary version"

**runtimeVersion**（<https://docs.expo.dev/eas-update/runtime-versions/> および
<https://docs.expo.dev/versions/latest/sdk/updates/>、アクセス 2026-09-06）:

> "a property that guarantees compatibility between a build's native code and an update."
> "EAS Update uses runtime version policies to ensure updates are only sent to builds with compatible native
> code. If your native code changes, you create a new runtime version."

**現行 SDK 57 のドキュメントに記載されているポリシーは 3 つ**（`sdkVersion` は当該ページに記載が無い＝
現行ドキュメントでは提示されていない）:

| policy | 解決される値（原文ベース） |
|---|---|
| `appVersion` | "The `"appVersion"` policy will set the runtime version to the project's current `"version"` property." 例: `version: "1.0.0"` → runtimeVersion `"1.0.0"` |
| `nativeVersion` | "the combination of `"[version]([buildNumber\|versionCode])"`" 例: `"1.0.0(1)"`。**「このポリシーはビルドごとの native version 管理を手動で行う必要がある」**と明記 |
| `fingerprint` | "`@expo/fingerprint` パッケージを使ってビルド時と更新時にプロジェクトのハッシュを計算し、build-update の互換性（＝ runtime）を判定する"。"works for both projects with and without custom native code" |

> **`appVersionSource: "remote"` + `autoIncrement` を使う本リポジトリでは、
> `nativeVersion` ポリシーは相性が悪い**（buildNumber が EAS 側で自動採番されるため runtimeVersion が
> ビルドごとに変わり、OTA の配信先が毎回分断される）。
> **`fingerprint`（native 変更を自動検出）または `appVersion`（`version` を手動運用）**のどちらかを選ぶ。
> ただし本リポジトリはまだ `expo-updates` を入れていないので、この判断は OTA 導入時に行えばよい。

**役割分担（公式ドキュメントから導かれる整理）**:

| 直したいもの | 手段 |
|---|---|
| JS のバグ・文言・スタイル | **EAS Update（OTA）**。ストア更新も強制アップデートも不要 |
| native コード / native 依存 / 権限 / Expo SDK | **ストア更新が必須**。ここで初めて「強制アップデート」が意味を持つ |
| 「配ってしまった壊れた JS」の巻き戻し | EAS Update の再パブリッシュ / ロールバック（強制アップデートの出番ではない） |

> **原則**: 強制アップデートは「**OTA では直せないもの**」のためだけに使う。
> OTA で直せるものを強制アップデートで押しつけると、ユーザーに不要な負担をかけ、
> §1.1 の 2.1 リスクだけが増える。

### 3.4 Expo エコシステムの in-app updates ライブラリ（実測）

registry / GitHub での実測（すべてアクセス 2026-09-06）。
`.claude/rules/minimal-implementation.md` §3.1 の 7 項目の観点で並べる。

| パッケージ | 最新版 / 公開日 | 週次DL | Stars | License | 依存 | 実装 |
|---|---|---|---|---|---|---|
| [`expo-in-app-updates`](https://www.npmjs.com/package/expo-in-app-updates) | `0.12.0` / **2026-06-07** | **36,545** | 297（<https://github.com/SohelIslamImran/expo-in-app-updates>） | MIT | runtime deps **なし**、peer `expo: *` | Android = Play In-app updates API / iOS = **iTunes Search API + App Store をモーダルで開く** |
| [`sp-react-native-in-app-updates`](https://www.npmjs.com/package/sp-react-native-in-app-updates) | `2.0.0` / **2026-07-10** | **44,387** | 583（<https://github.com/SudoPlz/sp-react-native-in-app-updates>） | MIT | `react-native-device-info` を必要とする（Expo では Constants への差し替えが要る旨 README に記載） | Android = Play Core / iOS = iTunes Search API（既定）または `react-native-siren` |
| [`react-native-in-app-updates`](https://www.npmjs.com/package/react-native-in-app-updates) | `0.3.2` / 2026-08-04 | **406** | 未取得 | MIT | — | — |

補足（すべて一次情報）:

- 3 つとも **archived ではない**。`@sudoplz/sp-react-native-in-app-updates` という scoped 版は
  **npm に存在しない**（404）。
- `expo-in-app-updates` はリリースに空白がある: `0.10.0-beta.0` が 2025-04-06、次の `0.10.0` が
  **2026-06-06**（約 14 か月の間隔）。その後 `0.11.0` / `0.12.0` を連続公開。**現在はメンテされている**が、
  過去に長期停滞した実績がある点は選定時に織り込むこと。
- `expo-in-app-updates` の API（README より）:
  `checkForUpdate()` → `{ updateAvailable, flexibleAllowed, immediateAllowed, storeVersion, releaseDate,
  daysSinceRelease, serverPriority, serverUpdateType }`。
  `daysSinceRelease` は Android の `clientVersionStalenessDays` をそのまま返す。
  iOS 設定は `app.json` の `ios.infoPlist` に `AppStoreID`（+必要なら `AppStoreCountry`）を置く方式。
- **いずれも native モジュール**。**Expo Go では動作せず、development build / EAS Build が必要**。
- **重大な注意（iOS 側の設計）**: 3 つとも iOS では
  **`https://itunes.apple.com/lookup` を全クライアントから叩く**。Apple の公式ドキュメントは
  この API について "The Search API is limited to **approximately 20 calls per minute** (subject to change)."
  と明記し、さらに利用条件は**アフィリエイト / プロモーション目的**を前提とした文言になっている
  （<https://performance-partners.apple.com/search-api>、アクセス 2026-09-06）。
  → **本番アプリの全起動でこれを叩くのは、レート制限・規約の両面でリスクがある。**
  最小バージョンは自前バックエンド（本リポジトリでは Supabase）で持つべき。

---

## 4. バージョン比較の実務

### 4.1 iOS: `CFBundleShortVersionString` / `CFBundleVersion`

出典: Apple Developer Documentation（アクセス 2026-09-06）

**`CFBundleShortVersionString`**（<https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleshortversionstring>）
> "The release or version number of the bundle."
> "This key is a **user-visible** string for the version of the bundle. **The required format is three
> period-separated integers**, such as 10.14.1. **The string can only contain numeric characters (0-9) and
> periods.**"

**`CFBundleVersion`**（<https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleversion>）
> "The version of the build that identifies an iteration of the bundle."
> "This key is a **machine-readable** string composed of **one to three period-separated integers**...
> **The string can only contain numeric characters (0-9) and periods.**"
> "You can include more integers but **the system ignores them**."
> "You can also abbreviate the build version by using only one or two integers, where missing integers in the
> format are interpreted as zeros. For example, 0 specifies 0.0.0, 10 specifies 10.0.0, and 10.5 specifies 10.5.0."

**重要な帰結**:

1. **iOS の marketing version にプレリリースタグ（`-beta` / `-rc.1`）は入れられない。**
   Apple の仕様が「数字とピリオドのみ」なので、**semver のプレリリース比較は iOS では原理的に不要**。
   → 「プレリリースタグを正しく比較する」ためだけに semver ライブラリを入れる理由は無い。
2. `CFBundleVersion` は 4 桁以上書いても**システムが無視する**。EAS の `autoIncrement` は
   単調増加の整数を入れるので問題にならない。
3. 桁数の**上限に関する明記は Apple ドキュメントに見つからなかった（未確認）**。

### 4.2 Android: `versionCode` / `versionName`

出典: <https://developer.android.com/studio/publish/versioning>（アクセス 2026-09-06）

**`versionCode`**
> "**A positive integer** used as an internal version number. This number helps determine whether one version
> is more recent than another, with higher numbers indicating more recent versions... The Android system uses
> the `versionCode` value to protect against downgrades by preventing users from installing an APK with a
> lower `versionCode` than the version currently installed on their device."
> "**The greatest value Google Play allows for `versionCode` is 2100000000.**"
> "make sure that each successive release of your app uses a greater value."

**`versionName`**
> "A string used as the version number shown to users... The value is a string so that you can describe the
> app version as a `<major>.<minor>.<point>` string **or as any other type of absolute or relative version
> identifier**. The `versionName` is the only value displayed to users."

**帰結**: `versionName` は**構造の保証が無い自由文字列**。したがって
**`versionName` を機械的な比較に使うのは仕様上サポートされていない**。
比較は `versionCode`（正の整数、単調増加、上限 2,100,000,000）で行うのが正しい。

### 4.3 semver 自前比較の落とし穴

出典: <https://semver.org/>（Semantic Versioning 2.0.0、アクセス 2026-09-06）

| 落とし穴 | 内容 |
|---|---|
| **文字列比較は必ず壊れる** | `"1.10.0" < "1.9.0"` が `true` になる（`'1' < '9'` の辞書順）。仕様は「Major, minor, and patch versions are **always compared numerically**」と定めている。**必ず `.` で分割して数値比較する** |
| **ゼロ埋めも壊れる** | `parseInt` を使えば `01` = `1` だが、`"1.01.0"` と `"1.1.0"` は文字列としては別物になる。正規化してから比較する |
| **プレリリースは通常版より小さい** | "a pre-release version has **lower** precedence than a normal version: `1.0.0-alpha < 1.0.0`"。素朴に `split('.')` すると `1.0.0-alpha` の patch が `NaN` になる |
| **プレリリースの比較規則が複雑** | "Identifiers consisting of only digits are compared numerically. Identifiers with letters or hyphens are compared **lexically in ASCII sort order**. Numeric identifiers always have **lower** precedence than non-numeric identifiers." → `1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta < 1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0-rc.1 < 1.0.0` |
| **build metadata は比較に含めない** | "Build metadata does not figure into precedence"（`1.0.0+build.1` と `1.0.0` は同順位） |
| **桁数の違い** | `"1.2"` と `"1.2.0"` を同一視するか決める必要がある。CFBundleVersion は「欠けた整数は 0 と解釈」（Apple の明記）だが、これは仕様の異なる別ルール |

**このリポジトリでの推奨**:

> **バージョン比較は semver ではなく「単調増加する整数（build number / versionCode）」で行う。**
>
> - iOS: `CFBundleVersion` = `Application.nativeBuildVersion`（EAS `autoIncrement` が単調増加を保証）
> - Android: `versionCode` = `Application.nativeBuildVersion`（同上）
> - **これなら `Number.parseInt` 1 回で比較でき、semver の落とし穴が 1 つも発生しない。**
> - 表示用（「v1.2.0 → v1.3.0 にアップデート」）だけ `nativeApplicationVersion` を使う。
>   **表示と判定を混ぜない。**
>
> ただし `nativeBuildVersion` は **プラットフォームごとに独立した採番**なので、
> **最小バージョンの設定値も iOS / Android で別々に持つ**必要がある（同じ数字にならない）。

---

## 5. 本リポジトリへの推奨設計（一次情報から導かれる形）

> 本節は調査結果からの**提案**であり、採否は `PROJECT.md` の決定事項として
> ユーザーが決めるべきもの（`mode: boilerplate` の現状では未決定のまま置いてよい）。

### 5.1 判定データの持ち方

`.claude/rules/supabase-first.md` の判断順（supabase-js → Edge Functions → backend-py）に従うと、
**単純な読み取りなので supabase-js で完結する**。

```
テーブル: app_min_versions
  platform            text  ('ios' | 'android')   -- PK の一部
  min_supported_build integer                     -- これ未満はブロック（強制）
  recommended_build   integer                     -- これ未満は推奨（後で可）
  store_url           text
  updated_at          timestamptz                 -- UTC（datetime.md）
```

- RLS: **anon に SELECT のみ許可**（機密ではない。書き込みは service_role / 管理者のみ）。
- クライアントは起動時に 1 回だけ読む。**取得失敗時はブロックしない**（フェイルオープン。§1.2 原則 C）。
- iTunes Lookup API / Play へのクライアント直問い合わせは**しない**（§3.4 の Apple 規約・レート制限）。

### 5.2 判定ロジック（プラットフォーム共通）

```ts
// build は Application.nativeBuildVersion（string）を parseInt したもの
// 取得できない（web / null / NaN）ときは 'none'（フェイルオープン）
type Gate = 'none' | 'recommended' | 'forced'
```

不変条件:

1. `build >= min_supported_build` なら**絶対にブロックしない**（審査中ビルドを弾かないための原則 A）
2. `min_supported_build` の引き上げは**ストア配信開始後**（原則 B）
3. 取得失敗・パース失敗はすべて `'none'`（原則 C）
4. `recommended` は**セッションに 1 回まで**表示し、「後で」を押したら記憶して黙る
   （`.claude/rules/list-pagination.md` の思想と同じく、うるさい UI は品質欠陥）

→ このロジックは `features/app-update/model/` に置き、**TDD 必須**（`.claude/rules/tdd.md`）。
UI は `features/app-update/ui/` で **Storybook 必須・単体テスト不要**（`.claude/rules/ui-testing.md`）。
文言は **en / ja 両方**（`.claude/rules/i18n.md`）。

### 5.3 プラットフォーム別の手段

| | 推奨（`recommended`） | 強制（`forced`） |
|---|---|---|
| **iOS** | 自前のダイアログ（「後で」あり）→ `Linking.openURL('https://apps.apple.com/app/id<ID>')` | 自前のフルスクリーン（「後で」なし）→ 同上。**公式 API は存在しない**（§1.4） |
| **Android** | **Play In-app updates の Flexible フロー**（公式手段）。ライブラリを入れないなら自前ダイアログ → `https://play.google.com/store/apps/details?id=<pkg>` | **Play In-app updates の Immediate フロー**（Google 公式の強制 UX）。導入しないなら自前フルスクリーン → 同上 |
| **サーバ側の緊急手段（Android のみ）** | — | Play Console **Recovery tools / `apprecovery` API**（コード変更不要、versionCode 範囲指定可）。**`inAppUpdatePriority` はリリース後変更不可**なので、事後対応はこちら（§2.4） |

**ライブラリを入れるかの判断**（`minimal-implementation.md` §1 の順序）:

- `expo-in-app-updates` は MIT / 無依存 / 週次 36k DL / 現在メンテ中 → 選定基準は概ね満たす。
- ただし **iOS 側の価値はほぼ無い**（App Store を開くだけ ＝ `Linking.openURL` 1 行で足りる）。
  むしろ iTunes Lookup を叩く挙動が**不要なリスク**になる。
- **価値があるのは Android の Immediate / Flexible フローだけ**。
  → **「Android の Play 公式フローが要るか」で採否を決める**。要らないなら
  **`expo-application` + `Linking` + Supabase の 3 点だけで実装でき、依存を 1 つも増やさない**。

### 5.4 このリポジトリで先に必要になる作業

1. `npx expo install expo-application`（`Constants.expoConfig` からビルド番号が取れないため必須。§3.2.3）
2. `PROJECT.md` の `distribution` に mobile が含まれることの確認（`mode: boilerplate` の現状では未決定）
3. App Store ID / package name は `PROJECT.md` / `app.json` の TODO。**確定するまで URL は組み立てられない**
4. OTA を入れるなら `expo-updates` の導入と `runtimeVersion` ポリシーの決定（`fingerprint` か `appVersion`。§3.3）

---

## 6. 分からなかったこと（推測で埋めていない項目）

| # | 項目 |
|---|---|
| 1 | **Apple が強制アップデートを明示的に許可/禁止した条項**。Review Guidelines 全文を検索したが該当なし。§1.1 のリスク評価は 2.1(a) の条文からの推論であり、Apple の明示的見解ではない |
| 2 | **「強制アップデート画面でレビュアーがブロックされ 2.1 でリジェクトされた」という Apple 一次情報の事例**。見つからなかった（第三者ブログには多数あるが、本レポートでは根拠に採用しない） |
| 3 | **`itms-apps://` スキームの Apple 公式ドキュメント**。developer.apple.com に記載を見つけられなかった |
| 4 | **`market://details?id=` の現行 Google 公式ドキュメント**。当該ページには `market://launch`（Instant 用）しか記載が無かった |
| 5 | **`SKStoreProductViewController` を「インストール済みアプリの更新導線」として使えるか**の公式言及 |
| 6 | **Google Play が EAS Update 方式の JS OTA を明示的に許可した一次情報**。DNA ポリシーは "dex, JAR, .so" を挙げているのみ |
| 7 | **`CFBundleShortVersionString` / `CFBundleVersion` の各整数の桁数上限**（Apple ドキュメントに記載なし） |
| 8 | **Play Console Recovery tools の「1 アプリあたり実行可能な recovery action 数」等の上限**。ヘルプページからは読み取れなかった |
| 9 | **`react-native-in-app-updates` (aravind3566) の GitHub 指標**（stars / 最終コミット）。この実行環境から GitHub API にアクセスできず未取得。週次 DL 406 と低いため、いずれにせよ `minimal-implementation.md` §3.3 の「採用を見送るサイン」に該当 |
| 10 | **Expo 公式が「強制アップデートの推奨実装」を示したドキュメント**。存在を確認できなかった（EAS Update のガイドラインへの言及のみ） |

---

## 7. 出典一覧（すべてアクセス日 2026-09-06）

### Apple
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 2.1 / 2.5.2 / 2.5.9 / 3.1.1 / 4.2 / 4.2.3 の全文
- [SKStoreReviewController](https://developer.apple.com/documentation/storekit/skstorereviewcontroller) — 評価/レビュー専用
- [Requesting App Store reviews](https://developer.apple.com/documentation/storekit/requesting-app-store-reviews) — 365 日で最大 3 回 / `https://apps.apple.com/app/id...` 形式
- [SKOverlay](https://developer.apple.com/documentation/storekit/skoverlay) — 別アプリ / App Clip 親アプリの推奨専用
- [SKStoreProductViewController](https://developer.apple.com/documentation/storekit/skstoreproductviewcontroller)
- [CFBundleShortVersionString](https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleshortversionstring)
- [CFBundleVersion](https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundleversion)
- [iTunes Search API (Apple Services Performance Partners)](https://performance-partners.apple.com/search-api) — 約 20 calls/min

### Google
- [In-app updates](https://developer.android.com/guide/playcore/in-app-updates) — Flexible / Immediate の定義、API 21+、対応デバイス
- [Support in-app updates (Kotlin or Java)](https://developer.android.com/guide/playcore/in-app-updates/kotlin-java) — `app-update:2.1.0`、`clientVersionStalenessDays`、`updatePriority`、キャンセル時の推奨
- [Test in-app updates](https://developer.android.com/guide/playcore/in-app-updates/test) — internal app sharing 必須、`inAppUpdatePriority` 非対応
- [Edits.tracks (Play Developer API)](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks) — `inAppUpdatePriority` 0–5 / ロールアウト後変更不可
- [Device and Network Abuse policy](https://support.google.com/googleplay/android-developer/answer/9888379) — Play 以外の更新機構の禁止
- [Prompt users to update to your latest app version](https://support.google.com/googleplay/android-developer/answer/13812041) — Recovery tools、Play App Signing + AAB 必須、非ブロッキング
- [apprecovery (Play Developer API)](https://developers.google.com/android-publisher/api-ref/rest/v3/apprecovery) / [apprecovery.create](https://developers.google.com/android-publisher/api-ref/rest/v3/apprecovery/create) / [Targeting](https://developers.google.com/android-publisher/api-ref/rest/v3/Targeting)
- [Version your app](https://developer.android.com/studio/publish/versioning) — versionCode 上限 2100000000、versionName は自由文字列
- [Link to your products (Google Play)](https://developer.android.com/distribute/marketing-tools/linking-to-google-play) — `https://play.google.com/store/apps/details?id=`、`setPackage("com.android.vending")`

### Expo
- [Application (expo-application)](https://docs.expo.dev/versions/latest/sdk/application/)
- [Constants (expo-constants)](https://docs.expo.dev/versions/latest/sdk/constants/) — `expoConfig` は manifest 由来 / `nativeBuildVersion` 推奨
- [EAS Update introduction](https://docs.expo.dev/eas-update/introduction/) — OTA で配れるもの / ストアのルール遵守
- [Runtime versions and updates](https://docs.expo.dev/eas-update/runtime-versions/)
- [Updates (expo-updates) — runtime version policies](https://docs.expo.dev/versions/latest/sdk/updates/) — `appVersion` / `nativeVersion` / `fingerprint`
- [App version management](https://docs.expo.dev/build-reference/app-versions/) — `appVersionSource` remote/local、`autoIncrement`

### その他
- [Semantic Versioning 2.0.0](https://semver.org/) — precedence 規則
- npm registry / downloads API: [expo-in-app-updates](https://www.npmjs.com/package/expo-in-app-updates) / [sp-react-native-in-app-updates](https://www.npmjs.com/package/sp-react-native-in-app-updates) / [react-native-in-app-updates](https://www.npmjs.com/package/react-native-in-app-updates)
- GitHub: [SohelIslamImran/expo-in-app-updates](https://github.com/SohelIslamImran/expo-in-app-updates) / [SudoPlz/sp-react-native-in-app-updates](https://github.com/SudoPlz/sp-react-native-in-app-updates)
