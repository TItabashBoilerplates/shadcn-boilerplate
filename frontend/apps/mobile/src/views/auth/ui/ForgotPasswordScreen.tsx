import { ForgotPasswordForm } from '@/features/auth'
import { useI18n } from '@/shared/hooks'
import { AuthScreen } from './AuthScreen'

/**
 * パスワード再設定画面（6 桁コード方式）
 *
 * 導線はログイン画面に置くこと。忘れた人はログイン後の画面に到達できない。
 */
export function ForgotPasswordScreen() {
  const { t } = useI18n()
  return (
    <AuthScreen
      title={t('auth.forgotPasswordTitle')}
      description={t('auth.forgotPasswordDescription')}
    >
      <ForgotPasswordForm />
    </AuthScreen>
  )
}
