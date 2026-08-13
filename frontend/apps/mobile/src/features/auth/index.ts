/**
 * Mobile 認証 feature の Public API
 *
 * `.claude/rules/auth.md` が要求する導線一式:
 * - `SignInForm` … メール + パスワード（審査で使われる主経路）
 * - `ForgotPasswordForm` … ログイン画面から到達（6 桁コード方式）
 * - `ChangePasswordForm` / `ChangeEmailForm` … 設定画面から到達
 */
export {
  changeEmail,
  changePassword,
  DELETE_ACCOUNT_CONFIRMATION,
  deleteAccount,
  requestPasswordResetCode,
  resetPasswordWithCode,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from './api'
export type { AuthResult, AuthSuccessKey, AuthValidationKey } from './model/types'
export { AuthField } from './ui/AuthField'
export { AuthMessage } from './ui/AuthMessage'
export { ChangeEmailForm } from './ui/ChangeEmailForm'
export { ChangePasswordForm } from './ui/ChangePasswordForm'
export { DeleteAccountForm } from './ui/DeleteAccountForm'
export { ForgotPasswordForm } from './ui/ForgotPasswordForm'
export { PasswordRequirements } from './ui/PasswordRequirements'
export { SignInForm } from './ui/SignInForm'
export { SignUpForm } from './ui/SignUpForm'
