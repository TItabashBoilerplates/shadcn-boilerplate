/**
 * カスタマーポータルフック
 *
 * Polar カスタマーポータル（サブスク管理画面）へのリダイレクトを管理する React Hook
 */
'use client'

import { useCallback, useState } from 'react'

interface UseCustomerPortalReturn {
  /** カスタマーポータルを開く */
  openPortal: (customerId?: string) => Promise<void>
  /** ローディング状態 */
  isLoading: boolean
  /** エラー情報 */
  error: Error | null
}

/**
 * Polar カスタマーポータルを開くフック
 *
 * カスタマーポータルでは以下の操作が可能:
 * - サブスクリプションの確認
 * - プランの変更
 * - 支払い方法の更新
 * - サブスクリプションのキャンセル
 *
 * @example
 * ```tsx
 * 'use client'
 *
 * function ManageSubscriptionButton({ customerId }: { customerId: string }) {
 *   const { openPortal, isLoading } = useCustomerPortal()
 *
 *   return (
 *     <Button onClick={() => openPortal(customerId)} disabled={isLoading}>
 *       {isLoading ? 'Loading...' : 'Manage Subscription'}
 *     </Button>
 *   )
 * }
 * ```
 */
export function useCustomerPortal(): UseCustomerPortalReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const openPortal = useCallback(async (customerId?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // カスタマーポータルAPIへリダイレクト
      const url = customerId ? `/api/portal?customerId=${customerId}` : '/api/portal'
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to open customer portal'))
      setIsLoading(false)
    }
  }, [])

  return {
    openPortal,
    isLoading,
    error,
  }
}
