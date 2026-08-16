import { ThemeProvider } from '@react-navigation/native'
import { GluestackUIProvider } from '@workspace/native-ui/components'
import { NavigationDarkTheme, NavigationLightTheme } from '@workspace/native-ui/constants'
import { useColorScheme } from '@workspace/native-ui/hooks'
import { PostHogProvider } from 'posthog-react-native'
import type { PropsWithChildren } from 'react'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { posthog } from '@/shared/lib/analytics'
import { OneSignalInitializer } from './OneSignalInitializer'

/**
 * アプリケーションプロバイダー
 * テーマ、認証状態、QueryClient などを提供
 *
 * ## KeyboardProvider（アプリに 1 つだけ・最上位）
 *
 * `react-native-keyboard-controller` のコンポーネント
 * （`KeyboardAwareScrollView` / `KeyboardStickyView` 等）はこの Provider を前提にする。
 * **無いとエラーも警告も出さずに何もしない**ので、「キーボード回避が効かない」ときは
 * 最初にここを疑う。画面ごとに置かず、**ナビゲーターより外側**に 1 つだけ置くこと
 * （`.claude/rules/mobile-uiux.md` §1.2 / `mobile-uiux.policy.test.ts` が検査する）。
 *
 * ネイティブコードを含むため **Expo Go では動かない**（development build が必要）。
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
 */
export function AppProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme()

  // TODO: 認証状態を取得して OneSignalInitializer に渡す
  // const { user } = useAuth()

  return (
    // PostHog: usePostHog() を配下で利用可能にする。画面遷移は _layout で手動計測するため
    // captureScreens は無効化し、タッチ autocapture のみ有効にする。
    <PostHogProvider client={posthog} autocapture={{ captureScreens: false, captureTouches: true }}>
      {/* キーボード回避の土台。アプリ全体で 1 つだけ */}
      <KeyboardProvider>
        {/* ナビゲーションの配色も @workspace/tokens 由来（Web / Desktop と共通） */}
        <ThemeProvider value={colorScheme === 'dark' ? NavigationDarkTheme : NavigationLightTheme}>
          {/* gluestack-ui のオーバーレイ / トーストのポータル */}
          <GluestackUIProvider>
            {/* OneSignal 初期化（認証連携は user?.id を渡す） */}
            <OneSignalInitializer userId={undefined} />
            {children}
          </GluestackUIProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </PostHogProvider>
  )
}
