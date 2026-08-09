/**
 * ログアウト機能
 *
 * @module features/auth/api/signOut
 */

import { createClient } from '@workspace/client-supabase/client'

/**
 * ログアウト処理
 * Supabase セッションを削除する。
 *
 * 画面遷移はここでは行わない。`window.location.href` による遷移は Next.js の
 * クライアントサイドルーティングを迂回してしまうため（`@next/next/no-location-assign-relative-destination`）、
 * 呼び出し側の Client Component が `useRouter()` で遷移すること。
 */
export async function signOut(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}
