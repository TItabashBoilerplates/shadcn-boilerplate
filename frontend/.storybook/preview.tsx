import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview } from '@storybook/react'
import type React from 'react'
import '../apps/web/src/app/styles/globals.css'

// GluestackUIProvider for Mobile components
import { GluestackUIProvider } from '../packages/ui/mobile/components/gluestack-ui-provider'

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
    // GluestackUIProvider wrapper for Mobile components
    (Story: React.ComponentType, context) => {
      // Only wrap Packages/UI Mobile stories with GluestackUIProvider
      const isMobileStory = context.title.startsWith('Packages/UI Mobile')
      if (isMobileStory) {
        return (
          <GluestackUIProvider mode="light">
            <Story />
          </GluestackUIProvider>
        )
      }
      return <Story />
    },
  ],
}

export default preview
