import { describe, expect, it } from 'vitest'

import { AUTH_FIELD_PURPOSES, resolveAuthFieldAttributes } from './input-attributes'

/**
 * 入力欄のオートフィル属性が**プラットフォームごとに正しい値**であることを守る。
 *
 * ## なぜテストが要るか
 *
 * `autoComplete` は「クロスプラットフォームに見えて、Android 側に対応する
 * autofill hint が存在しない値がある」。React Native の Android 実装
 * (`ReactTextInputManager.kt` の `REACT_PROPS_AUTOFILL_HINTS_MAP`) を実際に読むと、
 * マップに**入っていない**値がある:
 *
 * | 値 | Android hint |
 * |---|---|
 * | `email` / `password` / `password-new` / `sms-otp` / `email-otp` | ✅ ある |
 * | **`current-password` / `new-password` / `one-time-code`** | ❌ **無い** |
 *
 * つまり `autoComplete="one-time-code"` と書くと **iOS では
 * `textContentType="oneTimeCode"` のおかげで動くが、Android では
 * autofill hint が一切付かない**（= 何のエラーも出ないまま OTP 自動入力が死ぬ）。
 *
 * これは実機で OTP を受け取るまで気づけないので、値の対応表をテストで固定する。
 */
describe('resolveAuthFieldAttributes', () => {
  describe('メールアドレス', () => {
    it('iOS は textContentType、Android は autoComplete でオートフィルさせる', () => {
      expect(resolveAuthFieldAttributes('email', 'ios')).toMatchObject({
        inputMode: 'email',
        textContentType: 'emailAddress',
        autoCapitalize: 'none',
        autoCorrect: false,
      })
      expect(resolveAuthFieldAttributes('email', 'android')).toMatchObject({
        inputMode: 'email',
        autoComplete: 'email',
      })
    })
  })

  describe('パスワード', () => {
    it('現在のパスワードは Android で "password"（"current-password" は hint が無い）', () => {
      expect(resolveAuthFieldAttributes('currentPassword', 'android').autoComplete).toBe('password')
      expect(resolveAuthFieldAttributes('currentPassword', 'ios').textContentType).toBe('password')
    })

    it('新しいパスワードは Android で "password-new"（"new-password" は hint が無い）', () => {
      expect(resolveAuthFieldAttributes('newPassword', 'android').autoComplete).toBe('password-new')
      expect(resolveAuthFieldAttributes('newPassword', 'ios').textContentType).toBe('newPassword')
    })

    it('パスワード欄は secureTextEntry で、自動大文字化・自動修正を切る', () => {
      for (const purpose of ['currentPassword', 'newPassword'] as const) {
        const attributes = resolveAuthFieldAttributes(purpose, 'ios')
        expect(attributes.secureTextEntry).toBe(true)
        expect(attributes.autoCapitalize).toBe('none')
        expect(attributes.autoCorrect).toBe(false)
      }
    })
  })

  describe('ワンタイムコード', () => {
    /**
     * 本リポジトリの再設定コードは**メールで届く**（`resetPasswordForEmail` →
     * `verifyOtp({ type: 'recovery' })`。`.claude/rules/auth.md`）。
     * SMS 配信に変えるなら Android は `sms-otp` にする。
     */
    it('iOS は oneTimeCode、Android は email-otp（メール配信のため）', () => {
      expect(resolveAuthFieldAttributes('oneTimeCode', 'ios').textContentType).toBe('oneTimeCode')
      expect(resolveAuthFieldAttributes('oneTimeCode', 'android').autoComplete).toBe('email-otp')
    })

    it('数字キーボードを出す', () => {
      expect(resolveAuthFieldAttributes('oneTimeCode', 'ios').inputMode).toBe('numeric')
      expect(resolveAuthFieldAttributes('oneTimeCode', 'android').inputMode).toBe('numeric')
    })
  })

  describe('確認語句（アカウント削除など）', () => {
    /**
     * ここだけは iOS / Android の両方に「切る」値を渡す。`off` と `none` は
     * どちらも「オートフィルしない」の意味なので、食い違いようがない。
     */
    it.each(['ios', 'android'] as const)('%s でオートフィルを明示的に切る', (platform) => {
      const attributes = resolveAuthFieldAttributes('confirmation', platform)
      expect(attributes.autoComplete).toBe('off')
      expect(attributes.textContentType).toBe('none')
      expect(attributes.secureTextEntry).toBeFalsy()
    })
  })

  describe('Android に存在しない autoComplete を絶対に返さない', () => {
    /**
     * React Native 0.86 の `REACT_PROPS_AUTOFILL_HINTS_MAP` に無い値。
     * ここに載る値を Android へ渡すと**無言で hint が付かない**。
     */
    const UNMAPPED_ON_ANDROID = ['current-password', 'new-password', 'one-time-code']

    it.each(AUTH_FIELD_PURPOSES)('%s は Android で有効な値だけを返す', (purpose) => {
      const { autoComplete } = resolveAuthFieldAttributes(purpose, 'android')
      expect(UNMAPPED_ON_ANDROID).not.toContain(autoComplete)
    })
  })

  describe('Web ビルド（react-native-web → HTML の autocomplete）', () => {
    /** `expo start --web` / `web.output: static` で出る側。HTML の綴りが正 */
    it.each([
      ['email', 'email'],
      ['currentPassword', 'current-password'],
      ['newPassword', 'new-password'],
      ['oneTimeCode', 'one-time-code'],
    ] as const)('%s は %s', (purpose, expected) => {
      expect(resolveAuthFieldAttributes(purpose, 'web').autoComplete).toBe(expected)
    })
  })

  describe('属性の優先順位（食い違わせない）', () => {
    /** オートフィルを「有効にする」用途。`confirmation` は切る用途なので別扱い（上のブロック） */
    const AUTOFILL_PURPOSES = AUTH_FIELD_PURPOSES.filter((purpose) => purpose !== 'confirmation')

    /**
     * `inputMode` は `keyboardType` に、`textContentType`(iOS) は `autoComplete` に優先する。
     * 両方書くと「どちらが効いているか分からない」状態になるため、片方だけを返す。
     */
    it.each(AUTH_FIELD_PURPOSES)('%s は keyboardType を返さない（inputMode を使う）', (purpose) => {
      expect(resolveAuthFieldAttributes(purpose, 'ios')).not.toHaveProperty('keyboardType')
    })

    it.each(AUTOFILL_PURPOSES)('%s は iOS で autoComplete を返さない', (purpose) => {
      expect(resolveAuthFieldAttributes(purpose, 'ios').autoComplete).toBeUndefined()
    })

    it.each(AUTOFILL_PURPOSES)('%s は Android で textContentType を返さない', (purpose) => {
      expect(resolveAuthFieldAttributes(purpose, 'android').textContentType).toBeUndefined()
    })
  })
})
