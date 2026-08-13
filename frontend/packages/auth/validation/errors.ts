/**
 * Supabase AuthError → 安定した i18n キーへの変換（Web / Mobile 共有）
 *
 * ## なぜ必要か
 *
 * Supabase が返す `error.message` は **英語の実装都合の文言**で、ユーザーに見せる前提の
 * ものではない。そのまま画面に出すと (a) 日本語ロケールで英語が出る (b) 文言が
 * サーバー側の更新で無言に変わる (c) 何をすれば直るのか分からない、の 3 つが同時に起きる。
 *
 * そこで **`error.code`（安定した識別子）だけを見て i18n キーへ落とす**。
 * `code` は Supabase が公式にドキュメント化している列挙値。
 *
 * ## 握りつぶさない
 *
 * 未知のコードは `unexpected` にフォールバックするが、**原文は `raw` に保持**して
 * 呼び出し側がログに出せるようにしている（`.claude/rules/error-handling.md`）。
 *
 * @see https://supabase.com/docs/guides/auth/debugging/error-codes
 */

export const AUTH_ERROR_MESSAGE_KEYS = [
  'invalidCredentials',
  'emailNotConfirmed',
  'weakPassword',
  'samePassword',
  'otpExpired',
  'otpDisabled',
  'rateLimited',
  'emailExists',
  'userNotFound',
  'emailInvalid',
  'signupDisabled',
  'userBanned',
  'sessionExpired',
  'validationFailed',
  'captchaFailed',
  'ssoManaged',
  'reauthenticationNeeded',
  'reauthenticationNotValid',
  'unexpected',
] as const

export type AuthErrorMessageKey = (typeof AUTH_ERROR_MESSAGE_KEYS)[number]

export type ResolvedAuthError = {
  /** i18n の `Auth.errors.<key>` を引くためのキー */
  messageKey: AuthErrorMessageKey
  /** Supabase の元コード（未知の場合は undefined）。ログ用 */
  code?: string
  /** 元メッセージ。**ログ専用**でユーザーには見せない */
  raw?: string
  /**
   * パスワード再設定へ誘導すべきか。
   *
   * パスワード要件を強化すると、既存ユーザーは `signInWithPassword` で
   * `weak_password` を受け取る。ここを無視するとログイン画面が行き止まりになる。
   */
  requiresPasswordReset: boolean
  /**
   * そのアカウントが存在するかどうかを暴露しうるエラーか。
   *
   * **パスワード再設定・サインアップの画面ではこのエラーを表示してはならない**
   * （ユーザー列挙攻撃の入口になる）。成功時と同じ文言を返すこと。
   */
  revealsAccountExistence: boolean
}

/** `code` を持ちうる緩い型（AuthError / AuthApiError / 素の Error / unknown を受ける） */
type MaybeAuthError = { code?: unknown; message?: unknown } | Error | null | undefined

const CODE_TO_KEY: Record<string, AuthErrorMessageKey> = {
  invalid_credentials: 'invalidCredentials',
  email_not_confirmed: 'emailNotConfirmed',
  phone_not_confirmed: 'emailNotConfirmed',
  weak_password: 'weakPassword',
  same_password: 'samePassword',
  otp_expired: 'otpExpired',
  otp_disabled: 'otpDisabled',

  over_email_send_rate_limit: 'rateLimited',
  over_sms_send_rate_limit: 'rateLimited',
  over_request_rate_limit: 'rateLimited',

  email_exists: 'emailExists',
  user_already_exists: 'emailExists',
  identity_already_exists: 'emailExists',
  user_not_found: 'userNotFound',

  email_address_invalid: 'emailInvalid',
  email_address_not_authorized: 'emailInvalid',

  signup_disabled: 'signupDisabled',
  email_provider_disabled: 'signupDisabled',
  user_banned: 'userBanned',

  session_expired: 'sessionExpired',
  session_not_found: 'sessionExpired',
  flow_state_expired: 'sessionExpired',
  flow_state_not_found: 'sessionExpired',
  refresh_token_not_found: 'sessionExpired',
  refresh_token_already_used: 'sessionExpired',

  validation_failed: 'validationFailed',
  bad_json: 'validationFailed',
  captcha_failed: 'captchaFailed',
  user_sso_managed: 'ssoManaged',

  reauthentication_needed: 'reauthenticationNeeded',
  reauthentication_not_valid: 'reauthenticationNotValid',
}

/** アカウントの存在を暴露しうるコード（列挙攻撃対策で表示を抑制する対象） */
const ACCOUNT_EXISTENCE_CODES = new Set([
  'email_exists',
  'user_already_exists',
  'identity_already_exists',
  'user_not_found',
])

export function resolveAuthError(error: MaybeAuthError): ResolvedAuthError | null {
  if (!error) {
    return null
  }

  const code =
    typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : undefined
  const raw =
    typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : undefined

  // `code` が空文字のケースがあるため `&&` で繋がない（`'' ?? x` は `''` になる）
  const mapped = code ? CODE_TO_KEY[code] : undefined

  return {
    messageKey: mapped ?? 'unexpected',
    code,
    raw,
    requiresPasswordReset: code === 'weak_password',
    revealsAccountExistence: code ? ACCOUNT_EXISTENCE_CODES.has(code) : false,
  }
}
