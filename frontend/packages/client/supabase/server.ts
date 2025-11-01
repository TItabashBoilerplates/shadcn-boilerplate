import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@workspace/types/schema'

/**
 * Server Components/Actions/Route Handlers用Supabaseクライアント
 *
 * Next.js 15対応: cookies()は非同期関数のためawaitが必要
 *
 * @returns サーバー環境で動作するSupabaseクライアント
 *
 * @example
 * ```typescript
 * // Server Component
 * import { createClient } from '@workspace/client-supabase/server'
 * import { redirect } from 'next/navigation'
 *
 * export default async function Page() {
 *   const supabase = await createClient()
 *   const { data: { user } } = await supabase.auth.getUser() // セキュア
 *
 *   if (!user) redirect('/login')
 *   return <div>Hello, {user.email}</div>
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Server Action
 * 'use server'
 * import { createClient } from '@workspace/client-supabase/server'
 * import { revalidatePath } from 'next/cache'
 *
 * export async function updateProfile(formData: FormData) {
 *   const supabase = await createClient()
 *   const { error } = await supabase
 *     .from('profiles')
 *     .update({ name: formData.get('name') })
 *
 *   if (!error) revalidatePath('/profile')
 * }
 * ```
 */
export async function createClient() {
  // Next.js 15: cookies()は非同期関数
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server ComponentからのCookie書き込みエラーは
            // Middlewareがセッション更新を担当するため安全に無視
          }
        },
      },
    }
  )
}
