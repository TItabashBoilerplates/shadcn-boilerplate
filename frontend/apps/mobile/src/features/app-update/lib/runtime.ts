import * as Application from 'expo-application'
import { Linking, Platform } from 'react-native'
import type { AppPlatform } from '../model/types'

/**
 * ネイティブ側の実測値と OS 連携をまとめる層。
 * **判断は一切しない**（判断は `model/decide.ts` の純粋関数）。
 */

/**
 * ストア配布の対象プラットフォーム。それ以外（web / windows / macos）は `null`。
 *
 * `null` = アップデート判定を行わない。react-native-web ビルドや Storybook には
 * ストアという概念が無く、`expo-application` も web では全定数が `null` を返す。
 */
export function getStorePlatform(): AppPlatform | null {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS
  return null
}

/**
 * **いま動いているバイナリ**のマーケティング版。
 *
 * `expo-application.nativeApplicationVersion` は公式定義で
 * iOS = `CFBundleShortVersionString` / Android = `versionName` を読む。
 *
 * ⚠️ **`expo-constants` の `Constants.expoConfig?.version` を使ってはならない。**
 * Expo 公式が `Constants.platform.ios.buildNumber` の説明で明言している:
 *
 * > This may differ from the value in `Constants.expoConfig.ios.buildNumber`
 * > **because the manifest can be updated**, whereas this value will never change
 * > for a given native binary.
 *
 * つまり OTA（EAS Update）を当てた瞬間に `expoConfig` 側は「更新後の manifest の版」に
 * なり、**バイナリの実際の版とずれる**。「更新したのに強制アップデートが解けない」
 * 「古いのに解ける」という、一番デバッグしづらい壊れ方をする。
 * ネイティブの実測値だけを信じること。
 *
 * Expo Go / web では `null`。呼び出し側はフェイルオープンする。
 *
 * @see https://docs.expo.dev/versions/latest/sdk/application/
 * @see https://docs.expo.dev/versions/latest/sdk/constants/
 */
export function getCurrentAppVersion(): string | null {
  return Application.nativeApplicationVersion
}

/**
 * ストアのアプリページを開く。
 *
 * ## なぜ `https://` をそのまま開くのか（`itms-apps://` / `market://` を使わない理由）
 *
 * 一次情報で裏が取れるのは https 形式だけだから。
 *
 * - **iOS**: Apple 自身のサンプルコード（StoreKit "Requesting App Store reviews"）が
 *   `https://apps.apple.com/app/id<APPSTOREID>` を使っている。
 *   一方 **`itms-apps://` は developer.apple.com に記載が見つからない**。
 *   実務上は動くが、公式にサポートされた形式ではない。
 * - **Android**: 現行の公式ページが挙げる製品ページ URL は
 *   `https://play.google.com/store/apps/details?id=<package>` のみで、
 *   **`market://details?id=` は現行ドキュメントに記載が無い**。
 *   アプリ内からの公式手段は `Intent.ACTION_VIEW` + `setPackage("com.android.vending")` だが、
 *   React Native の `Linking` に `setPackage` 相当は無い。
 *   https 形式は Play ストアが App Link として処理する。
 *
 * どちらのプラットフォームでも、ストアアプリが在れば https がそこへ吸われ、
 * 無ければブラウザで開く（＝どの端末でも出口が残る）。
 *
 * @see https://developer.apple.com/documentation/storekit/requesting-app-store-reviews
 * @see https://developer.android.com/distribute/marketing-tools/linking-to-google-play
 */
export async function openStoreUrl(storeUrl: string): Promise<boolean> {
  try {
    await Linking.openURL(storeUrl)
    return true
  } catch (error: unknown) {
    // ストアアプリもブラウザも無い端末（法人管理端末など）。
    // 握りつぶさず、UI 側が「ストアで検索してください」を出せるように false を返す。
    console.error('Failed to open store URL:', { storeUrl, error })
    return false
  }
}
