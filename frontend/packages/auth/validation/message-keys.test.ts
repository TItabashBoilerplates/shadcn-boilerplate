import { describe, expect, it } from 'vitest'
import { AUTH_ERROR_MESSAGE_KEYS } from './errors'
import { AUTH_SUCCESS_KEYS, AUTH_VALIDATION_KEYS } from './message-keys'

/**
 * 認証メッセージキーの契約テスト。
 *
 * キー集合が web / mobile に分かれていた時代に、実際に
 * `passwordResetSent`（web）と `passwordResetCodeSent`（mobile）で
 * **集合がズレたまま両方が型チェックを通っていた**。共有後の不変条件を固定する。
 */

describe('認証メッセージキー', () => {
  it('成功キーが重複していない', () => {
    expect(new Set(AUTH_SUCCESS_KEYS).size).toBe(AUTH_SUCCESS_KEYS.length)
  })

  it('検証キーが重複していない', () => {
    expect(new Set(AUTH_VALIDATION_KEYS).size).toBe(AUTH_VALIDATION_KEYS.length)
  })

  it('検証キー（クライアント側）とサーバー側エラーキーが衝突していない', () => {
    // 同じキーが両方にあると `AuthErrorMessageKey | AuthValidationKey` の
    // どちらとして翻訳を引くべきか決まらず、片方の文言が死ぬ
    const overlap = AUTH_VALIDATION_KEYS.filter((key) =>
      (AUTH_ERROR_MESSAGE_KEYS as readonly string[]).includes(key)
    )

    expect(overlap).toEqual([])
  })

  it('Web / Mobile それぞれのパスワード再設定キーが両方ある', () => {
    // Web はリンク方式、Mobile は 6 桁コード方式で文面が異なる（auth.md §3.2）。
    // 片方だけになっていたら、そのプラットフォームの成功画面が壊れる。
    expect(AUTH_SUCCESS_KEYS).toContain('passwordResetSent')
    expect(AUTH_SUCCESS_KEYS).toContain('passwordResetCodeSent')
  })
})
