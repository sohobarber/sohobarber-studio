import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ownerSections, rupiah } from "@/lib/dashboard-data";

export const getOwnerDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { activeOwner, ownerSummary } = await import("@/lib/owner.server");
    const profile = await activeOwner(context.supabase, context.userId);
    if (!profile) return null;
    return { profile, summary: await ownerSummary(context.supabase) };
  });

export const getOwnerSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ section: z.enum(ownerSections), page: z.number().int().min(1) }))
  .handler(async ({ context, data }) => {
    const { activeOwner, ownerSummary } = await import("@/lib/owner.server");
    const profile = await activeOwner(context.supabase, context.userId);
    if (!profile) return null;
    const client = context.supabase;
    const start = (data.page - 1) * 25;
    const end = start + 24;
    type Row = { id: string; label: string; detail: string; value: string };
    let rows: Row[] = [];
    let count = 0;
    switch (data.section) {
      case "kasir": {
        const result = await client.from("transactions").select("id, transaction_code, total_amount, status, created_at", { count: "exact" }).order("created_at", { ascending: false }).range(start, end);
        if (result.error) throw new Error("Transaksi tidak dapat dimuat.");
        count = result.count ?? 0;
        rows = result.data.map(r => ({ id: r.id, label: r.transaction_code, detail: r.status === "completed" ? "Selesai" : "Dibatalkan", value: rupiah(r.total_amount) }));
        break;
      }
      case "booking": {
        const result = await client.from("bookings").select("id, customer_name, booking_date, start_time, booking_code", { count: "exact" }).order("booking_date", { ascending: false }).order("start_time").range(start, end);
        if (result.error) throw new Error("Booking tidak dapat dimuat.");
        count = result.count ?? 0;
        rows = result.data.map(r => ({ id: r.id, label: r.customer_name, detail: r.booking_code, value: `${r.booking_date} · ${r.start_time.slice(0, 5)}` }));
        break;
      }
      case "barber": {
        const result = await client.from("employees").select("id, full_name, employee_code, is_active", { count: "exact" }).order("full_name").range(start, end);
        if (result.error) throw new Error("Barber tidak dapat dimuat.");
        count = result.count ?? 0;
        rows = result.data.map(r => ({ id: r.id, label: r.full_name, detail: r.employee_code ?? "—", value: r.is_active ? "Aktif" : "Nonaktif" }));
        break;
      }
      case "produk": {
        const result = await client.from("products").select("id, name, stock, price", { count: "exact" }).order("name").range(start, end);
        if (result.error) throw new Error("Produk tidak dapat dimuat.");
        count = result.count ?? 0;
        rows = result.data.map(r => ({ id: r.id, label: r.name, detail: `Stok: ${r.stock}`, value: rupiah(r.price) }));
        break;
      }
      case "layanan": {
        const result = await client.from("services").select("id, name, duration_minutes, price", { count: "exact" }).order("name").range(start, end);
        if (result.error) throw new Error("Layanan tidak dapat dimuat.");
        count = result.count ?? 0;
        rows = result.data.map(r => ({ id: r.id, label: r.name, detail: `${r.duration_minutes} menit`, value: rupiah(r.price) }));
        break;
      }
      case "pengaturan": {
        const result = await client.from("business_settings").select("business_name, opening_time, closing_time, timezone, deposit_percent, slot_duration_minutes").eq("id", 1).maybeSingle();
        if (result.error) throw new Error("Pengaturan tidak dapat dimuat.");
        const r = result.data;
        if (r) rows = [
          { id: "name", label: "Nama usaha", detail: "", value: r.business_name },
          { id: "hours", label: "Jam operasional", detail: "", value: `${r.opening_time.slice(0, 5)}–${r.closing_time.slice(0, 5)}` },
          { id: "timezone", label: "Zona waktu", detail: "", value: r.timezone },
          { id: "deposit", label: "Deposit", detail: "", value: `${r.deposit_percent}%` },
          { id: "slot", label: "Durasi slot", detail: "", value: `${r.slot_duration_minutes} menit` },
        ];
        count = rows.length;
        break;
      }
      case "laporan": {
        const summary = await ownerSummary(client);
        rows = [
          { id: "revenue", label: "Omzet hari ini", detail: summary.date, value: rupiah(summary.revenue) },
          { id: "transactions", label: "Transaksi hari ini", detail: summary.date, value: String(summary.transactions) },
          { id: "bookings", label: "Booking hari ini", detail: summary.date, value: String(summary.bookings) },
          { id: "customers", label: "Jumlah pelanggan", detail: "", value: String(summary.customers) },
        ];
        count = rows.length;
      }
    }
    return { profile, rows, count };
  });