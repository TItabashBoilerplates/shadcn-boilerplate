import type { AuthErrorMessageKey } from '@workspace/auth/validation'

/**
 * 認証フォームの状態（OTP フロー用・既存）
 */
export interface AuthFormState {
  success: boolean
  message: string
}

/**
 * パスワード認証フォームの共通アクション状態。
 *
 * **英語の文言ではなく i18n キーを返す**のが要点。Server Action はロケールを
 * 持たない前提で書き、翻訳は表示側（Client Component）が `next-intl` で行う。
 * こうしないと日本語ロケールで英語のエラーが出る（`.claude/rules/i18n.md`）。
 */
export type AuthActionState =
  | { status: 'idle' }
  | { status: 'success'; messageKey: AuthSuccessKey }
  | {
      status: 'error'
      messageKey: AuthErrorMessageKey | AuthValidationKey
      /**
       * パスワード要件の強化により既存パスワードが弱いと判定された場合に立つ。
       * ログイン画面はこれを見てパスワード再設定へ誘導する。
       */
      requiresPasswordReset?: boolean
    }

/** 成功時に表示するメッセージのキー（`Auth.success.*`） */
export type AuthSuccessKey =
  | 'signedIn'
  | 'signUpConfirmationSent'
  | 'passwordResetSent'
  | 'passwordUpdated'
  | 'emailChangeRequested'

/** クライアント側の入力検証で弾いたときのキー（`Auth.errors.*`） */
export type AuthValidationKey =
  | 'emailRequired'
  | 'emailInvalidFormat'
  | 'passwordRequired'
  | 'passwordTooWeak'
  | 'passwordMismatch'
  | 'currentPasswordRequired'

export const AUTH_IDLE_STATE: AuthActionState = { status: 'idle' }

/**
 * OTP送信フォームのプロパティ
 */
export interface LoginFormProps {
  /**
   * 送信後のリダイレクト先（オプション）
   */
  redirectTo?: string

  /**
   * カスタムCSSクラス
   */
  className?: string
}

/**
 * OTP検証フォームのプロパティ
 */
export interface VerifyOTPFormProps {
  /**
   * メールアドレス（親コンポーネントから渡される）
   */
  email: string

  /**
   * 送信後のリダイレクト先（オプション）
   */
  redirectTo?: string

  /**
   * カスタムCSSクラス
   */
  className?: string
}
