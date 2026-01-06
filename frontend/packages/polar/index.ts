/**
 * @workspace/polar - Polar.sh 統合パッケージ
 *
 * 課金・サブスクリプション管理のための共通パッケージ
 *
 * @example
 * ```ts
 * // クライアント（サーバーサイドのみ）
 * import { createPolarClient, getOrganizationId } from '@workspace/polar/client'
 *
 * // プラン定義
 * import { planDefinitions, getProductByKey } from '@workspace/polar/plans'
 *
 * // フック（クライアントコンポーネント）
 * import { useCheckout, useSubscription, useCustomerPortal } from '@workspace/polar/hooks'
 *
 * // 型定義
 * import type { Product, Subscription, PolarServer } from '@workspace/polar/types'
 * ```
 *
 * @packageDocumentation
 */

// Client
export { createPolarClient, getOrganizationId, getPolarClient } from './client'
// Hooks
export { useCheckout, useCustomerPortal, useSubscription } from './hooks'
export type {
  BenefitReference,
  PlanDefinitions,
  PriceDefinition,
  ProductDefinition,
  ProductMapping,
  ProductType,
  RecurringInterval,
} from './plans'
// Plans
export {
  getOneTimeProducts,
  getProductByKey,
  getSubscriptionProducts,
  planDefinitions,
} from './plans'

// Types
export type {
  Checkout,
  CheckoutStatus,
  Customer,
  Order,
  OrderStatus,
  PolarServer,
  Product,
  ProductPrice,
  ProductPriceType,
  Subscription,
  SubscriptionStatus,
  WebhookEventType,
  WebhookPayload,
} from './types'
