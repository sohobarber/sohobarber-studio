import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Connects to an existing Supabase project via VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!, {
      auth: { persistSession: typeof window !== "undefined", autoRefreshToken: true },
    })
  : null;
