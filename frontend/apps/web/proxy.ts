import type { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { updateSession } from '@/shared/lib/supabase'
import { routing } from './src/shared/config/i18n'

/**
 * Next.js 16 Proxy (formerly Middleware)
 *
 * 統合機能:
 * 1. next-intl: ロケールベースのルーティング（i18n）
 * 2. Supabase: セッショントークンのリフレッシュ
 *
 * 処理順序:
 * - まず next-intl でルーティング処理
 * - 次に Supabase でセッション更新
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */
const handleI18nRouting = createMiddleware(routing)

export default async function proxy(request: NextRequest) {
  // Step 1: next-intl のルーティング処理
  const response = handleI18nRouting(request)

  // Step 2: Supabase セッション更新（レスポンスを渡す）
  return await updateSession(request, response)
}

export const config = {
  // 以下のパスを除くすべてのパス名にマッチ:
  // - /api で始まるもの
  // - /ingest で始まるもの（PostHog リバースプロキシ: next.config.ts の rewrites 宛先）
  // - /_next で始まるもの（Next.js の内部ファイル）
  // - /_vercel で始まるもの（Vercel の内部ファイル）
  // - ドットを含むもの（静的ファイル: favicon.ico / sitemap.xml / robots.txt など）
  // - 拡張子を持たない**メタデータルート**（app/icon.tsx / app/opengraph-image.tsx）
  //
  // メタデータルートを除外しないと next-intl のルーティングに飲み込まれて 404 になる。
  // `favicon.ico` はドットを含むので既存の除外に引っかかるが、`/icon` と
  // `/opengraph-image` は拡張子が無いため個別に列挙する必要がある。
  // app/ にメタデータルート（apple-icon / twitter-image 等）を追加したらここにも足すこと。
  //
  // ⚠️ 除外リストに `$`（完全一致アンカー）を混ぜてはいけない。Next.js は matcher 文字列を
  //    ルート定義としてもコンパイルするため、`icon$` のようなアンカーを入れると matcher 全体の
  //    解釈が壊れ、`/login` が自分自身へ 307 を返すリダイレクトループになる（実測で確認済み）。
  //    前方一致のまま列挙すること。
  matcher: ['/((?!api|ingest|_next|_vercel|icon|opengraph-image|.*\\..*).*)'],
}
