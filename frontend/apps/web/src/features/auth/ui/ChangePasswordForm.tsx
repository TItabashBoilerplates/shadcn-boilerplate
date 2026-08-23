'use client'

import { Button } from '@workspace/ui/components/button'
import { useTranslations } from 'next-intl'
import { useActionState, useState } from 'react'
import { AUTH_IDLE_STATE, type AuthActionState } from '../model/types'
import { AuthMessage } from './AuthMessage'
import { PasswordField } from './PasswordField'

/**
 * ログイン中のパスワード変更（設定画面）
 *
 * **現在のパスワードを必ず要求する。** ただし検証は `signInWithPassword` では行わず、
 * `updateUser({ current_password, password })` で Supabase 側に検証させる
 * （`.claude/rules/auth.md` §3.3 方式 A）。
 *
 * この UI だけでは防御にならない点に注意: `[auth.email] secure_password_change = true`
 * が無いと、`current_password` を送らないリクエストがサーバー側で通ってしまう。
 *
 * `action` を import ではなく **props で受け取る**のは 2 つの理由から:
 * 1. Server Action は `next/headers` 等のサーバー専用 API に依存するため、
 *    import すると Storybook（ブラウザ）で読み込めない
 * 2. UI と副作用が切り離され、各状態の見た目をそのまま確認・検証できる
 *
 * Server Component から Client Component へ Server Action を渡すのは
 * Next.js の標準パターン。
 */
export function ChangePasswordForm({
  action,
  className,
}: {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>
  className?: string
}) {
  const t = useTranslations('Auth')
  const [password, setPassword] = useState('')

  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    action,
    AUTH_IDLE_STATE
  )

  return (
    <form action={formAction} className={className ? `space-y-4 ${className}` : 'space-y-4'}>
      <PasswordField
        name="currentPassword"
        label={t('currentPasswordLabel')}
        autoComplete="current-password"
        disabled={pending}
      />

      <PasswordField
        name="password"
        label={t('newPasswordLabel')}
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
      {state.status === 'success' && (
        <AuthMessage tone="success">{t(`success.${state.messageKey}`)}</AuthMessage>
      )}

      <Button id="change-password-submit" type="submit" disabled={pending}>
        {pending ? t('saving') : t('updatePassword')}
      </Button>
    </form>
  )
}
