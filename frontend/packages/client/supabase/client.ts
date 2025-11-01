import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@workspace/types/schema'

/**
 * Client Components用Supabaseクライアント
 *
 * @returns ブラウザ環境で動作するSupabaseクライアント
 *
 * @example
 * ```typescript
 * 'use client'
 * import { createClient } from '@workspace/client-supabase/client'
 *
 * export function UserProfile() {
 *   const supabase = createClient()
 *   // クライアント側ではgetSession()が許容される
 *   const { data: { session } } = await supabase.auth.getSession()
 *   return <div>{session?.user.email}</div>
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
