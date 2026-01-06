/**
 * チェックアウトフック
 *
 * Polar チェックアウトへのリダイレクトを管理する React Hook
 */
'use client'

import { useCallback, useState } from 'react'

interface CheckoutOptions {
  /** 製品ID（Polar Product ID） */
  productId: string
  /** 価格ID（Polar Price ID、オプション） */
  priceId?: string
  /** 顧客メールアドレス */
  customerEmail?: string
  /** 既存の Polar Customer ID */
  customerId?: string
  /** カスタムメタデータ */
  metadata?: Record<string, string>
  /** 成功時のリダイレクトURL */
  successUrl?: string
}

interface UseCheckoutReturn {
  /** チェックアウトを開始 */
  checkout: (options: CheckoutOptions) => Promise<void>
  /** ローディング状態 */
  isLoading: boolean
  /** エラー情報 */
  error: Error | null
}

/**
 * Polar チェックアウトを開始するフック
 *
 * @example
 * ```tsx
 * 'use client'
 *
 * function PricingCard({ productId }: { productId: string }) {
 *   const { checkout, isLoading, error } = useCheckout()
 *
 *   const handleClick = async () => {
 *     await checkout({ productId })
 *   }
 *
 *   return (
 *     <Button onClick={handleClick} disabled={isLoading}>
 *       {isLoading ? 'Loading...' : 'Subscribe'}
 *     </Button>
 *   )
 * }
 * ```
 */
export function useCheckout(): UseCheckoutReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const checkout = useCallback(async (options: CheckoutOptions) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      // 必須パラメータ
      params.set('products', options.productId)

      // オプションパラメータ
      if (options.priceId) {
        params.set('priceId', options.priceId)
      }
      if (options.customerEmail) {
        params.set('customerEmail', options.customerEmail)
      }
      if (options.customerId) {
        params.set('customerId', options.customerId)
      }
      if (options.metadata) {
        params.set('metadata', JSON.stringify(options.metadata))
      }
      if (options.successUrl) {
        params.set('successUrl', options.successUrl)
      }

      // チェックアウトAPIへリダイレクト
      window.location.href = `/api/checkout?${params.toString()}`
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to start checkout'))
      setIsLoading(false)
    }
  }, [])

  return {
    checkout,
    isLoading,
    error,
  }
}
