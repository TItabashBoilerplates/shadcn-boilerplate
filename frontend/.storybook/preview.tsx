import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview } from '@storybook/react'
import '@workspace/ui/styles/globals.css'

// TODO: Mobile UI (react-native-web) が有効化されたらコメントを解除
// import { GluestackUIProvider } from '@workspace/native-ui/components'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    // Theme switching for Web components
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
    // TODO: Mobile UI (react-native-web) が有効化されたらコメントを解除
    // (Story: React.ComponentType, context) => {
    //   const isMobileStory = context.title.startsWith('Packages/UI Mobile')
    //   if (isMobileStory) {
    //     return (
    //       <GluestackUIProvider>
    //         <Story />
    //       </GluestackUIProvider>
    //     )
    //   }
    //   return <Story />
    // },
  ],
}

export default preview
