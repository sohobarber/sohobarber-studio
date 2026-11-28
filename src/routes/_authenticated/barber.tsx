import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, LogOut, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBarberPortal } from "@/lib/barber-portal.functions";
import { rupiah } from "@/lib/dashboard-data";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/barber")({
  loader: () => getBarberPortal(),
  head: () => ({ meta: [
    { title: "Jadwal Barber — SOHOBARBER" }, { name: "description", content: "Jadwal dan komisi barber SOHOBARBER." },
    { property: "og:title", content: "Jadwal Barber — SOHOBARBER" }, { property: "og:description", content: "Jadwal dan komisi barber SOHOBARBER." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: BarberPortal,
});

function BarberPortal() {
  const { profile, employee, bookings, payroll } = Route.useLoaderData();
  const navigate = useNavigate();
  return <main className="min-h-screen bg-background px-5 py-6 text-foreground sm:px-8"><div className="mx-auto max-w-5xl"><header className="mb-8 flex items-center justify-between gap-4 border-b border-border pb-5"><div><p className="font-display text-2xl">SOHO<span className="text-primary">BARBER</span></p><p className="mt-1 text-xs text-muted-foreground">Barber · {profile.full_name}</p></div><Button variant="outline" onClick={async () => { await supabase.auth.signOut(); await navigate({ to: "/" }); }}><LogOut />Keluar</Button></header>
    {!employee ? <section className="rounded-md border border-border bg-card p-8 text-center"><h1 className="text-xl font-bold">Profil barber belum terhubung</h1><p className="mt-3 text-sm text-muted-foreground">OWNER perlu menghubungkan akun ini ke data barber sebelum jadwal dan komisi dapat ditampilkan.</p></section> : <>
      <h1 className="font-display text-3xl">Jadwal & Komisi</h1><p className="mt-2 text-sm text-muted-foreground">{employee.full_name} · Komisi {employee.commission_mode === "percentage" ? `${employee.commission_percent}%` : employee.commission_mode === "fixed" ? rupiah(Number(employee.commission_fixed)) : employee.commission_mode === "both" ? `${employee.commission_percent}% + ${rupiah(Number(employee.commission_fixed))}` : "tidak diatur"}</p>
      <section className="mt-8"><h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><CalendarDays className="size-5 text-primary" />Jadwal terbaru</h2><div className="border-t border-border">{bookings.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">Belum ada jadwal.</p> : bookings.map(b => <article key={b.id} className="flex flex-wrap justify-between gap-3 border-b border-border py-4"><div><p className="font-medium">{b.customer_name}</p><p className="mt-1 text-xs text-muted-foreground">{b.booking_code} · {b.services?.name}</p></div><div className="text-right"><p className="text-sm text-primary">{b.booking_date} · {b.start_time.slice(0, 5)}</p><p className="mt-1 text-xs text-muted-foreground">{b.status}</p></div></article>)}</div></section>
      <section className="mt-10"><h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><WalletCards className="size-5 text-accent" />Payroll & komisi</h2><div className="border-t border-border">{payroll.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">Belum ada catatan payroll.</p> : payroll.map(p => <article key={p.id} className="flex flex-wrap justify-between gap-3 border-b border-border py-4"><div><p className="font-medium">{p.period_start} — {p.period_end}</p><p className="mt-1 text-xs text-muted-foreground">Gaji {rupiah(p.base_salary)} · Komisi {rupiah(p.commission_amount)} · Penyesuaian {rupiah(p.adjustments)}</p></div><div className="text-right"><p className="font-bold text-primary">{rupiah(p.total_amount)}</p><p className="mt-1 text-xs text-muted-foreground">{p.is_paid ? "Sudah dibayar" : "Belum dibayar"}</p></div></article>)}</div></section>
    </>}
  </div></main>;
}
