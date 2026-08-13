import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * 認証の必須導線が消えていないことを機械的に守る（Mobile）。
 *
 * Web 版（`apps/web/src/features/auth/model/required-flows.test.ts`）と対になる検査。
 * モバイルは**外すとストア審査で落ちる**ものが含まれるため、Web 以上に重要:
 *
 * | 導線 | 根拠 |
 * |---|---|
 * | メール + パスワードのログイン | App Store 2.1(a)（demo account / login credentials） |
 * | アプリ内アカウント削除 | App Store 5.1.1(v) |
 * | パスワード再設定 / メールアドレス再設定 | `.claude/rules/auth.md` §2 |
 *
 * どれも**消してもアプリは普通に動く**ので、静的検査でしか守れない
 * （`.claude/rules/store-review.md` §7）。
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = resolve(HERE, '../../../..')

function read(relativePath: string): string {
  const full = join(APP_ROOT, relativePath)
  expect(existsSync(full), `${relativePath} が存在しない`).toBe(true)
  return readFileSync(full, 'utf8')
}

/** 「この API は使わない」という注意書き自体を拾わないよう、コメントを除く */
function readCode(relativePath: string): string {
  return read(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

describe('必須ルート', () => {
  it.each([
    ['app/sign-in.tsx', 'ログイン（審査担当者が通る経路）'],
    ['app/sign-up.tsx', 'サインアップ'],
    ['app/forgot-password.tsx', 'パスワード再設定'],
    ['app/account.tsx', 'アカウント設定'],
  ])('%s (%s) がある', (path) => {
    expect(existsSync(join(APP_ROOT, path)), `${path} が無い`).toBe(true)
  })
})

describe('ログイン', () => {
  const signInRoute = read('app/sign-in.tsx')
  const signInForm = read('src/features/auth/ui/SignInForm.tsx')

  /**
   * OTP のみのログインは、審査担当者がコードの届く受信箱に触れられないため
   * App Store 2.1(a) でリジェクトされる。
   */
  it('パスワードログインを配線している', () => {
    expect(signInRoute).toContain('signInWithPassword')
  })

  it('パスワード再設定への導線がログイン画面にある', () => {
    expect(signInForm).toContain('/forgot-password')
    expect(signInForm).toContain('forgotPassword')
  })

  it('WeakPasswordError を再設定導線へ繋いでいる', () => {
    expect(signInForm).toContain('requiresPasswordReset')
  })
})

describe('アカウント設定画面', () => {
  const accountScreen = read('src/views/account/ui/AccountScreen.tsx')

  it.each([
    ['ChangeEmailForm', 'メールアドレス再設定'],
    ['ChangePasswordForm', 'パスワード変更'],
    ['DeleteAccountForm', 'アカウント削除（App Store 5.1.1(v)。サポート連絡では不可）'],
  ])('%s がある（%s）', (component) => {
    expect(accountScreen).toContain(component)
  })
})

describe('パスワード再設定の実装', () => {
  const api = read('src/features/auth/api/index.ts')

  /**
   * ディープリンクではなく 6 桁コード方式を既定にしている。
   * スパム対策によるリンクの事前消費は Supabase 公式が Limitations に挙げる
   * 既知の問題で、公式の回避策の 1 つ目が `{{ .Token }}` の OTP 方式。
   */
  it('verifyOtp の recovery でセッションを張ってから updateUser する', () => {
    expect(api).toContain("type: 'recovery'")
    expect(api).toContain('updateUser({ password })')
  })

  it('パスワード変更は current_password を Supabase に検証させる', () => {
    expect(api).toContain('current_password')
    expect(
      readCode('src/features/auth/api/index.ts').split('export async function changePassword')[1]
    ).not.toContain('signInWithPassword')
  })
})

describe('Supabase クライアント設定', () => {
  /**
   * `storage` / `persistSession` を設定しないと**起動のたびにログイン**になる。
   * 審査担当者の体験としても最悪で、実質的にリジェクト要因になりうる。
   */
  it('セッション永続化の設定が入っている', () => {
    const client = read('../../packages/client/supabase/native.ts')
    expect(client).toContain('storage')
    expect(client).toContain('persistSession: true')
    expect(client).toContain('autoRefreshToken: true')
    expect(client).toContain('detectSessionInUrl: false')
  })
})

describe('i18n', () => {
  const en = read('src/shared/config/i18n/translations/en.ts')
  const ja = read('src/shared/config/i18n/translations/ja.ts')

  it.each(['auth:', 'account:'])('%s が両ロケールにある', (namespace) => {
    expect(en).toContain(namespace)
    expect(ja).toContain(namespace)
  })

  it.each([
    'forgotPassword',
    'deleteAccount',
    'emailChangeDoubleConfirmNotice',
    'currentPasswordLabel',
  ])('必須文言 %s が両ロケールにある', (key) => {
    expect(en, `en に ${key} が無い`).toContain(`${key}:`)
    expect(ja, `ja に ${key} が無い`).toContain(`${key}:`)
  })
})
