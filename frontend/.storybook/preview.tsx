import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview } from '@storybook/react'
import { GluestackUIProvider } from '@workspace/native-ui/components'

// Tailwind + デザイントークン。Web / Native 両方のクラスをここで生成している
// （詳細は ./storybook.css のコメント参照）
import './storybook.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    // Mobile ストーリーだけ gluestack のプロバイダーで包む。
    // SafeAreaProvider が無いと `useSafeAreaInsets()` が例外を投げるため、
    // SafeAreaView 等を含むストーリーはこれが無いとレンダリング自体が失敗する。
    (Story, context) => {
      if (context.title.startsWith('Packages/UI Mobile')) {
        return (
          <GluestackUIProvider>
            <Story />
          </GluestackUIProvider>
        )
      }
      return <Story />
    },
    // Web / Native 共通のテーマ切り替え。
    // Storybook のカタログは `.dark` クラス方式に寄せてある（./storybook.css 参照）。
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],
}

export default preview
