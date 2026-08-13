'use server'

import {
  isPasswordValid,
  isValidEmail,
  normalizeEmail,
  passwordsMatch,
  resolveAuthError,
} from '@workspace/auth/validation'
import { createServerClient as createClient } from '@/shared/lib/supabase'
import type { AuthActionState } from '../model/types'

/**
 * メールアドレス + パスワードでサインアップ（`useActionState` 用 Server Action）
 *
 * 本番は `[auth.email] enable_confirmations = true` のため、成功しても
 * **その場ではログインせず確認メールが飛ぶ**。UI もそのつもりで
 * 「確認メールを送りました」を出すこと。
 */
export async function signUpWithPassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const rawEmail = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const confirmation = String(formData.get('passwordConfirmation') ?? '')
  // メールテンプレートの言語切替に使う（`{{ .Data.locale }}`）
  const locale = String(formData.get('locale') ?? 'en')

  if (!rawEmail) {
    return { status: 'error', messageKey: 'emailRequired' }
  }
  if (!isValidEmail(rawEmail)) {
    return { status: 'error', messageKey: 'emailInvalidFormat' }
  }
  if (!isPasswordValid(password)) {
    return { status: 'error', messageKey: 'passwordTooWeak' }
  }
  if (!passwordsMatch(password, confirmation)) {
    return { status: 'error', messageKey: 'passwordMismatch' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: normalizeEmail(rawEmail),
    password,
    options: { data: { locale } },
  })

  if (error) {
    const resolved = resolveAuthError(error)
    console.error('Sign up failed:', { code: resolved?.code, message: resolved?.raw })

    // 「そのアドレスは既に登録済み」をそのまま返すとアカウントの存在を教えてしまう
    // （ユーザー列挙）。成功時とまったく同じ応答にして、実際の案内はメールに委ねる。
    if (resolved?.revealsAccountExistence) {
      return { status: 'success', messageKey: 'signUpConfirmationSent' }
    }

    return { status: 'error', messageKey: resolved?.messageKey ?? 'unexpected' }
  }

  return { status: 'success', messageKey: 'signUpConfirmationSent' }
}
