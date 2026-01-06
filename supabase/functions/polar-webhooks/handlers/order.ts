import type { SupabaseClient } from "@supabase/supabase-js";
import type { PolarOrder } from "./types.ts";

/**
 * Handle order.paid event (one-time purchase completed)
 */
export async function handleOrderPaid(
  supabase: SupabaseClient,
  data: PolarOrder,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  console.log("[order.paid] Processing:", data.id);

  // Get user_id from metadata (should be set during checkout creation)
  const userId = metadata?.user_id as string | undefined;
  if (!userId) {
    console.error("[order.paid] No user_id in metadata");
    return { success: false, message: "No user_id in metadata" };
  }

  const { error } = await supabase.from("orders").insert({
    id: data.id,
    user_id: userId,
    polar_product_id: data.product_id,
    polar_price_id: data.product_price_id,
    status: "paid",
    amount: data.amount,
    currency: data.currency,
  });

  if (error) {
    console.error("[order.paid] Failed to create order:", error);
    return { success: false, message: error.message };
  }

  console.log("[order.paid] Order created for user:", userId);
  return { success: true, message: "Order processed successfully" };
}

/**
 * Handle order.refunded event
 */
export async function handleOrderRefunded(
  supabase: SupabaseClient,
  data: PolarOrder,
): Promise<{ success: boolean; message: string }> {
  console.log("[order.refunded] Processing:", data.id);

  const { error } = await supabase
    .from("orders")
    .update({
      status: "refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  if (error) {
    console.error("[order.refunded] Failed to refund order:", error);
    return { success: false, message: error.message };
  }

  console.log("[order.refunded] Order refunded:", data.id);
  return { success: true, message: "Order refunded successfully" };
}

/**
 * Handle order.created event
 */
export function handleOrderCreated(
  _supabase: SupabaseClient,
  data: PolarOrder,
): { success: boolean; message: string } {
  console.log("[order.created] Order created:", data.id);
  return { success: true, message: "Order created logged" };
}
