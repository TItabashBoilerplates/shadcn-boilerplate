/**
 * Polar.sh 型定義
 *
 * Note: Polar SDK は各型を個別ファイルでエクスポートするため、
 * プロジェクトで必要な型をここで定義しています。
 */

/**
 * Checkout status
 */
export type CheckoutStatus = 'open' | 'expired' | 'confirmed' | 'succeeded' | 'failed'

/**
 * Checkout session
 */
export interface Checkout {
  id: string
  createdAt: string
  modifiedAt: string | null
  status: CheckoutStatus
  clientSecret: string
  url: string
  expiresAt: string
  successUrl: string
  amount: number | null
  currency: string | null
  productId: string
  productPriceId: string
  customerId: string | null
  customerEmail: string | null
  customerName: string | null
  metadata: Record<string, string | number | boolean> | null
}

/**
 * Customer
 */
export interface Customer {
  id: string
  createdAt: string
  modifiedAt: string | null
  email: string
  name: string | null
  metadata: Record<string, string | number | boolean> | null
}

/**
 * Product price type
 */
export type ProductPriceType = 'one_time' | 'recurring'

/**
 * Recurring interval
 */
export type RecurringInterval = 'day' | 'week' | 'month' | 'year'

/**
 * Product price
 */
export interface ProductPrice {
  id: string
  createdAt: string
  modifiedAt: string | null
  type: ProductPriceType
  priceAmount: number
  priceCurrency: string
  recurringInterval?: RecurringInterval
}

/**
 * Product
 */
export interface Product {
  id: string
  createdAt: string
  modifiedAt: string | null
  name: string
  description: string | null
  isArchived: boolean
  organizationId: string
  prices: ProductPrice[]
  benefits: { id: string; type: string }[]
  medias: { id: string; publicUrl: string }[]
}

/**
 * Order status
 */
export type OrderStatus = 'paid' | 'refunded' | 'partially_refunded'

/**
 * Order
 */
export interface Order {
  id: string
  createdAt: string
  modifiedAt: string | null
  status: OrderStatus
  amount: number
  currency: string
  productId: string
  productPriceId: string
  customerId: string
  checkoutId: string | null
  metadata: Record<string, string | number | boolean> | null
}

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'

/**
 * Subscription
 */
export interface Subscription {
  id: string
  createdAt: string
  modifiedAt: string | null
  status: SubscriptionStatus
  amount: number
  currency: string
  recurringInterval: RecurringInterval
  currentPeriodStart: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  startedAt: string | null
  endsAt: string | null
  endedAt: string | null
  productId: string
  priceId: string
  customerId: string
  metadata: Record<string, string | number | boolean> | null
}

/**
 * Polar サーバー環境
 */
export type PolarServer = 'sandbox' | 'production'

/**
 * Webhook イベントタイプ
 */
export type WebhookEventType =
  | 'checkout.created'
  | 'checkout.updated'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.active'
  | 'subscription.canceled'
  | 'subscription.revoked'
  | 'order.created'
  | 'order.paid'
  | 'customer.created'
  | 'customer.updated'

/**
 * Webhook ペイロード基底型
 */
export interface WebhookPayload<T extends WebhookEventType, D> {
  type: T
  timestamp: string
  data: D
}
