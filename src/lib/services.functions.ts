import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { serviceInput } from "@/lib/service-rules";

async function ownerOrThrow(context: { supabase: any; userId: string }) {
  const { activeOwner } = await import("@/lib/owner.server");
  const profile = await activeOwner(context.supabase, context.userId);
  if (!profile) throw new Error("Hanya OWNER aktif yang dapat mengelola layanan.");
  return profile;
}

export const listServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { activeOwner } = await import("@/lib/owner.server");
    const profile = await activeOwner(context.supabase, context.userId);
    if (!profile) return null;
    const services: { id: string; name: string; price: number; duration_minutes: number; is_active: boolean }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const page = await context.supabase.from("services").select("id, name, price, duration_minutes, is_active").order("name").range(offset, offset + 999);
      if (page.error) throw new Error("Layanan tidak dapat dimuat.");
      services.push(...page.data.map(s => ({ ...s, price: Number(s.price) })));
      if (page.data.length < 1000) break;
    }
    return { profile, services };
  });

export const createService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(serviceInput)
  .handler(async ({ context, data }) => {
    await ownerOrThrow(context);
    const { error } = await context.supabase.from("services").insert({ name: data.name, price: data.price, is_active: true });
    if (error) throw new Error("Layanan tidak dapat disimpan.");
    return { ok: true };
  });

export const updateService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(serviceInput.extend({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await ownerOrThrow(context);
    const { error, count } = await context.supabase.from("services").update({ name: data.name, price: data.price }, { count: "exact" }).eq("id", data.id);
    if (error || !count) throw new Error("Layanan tidak dapat diubah.");
    return { ok: true };
  });

export const setServiceActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), is_active: z.boolean() }))
  .handler(async ({ context, data }) => {
    await ownerOrThrow(context);
    const { error, count } = await context.supabase.from("services").update({ is_active: data.is_active }, { count: "exact" }).eq("id", data.id);
    if (error || !count) throw new Error("Status layanan tidak dapat diubah.");
    return { ok: true };
  });
