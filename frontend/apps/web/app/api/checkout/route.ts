import { Checkout } from '@polar-sh/nextjs'
import type { PolarServer } from '@workspace/polar/types'

/**
 * Polar.sh Checkout API Route
 *
 * This route handles the checkout process for Polar.sh subscriptions and one-time purchases.
 *
 * Query Parameters:
 * - productId: The Polar product ID to checkout
 * - userId: The authenticated user's ID (passed to metadata for webhook processing)
 *
 * @example
 * // Client-side usage:
 * window.location.href = `/api/checkout?productId=${productId}&userId=${userId}`
 *
 * // Or with useCheckout hook:
 * const { checkout } = useCheckout()
 * checkout(productId, userId)
 */
export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: '/checkout/success',
  server: (process.env.POLAR_SERVER || 'sandbox') as PolarServer,
})
