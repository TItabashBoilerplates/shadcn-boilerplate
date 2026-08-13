'use client'

import { Button } from '@workspace/ui/components/button'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
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
 *
 * `action` を import ではなく **props で受け取る**のは 2 つの理由から:
 * 1. Server Action は `next/headers` 等のサーバー専用 API に依存するため、
 *    import すると Storybook（ブラウザ）で読み込めない
 * 2. UI と副作用が切り離され、各状態の見た目をそのまま確認・検証できる
 *
 * Server Component から Client Component へ Server Action を渡すのは
 * Next.js の標準パターン。
 */
export function ChangeEmailForm({
  action,
  currentEmail,
  className,
}: {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>
  currentEmail: string
  className?: string
}) {
  const t = useTranslations('Auth')

  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    action,
    AUTH_IDLE_STATE
  )

  return (
    <form action={formAction} className={className ? `space-y-4 ${className}` : 'space-y-4'}>
      <div className="text-sm text-muted-foreground">
        {t('currentEmail')}: <span className="font-medium text-foreground">{currentEmail}</span>
      </div>

      <EmailField
        id="newEmail"
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
