import { supabase } from "@/lib/supabase";
import { ensureArray } from "@/lib/supabase-helpers";
import type { DinariSubscription, Profile } from "@/types/domain";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "user" | "admin";
  balance_tnd: number;
  created_at: string;
};

type SubscriptionRow = {
  id: string;
  request_id: string;
  user_id: string;
  service_name: string;
  plan_name: string;
  start_date: string;
  renewal_date: string;
  status: "Active" | "Cancelled";
};

const mapProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  role: row.role,
  balanceTnd: Number(row.balance_tnd ?? 0),
  createdAt: row.created_at,
});

const mapSubscription = (row: SubscriptionRow): DinariSubscription => ({
  id: row.id,
  requestId: row.request_id,
  ownerId: row.user_id,
  service: row.service_name,
  plan: row.plan_name,
  startDate: row.start_date,
  renewalDate: row.renewal_date,
  status: row.status,
});

export const usersService = {
  async getMyProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, balance_tnd, created_at")
      .eq("id", userId)
      .single();

    if (error) throw new Error(error.message);
    return mapProfile(data as ProfileRow);
  },

  async listProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, balance_tnd, created_at")
      .order("created_at", { ascending: false });

    return ensureArray(data as ProfileRow[] | null, error).map(mapProfile);
  },

  async listSubscriptions(isAdmin: boolean, userId?: string) {
    let query = supabase
      .from("subscriptions")
      .select("id, request_id, user_id, service_name, plan_name, start_date, renewal_date, status")
      .order("start_date", { ascending: false });

    if (!isAdmin && userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    return ensureArray(data as SubscriptionRow[] | null, error).map(mapSubscription);
  },
};