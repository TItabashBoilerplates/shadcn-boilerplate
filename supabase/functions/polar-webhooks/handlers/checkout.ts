import type { SupabaseClient } from "@supabase/supabase-js";
import { createFunctionLogger } from "../../shared/logger/index.ts";
import type { PolarCheckout } from "./types.ts";

const logger = createFunctionLogger("polar-webhook");

/**
 * Handle checkout.updated event
 * This is called when a checkout is completed (status = 'succeeded')
 */
export async function handleCheckoutUpdated(
  supabase: SupabaseClient,
  data: PolarCheckout,
): Promise<{ success: boolean; message: string }> {
  logger.info("Processing checkout.updated", { checkoutId: data.id });

  if (data.status !== "succeeded") {
    logger.info("Checkout not succeeded, skipping", {
      checkoutId: data.id,
      status: data.status,
    });
    return { success: true, message: "Checkout not succeeded, skipping" };
  }

  // Get user_id from metadata (should be set during checkout creation)
  const userId = data.metadata?.user_id as string | undefined;
  if (!userId) {
    logger.error("No user_id in metadata", { checkoutId: data.id });
    return { success: false, message: "No user_id in metadata" };
  }

  // Update or create polar_customer_id in user profile
  const { error } = await supabase
    .from("general_user_profiles")
    .update({ polar_customer_id: data.customer_id })
    .eq("user_id", userId);

  if (error) {
    logger.error("Failed to update profile", {
      checkoutId: data.id,
      error: error.message,
    });
    return { success: false, message: error.message };
  }

  logger.info("Updated polar_customer_id", { checkoutId: data.id, userId });
  return { success: true, message: "Checkout processed successfully" };
}

/**
 * Handle checkout.created event
 * Typically used for logging/analytics
 */
export function handleCheckoutCreated(
  _supabase: SupabaseClient,
  data: PolarCheckout,
): { success: boolean; message: string } {
  logger.info("Checkout created", { checkoutId: data.id });
  return { success: true, message: "Checkout created logged" };
}
