import { supabase } from "@/lib/supabase";
import { ensureArray } from "@/lib/supabase-helpers";
import type { PaymentRequest, WalletTransaction } from "@/types/domain";

type PaymentRequestRow = {
  id: string;
  user_id: string;
  amount_tnd: number;
  payment_method: string;
  transaction_reference: string | null;
  screenshot_url: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  profiles: { email: string } | null;
};

type WalletTransactionRow = {
  id: string;
  user_id: string;
  amount_tnd: number;
  balance_before: number;
  balance_after: number;
  transaction_type: "top_up" | "service_purchase" | "refund" | "adjustment";
  request_id: string | null;
  payment_request_id: string | null;
  description: string | null;
  created_at: string;
};

const mapPaymentRequest = (row: PaymentRequestRow): PaymentRequest => ({
  id: row.id,
  userId: row.user_id,
  ownerEmail: row.profiles?.email ?? undefined,
  amountTND: Number(row.amount_tnd ?? 0),
  method: row.payment_method,
  transactionReference: row.transaction_reference ?? undefined,
  screenshotUrl: row.screenshot_url ?? undefined,
  note: row.note ?? undefined,
  status: row.status,
  adminNote: row.admin_note ?? undefined,
  createdAt: row.created_at,
  approvedAt: row.approved_at ?? undefined,
  rejectedAt: row.rejected_at ?? undefined,
});

const mapWalletTransaction = (row: WalletTransactionRow): WalletTransaction => ({
  id: row.id,
  userId: row.user_id,
  amountTND: Number(row.amount_tnd ?? 0),
  balanceBefore: Number(row.balance_before ?? 0),
  balanceAfter: Number(row.balance_after ?? 0),
  type: row.transaction_type,
  requestId: row.request_id ?? undefined,
  paymentRequestId: row.payment_request_id ?? undefined,
  description: row.description ?? undefined,
  createdAt: row.created_at,
});

export const walletService = {
  async listPaymentRequests(isAdmin: boolean, userId?: string) {
    let query = supabase
      .from("payment_requests")
      .select("id, user_id, amount_tnd, payment_method, transaction_reference, screenshot_url, note, status, admin_note, created_at, approved_at, rejected_at, profiles!payment_requests_user_id_fkey(email)")
      .order("created_at", { ascending: false });

    if (!isAdmin && userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    return ensureArray(data as PaymentRequestRow[] | null, error).map(mapPaymentRequest);
  },

  async listTransactions(isAdmin: boolean, userId?: string) {
    let query = supabase
      .from("wallet_transactions")
      .select("id, user_id, amount_tnd, balance_before, balance_after, transaction_type, request_id, payment_request_id, description, created_at")
      .order("created_at", { ascending: false });

    if (!isAdmin && userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    return ensureArray(data as WalletTransactionRow[] | null, error).map(mapWalletTransaction);
  },

  async createPaymentRequest(input: {
    amount: number;
    method: "D17" | "Bank Transfer" | "Flouci";
    transactionReference?: string;
    screenshotUrl?: string;
    note?: string;
  }) {
    const { data, error } = await supabase.rpc("create_payment_request", {
      p_amount: input.amount,
      p_method: input.method,
      p_transaction_reference: input.transactionReference ?? null,
      p_screenshot_url: input.screenshotUrl ?? null,
      p_note: input.note ?? null,
    });

    if (error) throw new Error(error.message);
    return data as string;
  },

  async approvePaymentRequest(id: string, adminNote?: string) {
    const { error } = await supabase.rpc("admin_approve_payment_request", {
      p_payment_request_id: id,
      p_admin_note: adminNote ?? null,
    });
    if (error) throw new Error(error.message);
  },

  async rejectPaymentRequest(id: string, adminNote?: string) {
    const { error } = await supabase.rpc("admin_reject_payment_request", {
      p_payment_request_id: id,
      p_admin_note: adminNote ?? null,
    });
    if (error) throw new Error(error.message);
  },

  async uploadTopUpProof(file: File, userId: string) {
    const extension = file.name.split(".").pop() ?? "png";
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("topup-proofs")
      .upload(fileName, file, {
        upsert: false,
        cacheControl: "3600",
        contentType: file.type || undefined,
      });

    if (uploadError) throw new Error(uploadError.message);
    return fileName;
  },

  async createTopUpProofPreviewUrl(path: string) {
    const { data, error } = await supabase.storage
      .from("topup-proofs")
      .createSignedUrl(path, 60 * 60);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },
};
