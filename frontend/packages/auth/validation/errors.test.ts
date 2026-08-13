import { describe, expect, it } from 'vitest'
import { AUTH_ERROR_MESSAGE_KEYS, resolveAuthError } from './errors'

/**
 * Supabase の AuthError を **安定した i18n キー**へ落とす層のテスト。
 *
 * ここが壊れると、ユーザーには「エラーが発生しました」しか出ない状態になり、
 * 何をすれば復帰できるのかが分からなくなる（＝サポート問い合わせ行き）。
 */
describe('resolveAuthError', () => {
  it('null を渡したら null（エラー無しを誤ってエラー表示しない）', () => {
    expect(resolveAuthError(null)).toBeNull()
    expect(resolveAuthError(undefined)).toBeNull()
  })

  it.each([
    ['invalid_credentials', 'invalidCredentials'],
    ['email_not_confirmed', 'emailNotConfirmed'],
    ['same_password', 'samePassword'],
    ['otp_expired', 'otpExpired'],
    ['email_address_invalid', 'emailInvalid'],
    ['user_banned', 'userBanned'],
    ['signup_disabled', 'signupDisabled'],
    ['reauthentication_needed', 'reauthenticationNeeded'],
    ['reauthentication_not_valid', 'reauthenticationNotValid'],
  ])('%s → %s', (code, key) => {
    expect(resolveAuthError({ code, message: 'ignored' })?.messageKey).toBe(key)
  })

  it.each([
    'over_email_send_rate_limit',
    'over_request_rate_limit',
    'over_sms_send_rate_limit',
  ])('レート制限系は rateLimited に集約する: %s', (code) => {
    expect(resolveAuthError({ code, message: '' })?.messageKey).toBe('rateLimited')
  })

  it.each([
    'session_expired',
    'session_not_found',
    'flow_state_expired',
    'flow_state_not_found',
  ])('セッション切れ系は sessionExpired に集約する: %s', (code) => {
    expect(resolveAuthError({ code, message: '' })?.messageKey).toBe('sessionExpired')
  })

  it('未知のコードは unexpected にフォールバックする（握りつぶさない）', () => {
    const resolved = resolveAuthError({ code: 'something_new_from_gotrue', message: 'boom' })
    expect(resolved?.messageKey).toBe('unexpected')
  })

  it('code が無いエラー（ネットワーク断など）も unexpected として扱う', () => {
    expect(resolveAuthError(new Error('Failed to fetch'))?.messageKey).toBe('unexpected')
  })

  it('原文メッセージを保持する（ログに出して原因追跡できるようにするため）', () => {
    expect(resolveAuthError({ code: 'invalid_credentials', message: 'Invalid login' })?.raw).toBe(
      'Invalid login'
    )
  })

  describe('weak_password', () => {
    it('weakPassword にマップする', () => {
      expect(resolveAuthError({ code: 'weak_password', message: '' })?.messageKey).toBe(
        'weakPassword'
      )
    })

    it('requiresPasswordReset が立つ（要件強化後の既存ユーザーを再設定導線へ送るため）', () => {
      expect(resolveAuthError({ code: 'weak_password', message: '' })?.requiresPasswordReset).toBe(
        true
      )
    })

    it('weak_password 以外では requiresPasswordReset は false', () => {
      expect(
        resolveAuthError({ code: 'invalid_credentials', message: '' })?.requiresPasswordReset
      ).toBe(false)
    })
  })

  describe('アカウント存在の秘匿', () => {
    it('email_exists / user_already_exists は同じキーになる', () => {
      expect(resolveAuthError({ code: 'email_exists', message: '' })?.messageKey).toBe(
        'emailExists'
      )
      expect(resolveAuthError({ code: 'user_already_exists', message: '' })?.messageKey).toBe(
        'emailExists'
      )
    })

    it('revealsAccountExistence が立つ（パスワード再設定画面では表示してはいけない印）', () => {
      expect(resolveAuthError({ code: 'email_exists', message: '' })?.revealsAccountExistence).toBe(
        true
      )
      expect(
        resolveAuthError({ code: 'user_not_found', message: '' })?.revealsAccountExistence
      ).toBe(true)
    })

    it('通常のエラーでは revealsAccountExistence は false', () => {
      expect(
        resolveAuthError({ code: 'over_request_rate_limit', message: '' })?.revealsAccountExistence
      ).toBe(false)
    })
  })
})

describe('AUTH_ERROR_MESSAGE_KEYS', () => {
  it('マッピングが返しうるキーをすべて列挙している（翻訳漏れ検出用）', () => {
    const produced = new Set(
      [
        'invalid_credentials',
        'email_not_confirmed',
        'weak_password',
        'same_password',
        'otp_expired',
        'otp_disabled',
        'over_email_send_rate_limit',
        'email_exists',
        'user_not_found',
        'email_address_invalid',
        'signup_disabled',
        'user_banned',
        'session_expired',
        'validation_failed',
        'captcha_failed',
        'user_sso_managed',
        'reauthentication_needed',
        'reauthentication_not_valid',
        'totally_unknown',
      ].map((code) => resolveAuthError({ code, message: '' })?.messageKey)
    )

    for (const key of produced) {
      expect(AUTH_ERROR_MESSAGE_KEYS).toContain(key)
    }
  })
})
