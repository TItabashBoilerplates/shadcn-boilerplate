import type { TextInputProps } from 'react-native'

/**
 * 入力欄の「意味」から、プラットフォームごとの正しい入力属性を導出する。
 *
 * ## なぜ画面側で属性を直書きしないのか
 *
 * `autoComplete` は**クロスプラットフォームに見えて、Android 側に対応する
 * autofill hint が存在しない値がある**。React Native の Android 実装
 * (`ReactTextInputManager.kt` の `REACT_PROPS_AUTOFILL_HINTS_MAP`) を実際に読むと:
 *
 * | 値 | Android hint |
 * |---|---|
 * | `email` / `password` / `password-new` / `sms-otp` / `email-otp` | ✅ ある |
 * | **`current-password` / `new-password` / `one-time-code`** | ❌ **無い** |
 *
 * つまり `autoComplete="one-time-code"` は **iOS では `textContentType` のおかげで
 * 動くが、Android では hint が一切付かない**（エラーも警告も出ないまま
 * OTP 自動入力だけが死ぬ）。実機で OTP を受け取るまで気づけない類の不具合なので、
 * 対応表を 1 か所に閉じ込めて `input-attributes.test.ts` で固定している。
 *
 * ## 優先順位（食い違わせない）
 *
 * `inputMode` > `keyboardType` / `enterKeyHint` > `returnKeyType` /
 * `textContentType`(iOS) > `autoComplete`。**新しい方だけを返す。**
 *
 * @see .claude/rules/mobile-uiux.md §3
 * @see .claude/skills/mobile-uiux/references/input-attributes.md
 */

export const AUTH_FIELD_PURPOSES = [
  'email',
  'currentPassword',
  'newPassword',
  'oneTimeCode',
  'confirmation',
] as const

export type AuthFieldPurpose = (typeof AUTH_FIELD_PURPOSES)[number]

/** `Platform.OS` のうち本アプリが出力する 3 つ */
export type AuthFieldPlatform = 'ios' | 'android' | 'web'

export type AuthFieldAttributes = Pick<
  TextInputProps,
  'inputMode' | 'autoComplete' | 'textContentType' | 'secureTextEntry'
> & {
  autoCapitalize: 'none' | 'sentences'
  autoCorrect: boolean
}

type PurposeSpec = {
  inputMode?: TextInputProps['inputMode']
  secureTextEntry?: boolean
  /** iOS。`autoComplete` より優先されるため iOS ではこちらだけを渡す */
  ios: TextInputProps['textContentType']
  /** Android の autofill hint（上表の「ある」側の綴りだけを使う） */
  android: TextInputProps['autoComplete']
  /** react-native-web → HTML の `autocomplete` にそのまま出る */
  web: TextInputProps['autoComplete']
}

const SPECS: Record<AuthFieldPurpose, PurposeSpec> = {
  email: {
    inputMode: 'email',
    ios: 'emailAddress',
    android: 'email',
    web: 'email',
  },
  currentPassword: {
    secureTextEntry: true,
    ios: 'password',
    // Android に `current-password` は無い。`password` が現在のパスワード用
    android: 'password',
    web: 'current-password',
  },
  newPassword: {
    secureTextEntry: true,
    ios: 'newPassword',
    // Android は `new-password` ではなく `password-new`
    android: 'password-new',
    web: 'new-password',
  },
  oneTimeCode: {
    inputMode: 'numeric',
    ios: 'oneTimeCode',
    // 本リポジトリの再設定コードは**メールで届く**（`resetPasswordForEmail` →
    // `verifyOtp({ type: 'recovery' })`）。SMS 配信に変えるなら `sms-otp` にする
    android: 'email-otp',
    web: 'one-time-code',
  },
  confirmation: {
    // 削除確認の語句など。保存済みの値が入ると事故になるので明示的に切る
    ios: 'none',
    android: 'off',
    web: 'off',
  },
}

export function resolveAuthFieldAttributes(
  purpose: AuthFieldPurpose,
  platform: AuthFieldPlatform
): AuthFieldAttributes {
  const spec = SPECS[purpose]

  const base: AuthFieldAttributes = {
    inputMode: spec.inputMode,
    secureTextEntry: spec.secureTextEntry,
    // 認証系の入力はすべて自動大文字化・自動修正が邪魔になる
    autoCapitalize: 'none',
    autoCorrect: false,
  }

  // オートフィルを「切る」用途だけは両プラットフォームへ渡してよい
  // （`off` と `none` はどちらも「しない」の意味で、食い違いようがない）
  if (purpose === 'confirmation') {
    return { ...base, textContentType: spec.ios, autoComplete: spec.android }
  }

  if (platform === 'ios') {
    return { ...base, textContentType: spec.ios }
  }

  return { ...base, autoComplete: platform === 'android' ? spec.android : spec.web }
}
