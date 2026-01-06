import { createClient } from "@supabase/supabase-js";
import type { WebhookEventType, WebhookPayload } from "./handlers/types.ts";
import {
  handleCheckoutCreated,
  handleCheckoutUpdated,
} from "./handlers/checkout.ts";
import {
  handleSubscriptionActive,
  handleSubscriptionCanceled,
  handleSubscriptionCreated,
  handleSubscriptionRevoked,
  handleSubscriptionUncanceled,
  handleSubscriptionUpdated,
} from "./handlers/subscription.ts";
import {
  handleOrderCreated,
  handleOrderPaid,
  handleOrderRefunded,
} from "./handlers/order.ts";
import {
  handleCustomerCreated,
  handleCustomerUpdated,
} from "./handlers/customer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

/**
 * Verify webhook signature using HMAC SHA256
 * @see https://docs.polar.sh/api-reference/webhooks
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  webhookId: string | null,
  timestamp: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature || !webhookId || !timestamp) {
    console.error("[verify] Missing required headers");
    return false;
  }

  // Parse the signature header (format: "v1,signature1 v1,signature2")
  const signatureParts = signature.split(" ");
  const signatures: string[] = [];

  for (const part of signatureParts) {
    const [version, sig] = part.split(",");
    if (version === "v1" && sig) {
      signatures.push(sig);
    }
  }

  if (signatures.length === 0) {
    console.error("[verify] No valid v1 signatures found");
    return false;
  }

  // Create the signed payload
  const signedPayload = `${webhookId}.${timestamp}.${payload}`;

  // Compute expected signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(signedPayload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
  const expectedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer)),
  );

  // Check if any of the provided signatures match
  return signatures.some((sig) => sig === expectedSignature);
}

/**
 * Main webhook handler
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get webhook secret
    const webhookSecret = Deno.env.get("POLAR_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("[webhook] POLAR_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get signature headers
    const webhookId = req.headers.get("webhook-id");
    const timestamp = req.headers.get("webhook-timestamp");
    const signature = req.headers.get("webhook-signature");

    // Get raw body for signature verification
    const rawBody = await req.text();

    // Verify signature
    const isValid = await verifyWebhookSignature(
      rawBody,
      signature,
      webhookId,
      timestamp,
      webhookSecret,
    );

    if (!isValid) {
      console.error("[webhook] Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the payload
    const payload: WebhookPayload = JSON.parse(rawBody);
    const eventType = payload.type as WebhookEventType;

    console.log("[webhook] Received event:", eventType);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[webhook] Supabase configuration missing");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Route event to appropriate handler
    let result: { success: boolean; message: string };

    switch (eventType) {
      case "checkout.created":
        result = await handleCheckoutCreated(supabase, payload.data);
        break;
      case "checkout.updated":
        result = await handleCheckoutUpdated(supabase, payload.data);
        break;
      case "subscription.created":
        result = await handleSubscriptionCreated(supabase, payload.data);
        break;
      case "subscription.updated":
        result = await handleSubscriptionUpdated(supabase, payload.data);
        break;
      case "subscription.canceled":
        result = await handleSubscriptionCanceled(supabase, payload.data);
        break;
      case "subscription.revoked":
        result = await handleSubscriptionRevoked(supabase, payload.data);
        break;
      case "subscription.active":
        result = await handleSubscriptionActive(supabase, payload.data);
        break;
      case "subscription.uncanceled":
        result = await handleSubscriptionUncanceled(supabase, payload.data);
        break;
      case "order.created":
        result = await handleOrderCreated(supabase, payload.data);
        break;
      case "order.paid":
        result = await handleOrderPaid(
          supabase,
          payload.data,
          payload.data.metadata,
        );
        break;
      case "order.refunded":
        result = await handleOrderRefunded(supabase, payload.data);
        break;
      case "customer.created":
        result = await handleCustomerCreated(supabase, payload.data);
        break;
      case "customer.updated":
        result = await handleCustomerUpdated(supabase, payload.data);
        break;
      default:
        console.log("[webhook] Unhandled event type:", eventType);
        result = { success: true, message: `Unhandled event: ${eventType}` };
    }

    const status = result.success ? 200 : 500;
    return new Response(JSON.stringify(result), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    console.error("[webhook] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
