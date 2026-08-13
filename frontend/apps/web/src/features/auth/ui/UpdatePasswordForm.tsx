'use client'

import { Button } from '@workspace/ui/components/button'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useState } from 'react'
import { Link, useRouter } from '@/shared/lib/i18n'
import { updatePassword } from '../api'
import { AUTH_IDLE_STATE, type AuthActionState } from '../model/types'
import { AuthMessage } from './AuthMessage'
import { PasswordField } from './PasswordField'

/**
 * 新しいパスワードの設定（再設定リンクから来た recovery セッション用）
 *
 * `/auth/confirm` が `verifyOtp({ type: 'recovery', token_hash })` でセッションを
 * 確立した後の着地点。**現在のパスワードは尋ねない**（忘れた人がここに来るため）。
 *
 * ログイン中の変更は `ChangePasswordForm`（現在のパスワードを要求する）を使う。
 */
export function UpdatePasswordForm({
  redirectTo = '/account',
  className,
}: {
  redirectTo?: string
  className?: string
}) {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [password, setPassword] = useState('')

  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    updatePassword,
    AUTH_IDLE_STATE
  )

  useEffect(() => {
    if (state.status !== 'success') {
      return
    }
    // 成功表示を読む時間を与えてから遷移する（即時遷移だと何が起きたか分からない）
    const timer = setTimeout(() => {
      router.refresh()
      router.push(redirectTo)
    }, 1500)
    return () => clearTimeout(timer)
  }, [state, router, redirectTo])

  return (
    <form action={formAction} className={className ? `space-y-4 ${className}` : 'space-y-4'}>
      <PasswordField
        name="password"
        label={t('newPasswordLabel')}
        autoComplete="new-password"
        disabled={pending || state.status === 'success'}
        showRequirements
        value={password}
        onValueChange={setPassword}
      />

      <PasswordField
        name="passwordConfirmation"
        label={t('passwordConfirmationLabel')}
        autoComplete="new-password"
        disabled={pending || state.status === 'success'}
      />

      {state.status === 'error' && (
        <AuthMessage tone="error">
          {t(`errors.${state.messageKey}`)}
          {state.messageKey === 'sessionExpired' && (
            <>
              {' '}
              <Link href="/forgot-password" className="font-medium underline underline-offset-4">
                {t('requestNewResetLink')}
              </Link>
            </>
          )}
        </AuthMessage>
      )}

      {state.status === 'success' && (
        <AuthMessage tone="success">{t(`success.${state.messageKey}`)}</AuthMessage>
      )}

      <Button type="submit" disabled={pending || state.status === 'success'} className="w-full">
        {pending ? t('saving') : t('updatePassword')}
      </Button>
    </form>
  )
}
