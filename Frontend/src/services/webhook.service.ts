import { supabase } from "@/lib/supabase";
import { paymentSessionService } from "./payment-session.service";
import { SANDBOX_DELAYS } from "@/lib/payment.constants";
import type { PaymentSession } from "@/types/domain";

/**
 * Webhook Simulation Service
 * Simulates payment provider webhook events for testing
 * Production-ready architecture for future integration with Konnect, Flouci, etc.
 */

export type WebhookEvent = "payment.confirmed" | "payment.failed" | "session.expired";

export interface WebhookPayload {
  event: WebhookEvent;
  sessionId: string;
  paymentReference: string;
  timestamp: string;
  status?: "successful" | "failed";
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

interface WebhookHandler {
  (payload: WebhookPayload): Promise<void>;
}

export const webhookService = {
  /**
   * Register a webhook handler (for testing)
   */
  handlers: new Map<WebhookEvent, WebhookHandler[]>(),

  /**
   * Subscribe to webhook events
   */
  on(event: WebhookEvent, handler: WebhookHandler): () => void {
    if (!webhookService.handlers.has(event)) {
      webhookService.handlers.set(event, []);
    }
    webhookService.handlers.get(event)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = webhookService.handlers.get(event);
      if (handlers) {
        handlers.splice(handlers.indexOf(handler), 1);
      }
    };
  },

  /**
   * Emit a webhook event
   */
  async emit(payload: WebhookPayload): Promise<void> {
    const handlers = webhookService.handlers.get(payload.event) || [];
    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`Error in webhook handler for ${payload.event}:`, error);
      }
    }
  },

  /**
   * Simulate successful payment
   * Triggered from checkout page when user clicks "Simulate Successful Payment"
   */
  async simulatePaymentSuccess(session: PaymentSession): Promise<void> {
    // Simulate processing delay
    await new Promise((resolve) =>
      setTimeout(resolve, SANDBOX_DELAYS.PAYMENT_PROCESSING)
    );

    // Update session status
    await paymentSessionService.updateSessionStatus(session.id, "completed");

    // Get request details
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("id, user_id, request_code, amount_tnd")
      .eq("id", session.requestId)
      .single();

    if (requestError) {
      console.error("Failed to fetch request:", requestError);
      throw new Error("Failed to process payment: request not found");
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        request_id: request.id,
        user_id: request.user_id,
        amount_tnd: request.amount_tnd,
        payment_method: "sandbox",
        status: "Completed",
        payment_reference: session.paymentReference,
        session_id: session.id,
      })
      .select("id")
      .single();

    if (paymentError) {
      console.error("Failed to create payment:", paymentError);
      throw new Error("Failed to create payment record");
    }

    // Update request status to Paid
    const { error: updateError } = await supabase
      .from("requests")
      .update({
        status: "Paid",
        payment_reference: session.paymentReference,
        payment_method: "sandbox",
        payment_date: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (updateError) {
      console.error("Failed to update request status:", updateError);
      throw new Error("Failed to update request status");
    }

    // Record payment event
    await supabase.from("payment_events").insert({
      payment_id: payment.id,
      session_id: session.id,
      event_type: "payment_confirmed",
      status: "successful",
      metadata: {
        request_code: request.request_code,
        amount: request.amount_tnd,
        method: "sandbox_simulation",
      },
    });

    // Create notification
    await supabase.from("notifications").insert({
      user_id: request.user_id,
      title: "Payment Successful",
      message: `Your payment of ${request.amount_tnd} TND has been confirmed. Request ${request.request_code} is now paid.`,
    });

    // Emit webhook event
    await webhookService.emit({
      event: "payment.confirmed",
      sessionId: session.id,
      paymentReference: session.paymentReference,
      timestamp: new Date().toISOString(),
      status: "successful",
      metadata: {
        requestId: request.id,
        requestCode: request.request_code,
        amount: request.amount_tnd,
      },
    });
  },

  /**
   * Simulate payment failure
   * Triggered from checkout page when user clicks "Simulate Failed Payment"
   */
  async simulatePaymentFailure(
    session: PaymentSession,
    failureReason: string = "Insufficient funds"
  ): Promise<void> {
    // Simulate processing delay
    await new Promise((resolve) =>
      setTimeout(resolve, SANDBOX_DELAYS.PAYMENT_PROCESSING)
    );

    // Update session status
    await paymentSessionService.updateSessionStatus(session.id, "cancelled");

    // Get request details
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("id, user_id, request_code, amount_tnd")
      .eq("id", session.requestId)
      .single();

    if (requestError) {
      console.error("Failed to fetch request:", requestError);
      throw new Error("Failed to process payment failure: request not found");
    }

    // Create failed payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        request_id: request.id,
        user_id: request.user_id,
        amount_tnd: request.amount_tnd,
        payment_method: "sandbox",
        status: "Failed",
        payment_reference: session.paymentReference,
        session_id: session.id,
      })
      .select("id")
      .single();

    if (paymentError) {
      console.error("Failed to create payment record:", paymentError);
      throw new Error("Failed to create payment record");
    }

    // Request stays in "Awaiting Payment" status
    const { error: updateError } = await supabase
      .from("requests")
      .update({
        last_payment_attempt_at: new Date().toISOString(),
        payment_attempts: supabase.rpc("increment_payment_attempts", {
          p_request_id: request.id,
        }),
      })
      .eq("id", request.id);

    if (updateError) {
      console.error("Failed to update request:", updateError);
    }

    // Record payment event
    await supabase.from("payment_events").insert({
      payment_id: payment.id,
      session_id: session.id,
      event_type: "payment_failed",
      status: "failed",
      metadata: {
        request_code: request.request_code,
        amount: request.amount_tnd,
        failure_reason: failureReason,
        method: "sandbox_simulation",
      },
    });

    // Create notification
    await supabase.from("notifications").insert({
      user_id: request.user_id,
      title: "Payment Failed",
      message: `Your payment could not be processed: ${failureReason}. Request ${request.request_code} remains awaiting payment.`,
    });

    // Emit webhook event
    await webhookService.emit({
      event: "payment.failed",
      sessionId: session.id,
      paymentReference: session.paymentReference,
      timestamp: new Date().toISOString(),
      status: "failed",
      errorMessage: failureReason,
      metadata: {
        requestId: request.id,
        requestCode: request.request_code,
        amount: request.amount_tnd,
      },
    });
  },

  /**
   * Handle session expiration
   */
  async handleSessionExpiration(session: PaymentSession): Promise<void> {
    // Update session status
    await paymentSessionService.updateSessionStatus(session.id, "expired");

    // Get request details
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("id, user_id, request_code")
      .eq("id", session.requestId)
      .single();

    if (requestError) {
      console.error("Failed to fetch request:", requestError);
      return;
    }

    // Create notification
    await supabase.from("notifications").insert({
      user_id: request.user_id,
      title: "Payment Session Expired",
      message: `Your payment session for request ${request.request_code} has expired. Please create a new payment session.`,
    });

    // Emit webhook event
    await webhookService.emit({
      event: "session.expired",
      sessionId: session.id,
      paymentReference: session.paymentReference,
      timestamp: new Date().toISOString(),
      metadata: {
        requestId: request.id,
        requestCode: request.request_code,
      },
    });
  },

  /**
   * Verify payment integrity (for future provider integration)
   * Can be extended to verify signatures from real payment providers
   */
  async verifyPaymentSignature(
    payload: WebhookPayload,
    signature: string,
    secret: string
  ): Promise<boolean> {
    // Sandbox mode: accept all signatures
    if (process.env.NODE_ENV === "development") {
      return true;
    }

    // Production: implement real signature verification
    const crypto = await import("crypto");
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(payload))
      .digest("hex");

    return computedSignature === signature;
  },

  /**
   * Log webhook event for debugging
   */
  async logWebhookEvent(payload: WebhookPayload, response?: any): Promise<void> {
    console.log("[WEBHOOK EVENT]", {
      event: payload.event,
      timestamp: payload.timestamp,
      sessionId: payload.sessionId,
      paymentReference: payload.paymentReference,
      status: payload.status,
      errorMessage: payload.errorMessage,
      response,
    });
  },
};
