import { pgEnum } from 'drizzle-orm/pg-core'

// Enum: chat_type
export const chatTypeEnum = pgEnum('chat_type', ['PRIVATE', 'GROUP'])

// Enum: subscription_status (Polar.sh)
// @see https://docs.polar.sh/api-reference/subscriptions/list-subscriptions
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'trialing',
  'unpaid',
])

// Enum: order_status (Polar.sh)
// @see https://docs.polar.sh/api-reference/orders/list-orders
export const orderStatusEnum = pgEnum('order_status', ['paid', 'refunded', 'partially_refunded'])
