/**
 * 認証フローの i18n メッセージキー（Web / Mobile / Desktop 共有）
 *
 * ## なぜ共有するのか
 *
 * これらは**翻訳ファイルとの契約**であって、プラットフォーム固有の実装詳細ではない。
 * web と mobile で別々に持つと、片方にキーを足したときにもう片方の翻訳が
 * 追従せず、**そのプラットフォームでだけキー文字列が画面に出る**（`emailRequired`
 * とそのまま表示される）という形で壊れる。しかも**型チェックも lint も通る**ので、
 * その画面を実際に踏むまで気づけない。
 *
 * `.claude/rules/minimal-implementation.md` §2.1 が「不整合が事故になるもの
 * （バリデーション規則・API 契約）は 2 回目で即共通化」と定めている対象。
 *
 * ## 何を共有し、何を共有しないか
 *
 * 共有するのは**キーの集合**だけ。戻り値の器はプラットフォームで違ってよい:
 *
 * - Web    … `AuthActionState`（Server Actions + `useActionState` の形）
 * - Mobile … `AuthResult`（直接呼び出しの形）
 *
 * ここを無理に共通化すると、Server Actions の制約に Mobile が引きずられる。
 */

/**
 * 成功時のメッセージキー（i18n の `Auth.success.<key>`）
 *
 * ⚠️ **パスワード再設定の成功キーが 2 つあるのは意図的**（`.claude/rules/auth.md` §3.2）:
 *
 * - `passwordResetSent`     … Web。リンク（token_hash）付きのメールを送った
 * - `passwordResetCodeSent` … Mobile。6 桁コードを送った（ディープリンクは
 *                             メールプロバイダのリンク事前読み込みで壊れるため）
 *
 * 文面が違う（「メールのリンクを開いてください」vs「届いた 6 桁コードを入力してください」）
 * ので統合してはならない。**実際に web と mobile で片方ずつしか定義されておらず、
 * 集合がズレていた**ため、ここに両方を並べて可視化している。
 */
export const AUTH_SUCCESS_KEYS = [
  'signedIn',
  'signUpConfirmationSent',
  'passwordResetSent',
  'passwordResetCodeSent',
  'passwordUpdated',
  'emailChangeRequested',
  'accountDeleted',
] as const

export type AuthSuccessKey = (typeof AUTH_SUCCESS_KEYS)[number]

/**
 * クライアント側バリデーションのメッセージキー（i18n の `Auth.errors.<key>`）
 *
 * Supabase が返すサーバー側エラーは `AuthErrorMessageKey`（`./errors`）で別に持つ。
 * 「送信前に弾いたもの」と「サーバーが拒否したもの」は原因も文言も違うため分けている。
 */
export const AUTH_VALIDATION_KEYS = [
  'emailRequired',
  'emailInvalidFormat',
  'passwordRequired',
  'passwordTooWeak',
  'passwordMismatch',
  'currentPasswordRequired',
  'deleteConfirmationMismatch',
] as const

export type AuthValidationKey = (typeof AUTH_VALIDATION_KEYS)[number]
