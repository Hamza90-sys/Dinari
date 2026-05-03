import { supabase } from "@/lib/supabase";
import type { PaymentSession, DinariRequest } from "@/types/domain";
import {
  PAYMENT_SESSION_CONFIG,
  PAYMENT_REFERENCE_FORMAT,
  SANDBOX_DELAYS,
} from "@/lib/payment.constants";

type PaymentSessionRow = {
  id: string;
  request_id: string;
  user_id: string;
  payment_reference: string;
  session_id: string | null;
  checkout_url: string | null;
  status: string;
  amount_tnd: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
};

const mapPaymentSession = (row: PaymentSessionRow): PaymentSession => ({
  id: row.id,
  requestId: row.request_id,
  userId: row.user_id,
  paymentReference: row.payment_reference,
  sessionId: row.session_id ?? undefined,
  checkoutUrl: row.checkout_url ?? undefined,
  status: (row.status as any) ?? "pending",
  amountTnd: Number(row.amount_tnd),
  expiresAt: row.expires_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  metadata: row.metadata ?? undefined,
});

/**
 * Payment Session Service
 * Manages payment session lifecycle and checkout flow
 * Sandbox mode with simulated payment processing
 */
export const paymentSessionService = {
  /**
   * Create a new payment session for a request
   */
  async createSession(input: {
    requestId: string;
    requestCode: string;
    userId: string;
    amount: number;
  }): Promise<PaymentSession> {
    // Simulate session creation delay
    await new Promise((resolve) =>
      setTimeout(resolve, SANDBOX_DELAYS.SESSION_CREATION)
    );

    // Generate unique payment reference
    const paymentReference = generatePaymentReference();

    // Create session in database
    const { data, error } = await supabase
      .from("payment_sessions")
      .insert({
        request_id: input.requestId,
        user_id: input.userId,
        payment_reference: paymentReference,
        status: "active",
        amount_tnd: input.amount,
        expires_at: new Date(Date.now() + PAYMENT_SESSION_CONFIG.CHECKOUT_TIMEOUT_MS).toISOString(),
        metadata: {
          request_code: input.requestCode,
          created_via: "sandbox",
        },
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create payment session: ${error.message}`);

    return mapPaymentSession(data as PaymentSessionRow);
  },

  /**
   * Get a payment session by ID
   */
  async getSession(sessionId: string): Promise<PaymentSession | null> {
    const { data, error } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to fetch payment session: ${error.message}`);
    }

    return data ? mapPaymentSession(data as PaymentSessionRow) : null;
  },

  /**
   * Get a payment session by payment reference
   */
  async getSessionByReference(paymentReference: string): Promise<PaymentSession | null> {
    const { data, error } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("payment_reference", paymentReference)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to fetch payment session: ${error.message}`);
    }

    return data ? mapPaymentSession(data as PaymentSessionRow) : null;
  },

  /**
   * Generate checkout URL (redirects to checkout page)
   */
  async generateCheckoutUrl(sessionId: string, baseUrl: string = window.location.origin): Promise<string> {
    const url = new URL(`${baseUrl}/checkout`);
    url.searchParams.set("session", sessionId);
    return url.toString();
  },

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: "pending" | "active" | "completed" | "cancelled" | "expired"
  ): Promise<void> {
    const { error } = await supabase
      .from("payment_sessions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (error) throw new Error(`Failed to update payment session: ${error.message}`);
  },

  /**
   * Verify payment session is still valid
   */
  async verifySession(sessionId: string): Promise<{ valid: boolean; reason?: string }> {
    const session = await paymentSessionService.getSession(sessionId);

    if (!session) {
      return { valid: false, reason: "Session not found" };
    }

    if (session.status === "cancelled") {
      return { valid: false, reason: "Session was cancelled" };
    }

    if (session.status === "completed") {
      return { valid: false, reason: "Session already completed" };
    }

    if (session.status === "expired") {
      return { valid: false, reason: "Session has expired" };
    }

    if (new Date(session.expiresAt) < new Date()) {
      return { valid: false, reason: "Session has expired" };
    }

    return { valid: true };
  },

  /**
   * Cancel a payment session
   */
  async cancelSession(sessionId: string): Promise<void> {
    await paymentSessionService.updateSessionStatus(sessionId, "cancelled");
  },

  /**
   * Get user's active sessions
   */
  async getUserActiveSessions(userId: string): Promise<PaymentSession[]> {
    const { data, error } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch user sessions: ${error.message}`);

    return (data as PaymentSessionRow[]).map(mapPaymentSession);
  },

  /**
   * Get sessions for a specific request
   */
  async getRequestSessions(requestId: string): Promise<PaymentSession[]> {
    const { data, error } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch request sessions: ${error.message}`);

    return (data as PaymentSessionRow[]).map(mapPaymentSession);
  },

  /**
   * Clean up expired sessions (call periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const { data: expiredSessions, error: fetchError } = await supabase
      .from("payment_sessions")
      .select("id")
      .lt("expires_at", new Date().toISOString())
      .in("status", ["pending", "active"]);

    if (fetchError) throw new Error(`Failed to fetch expired sessions: ${fetchError.message}`);

    if (!expiredSessions || expiredSessions.length === 0) {
      return 0;
    }

    const { error: updateError } = await supabase
      .from("payment_sessions")
      .update({ status: "expired" })
      .lt("expires_at", new Date().toISOString())
      .in("status", ["pending", "active"]);

    if (updateError) throw new Error(`Failed to update expired sessions: ${updateError.message}`);

    return expiredSessions.length;
  },
};

/**
 * Generate unique payment reference in format: DIN-2026-XXXX
 */
export function generatePaymentReference(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return PAYMENT_REFERENCE_FORMAT(year, random);
}
