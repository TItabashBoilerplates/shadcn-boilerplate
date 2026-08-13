/**
 * パスワードポリシー（Web / Mobile 共有）
 *
 * **`supabase/config.toml` の設定と一対一に対応させること。**
 *
 * ```toml
 * [auth]
 * minimum_password_length = 12
 * password_requirements   = "lower_upper_letters_digits_symbols"
 * ```
 *
 * ここでの検証は「サーバーに弾かれる前に親切に教える」ための **UX 上の先出し**であって、
 * セキュリティ境界ではない（本当の判定は Supabase Auth が行う）。したがって
 * **設定より緩くても厳しくてもいけない**: 緩いと「フォームは通ったのに 422」、
 * 厳しいとサーバーが受け付けるパスワードを弾いてしまう。
 *
 * 設定を変えたら、この定数とテストも同じコミットで更新する。
 *
 * @see https://supabase.com/docs/guides/auth/password-security
 */

/** `minimum_password_length` と一致させる。公式は 8 未満を非推奨としている。 */
export const PASSWORD_MIN_LENGTH = 12

/**
 * Supabase が「記号」として認める文字（公式ドキュメントの記載そのまま）。
 *
 * ここに無い文字（空白・全角記号など）は記号として数えられないため、
 * 独自に拡張してはならない。
 */
export const PASSWORD_SYMBOLS = `!@#$%^&*()_+-=[]{};'\\:"|<>?,./\`~`

export const PASSWORD_ISSUES = [
  'too_short',
  'missing_lowercase',
  'missing_uppercase',
  'missing_digit',
  'missing_symbol',
] as const

export type PasswordIssue = (typeof PASSWORD_ISSUES)[number]

const SYMBOL_SET = new Set(PASSWORD_SYMBOLS)

/**
 * 満たしていない要件を返す。
 *
 * 順序は `PASSWORD_ISSUES` の宣言順で安定させている（UI のチェックリストが
 * 入力のたびに並び替わらないようにするため）。
 *
 * @returns 満たしていない要件の配列。空配列ならポリシーを満たしている
 */
export function getPasswordIssues(password: string): PasswordIssue[] {
  const issues: PasswordIssue[] = []

  if (password.length < PASSWORD_MIN_LENGTH) {
    issues.push('too_short')
  }
  if (!/[a-z]/.test(password)) {
    issues.push('missing_lowercase')
  }
  if (!/[A-Z]/.test(password)) {
    issues.push('missing_uppercase')
  }
  if (!/[0-9]/.test(password)) {
    issues.push('missing_digit')
  }
  if (![...password].some((char) => SYMBOL_SET.has(char))) {
    issues.push('missing_symbol')
  }

  return issues
}

export function isPasswordValid(password: string): boolean {
  return getPasswordIssues(password).length === 0
}

/**
 * 新パスワードと確認用入力の一致判定。
 *
 * **両方空のときは `false`** を返す。未入力を「一致している」と扱うと、
 * 送信ボタンが有効化されてしまうため。
 */
export function passwordsMatch(password: string, confirmation: string): boolean {
  if (password.length === 0) {
    return false
  }
  return password === confirmation
}
