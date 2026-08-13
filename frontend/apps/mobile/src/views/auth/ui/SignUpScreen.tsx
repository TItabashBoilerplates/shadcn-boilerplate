import { SignUpForm } from '@/features/auth'
import { useI18n } from '@/shared/hooks'
import { AuthScreen } from './AuthScreen'

/** サインアップ画面。本番は確認メールが挟まる */
export function SignUpScreen() {
  const { t } = useI18n()
  return (
    <AuthScreen title={t('auth.signUpTitle')} description={t('auth.signUpDescription')}>
      <SignUpForm />
    </AuthScreen>
  )
}
