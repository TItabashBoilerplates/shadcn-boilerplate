/**
 * PostHog クライアント（Mobile / Expo・shared layer）
 *
 * `PostHogProvider client={posthog}` に渡すシングルトン。初期化値は `EXPO_PUBLIC_*`
 * 環境変数から読む（`@workspace/onesignal` の Mobile 実装と同じ規約）。
 * キー未設定（ローカル既定）のときは `disabled: true` で完全に無効化する。
 *
 * ## 追加の peer 依存（EAS dev/prod build 時に推奨）
 * より豊富なデバイス情報・永続化のため、ネイティブビルドを作る際は次を追加する:
 *
 * ```bash
 * npx expo install expo-file-system expo-application expo-device expo-localization
 * ```
 *
 * （ローカルの Metro/Expo Go では key 未設定＝disabled のため未導入でも動作を妨げない）
 *
 * @see https://posthog.com/docs/libraries/react-native
 * @module shared/lib/analytics
 */
import PostHog from 'posthog-react-native'

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

/** キーが設定されているときのみ計測を有効化する */
export const isAnalyticsEnabled = Boolean(apiKey)

/**
 * PostHog シングルトン。`AppProvider` の `PostHogProvider` に渡す。
 */
export const posthog = new PostHog(apiKey ?? 'placeholder', {
  host,
  // キー未設定時は送信しない（ローカル開発でのノイズ・課金を防ぐ）
  disabled: !isAnalyticsEnabled,
  // Application Installed/Updated/Opened 等のライフサイクルイベントを自動計測
  captureAppLifecycleEvents: true,
})
