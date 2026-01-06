/**
 * サブスクリプション状態フック
 *
 * ユーザーのサブスクリプション状態を取得・管理するための React Hook
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Subscription, SubscriptionStatus } from '../types'

interface UseSubscriptionOptions {
  /** 初期データ（SSR から渡す場合） */
  initialData?: Subscription | null
  /** 自動更新間隔（ミリ秒） */
  refreshInterval?: number
}

interface UseSubscriptionReturn {
  /** サブスクリプション情報 */
  subscription: Subscription | null
  /** ローディング状態 */
  isLoading: boolean
  /** エラー情報 */
  error: Error | null
  /** 手動更新 */
  refresh: () => Promise<void>
  /** アクティブなサブスクリプションがあるか */
  isActive: boolean
  /** サブスクリプションステータス */
  status: SubscriptionStatus | null
}

/**
 * サブスクリプション状態を管理するフック
 *
 * @example
 * ```tsx
 * 'use client'
 *
 * function SubscriptionStatus() {
 *   const { subscription, isActive, status, isLoading } = useSubscription()
 *
 *   if (isLoading) return <Skeleton />
 *
 *   return (
 *     <div>
 *       {isActive ? (
 *         <Badge variant="success">Active: {status}</Badge>
 *       ) : (
 *         <Badge variant="secondary">No subscription</Badge>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
export function useSubscription(options: UseSubscriptionOptions = {}): UseSubscriptionReturn {
  const { initialData = null, refreshInterval } = options

  const [subscription, setSubscription] = useState<Subscription | null>(initialData)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/subscription')
      if (!response.ok) {
        if (response.status === 404) {
          setSubscription(null)
          return
        }
        throw new Error('Failed to fetch subscription')
      }
      const data = await response.json()
      setSubscription(data.subscription)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialData) {
      refresh()
    }
  }, [initialData, refresh])

  useEffect(() => {
    if (!refreshInterval) return

    const interval = setInterval(refresh, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, refresh])

  const status = subscription?.status as SubscriptionStatus | null
  const isActive = status === 'active' || status === 'trialing'

  return {
    subscription,
    isLoading,
    error,
    refresh,
    isActive,
    status,
  }
}
