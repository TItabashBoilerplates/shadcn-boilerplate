'use server'

import { resolveAuthError } from '@workspace/auth/validation'
import { createServerClient as createClient } from '@/shared/lib/supabase'
import { type AuthActionState, DELETE_ACCOUNT_CONFIRMATION } from '../model/types'

/**
 * アカウント削除
 *
 * **App Store 5.1.1(v) によりモバイル配布時は必須**（「サポートへ連絡」では不可）。
 *
 * 実削除は `delete-account` Edge Function が行う。ユーザーの削除は
 * `auth.admin.deleteUser()` でしか行えず **service_role を要求する**ため、
 * クライアントからは実行できない（service_role を公開クライアントに置くのは厳禁）。
 *
 * 関連データは **DB 側の `on delete cascade`** で消す。ここで個別に delete を
 * 並べると、テーブルが増えるたびに消し漏れる。
 */
export async function deleteAccount(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const confirmation = String(formData.get('confirmation') ?? '').trim()

  if (confirmation !== DELETE_ACCOUNT_CONFIRMATION) {
    return { status: 'error', messageKey: 'deleteConfirmationMismatch' }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('Delete account without a valid session:', userError)
    return { status: 'error', messageKey: 'sessionExpired' }
  }

  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })

  if (error) {
    const resolved = resolveAuthError(error)
    console.error('Delete account failed:', { code: resolved?.code, message: resolved?.raw })
    return { status: 'error', messageKey: 'unexpected' }
  }

  // 削除後はローカルのセッションも破棄する。
  // 残しておくと「消えたはずのアカウントでログイン済みに見える」画面になる。
  await supabase.auth.signOut()

  return { status: 'success', messageKey: 'accountDeleted' }
}
