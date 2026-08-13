import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 認証の必須導線が消えていないことを機械的に守る（Web）。
 *
 * ## なぜこの検査が要るか
 *
 * `.claude/rules/auth.md` が要求する導線は、**消してもアプリは普通に動く**。
 * ビルドも型チェックも lint も Storybook も通る。気づけるのは
 * 「メールアドレスを変えたユーザーがサポートに問い合わせてきたとき」や
 * 「ストア審査でリジェクトされたとき」だけである。
 *
 * `.claude/rules/store-review.md` §7 が「実装した導線に対する検査を追加すること」を
 * 求めているのはこのため。実装に対応する検査が無いと、消しても誰も気づかない。
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(HERE, '../../../..')

function read(relativePath: string): string {
  const full = join(APP_ROOT, relativePath)
  expect(existsSync(full), `${relativePath} が存在しない`).toBe(true)
  return readFileSync(full, 'utf8')
}

/**
 * コメントを除いたコード本体。
 *
 * 「この API は使わない」という**注意書き自体**を検出してしまうと、正しく書けている
 * ファイルほど落ちる（実際にそうなった）。禁止 API の検査は必ずコードだけを見る。
 */
function readCode(relativePath: string): string {
  return read(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

describe('必須ルート', () => {
  it.each([
    ['app/[locale]/login/page.tsx', 'ログイン'],
    ['app/[locale]/signup/page.tsx', 'サインアップ'],
    ['app/[locale]/forgot-password/page.tsx', 'パスワード再設定の申請'],
    ['app/[locale]/account/update-password/page.tsx', '新パスワードの設定'],
    ['app/[locale]/account/page.tsx', 'アカウント設定'],
    ['app/auth/confirm/route.ts', 'PKCE のトークン交換'],
  ])('%s (%s) がある', (path) => {
    expect(existsSync(join(APP_ROOT, path)), `${path} が無い`).toBe(true)
  })
})

describe('ログイン画面', () => {
  const loginPage = read('src/views/auth/ui/LoginPage.tsx')

  it('パスワードログインを使っている（OTP のみにしない）', () => {
    expect(loginPage).toContain('PasswordLoginForm')
  })

  /**
   * パスワードを忘れた人は**ログインできない**のだから、再設定導線を
   * 設定画面に置いても到達できない。ログイン画面に無いと詰む。
   */
  it('パスワード再設定への導線がログインフォーム内にある', () => {
    const form = read('src/features/auth/ui/PasswordLoginForm.tsx')
    expect(form).toContain('/forgot-password')
    expect(form).toContain('forgotPassword')
  })

  /**
   * パスワード要件を強化すると既存ユーザーは weak_password でログインに失敗する。
   * ここを握りつぶすとログイン画面が行き止まりになる。
   */
  it('WeakPasswordError を再設定導線へ繋いでいる', () => {
    const form = read('src/features/auth/ui/PasswordLoginForm.tsx')
    expect(form).toContain('requiresPasswordReset')
  })
})

describe('アカウント設定画面', () => {
  const accountPage = read('src/views/account/ui/AccountPage.tsx')

  it.each([
    ['ChangeEmailForm', 'メールアドレス再設定（認証方式を問わず必須）'],
    ['ChangePasswordForm', 'パスワード変更'],
    ['DeleteAccountForm', 'アカウント削除（App Store 5.1.1(v)）'],
  ])('%s がある（%s）', (component) => {
    expect(accountPage).toContain(component)
  })
})

describe('パスワード変更の実装', () => {
  const changePassword = read('src/features/auth/api/changePassword.ts')

  /**
   * `signInWithPassword` を検証目的で呼ぶのは誤り。新しいセッションが発行される
   * 副作用があり、公式が示す手順でもない（`.claude/rules/auth.md` §3.3）。
   */
  it('current_password を Supabase に検証させている', () => {
    expect(changePassword).toContain('current_password')
    expect(
      readCode('src/features/auth/api/changePassword.ts'),
      'signInWithPassword での代用は新セッションが発行される副作用があり誤り'
    ).not.toContain('signInWithPassword')
  })
})

describe('サーバー側の認可判断', () => {
  it.each([
    'src/views/account/ui/AccountPage.tsx',
    'src/features/auth/api/changePassword.ts',
    'src/features/auth/api/changeEmail.ts',
    'src/features/auth/api/updatePassword.ts',
  ])('%s は getSession() ではなく getUser() を使う', (path) => {
    const source = readCode(path)
    expect(source).toContain('getUser()')
    expect(source, 'getSession() は cookie 由来で真正性が保証されない').not.toContain('getSession(')
  })
})

describe('i18n', () => {
  const en = JSON.parse(read('src/shared/config/i18n/messages/en.json'))
  const ja = JSON.parse(read('src/shared/config/i18n/messages/ja.json'))

  it('Auth / Account namespace が両ロケールにある', () => {
    for (const messages of [en, ja]) {
      expect(messages.Auth).toBeDefined()
      expect(messages.Account).toBeDefined()
    }
  })

  it('en と ja のキー集合が一致する（片方だけ足す事故を防ぐ）', () => {
    const flatten = (value: unknown, prefix = ''): string[] =>
      typeof value === 'object' && value !== null
        ? Object.entries(value).flatMap(([key, child]) => flatten(child, `${prefix}${key}.`))
        : [prefix]

    for (const namespace of ['Auth', 'Account']) {
      expect(flatten(en[namespace]).sort(), `${namespace} のキーが en/ja でずれている`).toEqual(
        flatten(ja[namespace]).sort()
      )
    }
  })
})
