import { requestPasswordResetCode, resetPasswordWithCode } from '@/features/auth'
import { ForgotPasswordScreen } from '@/views/auth'

export default function ForgotPasswordRoute() {
  return (
    <ForgotPasswordScreen
      requestCode={requestPasswordResetCode}
      resetPassword={resetPasswordWithCode}
    />
  )
}
