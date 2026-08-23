'use client'

import { Button } from '@workspace/ui/components/button'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect } from 'react'
import { Link, useRouter } from '@/shared/lib/i18n'
import { AUTH_IDLE_STATE, type AuthActionState } from '../model/types'
import { AuthMessage } from './AuthMessage'
import { EmailField } from './EmailField'
import { PasswordField } from './PasswordField'

/**
 * メールアドレス + パスワードのログインフォーム
 *
 * **モバイルアプリを配布するプロダクトではこれが主たるログイン手段**
 * （OTP のみのログインは App Store 2.1(a) でリジェクトされる。`.claude/rules/auth.md`）。
 *
 * ## この画面に「パスワードをお忘れですか？」がある理由
 *
 * パスワードを忘れた人は**ログインできない**のだから、再設定導線を設定画面に置いても
 * 到達できない。実際にやりがちな設計ミスなので、ここに置くことをルール化している。
 *
 * ## `requiresPasswordReset`
 *
 * パスワード要件を強化すると、既存ユーザーは `weak_password` でログインに失敗する。
 * このときエラーを出すだけでは行き止まりになるため、再設定リンクを目立たせる。
 *
 * `action` を import ではなく **props で受け取る**のは 2 つの理由から:
 * 1. Server Action は `next/headers` 等のサーバー専用 API に依存するため、
 *    import すると Storybook（ブラウザ）で読み込めない
 * 2. UI と副作用が切り離され、各状態の見た目をそのまま確認・検証できる
 *
 * Server Component から Client Component へ Server Action を渡すのは
 * Next.js の標準パターン。
 */
export function PasswordLoginForm({
  action,
  redirectTo = '/dashboard',
  className,
}: {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>
  redirectTo?: string
  className?: string
}) {
  const t = useTranslations('Auth')
  const router = useRouter()

  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    action,
    AUTH_IDLE_STATE
  )

  useEffect(() => {
    if (state.status === 'success') {
      // Server Action が Set-Cookie でセッションを張っているので、
      // Server Component を取り直してから遷移する
      router.refresh()
      router.push(redirectTo)
    }
  }, [state, router, redirectTo])

  return (
    <form action={formAction} className={className ? `space-y-4 ${className}` : 'space-y-4'}>
      <EmailField
        id="email"
        label={t('emailLabel')}
        placeholder={t('emailPlaceholder')}
        disabled={pending}
        autoComplete="username"
      />

      <div className="space-y-2">
        <PasswordField
          name="password"
          label={t('passwordLabel')}
          autoComplete="current-password"
          disabled={pending}
        />
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t('forgotPassword')}
          </Link>
        </div>
      </div>

      {state.status === 'error' && (
        <AuthMessage tone="error">
          {t(`errors.${state.messageKey}`)}
          {state.requiresPasswordReset && (
            <>
              {' '}
              <Link href="/forgot-password" className="font-medium underline underline-offset-4">
                {t('resetPasswordNow')}
              </Link>
            </>
          )}
        </AuthMessage>
      )}

      <Button id="sign-in-submit" type="submit" disabled={pending} className="w-full">
        {pending ? t('signingIn') : t('signIn')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
          {t('signUp')}
        </Link>
      </p>
    </form>
  )
}
