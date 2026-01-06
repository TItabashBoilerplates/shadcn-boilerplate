/**
 * Polar SDK クライアント
 *
 * サーバーサイドでのみ使用（Access Token を含むため）
 */
import { Polar } from '@polar-sh/sdk'
import type { PolarServer } from '../types'

/**
 * Polar クライアントを作成
 *
 * @param options - クライアントオプション
 * @returns Polar SDK クライアントインスタンス
 *
 * @example
 * ```ts
 * // Server Action / API Route で使用
 * const polar = createPolarClient()
 * const products = await polar.products.list({ organizationId })
 * ```
 */
export function createPolarClient(options?: { accessToken?: string; server?: PolarServer }) {
  const accessToken = options?.accessToken ?? process.env.POLAR_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('POLAR_ACCESS_TOKEN is not set. Please set it in your environment variables.')
  }

  return new Polar({
    accessToken,
    server: options?.server ?? (process.env.POLAR_SERVER as PolarServer) ?? 'sandbox',
  })
}

/**
 * Polar クライアントのシングルトンインスタンス（サーバーサイド用）
 *
 * 注意: このインスタンスはサーバーサイドでのみ使用してください
 */
let polarClientInstance: Polar | null = null

/**
 * Polar クライアントのシングルトンを取得
 *
 * @returns Polar SDK クライアントインスタンス
 */
export function getPolarClient(): Polar {
  if (!polarClientInstance) {
    polarClientInstance = createPolarClient()
  }
  return polarClientInstance
}

/**
 * Organization ID を取得
 *
 * @returns Polar Organization ID
 * @throws 環境変数が設定されていない場合
 */
export function getOrganizationId(): string {
  const orgId = process.env.POLAR_ORGANIZATION_ID

  if (!orgId) {
    throw new Error(
      'POLAR_ORGANIZATION_ID is not set. Please set it in your environment variables.'
    )
  }

  return orgId
}
