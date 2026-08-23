'use client'

import { Button } from '@workspace/ui/components/button'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { Link } from '@/shared/lib/i18n'
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
 *
 * `action` を import ではなく **props で受け取る**のは 2 つの理由から:
 * 1. Server Action は `next/headers` 等のサーバー専用 API に依存するため、
 *    import すると Storybook（ブラウザ）で読み込めない
 * 2. UI と副作用が切り離され、各状態の見た目をそのまま確認・検証できる
 *
 * Server Component から Client Component へ Server Action を渡すのは
 * Next.js の標準パターン。
 */
export function ForgotPasswordForm({
  action,
  className,
}: {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>
  className?: string
}) {
  const t = useTranslations('Auth')

  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    action,
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
        id="email"
        label={t('emailLabel')}
        placeholder={t('emailPlaceholder')}
        disabled={pending}
      />

      {state.status === 'error' && (
        <AuthMessage tone="error">{t(`errors.${state.messageKey}`)}</AuthMessage>
      )}

      <Button id="send-reset-link-submit" type="submit" disabled={pending} className="w-full">
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
