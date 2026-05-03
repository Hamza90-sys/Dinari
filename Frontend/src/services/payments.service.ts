import { supabase } from "@/lib/supabase";
import { ensureArray } from "@/lib/supabase-helpers";
import type { DinariPayment } from "@/types/domain";

type PaymentRow = {
  id: string;
  request_id: string | null;
  user_id: string;
  amount_tnd: number;
  payment_method: string;
  status: "Completed" | "Failed" | "Pending";
  proof_url: string | null;
  created_at: string;
  profiles: { email: string } | null;
  requests: { request_code: string } | null;
};

const mapPayment = (row: PaymentRow): DinariPayment => ({
  id: row.id,
  dbId: row.id,
  requestId: row.requests?.request_code ?? undefined,
  ownerId: row.user_id,
  ownerEmail: row.profiles?.email ?? undefined,
  amountTND: Number(row.amount_tnd ?? 0),
  method: row.payment_method,
  status: row.status,
  createdAt: row.created_at,
  proofUrl: row.proof_url ?? undefined,
});

export const paymentsService = {
  async list(isAdmin: boolean, userId?: string) {
    let query = supabase
      .from("payments")
      .select("id, request_id, user_id, amount_tnd, payment_method, status, proof_url, created_at, profiles!payments_user_id_fkey(email), requests!payments_request_id_fkey(request_code)")
      .order("created_at", { ascending: false });

    if (!isAdmin && userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    return ensureArray(data as PaymentRow[] | null, error).map(mapPayment);
  },

  async topUp(amount: number, method = "D17") {
    const { error } = await supabase.rpc("top_up_balance", {
      p_amount: amount,
      p_method: method,
    });
    if (error) throw new Error(error.message);
  },

  async withdraw(amount: number) {
    const { error } = await supabase.rpc("withdraw_balance", {
      p_amount: amount,
    });
    if (error) throw new Error(error.message);
  },

  async uploadProof(file: File, userId: string) {
    const extension = file.name.split(".").pop() ?? "png";
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(fileName, file, {
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    return fileName;
  },

  async createProofPreviewUrl(path: string) {
    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 60 * 60);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },

  async attachProofToPayment(paymentId: string, proofPath: string) {
    const { error } = await supabase
      .from("payments")
      .update({ proof_url: proofPath })
      .eq("id", paymentId);
    if (error) throw new Error(error.message);
  },

  async attachProofToRequestCode(requestCode: string, file: File, userId: string) {
    const { data: requestRow, error: requestError } = await supabase
      .from("requests")
      .select("id, user_id, amount_tnd")
      .eq("request_code", requestCode)
      .single();
    if (requestError) throw new Error(requestError.message);

    const { data: latestPaymentRow, error: paymentError } = await supabase
      .from("payments")
      .select("id")
      .eq("request_id", requestRow.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (paymentError) throw new Error(paymentError.message);

    let paymentId = latestPaymentRow?.id ?? null;
    if (!paymentId) {
      const { data: insertedPayment, error: insertError } = await supabase
        .from("payments")
        .insert({
          request_id: requestRow.id,
          user_id: requestRow.user_id,
          amount_tnd: requestRow.amount_tnd,
          payment_method: "Manual Proof",
          status: "Pending",
        })
        .select("id")
        .single();

      if (insertError) throw new Error(insertError.message);
      paymentId = insertedPayment.id;
    }

    const proofPath = await paymentsService.uploadProof(file, userId);
    await paymentsService.attachProofToPayment(paymentId, proofPath);
    return proofPath;
  },
};
