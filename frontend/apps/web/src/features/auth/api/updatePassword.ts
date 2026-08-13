'use server'

import { isPasswordValid, passwordsMatch, resolveAuthError } from '@workspace/auth/validation'
import { createServerClient as createClient } from '@/shared/lib/supabase'
import type { AuthActionState } from '../model/types'

/**
 * 新しいパスワードの設定（**再設定リンクから来た recovery セッション用**）
 *
 * `/auth/confirm` が `verifyOtp({ type: 'recovery', token_hash })` でセッションを
 * 確立した直後に呼ばれる想定。**この経路では現在のパスワードを知らない**ので
 * `current_password` は送らない（送れない）。
 *
 * ログイン中の設定画面からの変更は `changePassword` を使うこと。
 */
export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const password = String(formData.get('password') ?? '')
  const confirmation = String(formData.get('passwordConfirmation') ?? '')

  if (!isPasswordValid(password)) {
    return { status: 'error', messageKey: 'passwordTooWeak' }
  }
  if (!passwordsMatch(password, confirmation)) {
    return { status: 'error', messageKey: 'passwordMismatch' }
  }

  const supabase = await createClient()

  // recovery リンクが失効している / 別タブでセッションが切れた場合をここで検出する。
  // getSession() ではなく getUser() を使う（cookie の値は真正とは限らない）。
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('Update password without a valid session:', userError)
    return { status: 'error', messageKey: 'sessionExpired' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    const resolved = resolveAuthError(error)
    console.error('Update password failed:', { code: resolved?.code, message: resolved?.raw })
    return { status: 'error', messageKey: resolved?.messageKey ?? 'unexpected' }
  }

  return { status: 'success', messageKey: 'passwordUpdated' }
}
