import type { SupabaseClient } from "@supabase/supabase-js";
import { createFunctionLogger } from "../../shared/logger/index.ts";
import type { PolarOrder } from "./types.ts";

const logger = createFunctionLogger("polar-webhook");

/**
 * Handle order.paid event (one-time purchase completed)
 */
export async function handleOrderPaid(
  supabase: SupabaseClient,
  data: PolarOrder,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  logger.info("Processing order.paid", { orderId: data.id });

  // Get user_id from metadata (should be set during checkout creation)
  const userId = metadata?.user_id as string | undefined;
  if (!userId) {
    logger.error("No user_id in metadata", { orderId: data.id });
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
    logger.error("Failed to create order", {
      orderId: data.id,
      error: error.message,
    });
    return { success: false, message: error.message };
  }

  logger.info("Order created", { orderId: data.id, userId });
  return { success: true, message: "Order processed successfully" };
}

/**
 * Handle order.refunded event
 */
export async function handleOrderRefunded(
  supabase: SupabaseClient,
  data: PolarOrder,
): Promise<{ success: boolean; message: string }> {
  logger.info("Processing order.refunded", { orderId: data.id });

  const { error } = await supabase
    .from("orders")
    .update({
      status: "refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  if (error) {
    logger.error("Failed to refund order", {
      orderId: data.id,
      error: error.message,
    });
    return { success: false, message: error.message };
  }

  logger.info("Order refunded", { orderId: data.id });
  return { success: true, message: "Order refunded successfully" };
}

/**
 * Handle order.created event
 */
export function handleOrderCreated(
  _supabase: SupabaseClient,
  data: PolarOrder,
): { success: boolean; message: string } {
  logger.info("Order created", { orderId: data.id });
  return { success: true, message: "Order created logged" };
}
