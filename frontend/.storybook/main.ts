import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/nextjs'

// ESM環境では __dirname が使えないため import.meta.url から取得
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const config: StorybookConfig = {
  framework: '@storybook/nextjs',

  stories: [
    // ============================================
    // PACKAGES - Web UI のみ（Mobile は TailwindCSS 4 互換性問題のため一時無効）
    // ============================================
    {
      directory: '../packages/ui/web/components',
      files: '*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Packages/UI Web/Components',
    },
    {
      directory: '../packages/ui/web/magicui',
      files: '**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Packages/UI Web/MagicUI',
    },

    // ============================================
    // FSD LAYERS
    // ============================================
    {
      directory: '../apps/web/src/widgets',
      files: '**/ui/**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Widgets',
    },
    {
      directory: '../apps/web/src/shared/ui',
      files: '**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Shared',
    },
    {
      directory: '../apps/web/src/entities',
      files: '**/ui/**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Entities',
    },
    {
      directory: '../apps/web/src/features',
      files: '**/ui/**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Features',
    },

    // TODO: Mobile UI (gluestack-ui) - TailwindCSS 4 との互換性問題解決後に有効化
    // TODO: Views - i18n (@/shared/lib/i18n) 依存の解決後に有効化
  ],

  addons: ['@storybook/addon-docs', '@storybook/addon-themes'],

  typescript: {
    reactDocgen: 'react-docgen',
    check: false,
  },

  staticDirs: ['../apps/web/public'],

  // Webpack 設定: @/ エイリアスを解決
  webpackFinal: async (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': resolve(__dirname, '../apps/web/src'),
      }
    }
    return config
  },
}

export default config
