import { type NextRequest } from 'next/server'
import { updateSession } from '@workspace/client-supabase/middleware'

/**
 * Next.js Middleware
 *
 * すべてのリクエストでSupabaseセッションを更新し、
 * 認証トークンをリフレッシュします。
 *
 * @param request - Next.jsのリクエストオブジェクト
 * @returns 更新されたCookieを含むレスポンス
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

/**
 * Middleware設定
 *
 * 以下を除くすべてのリクエストパスにマッチ:
 * - _next/static (静的ファイル)
 * - _next/image (画像最適化ファイル)
 * - favicon.ico (ファビコンファイル)
 * - 画像拡張子を持つファイル (.svg, .png, .jpg, .jpeg, .gif, .webp)
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
