'use server'

import { isPasswordValid, passwordsMatch, resolveAuthError } from '@workspace/auth/validation'
import { createServerClient as createClient } from '@/shared/lib/supabase'
import type { AuthActionState } from '../model/types'

/**
 * ログイン中のパスワード変更（設定画面）
 *
 * **現在のパスワードは `current_password` として Supabase に検証させる。**
 * `signInWithPassword` を「検証目的で」呼ぶのは誤り — 新しいセッションが発行される
 * 副作用があり、公式が示す手順でもない（`.claude/rules/auth.md` §3.3 方式 A）。
 *
 * 有効化するには `supabase/config.toml` に以下が必要:
 *
 * ```toml
 * [auth.email]
 * secure_password_change = true   # 既定 false
 * ```
 *
 * 設定しないと `current_password` を送らない変更も通ってしまうため、
 * **クライアント側で入力を求めるだけでは防御にならない**。
 */
export async function changePassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const currentPassword = String(formData.get('currentPassword') ?? '')
  const password = String(formData.get('password') ?? '')
  const confirmation = String(formData.get('passwordConfirmation') ?? '')

  if (!currentPassword) {
    return { status: 'error', messageKey: 'currentPasswordRequired' }
  }
  if (!isPasswordValid(password)) {
    return { status: 'error', messageKey: 'passwordTooWeak' }
  }
  if (!passwordsMatch(password, confirmation)) {
    return { status: 'error', messageKey: 'passwordMismatch' }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    console.error('Change password without a valid session:', userError)
    return { status: 'error', messageKey: 'sessionExpired' }
  }

  const { error } = await supabase.auth.updateUser({
    email: user.email,
    current_password: currentPassword,
    password,
  })

  if (error) {
    const resolved = resolveAuthError(error)
    console.error('Change password failed:', { code: resolved?.code, message: resolved?.raw })
    return { status: 'error', messageKey: resolved?.messageKey ?? 'unexpected' }
  }

  return { status: 'success', messageKey: 'passwordUpdated' }
}
