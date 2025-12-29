import type { StorybookConfig } from '@storybook/nextjs'

const config: StorybookConfig = {
  framework: '@storybook/nextjs',

  stories: [
    // ============================================
    // PACKAGES
    // ============================================
    // packages/ui/web
    {
      directory: '../packages/ui/web/components',
      files: '**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Packages/UI Web/Components',
    },
    {
      directory: '../packages/ui/web/magicui',
      files: '**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Packages/UI Web/MagicUI',
    },
    // packages/ui/mobile (React Native Web)
    {
      directory: '../packages/ui/mobile/components',
      files: '**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Packages/UI Mobile/Components',
    },
    {
      directory: '../packages/ui/mobile/layout',
      files: '**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Packages/UI Mobile/Layout',
    },

    // ============================================
    // FSD LAYERS (apps/web)
    // ============================================
    // Shared
    {
      directory: '../apps/web/src/shared/ui',
      files: '**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Shared',
    },
    // Entities
    {
      directory: '../apps/web/src/entities',
      files: '**/ui/**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Entities',
    },
    // Features
    {
      directory: '../apps/web/src/features',
      files: '**/ui/**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Features',
    },
    // Widgets
    {
      directory: '../apps/web/src/widgets',
      files: '**/ui/**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Widgets',
    },
    // Views
    {
      directory: '../apps/web/src/views',
      files: '**/ui/**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Views',
    },
  ],

  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-themes',
    {
      name: '@storybook/addon-react-native-web',
      options: {
        modulesToTranspile: [
          'nativewind',
          'react-native-css-interop',
          'react-native-reanimated',
          '@gluestack-ui/button',
          '@gluestack-ui/core',
          '@gluestack-ui/nativewind-utils',
          '@gluestack-ui/overlay',
          '@gluestack-ui/toast',
          '@gluestack-ui/utils',
        ],
        babelPresetReactOptions: {
          jsxImportSource: 'nativewind',
        },
        babelPresets: ['nativewind/babel'],
        babelPlugins: ['react-native-reanimated/plugin'],
      },
    },
  ],

  typescript: {
    reactDocgen: 'react-docgen',
    check: false,
  },

  staticDirs: ['../apps/web/public'],
}

export default config
