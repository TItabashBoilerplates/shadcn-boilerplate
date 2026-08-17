/**
 * 認証 feature の Public API
 *
 * ## パスワード認証（主たるログイン手段）
 *
 * `.claude/rules/auth.md` により、モバイルアプリを配布するプロダクトでは
 * メール + パスワードが必須。以下 3 つの復帰導線もセットで必須:
 *
 * - `ForgotPasswordForm` … ログイン画面から（忘れた人は設定画面に到達できない）
 * - `ChangePasswordForm` … 設定画面から（現在のパスワードを検証する）
 * - `ChangeEmailForm` … 設定画面から（認証方式を問わず必須）
 *
 * ## OTP（補助手段）
 *
 * Web のみで完結するプロダクトなら OTP を主手段にしてよい。併用も可。
 */

export {
  changeEmail,
  changePassword,
  deleteAccount,
  requestPasswordReset,
  resendOtp,
  signInWithOtp,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updatePassword,
  verifyOtp,
} from './api'
export type {
  AuthActionState,
  AuthFormState,
  AuthSuccessKey,
  AuthValidationKey,
  LoginFormProps,
  VerifyOTPFormProps,
} from './model/types'
export { AUTH_IDLE_STATE, DELETE_ACCOUNT_CONFIRMATION } from './model/types'
export { AuthMessage } from './ui/AuthMessage'
export { ChangeEmailForm } from './ui/ChangeEmailForm'
export { ChangePasswordForm } from './ui/ChangePasswordForm'
export { DeleteAccountForm } from './ui/DeleteAccountForm'
export { EmailField } from './ui/EmailField'
export { ForgotPasswordForm } from './ui/ForgotPasswordForm'
export { LoginForm } from './ui/LoginForm'
export { PasswordField } from './ui/PasswordField'
export { PasswordLoginForm } from './ui/PasswordLoginForm'
export { SignUpForm } from './ui/SignUpForm'
export { UpdatePasswordForm } from './ui/UpdatePasswordForm'
export { VerifyOTPForm } from './ui/VerifyOTPForm'
