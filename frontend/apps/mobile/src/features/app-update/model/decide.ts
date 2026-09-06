import type { DecideUpdateActionInput, UpdateDecision, UpdateDecisionReason } from './types'
import { compareVersions } from './version'

/**
 * 起動中のアプリが「更新すべきか、止めるべきか」を決める**唯一の場所**。
 *
 * ## 原則: 判断できないならブロックしない（フェイルオープン）
 *
 * 強制アップデートは **こちらから取り消せない操作**である。誤って発動すると
 * ユーザーはアプリを開けず、アプリ内で何かを直させることもできない。
 * 一方で「強制すべきだったのに強制しなかった」は、次の起動で取り返せる。
 * 被害が非対称なので、材料が 1 つでも欠けたら `none` に倒す。
 *
 * 具体的にフェイルオープンする条件:
 *
 * | 状況 | 理由 |
 * |---|---|
 * | 方針を取得できていない | 通信断・RLS の変更・行の消失。ユーザーの責任ではない |
 * | 自分の版が読めない | `expo-application` が null を返す環境（Expo Go / Web） |
 * | 方針側の版が読めない | 運用のタイプミス |
 * | `minimum > latest` | **ストアに存在しない版の要求**。全員が詰む |
 * | `storeUrl` が https でない | ブロックしても誘導先が無い |
 *
 * ## 「自分より新しい版」は何も出さない
 *
 * ストア審査中の版や社内配布ビルドは `latestVersion` より新しい。ここで推奨を出すと
 * **審査担当者に「更新してください」と表示される**。
 *
 * 対の運用ルール（`docs/mobile/app-update-runbook.md`）:
 * **審査に出している版を `minimum_version` にしない。** ストアで公開済みになってから上げる。
 */
export function decideUpdateAction(input: DecideUpdateActionInput): UpdateDecision {
  const { currentVersion, policy, dismissedVersion } = input

  if (!policy) return noUpdate('no-policy')

  const { minimumVersion, latestVersion, storeUrl, releaseNotes } = policy

  // 誘導先が無い / スキームが不正なら、ブロックしても出口が無い。
  // `https://` 限定にしているのは、行を書き換えられる経路ができたときに
  // そのまま任意 URL のオープンにならないようにするため（DB 側も CHECK 制約で同じ条件）。
  if (!isHttpsUrl(storeUrl)) return noUpdate('invalid-store-url')

  const vsMinimum = compareVersions(currentVersion, minimumVersion)
  const vsLatest = compareVersions(currentVersion, latestVersion)

  if (vsMinimum === null || vsLatest === null) {
    // どちらが読めなかったかで理由を分ける（切り分けのため）
    const currentIsReadable = compareVersions(currentVersion, currentVersion) !== null
    return noUpdate(currentIsReadable ? 'unparsable-policy-version' : 'unparsable-current-version')
  }

  const minimumVsLatest = compareVersions(minimumVersion, latestVersion)

  // DB の CHECK 制約で防いでいるが、制約を落とした / service_role で直接書いた場合の保険。
  // ストアに無い版を要求することになるので、**強制には決して昇格させない**。
  if (minimumVsLatest !== null && minimumVsLatest > 0) {
    return { ...noUpdate('minimum-above-latest'), latestVersion, storeUrl, releaseNotes }
  }

  if (vsMinimum < 0) {
    return {
      action: 'forced',
      reason: 'below-minimum',
      latestVersion,
      storeUrl,
      releaseNotes,
    }
  }

  if (vsLatest >= 0) return { ...noUpdate('up-to-date'), latestVersion, storeUrl, releaseNotes }

  // 推奨は見送れる。**強制より後で判定する**（強制は見送れない）。
  if (dismissedVersion && compareVersions(dismissedVersion, latestVersion) === 0) {
    return { ...noUpdate('dismissed'), latestVersion, storeUrl, releaseNotes }
  }

  return {
    action: 'recommended',
    reason: 'below-latest',
    latestVersion,
    storeUrl,
    releaseNotes,
  }
}

function noUpdate(reason: UpdateDecisionReason): UpdateDecision {
  return { action: 'none', reason, latestVersion: null, storeUrl: null, releaseNotes: null }
}

/** `https://` のみ許可する。`javascript:` 等を弾くための最小限の検証 */
function isHttpsUrl(value: string): boolean {
  return typeof value === 'string' && /^https:\/\/\S+$/i.test(value)
}
