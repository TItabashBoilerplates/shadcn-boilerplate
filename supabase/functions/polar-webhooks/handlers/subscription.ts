import type { SupabaseClient } from "@supabase/supabase-js";
import { createFunctionLogger } from "../../shared/logger/index.ts";
import type { PolarSubscription } from "./types.ts";

const logger = createFunctionLogger("polar-webhook");

/**
 * Handle subscription.created event
 */
export async function handleSubscriptionCreated(
  supabase: SupabaseClient,
  data: PolarSubscription,
): Promise<{ success: boolean; message: string }> {
  logger.info("Processing subscription.created", { subscriptionId: data.id });

  // Get user_id from metadata
  const userId = data.metadata?.user_id as string | undefined;
  if (!userId) {
    logger.error("No user_id in metadata", { subscriptionId: data.id });
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
    logger.error("Failed to create subscription", {
      subscriptionId: data.id,
      error: error.message,
    });
    return { success: false, message: error.message };
  }

  logger.info("Subscription created", { subscriptionId: data.id, userId });
  return { success: true, message: "Subscription created successfully" };
}

/**
 * Handle subscription.updated event
 */
export async function handleSubscriptionUpdated(
  supabase: SupabaseClient,
  data: PolarSubscription,
): Promise<{ success: boolean; message: string }> {
  logger.info("Processing subscription.updated", { subscriptionId: data.id });

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
    logger.error("Failed to update subscription", {
      subscriptionId: data.id,
      error: error.message,
    });
    return { success: false, message: error.message };
  }

  logger.info("Subscription updated", { subscriptionId: data.id });
  return { success: true, message: "Subscription updated successfully" };
}

/**
 * Handle subscription.canceled event
 */
export async function handleSubscriptionCanceled(
  supabase: SupabaseClient,
  data: PolarSubscription,
): Promise<{ success: boolean; message: string }> {
  logger.info("Processing subscription.canceled", { subscriptionId: data.id });

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  if (error) {
    logger.error("Failed to cancel subscription", {
      subscriptionId: data.id,
      error: error.message,
    });
    return { success: false, message: error.message };
  }

  logger.info("Subscription canceled", { subscriptionId: data.id });
  return { success: true, message: "Subscription canceled successfully" };
}

/**
 * Handle subscription.active event
 */
export async function handleSubscriptionActive(
  supabase: SupabaseClient,
  data: PolarSubscription,
): Promise<{ success: boolean; message: string }> {
  logger.info("Processing subscription.active", { subscriptionId: data.id });

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
    logger.error("Failed to activate subscription", {
      subscriptionId: data.id,
      error: error.message,
    });
    return { success: false, message: error.message };
  }

  logger.info("Subscription activated", { subscriptionId: data.id });
  return { success: true, message: "Subscription activated successfully" };
}

/**
 * Handle subscription.revoked event
 */
export async function handleSubscriptionRevoked(
  supabase: SupabaseClient,
  data: PolarSubscription,
): Promise<{ success: boolean; message: string }> {
  logger.info("Processing subscription.revoked", { subscriptionId: data.id });

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  if (error) {
    logger.error("Failed to revoke subscription", {
      subscriptionId: data.id,
      error: error.message,
    });
    return { success: false, message: error.message };
  }

  logger.info("Subscription revoked", { subscriptionId: data.id });
  return { success: true, message: "Subscription revoked successfully" };
}

/**
 * Handle subscription.uncanceled event
 */
export async function handleSubscriptionUncanceled(
  supabase: SupabaseClient,
  data: PolarSubscription,
): Promise<{ success: boolean; message: string }> {
  logger.info("Processing subscription.uncanceled", {
    subscriptionId: data.id,
  });

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: data.status,
      cancel_at_period_end: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  if (error) {
    logger.error("Failed to uncancel subscription", {
      subscriptionId: data.id,
      error: error.message,
    });
    return { success: false, message: error.message };
  }

  logger.info("Subscription uncanceled", { subscriptionId: data.id });
  return { success: true, message: "Subscription uncanceled successfully" };
}
