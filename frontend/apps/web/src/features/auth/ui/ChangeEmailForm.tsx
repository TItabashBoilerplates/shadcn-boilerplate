'use client'

import { Button } from '@workspace/ui/components/button'
import { useTranslations } from 'next-intl'
import { useActionState, useId } from 'react'
import { changeEmail } from '../api'
import { AUTH_IDLE_STATE, type AuthActionState } from '../model/types'
import { AuthMessage } from './AuthMessage'
import { EmailField } from './EmailField'

/**
 * メールアドレスの再設定（設定画面）
 *
 * **認証方式が OTP でもメール + パスワードでも必須の導線**。これが無いと、
 * メールアドレスを変えたユーザーは自力でアカウントに戻れない。
 *
 * `double_confirm_changes = true`（既定）では**旧アドレスと新アドレスの両方**で
 * 確認が必要になる。ここでその旨を明示しているのは、説明が無いと片方だけ確認して
 * 「変わらない」という問い合わせになるため（`.claude/rules/auth.md` §3.4）。
 */
export function ChangeEmailForm({
  currentEmail,
  className,
}: {
  currentEmail: string
  className?: string
}) {
  const t = useTranslations('Auth')
  const emailId = useId()

  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    changeEmail,
    AUTH_IDLE_STATE
  )

  return (
    <form action={formAction} className={className ? `space-y-4 ${className}` : 'space-y-4'}>
      <div className="text-sm text-muted-foreground">
        {t('currentEmail')}: <span className="font-medium text-foreground">{currentEmail}</span>
      </div>

      <EmailField
        id={emailId}
        label={t('newEmailLabel')}
        placeholder={t('emailPlaceholder')}
        disabled={pending}
      />

      <p className="text-xs text-muted-foreground">{t('emailChangeDoubleConfirmNotice')}</p>

      {state.status === 'error' && (
        <AuthMessage tone="error">{t(`errors.${state.messageKey}`)}</AuthMessage>
      )}
      {state.status === 'success' && (
        <AuthMessage tone="success">{t(`success.${state.messageKey}`)}</AuthMessage>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t('sending') : t('changeEmail')}
      </Button>
    </form>
  )
}
