/** ストア配布のプラットフォーム。Web ビルド（react-native-web）は対象外 */
export type AppPlatform = 'ios' | 'android'

/**
 * `app_release_policies` の 1 行（drizzle/schema/app-release-policies.ts）。
 *
 * 生成型（`@workspace/types` の `schema.ts`）ではなくここで宣言している理由:
 * この feature は **DB スキーマが無くても成立する**（方針を別の場所から取る派生先もありうる）。
 * 判断ロジックが依存するのは「この 5 つの値」だけなので、その形だけを契約にする。
 */
export interface ReleasePolicy {
  platform: AppPlatform
  /** これ**未満**の版はブロックする */
  minimumVersion: string
  /** ストアで公開中の最新版。これ**未満**なら推奨アップデートを出す */
  latestVersion: string
  /**
   * 誘導先。**`https://` のみ**（iOS は `https://apps.apple.com/app/id<ID>`、
   * Android は `https://play.google.com/store/apps/details?id=<package>`）。
   * どちらも一次情報で裏の取れる唯一の形式。`lib/runtime.ts` の注記を参照。
   */
  storeUrl: string
  /** ロケールキーの「新しくなったこと」。無ければ i18n の既定文言を使う */
  releaseNotes: Record<string, string> | null
}

/** 何をすべきか。`forced` だけがユーザーの操作を奪う */
export type UpdateAction = 'none' | 'recommended' | 'forced'

/**
 * なぜその判断になったか。**ログとテレメトリのために必ず持つ。**
 *
 * 強制アップデートは「出ない」より「出てはいけないのに出た」ほうが被害が大きく、
 * かつユーザーからは「アプリが壊れた」としか報告されない。理由コードが無いと
 * 通信断なのかデータ不正なのか版の読み取り失敗なのかを切り分けられない。
 */
export type UpdateDecisionReason =
  | 'up-to-date'
  | 'below-latest'
  | 'below-minimum'
  | 'dismissed'
  | 'no-policy'
  | 'unparsable-current-version'
  | 'unparsable-policy-version'
  | 'minimum-above-latest'
  | 'invalid-store-url'

export interface UpdateDecision {
  action: UpdateAction
  reason: UpdateDecisionReason
  /** `action !== 'none'` のときだけ意味を持つ */
  latestVersion: string | null
  storeUrl: string | null
  releaseNotes: Record<string, string> | null
}

export interface DecideUpdateActionInput {
  /** 実際に動いているバイナリの版（`expo-application` の `nativeApplicationVersion`） */
  currentVersion: string | null | undefined
  policy: ReleasePolicy | null | undefined
  /** ユーザーが「後で」を選んだ版。強制には効かない */
  dismissedVersion?: string | null
}
