'use client'

import { useState, useSyncExternalStore } from 'react'
/**
 * Cookie / 分析同意の状態管理（glue）
 *
 * PostHog は `instrumentation-client.ts` で既定 opt-out。ユーザーが未決定のときだけ
 * バナーを表示し、accept で opt-in、decline で opt-out する。判定・永続化は PostHog 側
 * （`shared/lib/analytics`）に委譲する。
 *
 * 同意状態は「外部（PostHog）にあるクライアント専用状態」なので `useSyncExternalStore`
 * で読む（SSR は false = 非表示 → ハイドレーション不一致とバナーのちらつきを防ぐ）。
 * useEffect + setState を避けることで React Compiler の cascading-render 警告も回避する。
 *
 * @module features/cookie-consent
 */
import {
  hasAnalyticsDecision,
  isAnalyticsConfigured,
  optInAnalytics,
  optOutAnalytics,
} from '@/shared/lib/analytics'

interface UseCookieConsent {
  /** 未決定（＝バナーを表示すべき）か */
  needsDecision: boolean
  /** 計測に同意する */
  accept: () => void
  /** 計測を拒否する */
  decline: () => void
}

// 同意の変更は本フックの accept/decline 経由でのみ起き、その場で再描画されるため
// 外部ストアの再購読は不要（no-op subscribe）。
const noopSubscribe = () => () => {}

export function useCookieConsent(): UseCookieConsent {
  // クライアント: 計測設定済み かつ 未決定 なら true。サーバー: 常に false。
  const undecided = useSyncExternalStore(
    noopSubscribe,
    () => isAnalyticsConfigured && !hasAnalyticsDecision(),
    () => false
  )
  const [dismissed, setDismissed] = useState(false)

  const accept = () => {
    optInAnalytics()
    setDismissed(true)
  }

  const decline = () => {
    optOutAnalytics()
    setDismissed(true)
  }

  return { needsDecision: undecided && !dismissed, accept, decline }
}
