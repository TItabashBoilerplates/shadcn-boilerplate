import { describe, expect, it } from 'vitest'
import {
  getPasswordIssues,
  isPasswordValid,
  PASSWORD_MIN_LENGTH,
  PASSWORD_SYMBOLS,
  passwordsMatch,
} from './password'

/**
 * パスワードポリシーは **Supabase の設定と一対一**でなければならない。
 *
 * `supabase/config.toml`:
 *   minimum_password_length = 12
 *   password_requirements   = "lower_upper_letters_digits_symbols"
 *
 * クライアント側の検証はあくまで「サーバーに弾かれる前に親切に教える」ためのもので、
 * ここが緩いと「フォームは通ったのに Supabase が 422 を返す」という最悪の体験になる。
 * 逆にここが厳しすぎると、サーバーが受け付けるパスワードを弾いてしまう。
 */
describe('getPasswordIssues', () => {
  it('空文字はすべての要件を満たさない', () => {
    expect(getPasswordIssues('')).toEqual([
      'too_short',
      'missing_lowercase',
      'missing_uppercase',
      'missing_digit',
      'missing_symbol',
    ])
  })

  it(`${PASSWORD_MIN_LENGTH} 文字未満は too_short`, () => {
    const short = `Aa1!${'x'.repeat(PASSWORD_MIN_LENGTH - 5)}`
    expect(short).toHaveLength(PASSWORD_MIN_LENGTH - 1)
    expect(getPasswordIssues(short)).toEqual(['too_short'])
  })

  it(`ちょうど ${PASSWORD_MIN_LENGTH} 文字は長さを満たす`, () => {
    const exact = `Aa1!${'x'.repeat(PASSWORD_MIN_LENGTH - 4)}`
    expect(exact).toHaveLength(PASSWORD_MIN_LENGTH)
    expect(getPasswordIssues(exact)).toEqual([])
  })

  it('小文字が無ければ missing_lowercase', () => {
    expect(getPasswordIssues('ABCDEFGH123!@#')).toContain('missing_lowercase')
  })

  it('大文字が無ければ missing_uppercase', () => {
    expect(getPasswordIssues('abcdefgh123!@#')).toContain('missing_uppercase')
  })

  it('数字が無ければ missing_digit', () => {
    expect(getPasswordIssues('abcdefghABC!@#')).toContain('missing_digit')
  })

  it('記号が無ければ missing_symbol', () => {
    expect(getPasswordIssues('abcdefghABC123')).toContain('missing_symbol')
  })

  it('Supabase が許可する記号はすべて記号として認識する', () => {
    for (const symbol of PASSWORD_SYMBOLS) {
      const password = `Abcdefgh1234${symbol}`
      expect(getPasswordIssues(password), `symbol ${symbol} が未対応`).toEqual([])
    }
  })

  it('許可されていない記号（空白・全角）は記号として数えない', () => {
    expect(getPasswordIssues('Abcdefgh1234 ')).toContain('missing_symbol')
    expect(getPasswordIssues('Abcdefgh1234　')).toContain('missing_symbol')
  })

  it('issue の順序は安定している（UI のチェックリスト表示が入れ替わらない）', () => {
    expect(getPasswordIssues('a')).toEqual([
      'too_short',
      'missing_uppercase',
      'missing_digit',
      'missing_symbol',
    ])
  })
})

describe('isPasswordValid', () => {
  it('要件を満たすパスワードは true', () => {
    expect(isPasswordValid('Sup3rStr0ng!Pass')).toBe(true)
  })

  it('1 つでも欠けたら false', () => {
    expect(isPasswordValid('sup3rstr0ng!pass')).toBe(false)
  })
})

describe('passwordsMatch', () => {
  it('一致すれば true', () => {
    expect(passwordsMatch('Sup3rStr0ng!Pass', 'Sup3rStr0ng!Pass')).toBe(true)
  })

  it('一致しなければ false', () => {
    expect(passwordsMatch('Sup3rStr0ng!Pass', 'Sup3rStr0ng!Pas')).toBe(false)
  })

  it('確認欄が空のときは false（未入力を「一致」と扱わない）', () => {
    expect(passwordsMatch('', '')).toBe(false)
  })
})
