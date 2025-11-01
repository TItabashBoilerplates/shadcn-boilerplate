import createMiddleware from 'next-intl/middleware'
import { routing } from './src/shared/config/i18n'

/**
 * Next.js Proxy (formerly Middleware)
 * next-intl を使用してロケールベースのルーティングを処理
 */
export default createMiddleware(routing)

export const config = {
  // 以下のパスを除くすべてのパス名にマッチ:
  // - /api で始まるもの
  // - /_next で始まるもの（Next.js の内部ファイル）
  // - /_vercel で始まるもの（Vercel の内部ファイル）
  // - ドットを含むもの（静的ファイル: favicon.ico など）
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
