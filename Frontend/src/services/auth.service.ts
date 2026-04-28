import type { User } from "@supabase/supabase-js";
import { assertSupabaseConfigured, supabase } from "@/lib/supabase";
import { unwrap } from "@/lib/supabase-helpers";
import type { Profile } from "@/types/domain";

const mapProfile = (row: {
  id: string;
  email: string;
  full_name: string | null;
  role: "user" | "admin";
  balance_tnd: number;
  created_at: string;
}): Profile => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  role: row.role,
  balanceTnd: Number(row.balance_tnd ?? 0),
  createdAt: row.created_at,
});

export const authService = {
  async signUp(input: { email: string; password: string; fullName?: string }) {
    assertSupabaseConfigured();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName ?? null,
        },
      },
    });
    if (error) throw new Error(error.message);

    if (data.user) {
      await authService.ensureProfile(data.user, input.fullName ?? null);
    }

    return data;
  },

  async signIn(input: { email: string; password: string }) {
    assertSupabaseConfigured();
    const { data, error } = await supabase.auth.signInWithPassword(input);
    if (error) throw new Error(error.message);
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return data.session;
  },

  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return data.user;
  },

  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, balance_tnd, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapProfile(data) : null;
  },

  async ensureProfile(user: User, fullName?: string | null) {
    const existing = await authService.getProfile(user.id);
    if (existing) return existing;

    const payload = {
      id: user.id,
      email: user.email ?? "",
      full_name: fullName ?? ((user.user_metadata?.full_name as string | undefined) ?? null),
      role: "user" as const,
      balance_tnd: 0,
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload)
      .select("id, email, full_name, role, balance_tnd, created_at")
      .single();

    return mapProfile(unwrap(data, error));
  },

  onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(callback);
  },
};