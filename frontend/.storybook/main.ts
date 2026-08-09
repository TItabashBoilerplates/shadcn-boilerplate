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
    // PACKAGES - Web UI のみ
    //
    // Mobile (packages/native-ui) のストーリーは意図的に登録していない。
    // NativeWind v5 は `className` を **Metro のトランスフォーマ**でスタイルへ変換する
    // 設計で、その実装元 react-native-css は「officially only supports Metro as the
    // bundler」と明言している（Webpack / Vite / Turbopack はコミュニティ実装待ち）。
    // このため Webpack ベースの @storybook/nextjs では className が変換されず、
    // react-native-web が未知の prop として捨てるため **全コンポーネントが無スタイル**で
    // 描画される（Tailwind 側は .bg-primary 等を正しく生成できており CSS の問題ではない）。
    // 登録すると「壊れた見た目のカタログ」ができてしまうので無効のままにする。
    //   - 上流: https://github.com/nativewind/react-native-css （README の Bundler 節）
    //   - 症状が同じ Storybook 側の issue: storybookjs/storybook#32018 / #31165
    // 有効化するには Storybook を NativeWind の変換が効く構成
    // （@storybook/react-native-web-vite + NativeWind preset 等）へ載せ替える必要がある。
    // ============================================
    {
      directory: '../packages/ui/src/components',
      files: '*.stories.@(js|jsx|ts|tsx)',
      titlePrefix: 'Packages/UI Web/Components',
    },
    {
      directory: '../packages/ui/src/magicui',
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

    // TODO: Mobile UI (gluestack-ui) - react-native-css が Metro 以外のバンドラに
    //       対応したら有効化（詳細は上記 PACKAGES ブロックのコメント）
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
  //   - `@workspace/ui/*`: subpath ごとに alias を張って exports をミラーする。
  //     Webpack5 の enhanced-resolve は `@workspace/ui` をパッケージとして解釈する。
  //     Next.js (Turbopack) は exports を解決するが、Storybook の Webpack5 builder では
  //     subpath alias で明示的にマッピングする必要がある。
  //     alias は `packages/ui/package.json` の `exports` フィールドと同期させる。
  //
  //     CSS など特定のファイルは ExportsFieldPlugin が AliasPlugin より先に走り、
  //     パッケージ解決に失敗してプレフィックス alias まで届かない場合があるため、
  //     `$` 付きの exact-match alias でファイル単位に直接マップしてバイパスする
  //     （webpack docs: resolve.alias で末尾 `$` は exact-match）。
  webpackFinal: async (config) => {
    if (config.resolve) {
      const uiSrc = resolve(__dirname, '../packages/ui/src')
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': resolve(__dirname, '../apps/web/src'),
        '@workspace/ui/styles/globals.css$': `${uiSrc}/styles/globals.css`,
        '@workspace/ui/components': `${uiSrc}/components`,
        '@workspace/ui/magicui': `${uiSrc}/magicui`,
        '@workspace/ui/lib': `${uiSrc}/lib`,
        '@workspace/ui/hooks': `${uiSrc}/hooks`,
        '@workspace/ui/styles': `${uiSrc}/styles`,
      }
    }
    return config
  },
}

export default config
