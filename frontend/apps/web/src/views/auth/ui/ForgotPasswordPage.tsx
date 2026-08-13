import { KeyRound } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { ForgotPasswordForm, requestPasswordReset } from '@/features/auth'
import { AuthCard } from './AuthCard'

/**
 * パスワード再設定の申請画面（未ログインから到達する）
 *
 * この画面への導線は**ログイン画面**に置くこと。パスワードを忘れた人は
 * ログインできないので、設定画面に置いても到達できない。
 */
export async function ForgotPasswordPage() {
  const t = await getTranslations('Auth')

  return (
    <AuthCard
      icon={KeyRound}
      title={t('forgotPasswordTitle')}
      description={t('forgotPasswordDescription')}
    >
      <ForgotPasswordForm action={requestPasswordReset} />
    </AuthCard>
  )
}
