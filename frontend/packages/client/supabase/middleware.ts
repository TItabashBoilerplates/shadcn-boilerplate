import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@workspace/types/schema'

/**
 * Middleware用セッション更新関数
 *
 * すべてのリクエストでSupabaseセッショントークンをリフレッシュし、
 * 更新されたトークンをServer Componentsとブラウザの両方に渡します。
 *
 * @param request - Next.jsのリクエストオブジェクト
 * @returns 更新されたCookieを含むレスポンス
 *
 * @example
 * ```typescript
 * // middleware.ts (プロジェクトルート)
 * import { type NextRequest } from 'next/server'
 * import { updateSession } from '@workspace/client-supabase/middleware'
 *
 * export async function middleware(request: NextRequest) {
 *   return await updateSession(request)
 * }
 *
 * export const config = {
 *   matcher: [
 *     '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
 *   ],
 * }
 * ```
 *
 * @remarks
 * この関数は以下の責務を持ちます：
 * 1. Authトークンを `supabase.auth.getUser()` でリフレッシュ
 * 2. リフレッシュされたトークンを `request.cookies.set` でServer Componentsに渡す
 * 3. リフレッシュされたトークンを `response.cookies.set` でブラウザに渡す
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // リクエストにCookieを設定（Server Componentsで利用可能に）
            request.cookies.set(name, value)
            // レスポンスにCookieを設定（ブラウザへ送信）
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 重要: セッショントークンをリフレッシュ
  // getUser()を使用してトークンの真正性を検証
  await supabase.auth.getUser()

  return supabaseResponse
}
