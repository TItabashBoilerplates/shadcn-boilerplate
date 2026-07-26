/**
 * OneSignal 初期化コンポーネント（Web ビルド用のスタブ）
 *
 * `react-native-onesignal` はネイティブモジュール（TurboModule）であり、
 * Metro の web ターゲット / 静的レンダリング（Node）では読み込めない。
 * Metro のプラットフォーム別解決（`.web.tsx`）で、web では何もしない実装に差し替える。
 *
 * Web アプリ側のプッシュ通知は `@workspace/onesignal`（react-onesignal）が担当する。
 */

interface OneSignalInitializerProps {
  /**
   * ユーザーID（認証されている場合）
   * null/undefined でログアウト状態
   */
  userId?: string | null
}

export function OneSignalInitializer(_props: OneSignalInitializerProps) {
  return null
}
