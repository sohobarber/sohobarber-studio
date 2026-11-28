import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getBarberPortal = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { activeStaff } = await import("@/lib/staff.server");
    const profile = await activeStaff(context.supabase, context.userId, ["barber"]);
    if (!profile) throw new Error("Hanya akun Barber aktif yang dapat membuka halaman ini.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const employee = await supabaseAdmin.from("employees").select("id, full_name, commission_mode, commission_percent, commission_fixed, base_salary").eq("profile_id", profile.id).eq("is_active", true).maybeSingle();
    if (employee.error) throw new Error("Data barber tidak dapat dimuat.");
    if (!employee.data) return { profile, employee: null, bookings: [], payroll: [] };
    const [bookings, payroll] = await Promise.all([
      supabaseAdmin.from("bookings").select("id, booking_code, customer_name, booking_date, start_time, status, services(name)").eq("barber_id", employee.data.id).order("booking_date", { ascending: false }).order("start_time").limit(50),
      supabaseAdmin.from("payroll_records").select("id, period_start, period_end, base_salary, commission_amount, adjustments, total_amount, is_paid").eq("employee_id", employee.data.id).order("period_start", { ascending: false }).limit(12),
    ]);
    if (bookings.error || payroll.error) throw new Error("Jadwal atau komisi tidak dapat dimuat.");
    return { profile, employee: employee.data, bookings: bookings.data, payroll: payroll.data.map(p => ({ ...p, base_salary: Number(p.base_salary), commission_amount: Number(p.commission_amount), adjustments: Number(p.adjustments), total_amount: Number(p.total_amount) })) };
  });
