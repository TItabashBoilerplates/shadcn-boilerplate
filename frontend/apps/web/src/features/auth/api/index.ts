/**
 * 認証 API（Server Actions）の Public API
 *
 * ## パスワード認証（主たるログイン手段）
 *
 * モバイルアプリを配布するプロダクトでは、メール + パスワードが**必須**
 * （OTP のみは App Store 2.1(a) でリジェクトされる）。`.claude/rules/auth.md` を参照。
 *
 * ## OTP（補助手段）
 *
 * Web のみで完結するプロダクトなら OTP を主手段にしてよい。パスワード認証と
 * **併用**する場合もそのまま使える。
 */

export { changeEmail } from './changeEmail'
export { changePassword } from './changePassword'
export { deleteAccount } from './deleteAccount'
export { requestPasswordReset } from './requestPasswordReset'
export { resendOtp } from './resendOtp'
export { signInWithOtp } from './signInWithOtp'
export { signInWithPassword } from './signInWithPassword'
export { signOut } from './signOut'
export { signUpWithPassword } from './signUpWithPassword'
export { updatePassword } from './updatePassword'
export { verifyOtp } from './verifyOtp'
