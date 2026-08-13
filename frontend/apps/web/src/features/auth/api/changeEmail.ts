'use server'

import { isValidEmail, normalizeEmail, resolveAuthError } from '@workspace/auth/validation'
import { headers } from 'next/headers'
import { createServerClient as createClient } from '@/shared/lib/supabase'
import type { AuthActionState } from '../model/types'

/**
 * メールアドレスの再設定（設定画面）
 *
 * **認証方式が OTP でもメール + パスワードでも必須の導線**（`.claude/rules/auth.md` §2）。
 * これが無いと、メールアドレスを変えたユーザーはアカウントに入れなくなる。
 *
 * `[auth.email] double_confirm_changes = true`（既定）のとき、**旧アドレスと
 * 新アドレスの両方で確認が完了するまでアドレスは変わらない**。UI 側でもその旨を
 * 必ず明示すること（説明が無いと「変わらない」という問い合わせになる）。
 *
 * `auth.users` の確定前に自前の `users` テーブルを書き換えてはならない。
 */
export async function changeEmail(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const rawEmail = String(formData.get('email') ?? '')

  if (!rawEmail) {
    return { status: 'error', messageKey: 'emailRequired' }
  }
  if (!isValidEmail(rawEmail)) {
    return { status: 'error', messageKey: 'emailInvalidFormat' }
  }

  const requestHeaders = await headers()
  const origin = requestHeaders.get('origin') ?? ''

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error('Change email without a valid session:', userError)
    return { status: 'error', messageKey: 'sessionExpired' }
  }

  const { error } = await supabase.auth.updateUser(
    { email: normalizeEmail(rawEmail) },
    { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent('/account')}` }
  )

  if (error) {
    const resolved = resolveAuthError(error)
    console.error('Change email failed:', { code: resolved?.code, message: resolved?.raw })

    // 「そのアドレスは使用済み」は他人のアカウント有無を教えてしまう。
    // 送信済みと同じ応答にし、実際の可否は確認メールの有無で伝わるようにする。
    if (resolved?.revealsAccountExistence) {
      return { status: 'success', messageKey: 'emailChangeRequested' }
    }

    return { status: 'error', messageKey: resolved?.messageKey ?? 'unexpected' }
  }

  return { status: 'success', messageKey: 'emailChangeRequested' }
}
