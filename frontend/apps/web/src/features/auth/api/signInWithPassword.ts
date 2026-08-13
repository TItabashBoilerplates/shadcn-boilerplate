'use server'

import { isValidEmail, normalizeEmail, resolveAuthError } from '@workspace/auth/validation'
import { createServerClient as createClient } from '@/shared/lib/supabase'
import type { AuthActionState } from '../model/types'

/**
 * メールアドレス + パスワードでログイン（`useActionState` 用 Server Action）
 *
 * **モバイルアプリを配布するプロダクトではこれが主たるログイン手段**でなければならない
 * （OTP のみは App Store 2.1(a) でリジェクトされる。`.claude/rules/auth.md`）。
 *
 * 成功時にここでリダイレクトしないのは、`useActionState` の戻り値で
 * 呼び出し側がトースト表示や `router.refresh()` を挟めるようにするため。
 *
 * @example
 * ```tsx
 * const [state, action, pending] = useActionState(signInWithPassword, AUTH_IDLE_STATE)
 * ```
 */
export async function signInWithPassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const rawEmail = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!rawEmail) {
    return { status: 'error', messageKey: 'emailRequired' }
  }
  if (!isValidEmail(rawEmail)) {
    return { status: 'error', messageKey: 'emailInvalidFormat' }
  }
  if (!password) {
    return { status: 'error', messageKey: 'passwordRequired' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(rawEmail),
    password,
  })

  if (error) {
    const resolved = resolveAuthError(error)
    console.error('Sign in failed:', { code: resolved?.code, message: resolved?.raw })

    return {
      status: 'error',
      messageKey: resolved?.messageKey ?? 'unexpected',
      // パスワード要件を強化した後、既存ユーザーは弱いパスワードのままログインを試みて
      // `weak_password` を受け取る。ここを握りつぶすとログイン画面が行き止まりになるので、
      // 呼び出し側がパスワード再設定へ誘導できるようフラグを立てて返す。
      requiresPasswordReset: resolved?.requiresPasswordReset ?? false,
    }
  }

  return { status: 'success', messageKey: 'signedIn' }
}
