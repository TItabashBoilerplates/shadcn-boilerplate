import type {
  AuthErrorMessageKey,
  AuthSuccessKey,
  AuthValidationKey,
} from '@workspace/auth/validation'

/**
 * Mobile 認証 API の戻り値
 *
 * **例外ではなく値で返す。** UI が「初期 / 送信中 / 成功 / 失敗 / レート制限」の
 * 5 状態を描き分けられるようにするため（`.claude/rules/auth.md` §9）。
 *
 * `messageKey` は i18n キー（`auth.errors.*` / `auth.success.*`）であって
 * 表示文言そのものではない。Supabase が返す英語の実装都合の文言をそのまま
 * 画面に出さないための層。
 */
export type AuthResult =
  | { ok: true; messageKey: AuthSuccessKey }
  | {
      ok: false
      messageKey: AuthErrorMessageKey | AuthValidationKey
      /** パスワード要件の強化で既存パスワードが弱いと判定された場合に立つ */
      requiresPasswordReset?: boolean
    }

// キーの集合は @workspace/auth/validation が正本（web/mobile で集合がズレる事故を防ぐ）
export type { AuthSuccessKey, AuthValidationKey }
