import { ThemeProvider } from '@react-navigation/native'
import { GluestackUIProvider } from '@workspace/native-ui/components'
import { NavigationDarkTheme, NavigationLightTheme } from '@workspace/native-ui/constants'
import { useColorScheme } from '@workspace/native-ui/hooks'
import { PostHogProvider } from 'posthog-react-native'
import type { PropsWithChildren } from 'react'
import { posthog } from '@/shared/lib/analytics'
import { AppUpdateGate } from './AppUpdateGate'
import { OneSignalInitializer } from './OneSignalInitializer'

/**
 * アプリケーションプロバイダー
 * テーマ、認証状態、QueryClient などを提供
 *
 * ## OneSignal 連携
 *
 * OneSignalInitializer にユーザー ID を渡すことで、
 * プッシュ通知の送信先とユーザーを紐付けることができます。
 *
 * ```tsx
 * // 認証状態がある場合
 * const { user } = useAuth()
 * <OneSignalInitializer userId={user?.id} />
 * ```
 *
 * ## 推奨 / 強制アップデート
 *
 * `AppUpdateGate` が `app_release_policies` を見て、下限を割っていれば
 * 画面を差し替える。**判定が終わるまでは何も出さない**ので、通信状況で
 * 起動が止まることはない（`.claude/skills/app-update/`）。
 */
export function AppProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme()

  // TODO: 認証状態を取得して OneSignalInitializer に渡す
  // const { user } = useAuth()

  return (
    // PostHog: usePostHog() を配下で利用可能にする。画面遷移は _layout で手動計測するため
    // captureScreens は無効化し、タッチ autocapture のみ有効にする。
    <PostHogProvider client={posthog} autocapture={{ captureScreens: false, captureTouches: true }}>
      {/* ナビゲーションの配色も @workspace/tokens 由来（Web / Desktop と共通） */}
      <ThemeProvider value={colorScheme === 'dark' ? NavigationDarkTheme : NavigationLightTheme}>
        {/* gluestack-ui のオーバーレイ / トーストのポータル */}
        <GluestackUIProvider>
          {/* OneSignal 初期化（認証連携は user?.id を渡す） */}
          <OneSignalInitializer userId={undefined} />
          {/* 推奨 / 強制アップデート。forced のときだけ children を差し替える */}
          <AppUpdateGate>{children}</AppUpdateGate>
        </GluestackUIProvider>
      </ThemeProvider>
    </PostHogProvider>
  )
}
