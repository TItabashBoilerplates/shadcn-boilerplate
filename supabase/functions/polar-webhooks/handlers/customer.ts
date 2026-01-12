import type { SupabaseClient } from "@supabase/supabase-js";
import { createFunctionLogger } from "../../shared/logger/index.ts";
import type { PolarCustomer } from "./types.ts";

const logger = createFunctionLogger("polar-webhook");

/**
 * Handle customer.created event
 */
export async function handleCustomerCreated(
  supabase: SupabaseClient,
  data: PolarCustomer,
): Promise<{ success: boolean; message: string }> {
  logger.info("Processing customer.created", { customerId: data.id });

  // Get user_id from metadata (should be set during checkout creation)
  const userId = data.metadata?.user_id as string | undefined;
  if (!userId) {
    logger.info("No user_id in metadata, skipping profile update", {
      customerId: data.id,
    });
    return { success: true, message: "Customer created without user_id" };
  }

  // Update user profile with polar_customer_id
  const { error } = await supabase
    .from("general_user_profiles")
    .update({ polar_customer_id: data.id })
    .eq("user_id", userId);

  if (error) {
    logger.error("Failed to update profile", {
      customerId: data.id,
      error: error.message,
    });
    return { success: false, message: error.message };
  }

  logger.info("Updated polar_customer_id", { customerId: data.id, userId });
  return { success: true, message: "Customer created and profile updated" };
}

/**
 * Handle customer.updated event
 */
export function handleCustomerUpdated(
  _supabase: SupabaseClient,
  data: PolarCustomer,
): { success: boolean; message: string } {
  logger.info("Customer updated", { customerId: data.id });
  return { success: true, message: "Customer updated logged" };
}
