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

const withTimeout = async <T>(label: string, ms: number, run: (signal: AbortSignal) => Promise<T>) => {
  const controller = new AbortController();
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      controller.abort();
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([run(controller.signal), timeoutPromise]);
  } catch (error) {
    console.error(`❌ [auth.service] ${label} failed:`, error);
    throw error;
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

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

    // Only attempt a client-side profile upsert when a session exists.
    // If email confirmation is required, there is no authenticated user yet,
    // and RLS correctly blocks inserts into profiles from the client.
    if (data.user && data.session) {
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
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error && !/session|refresh token/i.test(error.message)) {
      throw new Error(error.message);
    }
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
    const { data, error } = await withTimeout("getProfile", 7000, (signal) =>
      supabase
        .from("profiles")
        .select("id, email, full_name, role, balance_tnd, created_at")
        .eq("id", userId)
        .maybeSingle()
        .abortSignal(signal),
    );

    if (error) throw new Error(error.message);
    return data ? mapProfile(data) : null;
  },

  async ensureProfile(user: User, fullName?: string | null) {
    console.log("👤 [auth.service] Ensuring profile for:", user.id);
    const existing = await authService.getProfile(user.id);
    if (existing) return existing;

    const payload = {
      id: user.id,
      email: user.email ?? "",
      full_name: fullName ?? ((user.user_metadata?.full_name as string | undefined) ?? null),
      role: "user" as const,
      balance_tnd: 0,
    };

    const { data, error } = await withTimeout("upsertProfile", 7000, (signal) =>
      supabase
        .from("profiles")
        .upsert(payload)
        .select("id, email, full_name, role, balance_tnd, created_at")
        .single()
        .abortSignal(signal),
    );

    return mapProfile(unwrap(data, error));
  },

  onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
