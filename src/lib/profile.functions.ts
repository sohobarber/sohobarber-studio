import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canAccessOwnerDashboard } from "@/lib/owner-access";

export const getLoginProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("profiles")
      .select("id, full_name, role, is_active").eq("id", context.userId).maybeSingle();
    if (error) throw new Error("Profil pengguna tidak dapat dimuat. Silakan coba lagi.");
    return data;
  });

export const getOwnerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("profiles")
      .select("id, full_name, role, is_active").eq("id", context.userId).maybeSingle();
    if (error) throw new Error("Profil pengguna tidak dapat dimuat. Silakan coba lagi.");
    if (!canAccessOwnerDashboard(data)) return null;
    return data;
  });