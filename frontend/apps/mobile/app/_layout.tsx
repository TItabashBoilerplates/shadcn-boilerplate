import '../global.css'

import { Stack, usePathname } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef } from 'react'
import 'react-native-reanimated'

import { AppProvider } from '@/app'
import { posthog } from '@/shared/lib/analytics'

export const unstable_settings = {
  anchor: '(tabs)',
}

export default function RootLayout() {
  const pathname = usePathname()
  const previousPathname = useRef<string | undefined>(undefined)

  // Expo Router の画面遷移を手動計測（autocapture の captureScreens は無効）
  // client を直接使う: RootLayout は PostHogProvider の外側のため usePostHog は使えない
  // @see https://posthog.com/docs/libraries/react-native
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, { previous_screen: previousPathname.current ?? null })
      previousPathname.current = pathname
    }
  }, [pathname])

  return (
    <AppProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </AppProvider>
  )
}
