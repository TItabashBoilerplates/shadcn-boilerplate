import type { SupabaseClient } from "@supabase/supabase-js";
import type { PolarCheckout } from "./types.ts";

/**
 * Handle checkout.updated event
 * This is called when a checkout is completed (status = 'succeeded')
 */
export async function handleCheckoutUpdated(
  supabase: SupabaseClient,
  data: PolarCheckout,
): Promise<{ success: boolean; message: string }> {
  console.log("[checkout.updated] Processing:", data.id);

  if (data.status !== "succeeded") {
    console.log("[checkout.updated] Checkout not succeeded, skipping");
    return { success: true, message: "Checkout not succeeded, skipping" };
  }

  // Get user_id from metadata (should be set during checkout creation)
  const userId = data.metadata?.user_id as string | undefined;
  if (!userId) {
    console.error("[checkout.updated] No user_id in metadata");
    return { success: false, message: "No user_id in metadata" };
  }

  // Update or create polar_customer_id in user profile
  const { error } = await supabase
    .from("general_user_profiles")
    .update({ polar_customer_id: data.customer_id })
    .eq("user_id", userId);

  if (error) {
    console.error("[checkout.updated] Failed to update profile:", error);
    return { success: false, message: error.message };
  }

  console.log("[checkout.updated] Updated polar_customer_id for user:", userId);
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
  console.log("[checkout.created] Checkout created:", data.id);
  return { success: true, message: "Checkout created logged" };
}
