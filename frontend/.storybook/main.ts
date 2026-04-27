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
      directory: '../packages/ui/web/src/components',
      files: '*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Packages/UI Web/Components',
    },
    {
      directory: '../packages/ui/web/src/magicui',
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
      directory: '../apps/web/src/entities',
      files: '**/ui/**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Entities',
    },
    {
      directory: '../apps/web/src/features',
      files: '**/ui/**/*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Features',
    },

    // NOTE: apps/web/src/shared/ には ui/ ディレクトリが存在しないため除外
    //       (現状の shared 配下: api / config / hooks / lib)
    //       UI を追加する場合はここに { directory: '../apps/web/src/shared/ui', ... } を復活させる

    // TODO: Mobile UI (gluestack-ui) - TailwindCSS 4 との互換性問題解決後に有効化
    // TODO: Views - i18n (@/shared/lib/i18n) 依存の解決後に有効化
  ],

  addons: ['@storybook/addon-docs', '@storybook/addon-themes'],

  typescript: {
    reactDocgen: 'react-docgen',
    check: false,
  },

  staticDirs: ['../apps/web/public'],

  // Webpack 設定:
  //   - `@/`: apps/web/src への FSD エイリアス
  //   - `@workspace/ui/web/*`: スコープ内に追加スラッシュを含む非標準パッケージ名のため、
  //     Webpack5 の enhanced-resolve が `@workspace/ui` をパッケージとして解釈してしまい、
  //     `node_modules/@workspace/ui/web/package.json` の `exports` を解決できない。
  //     Next.js (Turbopack) は exports を解決するが、Storybook の Webpack5 builder では
  //     subpath ごとに alias を張って exports をミラーする必要がある。
  //     alias は `packages/ui/web/package.json` の `exports` フィールドと同期させる。
  //
  //     CSS など特定のファイルは ExportsFieldPlugin が AliasPlugin より先に走り、
  //     非標準スコープのパッケージ解決に失敗してプレフィックス alias まで届かない。
  //     そのため `$` 付きの exact-match alias でファイル単位に直接マップしてバイパスする
  //     （webpack docs: resolve.alias で末尾 `$` は exact-match）。
  webpackFinal: async (config) => {
    if (config.resolve) {
      const uiWebSrc = resolve(__dirname, '../packages/ui/web/src')
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': resolve(__dirname, '../apps/web/src'),
        '@workspace/ui/web/styles/globals.css$': `${uiWebSrc}/styles/globals.css`,
        '@workspace/ui/web/components': `${uiWebSrc}/components`,
        '@workspace/ui/web/magicui': `${uiWebSrc}/magicui`,
        '@workspace/ui/web/lib': `${uiWebSrc}/lib`,
        '@workspace/ui/web/hooks': `${uiWebSrc}/hooks`,
        '@workspace/ui/web/styles': `${uiWebSrc}/styles`,
      }
    }
    return config
  },
}

export default config
