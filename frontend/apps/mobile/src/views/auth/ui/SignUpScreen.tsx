import type { AuthResult } from '@/features/auth'
import { SignUpForm } from '@/features/auth'
import { useI18n } from '@/shared/hooks'
import { AuthScreen } from './AuthScreen'

/** サインアップ画面。本番は確認メールが挟まる */
export function SignUpScreen({
  signUp,
}: {
  signUp: (
    email: string,
    password: string,
    passwordConfirmation: string,
    locale: string
  ) => Promise<AuthResult>
}) {
  const { t } = useI18n()
  return (
    <AuthScreen title={t('auth.signUpTitle')} description={t('auth.signUpDescription')}>
      <SignUpForm signUp={signUp} />
    </AuthScreen>
  )
}
