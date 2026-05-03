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
  account_access_type: "existing" | "new";
  phone_number: string | null;
  preferred_contact_method: "Phone Call" | "WhatsApp" | "SMS" | null;
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
    accountAccessType: row.account_access_type,
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
    phoneNumber: row.phone_number ?? undefined,
    preferredContactMethod: row.preferred_contact_method ?? undefined,
  };
};

export const requestsService = {
  async list(isAdmin: boolean, userId?: string) {
    console.log("🔍 [requests.service] Fetching requests - isAdmin:", isAdmin, "userId:", userId);
    let query = supabase
      .from("requests")
      .select(
        "id, request_code, user_id, service_name, plan_name, account_email, account_access_type, phone_number, preferred_contact_method, amount_tnd, status, notes, admin_notes, payment_method, payment_date, created_at, updated_at, profiles!requests_user_id_fkey(email), payments(id, proof_url, created_at)",
      )
      .order("created_at", { ascending: false });

    if (!isAdmin && userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) console.error("❌ [requests.service] List error:", error);
    return ensureArray(data as RequestRow[] | null, error).map(mapRequest);
  },

  async create(input: {
    userId: string;
    service: string;
    plan: string;
    accountEmail: string;
    accountAccessType: "existing" | "new";
    accountPassword?: string;
    notes?: string;
    amountTND: number;
    phoneNumber?: string;
    preferredContactMethod?: "Phone Call" | "WhatsApp" | "SMS";
  }) {
    console.log("📝 [requests.service] Starting request creation...");
    console.log("📋 [requests.service] Input:", {
      userId: input.userId,
      service: input.service,
      plan: input.plan,
      accountEmail: input.accountEmail,
      accountAccessType: input.accountAccessType,
      amountTND: input.amountTND,
      notes: input.notes ? "provided" : "none",
      hasPassword: Boolean(input.accountPassword),
      phoneNumber: input.phoneNumber ? "provided" : "none",
      preferredContactMethod: input.preferredContactMethod ?? "none",
    });

    if (!input.userId) {
      const error = new Error("User ID is required but missing");
      console.error("❌ [requests.service] Missing user ID:", error);
      throw error;
    }

    try {
      console.log("⏳ [requests.service] Inserting request into Supabase...");
      const { data: created, error: createError } = await supabase
        .rpc("create_request_secure", {
          p_service_name: input.service,
          p_plan_name: input.plan,
          p_account_email: input.accountEmail,
          p_account_access_type: input.accountAccessType,
          p_account_password: input.accountPassword ?? null,
          p_notes: input.notes ?? null,
          p_amount_tnd: input.amountTND,
          p_phone_number: input.phoneNumber ?? null,
          p_preferred_contact_method: input.preferredContactMethod ?? null,
        });

      if (createError) {
        console.error("❌ [requests.service] Insert error:", {
          message: createError.message,
          code: createError.code,
          details: createError.details,
          hint: createError.hint,
        });
        throw new Error(`Failed to create request: ${createError.message}`);
      }

      if (!created) {
        console.error("❌ [requests.service] No data returned from insert");
        throw new Error("Request was inserted but no data returned");
      }

      const { data, error } = await supabase
        .from("requests")
        .select(
          "id, request_code, user_id, service_name, plan_name, account_email, account_access_type, phone_number, preferred_contact_method, amount_tnd, status, notes, admin_notes, payment_method, payment_date, created_at, updated_at, profiles!requests_user_id_fkey(email), payments(id, proof_url, created_at)",
        )
        .eq("id", created.id)
        .single();

      if (error) {
        console.error("❌ [requests.service] Insert error:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(`Failed to create request: ${error.message}`);
      }

      if (!data) {
        console.error("❌ [requests.service] No data returned from insert");
        throw new Error("Request was inserted but no data returned");
      }

      console.log("✅ [requests.service] Request created successfully:", {
        id: data.id,
        requestCode: data.request_code,
        status: data.status,
      });

      return mapRequest(data as RequestRow);
    } catch (error) {
      console.error("❌ [requests.service] Create exception:", error);
      throw error;
    }
  },

  async pay(requestCode: string, method = "D17") {
    console.log("💳 [requests.service] Processing payment for request:", requestCode);
    try {
      const { error } = await supabase.rpc("pay_request", {
        p_request_code: requestCode,
        p_method: method,
      });
      if (error) {
        console.error("❌ [requests.service] Payment error:", error);
        throw new Error(error.message);
      }
      console.log("✅ [requests.service] Payment processed");
    } catch (error) {
      console.error("❌ [requests.service] Pay exception:", error);
      throw error;
    }
  },

  async setStatus(requestCode: string, status: RequestStatus, adminNotes?: string) {
    console.log("🔄 [requests.service] Updating request status:", { requestCode, status });
    try {
      const { error } = await supabase.rpc("admin_update_request_status", {
        p_request_code: requestCode,
        p_status: status,
        p_admin_notes: adminNotes ?? null,
      });
      if (error) {
        console.error("❌ [requests.service] Status update error:", error);
        throw new Error(error.message);
      }
      console.log("✅ [requests.service] Status updated");
    } catch (error) {
      console.error("❌ [requests.service] Status update exception:", error);
      throw error;
    }
  },

  async setAdminNotes(requestCode: string, notes: string) {
    console.log("📝 [requests.service] Updating admin notes for:", requestCode);
    try {
      const { error } = await supabase.rpc("admin_set_request_notes", {
        p_request_code: requestCode,
        p_admin_notes: notes,
      });
      if (error) {
        console.error("❌ [requests.service] Admin notes error:", error);
        throw new Error(error.message);
      }
      console.log("✅ [requests.service] Admin notes updated");
    } catch (error) {
      console.error("❌ [requests.service] Admin notes exception:", error);
      throw error;
    }
  },

  async revealPassword(requestCode: string) {
    const { data, error } = await supabase.rpc("admin_reveal_request_password", {
      p_request_code: requestCode,
    });
    if (error) throw new Error(error.message);
    return data as string | null;
  },

  async delete(requestCode: string) {
    console.log("🗑️ [requests.service] Deleting request:", requestCode);
    try {
      const { error } = await supabase.from("requests").delete().eq("request_code", requestCode);
      if (error) {
        console.error("❌ [requests.service] Delete error:", error);
        throw new Error(error.message);
      }
      console.log("✅ [requests.service] Request deleted");
    } catch (error) {
      console.error("❌ [requests.service] Delete exception:", error);
      throw error;
    }
  },
};
