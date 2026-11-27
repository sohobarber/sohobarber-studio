import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { barberInput } from "@/lib/barber-rules";

async function ownerOrThrow(context: { supabase: any; userId: string }) {
  const { activeOwner } = await import("@/lib/owner.server");
  const profile = await activeOwner(context.supabase, context.userId);
  if (!profile) throw new Error("Hanya OWNER aktif yang dapat mengelola barber.");
  return profile;
}

export const listBarbers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { activeOwner } = await import("@/lib/owner.server");
    const profile = await activeOwner(context.supabase, context.userId);
    if (!profile) return null;
    const barbers: { id: string; full_name: string; phone: string | null; employee_code: string | null; is_active: boolean }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const page = await context.supabase.from("employees").select("id, full_name, phone, employee_code, is_active").order("full_name").range(offset, offset + 999);
      if (page.error) { console.error("listBarbers", page.error); throw new Error("Barber tidak dapat dimuat."); }
      barbers.push(...page.data);
      if (page.data.length < 1000) break;
    }
    return { profile, barbers };
  });

export const createBarber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(barberInput)
  .handler(async ({ context, data }) => {
    await ownerOrThrow(context);
    const { error } = await context.supabase.from("employees").insert({ full_name: data.full_name, phone: data.phone, is_active: true });
    if (error) { console.error("createBarber", error); throw new Error("Barber tidak dapat disimpan."); }
    return { ok: true };
  });

export const updateBarber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(barberInput.extend({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await ownerOrThrow(context);
    const { error, count } = await context.supabase.from("employees").update({ full_name: data.full_name, phone: data.phone }, { count: "exact" }).eq("id", data.id);
    if (error || !count) { if (error) console.error("updateBarber", error); throw new Error("Barber tidak dapat diubah."); }
    return { ok: true };
  });

export const setBarberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), is_active: z.boolean() }))
  .handler(async ({ context, data }) => {
    await ownerOrThrow(context);
    const { error, count } = await context.supabase.from("employees").update({ is_active: data.is_active }, { count: "exact" }).eq("id", data.id);
    if (error || !count) throw new Error("Status barber tidak dapat diubah.");
    return { ok: true };
  });
