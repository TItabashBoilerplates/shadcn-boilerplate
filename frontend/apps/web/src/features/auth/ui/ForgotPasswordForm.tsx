'use client'

import { Button } from '@workspace/ui/components/button'
import { useTranslations } from 'next-intl'
import { useActionState, useId } from 'react'
import { Link } from '@/shared/lib/i18n'
import { requestPasswordReset } from '../api'
import { AUTH_IDLE_STATE, type AuthActionState } from '../model/types'
import { AuthMessage } from './AuthMessage'
import { EmailField } from './EmailField'

/**
 * パスワード再設定メールの送信フォーム（未ログインから使う）
 *
 * **成功時の文言はアカウントの存在を漏らさない**ことが要件。
 * 「登録が無いアドレスです」と返すのはユーザー列挙攻撃の入口になるため、
 * 送れても送れなくても「登録があればメールを送りました」と表示する
 * （`.claude/rules/auth.md` §3.2）。Server Action 側もそう実装してある。
 */
export function ForgotPasswordForm({ className }: { className?: string }) {
  const t = useTranslations('Auth')
  const emailId = useId()

  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    requestPasswordReset,
    AUTH_IDLE_STATE
  )

  if (state.status === 'success') {
    return (
      <div className={className ? `space-y-4 ${className}` : 'space-y-4'}>
        <AuthMessage tone="success">{t(`success.${state.messageKey}`)}</AuthMessage>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            {t('backToSignIn')}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className={className ? `space-y-4 ${className}` : 'space-y-4'}>
      <EmailField
        id={emailId}
        label={t('emailLabel')}
        placeholder={t('emailPlaceholder')}
        disabled={pending}
      />

      {state.status === 'error' && (
        <AuthMessage tone="error">{t(`errors.${state.messageKey}`)}</AuthMessage>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t('sending') : t('sendResetLink')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
          {t('backToSignIn')}
        </Link>
      </p>
    </form>
  )
}
