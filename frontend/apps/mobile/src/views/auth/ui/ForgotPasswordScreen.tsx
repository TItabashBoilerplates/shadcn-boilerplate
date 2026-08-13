import type { AuthResult } from '@/features/auth'
import { ForgotPasswordForm } from '@/features/auth'
import { useI18n } from '@/shared/hooks'
import { AuthScreen } from './AuthScreen'

/**
 * パスワード再設定画面（6 桁コード方式）
 *
 * 導線はログイン画面に置くこと。忘れた人はログイン後の画面に到達できない。
 */
export function ForgotPasswordScreen({
  requestCode,
  resetPassword,
}: {
  requestCode: (email: string) => Promise<AuthResult>
  resetPassword: (
    email: string,
    token: string,
    password: string,
    passwordConfirmation: string
  ) => Promise<AuthResult>
}) {
  const { t } = useI18n()
  return (
    <AuthScreen
      title={t('auth.forgotPasswordTitle')}
      description={t('auth.forgotPasswordDescription')}
    >
      <ForgotPasswordForm requestCode={requestCode} resetPassword={resetPassword} />
    </AuthScreen>
  )
}
