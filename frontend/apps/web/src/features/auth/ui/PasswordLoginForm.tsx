'use client'

import { Button } from '@workspace/ui/components/button'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId } from 'react'
import { Link, useRouter } from '@/shared/lib/i18n'
import { signInWithPassword } from '../api'
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
 */
export function PasswordLoginForm({
  redirectTo = '/dashboard',
  className,
}: {
  redirectTo?: string
  className?: string
}) {
  const t = useTranslations('Auth')
  const router = useRouter()
  const emailId = useId()

  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    signInWithPassword,
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
        id={emailId}
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

      <Button type="submit" disabled={pending} className="w-full">
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
