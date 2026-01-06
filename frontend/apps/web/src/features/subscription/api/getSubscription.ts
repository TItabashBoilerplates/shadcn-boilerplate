'use server'

import type { Subscription } from '@workspace/polar/types'
import { createServerClient as createClient } from '@/shared/lib/supabase'

/**
 * Get the current user's active subscription
 */
export async function getSubscription(): Promise<Subscription | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  // Map database fields to Subscription type
  return {
    id: data.id,
    status: data.status,
    customerId: data.user_id,
    productId: data.polar_product_id,
    priceId: data.polar_price_id,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end === 1,
    createdAt: data.created_at,
    modifiedAt: data.updated_at,
  } as Subscription
}
