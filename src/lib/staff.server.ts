import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function activeStaff(client: SupabaseClient<Database>, userId: string, roles: ("owner" | "cashier" | "barber")[]) {
  const { data, error } = await client.from("profiles").select("id, full_name, role, is_active").eq("id", userId).maybeSingle();
  if (error) throw new Error("Profil pengguna tidak dapat dimuat.");
  if (!data?.is_active || !roles.includes(data.role)) return null;
  return data;
}
