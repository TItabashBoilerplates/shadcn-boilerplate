import type { SupabaseClient } from "@supabase/supabase-js";
import type { PolarCustomer } from "./types.ts";

/**
 * Handle customer.created event
 */
export async function handleCustomerCreated(
  supabase: SupabaseClient,
  data: PolarCustomer,
): Promise<{ success: boolean; message: string }> {
  console.log("[customer.created] Processing:", data.id);

  // Get user_id from metadata (should be set during checkout creation)
  const userId = data.metadata?.user_id as string | undefined;
  if (!userId) {
    console.log(
      "[customer.created] No user_id in metadata, skipping profile update",
    );
    return { success: true, message: "Customer created without user_id" };
  }

  // Update user profile with polar_customer_id
  const { error } = await supabase
    .from("general_user_profiles")
    .update({ polar_customer_id: data.id })
    .eq("user_id", userId);

  if (error) {
    console.error("[customer.created] Failed to update profile:", error);
    return { success: false, message: error.message };
  }

  console.log("[customer.created] Updated polar_customer_id for user:", userId);
  return { success: true, message: "Customer created and profile updated" };
}

/**
 * Handle customer.updated event
 */
export function handleCustomerUpdated(
  _supabase: SupabaseClient,
  data: PolarCustomer,
): { success: boolean; message: string } {
  console.log("[customer.updated] Customer updated:", data.id);
  return { success: true, message: "Customer updated logged" };
}
