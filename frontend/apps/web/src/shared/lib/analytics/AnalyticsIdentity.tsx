'use client'

/**
 * 認証状態と PostHog の識別を同期する（レンダリングなし）
 *
 * 認証状態の変化を監視し、ログイン時は `identify`、ログアウト遷移時は `reset` を呼ぶ。
 * `@workspace/onesignal` の `useOneSignalAuth` と同じ発想で、レイアウトに 1 つだけマウントする。
 *
 * PostHog の初期化自体は `instrumentation-client.ts` が担う（Provider は併用しない）。
 *
 * @module shared/lib/analytics
 */
import { useAuth } from '@workspace/auth'
import { useEffect, useRef } from 'react'
import { identifyUser, resetUser } from './posthog'

/**
 * 認証状態を PostHog の identify / reset に反映するコンポーネント
 */
export function AnalyticsIdentity(): null {
  const { user } = useAuth()
  const previousUserId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    const userId = user?.id

    // 前回と同じ状態なら何もしない（初回の匿名状態で reset して distinctId を壊さない）
    if (previousUserId.current === userId) {
      return
    }

    const wasIdentified = Boolean(previousUserId.current)
    previousUserId.current = userId

    if (userId) {
      identifyUser(userId)
    } else if (wasIdentified) {
      // ログイン → ログアウトの遷移でのみリセット
      resetUser()
    }
  }, [user?.id])

  return null
}
