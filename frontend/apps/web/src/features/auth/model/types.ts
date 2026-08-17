import type {
  AuthErrorMessageKey,
  AuthSuccessKey,
  AuthValidationKey,
} from '@workspace/auth/validation'

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

// キーの集合は @workspace/auth/validation が正本（web/mobile で集合がズレる事故を防ぐ）
export type { AuthSuccessKey, AuthValidationKey }

export const AUTH_IDLE_STATE: AuthActionState = { status: 'idle' }

/**
 * 誤操作で消えないよう、アカウント削除時にユーザーへ打たせる語句。
 *
 * **`api/deleteAccount.ts`（`"use server"`）に置いてはならない。** Next.js は
 * `"use server"` ファイルからの export を async 関数に限定しており、定数を混ぜると
 * **モジュール全体の export が消えて `next build` が失敗する**（実際に起きた）。
 * `shared/lib/server-actions.policy.test.ts` がこれを検査している。
 */
export const DELETE_ACCOUNT_CONFIRMATION = 'DELETE'

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
