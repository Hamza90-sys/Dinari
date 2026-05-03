import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

console.log("⚙️ [supabase] Initializing Supabase client");
console.log("✅ [supabase] URL configured:", !!supabaseUrl);
console.log("✅ [supabase] Anon key configured:", !!supabaseAnonKey);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    "❌ [supabase] Supabase is not properly configured!",
    "Missing:",
    !supabaseUrl ? "VITE_SUPABASE_URL" : "",
    !supabaseAnonKey ? "VITE_SUPABASE_ANON_KEY" : ""
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || "https://example.supabase.co",
  supabaseAnonKey || "example-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

console.log("✅ [supabase] Supabase client created");

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    const message = "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env";
    console.error("❌ [supabase]", message);
    throw new Error(message);
  }
}