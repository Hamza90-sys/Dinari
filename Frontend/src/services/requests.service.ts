import { supabase } from "@/lib/supabase";
import { ensureArray, unwrap } from "@/lib/supabase-helpers";
import type { DinariRequest, RequestStatus } from "@/types/domain";

type RequestRow = {
  id: string;
  request_code: string;
  user_id: string;
  service_name: string;
  plan_name: string;
  account_email: string;
  amount_tnd: number;
  status: RequestStatus;
  notes: string | null;
  admin_notes: string | null;
  payment_method: string | null;
  payment_date: string | null;
  created_at: string;
  updated_at: string;
  profiles: { email: string } | null;
  payments: { id: string; proof_url: string | null; created_at: string }[] | null;
};

const mapRequest = (row: RequestRow): DinariRequest => {
  const proofUrl = (row.payments ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    ?.proof_url;

  return {
    id: row.request_code,
    dbId: row.id,
    service: row.service_name,
    plan: row.plan_name,
    email: row.account_email,
    notes: row.notes ?? undefined,
    status: row.status,
    amountTND: Number(row.amount_tnd ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paymentMethod: row.payment_method ?? undefined,
    paymentDate: row.payment_date ?? undefined,
    proofUrl: proofUrl ?? undefined,
    adminNotes: row.admin_notes ?? undefined,
    ownerEmail: row.profiles?.email ?? "Unknown",
    ownerId: row.user_id,
  };
};

export const requestsService = {
  async list(isAdmin: boolean, userId?: string) {
    let query = supabase
      .from("requests")
      .select(
        "id, request_code, user_id, service_name, plan_name, account_email, amount_tnd, status, notes, admin_notes, payment_method, payment_date, created_at, updated_at, profiles!requests_user_id_fkey(email), payments(id, proof_url, created_at)",
      )
      .order("created_at", { ascending: false });

    if (!isAdmin && userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    return ensureArray(data as RequestRow[] | null, error).map(mapRequest);
  },

  async create(input: {
    userId: string;
    service: string;
    plan: string;
    accountEmail: string;
    notes?: string;
    amountTND: number;
  }) {
    const { data, error } = await supabase
      .from("requests")
      .insert({
        user_id: input.userId,
        service_name: input.service,
        plan_name: input.plan,
        account_email: input.accountEmail,
        amount_tnd: input.amountTND,
        notes: input.notes ?? null,
      })
      .select(
        "id, request_code, user_id, service_name, plan_name, account_email, amount_tnd, status, notes, admin_notes, payment_method, payment_date, created_at, updated_at, profiles!requests_user_id_fkey(email), payments(id, proof_url, created_at)",
      )
      .single();

    return mapRequest(unwrap(data as RequestRow | null, error));
  },

  async pay(requestCode: string, method = "D17") {
    const { error } = await supabase.rpc("pay_request", {
      p_request_code: requestCode,
      p_method: method,
    });
    if (error) throw new Error(error.message);
  },

  async setStatus(requestCode: string, status: RequestStatus, adminNotes?: string) {
    const { error } = await supabase.rpc("admin_update_request_status", {
      p_request_code: requestCode,
      p_status: status,
      p_admin_notes: adminNotes ?? null,
    });
    if (error) throw new Error(error.message);
  },

  async setAdminNotes(requestCode: string, notes: string) {
    const { error } = await supabase
      .from("requests")
      .update({ admin_notes: notes })
      .eq("request_code", requestCode);
    if (error) throw new Error(error.message);
  },

  async delete(requestCode: string) {
    const { error } = await supabase.from("requests").delete().eq("request_code", requestCode);
    if (error) throw new Error(error.message);
  },
};
