'use server'

import { isValidEmail, normalizeEmail, resolveAuthError } from '@workspace/auth/validation'
import { headers } from 'next/headers'
import { createServerClient as createClient } from '@/shared/lib/supabase'
import type { AuthActionState } from '../model/types'

/** 再設定リンクの着地点。`/auth/confirm` が token_hash を検証してからここへ送る */
const UPDATE_PASSWORD_PATH = '/account/update-password'

/**
 * パスワード再設定メールの送信（ログイン画面の「パスワードをお忘れですか？」）
 *
 * **応答からアカウントの存在を推測させない。** 送信できたかどうかに関わらず
 * 常に成功として返し、「登録があればメールを送りました」と表示する
 * （`.claude/rules/auth.md` §3.2）。レート制限だけは実害があるので伝える。
 *
 * Web は PKCE フローなので、`recovery` メールのリンクは
 * `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=...`
 * の形にしておくこと（`supabase/templates/email/recovery.html`）。
 */
export async function requestPasswordReset(
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
  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(rawEmail), {
    redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(UPDATE_PASSWORD_PATH)}`,
  })

  if (error) {
    const resolved = resolveAuthError(error)
    console.error('Password reset request failed:', {
      code: resolved?.code,
      message: resolved?.raw,
    })

    // 送りすぎは事実として伝える（黙って成功に見せると連打され続ける）
    if (resolved?.messageKey === 'rateLimited') {
      return { status: 'error', messageKey: 'rateLimited' }
    }

    // それ以外はアカウントの存在を漏らさないため成功と同じ応答にする
    return { status: 'success', messageKey: 'passwordResetSent' }
  }

  return { status: 'success', messageKey: 'passwordResetSent' }
}
