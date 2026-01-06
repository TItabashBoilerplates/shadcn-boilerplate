/**
 * Polar.sh Webhook Types
 * @see https://docs.polar.sh/api-reference/webhooks
 */

// Webhook Event Types
export type WebhookEventType =
  | "checkout.created"
  | "checkout.updated"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.canceled"
  | "subscription.revoked"
  | "subscription.active"
  | "subscription.uncanceled"
  | "order.created"
  | "order.paid"
  | "order.refunded"
  | "customer.created"
  | "customer.updated";

// Customer object
export interface PolarCustomer {
  id: string;
  email: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Product object
export interface PolarProduct {
  id: string;
  name: string;
  description: string | null;
  is_recurring: boolean;
  is_archived: boolean;
  organization_id: string;
  created_at: string;
  modified_at: string;
}

// Price object
export interface PolarPrice {
  id: string;
  amount_type: "fixed" | "custom" | "free";
  price_amount: number | null;
  price_currency: string;
  type: "recurring" | "one_time";
  recurring_interval?: "month" | "year";
}

// Checkout object
export interface PolarCheckout {
  id: string;
  status: "open" | "expired" | "confirmed" | "succeeded" | "failed";
  customer_id: string;
  customer_email: string;
  product: PolarProduct;
  product_price: PolarPrice;
  metadata: Record<string, unknown>;
}

// Subscription object
export interface PolarSubscription {
  id: string;
  status:
    | "active"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "past_due"
    | "trialing"
    | "unpaid";
  customer_id: string;
  product_id: string;
  price_id: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  started_at: string;
  ended_at: string | null;
  metadata: Record<string, unknown>;
}

// Order object
export interface PolarOrder {
  id: string;
  customer_id: string;
  product_id: string;
  product_price_id: string;
  amount: number;
  currency: string;
  created_at: string;
  modified_at: string;
}

// Webhook payload structure
export interface WebhookPayload<T = unknown> {
  type: WebhookEventType;
  data: T;
}

// Typed webhook payloads
export type CheckoutWebhookPayload = WebhookPayload<PolarCheckout>;
export type SubscriptionWebhookPayload = WebhookPayload<PolarSubscription>;
export type OrderWebhookPayload = WebhookPayload<PolarOrder>;
export type CustomerWebhookPayload = WebhookPayload<PolarCustomer>;
