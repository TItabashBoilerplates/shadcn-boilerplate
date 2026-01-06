import { CustomerPortal } from '@polar-sh/nextjs'
import type { PolarServer } from '@workspace/polar/types'
import type { NextRequest } from 'next/server'

/**
 * Polar.sh Customer Portal API Route
 *
 * This route redirects authenticated users to the Polar.sh customer portal
 * where they can manage their subscriptions, payment methods, and view order history.
 *
 * Query Parameters:
 * - customerId: The Polar customer ID (polar_customer_id from general_user_profiles)
 *
 * @example
 * // Client-side usage:
 * window.location.href = `/api/portal?customerId=${polarCustomerId}`
 *
 * // Or with useCustomerPortal hook:
 * const { openPortal } = useCustomerPortal()
 * openPortal(polarCustomerId)
 */
export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: (process.env.POLAR_SERVER || 'sandbox') as PolarServer,
  getCustomerId: async (req: NextRequest) => {
    const customerId = req.nextUrl.searchParams.get('customerId')
    if (!customerId) {
      throw new Error('customerId is required')
    }
    return customerId
  },
})
