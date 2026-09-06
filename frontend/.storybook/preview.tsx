import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview } from '@storybook/react'
import { GluestackUIProvider } from '@workspace/native-ui/components'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '../apps/web/src/shared/config/i18n/messages/en.json'
import jaMessages from '../apps/web/src/shared/config/i18n/messages/ja.json'
import { deviceViewports } from './viewports'

// 実メッセージをそのまま読む。ダミー文言を置くとカタログと本番でテキスト量が変わり、
// 「Storybook では収まっていたのに本番で折り返す」という崩れ方をする。
const MESSAGES = { en: enMessages, ja: jaMessages } as const
type Locale = keyof typeof MESSAGES

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
    // 実機相当の画面幅に切り替えて確認するためのプリセット（ツールバーの Viewport から選ぶ）。
    // 「MobileView 用の Story を作らず Viewport ツールを使う」方針の前提になるもの。
    // ⚠️ ストア用スクショの生成には使えない（理由は ./viewports.ts のコメント参照）
    viewport: { options: deviceViewports },
  },
  // ツールバーからロケールを切り替えられるようにする。
  // 日本語は英語より文字幅が広く行数も変わるため、**両方で崩れないこと**を
  // カタログ上で確認できる必要がある（i18n は必須ポリシー）。
  globalTypes: {
    locale: {
      description: 'Locale',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'ja', title: '日本語' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: 'en' },
  decorators: [
    // apps/web のコンポーネントは next-intl の `useTranslations` を使うため、
    // プロバイダーが無いと **描画時に例外**になる（ビルドは通るので気づけない）。
    (Story, context) => {
      const locale = (context.globals.locale as Locale) ?? 'en'
      return (
        <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
          <Story />
        </NextIntlClientProvider>
      )
    },
    // Mobile ストーリーだけ gluestack のプロバイダーで包む。
    //
    // `GluestackUIProvider` は **`SafeAreaProvider` を供給する**。これが無いと
    // `useSafeAreaInsets()` が
    //   "No safe area value available. Make sure you are rendering `<SafeAreaProvider>`"
    // を投げ、**ストーリーが丸ごと空になる**（`#storybook-root` が空の div になる）。
    //
    // ⚠️ **ビルドも型も lint も通る。** 気づけるのは実際に描画したときだけ
    // （`.claude/rules/ui-testing.md`「ビルドが通ったで終わらせない」）。
    //
    // 対象は `Packages/UI Mobile/*` だけでなく **`Apps/Mobile/*` も**。
    // 実機では mobile の全画面が `AppProvider` → `GluestackUIProvider` の下にあるので、
    // 包むほうが本番の木構造に忠実でもある。
    (Story, context) => {
      const isMobileStory =
        context.title.startsWith('Packages/UI Mobile') || context.title.startsWith('Apps/Mobile')

      if (isMobileStory) {
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
