import { defineRouting } from 'next-intl/routing'

/**
 * i18n ルーティング設定
 * Feature Sliced Design の shared/config レイヤーに配置
 */
export const routing = defineRouting({
  // サポートする言語のリスト
  locales: ['en', 'ja'],

  // デフォルトの言語（マッチする言語がない場合に使用）
  defaultLocale: 'en',
})

// TypeScript 型エクスポート
export type Locale = (typeof routing.locales)[number]
