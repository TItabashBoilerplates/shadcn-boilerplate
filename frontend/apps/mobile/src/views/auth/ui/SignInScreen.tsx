import { SignInForm } from '@/features/auth'
import { useI18n } from '@/shared/hooks'
import { AuthScreen } from './AuthScreen'

/** ログイン画面。審査担当者がここからメール + パスワードで入る */
export function SignInScreen() {
  const { t } = useI18n()
  return (
    <AuthScreen title={t('auth.signInTitle')} description={t('auth.signInDescription')}>
      <SignInForm />
    </AuthScreen>
  )
}
