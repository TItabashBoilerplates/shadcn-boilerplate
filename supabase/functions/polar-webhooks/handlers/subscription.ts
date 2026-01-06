import type { SupabaseClient } from "@supabase/supabase-js";
import type { PolarSubscription } from "./types.ts";

/**
 * Handle subscription.created event
 */
export async function handleSubscriptionCreated(
  supabase: SupabaseClient,
  data: PolarSubscription,
): Promise<{ success: boolean; message: string }> {
  console.log("[subscription.created] Processing:", data.id);

  // Get user_id from metadata
  const userId = data.metadata?.user_id as string | undefined;
  if (!userId) {
    console.error("[subscription.created] No user_id in metadata");
    return { success: false, message: "No user_id in metadata" };
  }

  const { error } = await supabase.from("subscriptions").insert({
    id: data.id,
    user_id: userId,
    polar_product_id: data.product_id,
    polar_price_id: data.price_id,
    status: data.status,
    current_period_start: data.current_period_start,
    current_period_end: data.current_period_end,
    cancel_at_period_end: data.cancel_at_period_end ? 1 : 0,
  });

  if (error) {
    console.error(
      "[subscription.created] Failed to create subscription:",
      error,
    );
    return { success: false, message: error.message };
  }

  console.log("[subscription.created] Subscription created for user:", userId);
  return { success: true, message: "Subscription created successfully" };
}

/**
 * Handle subscription.updated event
 */
export async function handleSubscriptionUpdated(
  supabase: SupabaseClient,
  data: PolarSubscription,
): Promise<{ success: boolean; message: string }> {
  console.log("[subscription.updated] Processing:", data.id);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: data.status,
      current_period_start: data.current_period_start,
      current_period_end: data.current_period_end,
      cancel_at_period_end: data.cancel_at_period_end ? 1 : 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  if (error) {
    console.error(
      "[subscription.updated] Failed to update subscription:",
      error,
    );
    return { success: false, message: error.message };
  }

  console.log("[subscription.updated] Subscription updated:", data.id);
  return { success: true, message: "Subscription updated successfully" };
}

/**
 * Handle subscription.canceled event
 */
export async function handleSubscriptionCanceled(
  supabase: SupabaseClient,
  data: PolarSubscription,
): Promise<{ success: boolean; message: string }> {
  console.log("[subscription.canceled] Processing:", data.id);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  if (error) {
    console.error(
      "[subscription.canceled] Failed to cancel subscription:",
      error,
    );
    return { success: false, message: error.message };
  }

  console.log("[subscription.canceled] Subscription canceled:", data.id);
  return { success: true, message: "Subscription canceled successfully" };
}

/**
 * Handle subscription.active event
 */
export async function handleSubscriptionActive(
  supabase: SupabaseClient,
  data: PolarSubscription,
): Promise<{ success: boolean; message: string }> {
  console.log("[subscription.active] Processing:", data.id);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      current_period_start: data.current_period_start,
      current_period_end: data.current_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  if (error) {
    console.error(
      "[subscription.active] Failed to activate subscription:",
      error,
    );
    return { success: false, message: error.message };
  }

  console.log("[subscription.active] Subscription activated:", data.id);
  return { success: true, message: "Subscription activated successfully" };
}

/**
 * Handle subscription.revoked event
 */
export async function handleSubscriptionRevoked(
  supabase: SupabaseClient,
  data: PolarSubscription,
): Promise<{ success: boolean; message: string }> {
  console.log("[subscription.revoked] Processing:", data.id);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  if (error) {
    console.error(
      "[subscription.revoked] Failed to revoke subscription:",
      error,
    );
    return { success: false, message: error.message };
  }

  console.log("[subscription.revoked] Subscription revoked:", data.id);
  return { success: true, message: "Subscription revoked successfully" };
}

/**
 * Handle subscription.uncanceled event
 */
export async function handleSubscriptionUncanceled(
  supabase: SupabaseClient,
  data: PolarSubscription,
): Promise<{ success: boolean; message: string }> {
  console.log("[subscription.uncanceled] Processing:", data.id);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: data.status,
      cancel_at_period_end: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  if (error) {
    console.error(
      "[subscription.uncanceled] Failed to uncancel subscription:",
      error,
    );
    return { success: false, message: error.message };
  }

  console.log("[subscription.uncanceled] Subscription uncanceled:", data.id);
  return { success: true, message: "Subscription uncanceled successfully" };
}
