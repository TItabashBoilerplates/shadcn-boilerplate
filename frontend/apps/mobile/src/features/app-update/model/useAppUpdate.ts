import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, type AppStateStatus, InteractionManager } from 'react-native'
import { fetchReleasePolicy } from '../api/fetchReleasePolicy'
import { releasePolicyQuery } from '../api/releasePolicyQuery'
import { readDismissedVersion, writeDismissedVersion } from '../lib/dismissal'
import { getCurrentAppVersion, getStorePlatform, openStoreUrl } from '../lib/runtime'
import { decideUpdateAction } from './decide'
import type { UpdateDecision } from './types'

/**
 * アップデート判定を購読するフック。判断そのものは `decideUpdateAction`（純粋関数）が持ち、
 * ここは**いつ再判定するか**と**副作用**だけを担う。
 *
 * ## いつ再判定するか
 *
 * 1. マウント時
 * 2. **フォアグラウンド復帰時**（`AppState` が `active` になったとき）
 *
 * 2 が要る理由: モバイルアプリはめったに終了せず、何日も background にいる。
 * 起動時だけ見ていると、**下限を上げた直後に使っているユーザーには何日も届かない**。
 * ただし復帰のたびに叩くとタブ切り替えでも走ってしまうので `MIN_RECHECK_INTERVAL_MS`
 * で間引く。
 *
 * ## 初期値は必ず `none`
 *
 * 取得が終わるまでは何も出さない（＝子を普通に描画する）。「判定が終わるまで
 * スプラッシュで待つ」設計にすると、**通信が遅い / 応答が返らない環境で
 * アプリが永久に開かない**。強制アップデート対象のユーザーが一瞬だけ画面を見るのは、
 * 全員が起動できなくなるリスクより桁違いに軽い。
 */
const MIN_RECHECK_INTERVAL_MS = 5 * 60 * 1000

const NO_UPDATE: UpdateDecision = {
  action: 'none',
  reason: 'no-policy',
  latestVersion: null,
  storeUrl: null,
  releaseNotes: null,
}

export interface UseAppUpdateResult {
  decision: UpdateDecision
  /** ストアを開く。開けなければ `false`（UI がエラー表示に使う） */
  openStore: () => Promise<boolean>
  /** 推奨アップデートを見送る。強制では呼ばない */
  dismiss: () => void
}

export function useAppUpdate(): UseAppUpdateResult {
  const [decision, setDecision] = useState<UpdateDecision>(NO_UPDATE)
  const lastCheckedAt = useRef(0)
  const dismissedVersion = useRef<string | null>(null)

  const check = useCallback(async () => {
    const platform = getStorePlatform()
    // web / Storybook ではストアという概念が無いので判定自体を行わない
    if (!platform) return

    lastCheckedAt.current = Date.now()

    const [policy, dismissed] = await Promise.all([
      fetchReleasePolicy(releasePolicyQuery, platform),
      readDismissedVersion(),
    ])
    dismissedVersion.current = dismissed

    const next = decideUpdateAction({
      currentVersion: getCurrentAppVersion(),
      policy,
      dismissedVersion: dismissed,
    })

    // 判断理由は必ず残す。強制アップデートは「出てはいけないのに出た」ときの
    // 被害が大きく、ユーザーからは「アプリが壊れた」としか報告されない。
    if (next.action !== 'none') {
      console.info('App update decision:', { action: next.action, reason: next.reason })
    }

    setDecision(next)
  }, [])

  useEffect(() => {
    // 初回判定は**最初の描画とアニメーションが落ち着いてから**走らせる。
    //
    // 理由は 2 つある:
    // 1. 起動直後は画面の組み立てで忙しく、そこにネットワークと AsyncStorage を
    //    割り込ませても得が無い（判定結果が要るのは「今この瞬間」ではない）。
    // 2. effect の同期実行中に setState を誘発しないため。React は effect の本体を
    //    「外部システムとの同期」に使い、状態更新は**コールバックの中**で行うことを
    //    求めている（`react-hooks/set-state-in-effect`）。
    const interaction = InteractionManager.runAfterInteractions(() => {
      void check()
    })

    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status !== 'active') return
      if (Date.now() - lastCheckedAt.current < MIN_RECHECK_INTERVAL_MS) return
      void check()
    })

    return () => {
      interaction.cancel()
      subscription.remove()
    }
  }, [check])

  const openStore = useCallback(async () => {
    if (!decision.storeUrl) return false
    return openStoreUrl(decision.storeUrl)
  }, [decision.storeUrl])

  const dismiss = useCallback(() => {
    // 強制は見送れない。UI 側が呼ばない前提だが、ここでも守る。
    if (decision.action !== 'recommended' || !decision.latestVersion) return

    const version = decision.latestVersion
    void writeDismissedVersion(version)
    dismissedVersion.current = version
    setDecision((current) =>
      current.action === 'recommended'
        ? { ...current, action: 'none', reason: 'dismissed' }
        : current
    )
  }, [decision.action, decision.latestVersion])

  return { decision, openStore, dismiss }
}
