import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useColorScheme } from '@workspace/ui/mobile/hooks'
import type { PropsWithChildren } from 'react'

/**
 * アプリケーションプロバイダー
 * テーマ、認証状態、QueryClient などを提供
 */
export function AppProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme()

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {children}
    </ThemeProvider>
  )
}
