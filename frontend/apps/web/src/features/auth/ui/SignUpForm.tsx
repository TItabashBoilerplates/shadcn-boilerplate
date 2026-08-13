'use client'

import { Button } from '@workspace/ui/components/button'
import { useLocale, useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'
import { Link } from '@/shared/lib/i18n'
import { AUTH_IDLE_STATE, type AuthActionState } from '../model/types'
import { AuthMessage } from './AuthMessage'
import { EmailField } from './EmailField'
import { PasswordField } from './PasswordField'

/**
 * メールアドレス + パスワードのサインアップフォーム
 *
 * 本番は `enable_confirmations = true` なので、**送信が成功してもログインはしない**。
 * 確認メールを送った旨だけを伝え、フォームは差し替える（続けて押させない）。
 *
 * `locale` を hidden で送っているのは、確認メールのテンプレートが
 * `{{ .Data.locale }}` で言語を切り替えているため（`supabase/templates/email/`）。
 *
 * `action` を import ではなく **props で受け取る**のは 2 つの理由から:
 * 1. Server Action は `next/headers` 等のサーバー専用 API に依存するため、
 *    import すると Storybook（ブラウザ）で読み込めない
 * 2. UI と副作用が切り離され、各状態の見た目をそのまま確認・検証できる
 *
 * Server Component から Client Component へ Server Action を渡すのは
 * Next.js の標準パターン。
 */
export function SignUpForm({
  action,
  className,
}: {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>
  className?: string
}) {
  const t = useTranslations('Auth')
  const locale = useLocale()
  const [password, setPassword] = useState('')

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
      <input type="hidden" name="locale" value={locale} />

      <EmailField
        id="email"
        label={t('emailLabel')}
        placeholder={t('emailPlaceholder')}
        disabled={pending}
      />

      <PasswordField
        name="password"
        label={t('passwordLabel')}
        autoComplete="new-password"
        disabled={pending}
        showRequirements
        value={password}
        onValueChange={setPassword}
      />

      <PasswordField
        name="passwordConfirmation"
        label={t('passwordConfirmationLabel')}
        autoComplete="new-password"
        disabled={pending}
      />

      {state.status === 'error' && (
        <AuthMessage tone="error">{t(`errors.${state.messageKey}`)}</AuthMessage>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t('signingUp') : t('signUp')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          {t('signIn')}
        </Link>
      </p>
    </form>
  )
}
