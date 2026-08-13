import {
  isPasswordValid,
  isValidEmail,
  normalizeEmail,
  passwordsMatch,
  resolveAuthError,
} from '@workspace/auth/validation'
import { supabase } from '@/shared/lib/supabase'
import type { AuthResult } from '../model/types'

/**
 * Mobile の認証 API
 *
 * ## Web との違い
 *
 * Web は Server Action + PKCE（リンク方式）だが、Mobile は**クライアントから直接**
 * 呼び、パスワード再設定は**6 桁コード方式**を使う。理由は 2 つ:
 *
 * 1. ディープリンクはスキーム登録・`additional_redirect_urls` など環境要因で
 *    無言に壊れる箇所が多い
 * 2. **スパム対策によるリンクの事前消費**（Safe Links 等）は Supabase 公式が
 *    Limitations として挙げている既知の問題で、公式の回避策の 1 つ目が
 *    「`{{ .Token }}` を使った OTP 方式にする」こと
 *
 * つまりコード方式は妥協ではなく**公式の推奨回避策**にあたる。
 *
 * ## 共通の約束
 *
 * - 検証規則は `@workspace/auth/validation`（Web と共有。2 か所に書かない）
 * - `{ error }` は必ずチェックしてログに残す（`.claude/rules/error-handling.md`）
 * - 失敗は例外ではなく `AuthResult` で返す（UI が 5 状態を描き分けられるように）
 */

/** サインアップ。本番は確認メールが挟まるのでその場ではログインしない */
export async function signUpWithPassword(
  email: string,
  password: string,
  passwordConfirmation: string,
  locale: string
): Promise<AuthResult> {
  if (!isValidEmail(email)) {
    return { ok: false, messageKey: 'emailInvalidFormat' }
  }
  if (!isPasswordValid(password)) {
    return { ok: false, messageKey: 'passwordTooWeak' }
  }
  if (!passwordsMatch(password, passwordConfirmation)) {
    return { ok: false, messageKey: 'passwordMismatch' }
  }

  const { error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: { data: { locale } },
  })

  if (error) {
    const resolved = resolveAuthError(error)
    console.error('Sign up failed:', { code: resolved?.code, message: resolved?.raw })

    // アカウントの存在を漏らさない（ユーザー列挙対策）
    if (resolved?.revealsAccountExistence) {
      return { ok: true, messageKey: 'signUpConfirmationSent' }
    }
    return { ok: false, messageKey: resolved?.messageKey ?? 'unexpected' }
  }

  return { ok: true, messageKey: 'signUpConfirmationSent' }
}

/**
 * ログイン。
 *
 * **ストア審査ではこの導線が使われる。** 審査担当者はこちらの受信箱に触れられないため、
 * メール + パスワードだけでログインし切れる状態を必ず保つこと
 * （OTP のみだと App Store 2.1(a) でリジェクト。`.claude/rules/auth.md`）。
 */
export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!isValidEmail(email)) {
    return { ok: false, messageKey: 'emailInvalidFormat' }
  }
  if (!password) {
    return { ok: false, messageKey: 'passwordRequired' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  })

  if (error) {
    const resolved = resolveAuthError(error)
    console.error('Sign in failed:', { code: resolved?.code, message: resolved?.raw })
    return {
      ok: false,
      messageKey: resolved?.messageKey ?? 'unexpected',
      // 要件強化後の既存ユーザーを再設定へ送るための印
      requiresPasswordReset: resolved?.requiresPasswordReset ?? false,
    }
  }

  return { ok: true, messageKey: 'signedIn' }
}

/**
 * パスワード再設定コードの送信。
 *
 * `recovery` テンプレートに `{{ .Token }}` が含まれている必要がある
 * （`supabase/templates/email/recovery.html`）。
 *
 * **アカウントの存在を漏らさない**ため、送信できなくても成功として返す
 * （レート制限だけは実害があるので伝える）。
 */
export async function requestPasswordResetCode(email: string): Promise<AuthResult> {
  if (!isValidEmail(email)) {
    return { ok: false, messageKey: 'emailInvalidFormat' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email))

  if (error) {
    const resolved = resolveAuthError(error)
    console.error('Password reset request failed:', {
      code: resolved?.code,
      message: resolved?.raw,
    })
    if (resolved?.messageKey === 'rateLimited') {
      return { ok: false, messageKey: 'rateLimited' }
    }
    return { ok: true, messageKey: 'passwordResetCodeSent' }
  }

  return { ok: true, messageKey: 'passwordResetCodeSent' }
}

/**
 * 受け取った 6 桁コードを検証して recovery セッションを確立し、新パスワードを設定する。
 *
 * `verifyOtp` → `updateUser` の 2 段。**コード検証だけで終わらせない**
 * （セッションは張れてもパスワードは変わっていない状態になる）。
 */
export async function resetPasswordWithCode(
  email: string,
  token: string,
  password: string,
  passwordConfirmation: string
): Promise<AuthResult> {
  if (!isPasswordValid(password)) {
    return { ok: false, messageKey: 'passwordTooWeak' }
  }
  if (!passwordsMatch(password, passwordConfirmation)) {
    return { ok: false, messageKey: 'passwordMismatch' }
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email: normalizeEmail(email),
    token,
    type: 'recovery',
  })

  if (verifyError) {
    const resolved = resolveAuthError(verifyError)
    console.error('Recovery code verification failed:', {
      code: resolved?.code,
      message: resolved?.raw,
    })
    return { ok: false, messageKey: resolved?.messageKey ?? 'unexpected' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    const resolved = resolveAuthError(error)
    console.error('Update password failed:', { code: resolved?.code, message: resolved?.raw })
    return { ok: false, messageKey: resolved?.messageKey ?? 'unexpected' }
  }

  return { ok: true, messageKey: 'passwordUpdated' }
}

/**
 * ログイン中のパスワード変更。
 *
 * **現在のパスワードは `current_password` として Supabase に検証させる。**
 * `signInWithPassword` で「検証」するのは誤り（新セッションが発行される副作用がある）。
 * `[auth.email] secure_password_change = true` が前提。
 */
export async function changePassword(
  currentPassword: string,
  password: string,
  passwordConfirmation: string
): Promise<AuthResult> {
  if (!currentPassword) {
    return { ok: false, messageKey: 'currentPasswordRequired' }
  }
  if (!isPasswordValid(password)) {
    return { ok: false, messageKey: 'passwordTooWeak' }
  }
  if (!passwordsMatch(password, passwordConfirmation)) {
    return { ok: false, messageKey: 'passwordMismatch' }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    console.error('Change password without a valid session:', userError)
    return { ok: false, messageKey: 'sessionExpired' }
  }

  const { error } = await supabase.auth.updateUser({
    email: user.email,
    current_password: currentPassword,
    password,
  })

  if (error) {
    const resolved = resolveAuthError(error)
    console.error('Change password failed:', { code: resolved?.code, message: resolved?.raw })
    return { ok: false, messageKey: resolved?.messageKey ?? 'unexpected' }
  }

  return { ok: true, messageKey: 'passwordUpdated' }
}

/**
 * メールアドレスの再設定。
 *
 * `double_confirm_changes = true`（既定）では**旧・新の両方**で確認するまで変わらない。
 * UI にその旨を必ず出すこと。
 */
export async function changeEmail(newEmail: string): Promise<AuthResult> {
  if (!isValidEmail(newEmail)) {
    return { ok: false, messageKey: 'emailInvalidFormat' }
  }

  const { error } = await supabase.auth.updateUser({ email: normalizeEmail(newEmail) })

  if (error) {
    const resolved = resolveAuthError(error)
    console.error('Change email failed:', { code: resolved?.code, message: resolved?.raw })
    if (resolved?.revealsAccountExistence) {
      return { ok: true, messageKey: 'emailChangeRequested' }
    }
    return { ok: false, messageKey: resolved?.messageKey ?? 'unexpected' }
  }

  return { ok: true, messageKey: 'emailChangeRequested' }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Sign out failed:', error)
  }
}
