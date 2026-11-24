import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { canAccessOwnerDashboard } from "@/lib/owner-access";
import { businessDay, completedRevenue } from "@/lib/dashboard-data";

export async function activeOwner(client: SupabaseClient<Database>, userId: string) {
  const { data, error } = await client.from("profiles").select("id, full_name, role, is_active").eq("id", userId).maybeSingle();
  if (error) throw new Error("Profil pengguna tidak dapat dimuat.");
  if (!canAccessOwnerDashboard(data)) return null;
  return data;
}

export async function ownerSummary(client: SupabaseClient<Database>) {
  const settings = await client.from("business_settings").select("timezone").eq("id", 1).maybeSingle();
  if (settings.error) throw new Error("Pengaturan barbershop tidak dapat dimuat.");
  const timezone = settings.data?.timezone ?? "Asia/Jakarta";
  const day = businessDay(new Date(), timezone);
  const [transactions, bookings, customers, upcoming, recent] = await Promise.all([
    client.from("transactions").select("id", { count: "exact", head: true }).eq("status", "completed").gte("created_at", day.start).lt("created_at", day.end),
    client.from("bookings").select("id", { count: "exact", head: true }).eq("booking_date", day.date),
    client.from("customers").select("id", { count: "exact", head: true }),
    client.from("bookings").select("id, booking_code, customer_name, start_time, status, services(name), employees(full_name)").eq("booking_date", day.date).order("start_time").limit(6),
    client.from("transactions").select("id, transaction_code, total_amount, status, created_at").gte("created_at", day.start).lt("created_at", day.end).order("created_at", { ascending: false }).limit(5),
  ]);
  if ([transactions, bookings, customers, upcoming, recent].some(result => result.error)) {
    throw new Error("Data dashboard tidak dapat dimuat. Silakan coba lagi.");
  }
  let revenue = 0;
  // Read all completed rows, not just Supabase's default first 1,000.
  for (let offset = 0; ; offset += 1000) {
    const page = await client.from("transactions").select("total_amount, status").eq("status", "completed")
      .gte("created_at", day.start).lt("created_at", day.end).order("id").range(offset, offset + 999);
    if (page.error) throw new Error("Omzet tidak dapat dimuat. Silakan coba lagi.");
    revenue += completedRevenue(page.data);
    if (page.data.length < 1000) break;
  }
  return {
    date: day.date, timezone, revenue,
    transactions: transactions.count ?? 0,
    bookings: bookings.count ?? 0,
    customers: customers.count ?? 0,
    upcoming: upcoming.data ?? [], recent: recent.data ?? [],
  };
}