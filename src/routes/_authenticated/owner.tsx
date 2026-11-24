import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, CircleDollarSign, ReceiptText, Scissors, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OwnerShell, OwnerError, OwnerNotFound } from "@/components/owner-shell";
import { getOwnerDashboard } from "@/lib/dashboard.functions";
import { dashboardHead, rupiah } from "@/lib/dashboard-data";

export const Route = createFileRoute("/_authenticated/owner")({
  loader: async () => {
    const data = await getOwnerDashboard();
    if (!data) throw redirect({ to: "/" });
    return data;
  },
  head: () => dashboardHead("Dashboard OWNER"),
  errorComponent: OwnerError,
  notFoundComponent: OwnerNotFound,
  pendingComponent: () => <main className="min-h-screen bg-background p-8"><p className="text-muted-foreground">Memuat dashboard…</p></main>,
  component: OwnerDashboard,
});

function OwnerDashboard() {
  const { profile, summary } = Route.useLoaderData();
  const dateLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${summary.date}T00:00:00Z`));
  const stats = [
    { title: "Omzet hari ini", value: rupiah(summary.revenue), detail: "Transaksi selesai", icon: CircleDollarSign, accent: true },
    { title: "Transaksi hari ini", value: String(summary.transactions), detail: "Transaksi selesai", icon: ReceiptText, accent: false },
    { title: "Booking hari ini", value: String(summary.bookings), detail: "Seluruh status booking", icon: CalendarDays, accent: false },
    { title: "Jumlah pelanggan", value: String(summary.customers), detail: "Pelanggan terdaftar", icon: Users, accent: false },
  ];
  const statuses: Record<string, string> = { pending_payment: "Menunggu pembayaran", pending_verification: "Menunggu verifikasi", confirmed: "Dikonfirmasi", checked_in: "Check-in", in_service: "Dilayani", completed: "Selesai", cancelled: "Dibatalkan", no_show: "Tidak hadir" };

  return (
    <OwnerShell profile={profile} active="dashboard">
      <section className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div><p className="mb-2 text-xs font-bold uppercase text-primary">Ringkasan usaha</p><h1 className="font-display text-3xl sm:text-4xl">Dashboard OWNER</h1><p className="mt-3 text-sm text-muted-foreground">Selamat datang, {profile.full_name}.</p></div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" />{dateLabel}</p>
      </section>
      <section aria-label="Ringkasan hari ini" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return <article key={stat.title} className={`min-w-0 rounded-md border bg-card p-4 sm:p-5 ${stat.accent ? "col-span-2 border-primary/40 sm:col-span-1" : stat.title === "Jumlah pelanggan" ? "col-span-2 border-border sm:col-span-1" : "border-border"}`}>
            <div className="mb-6 flex items-center justify-between gap-2"><h2 className="text-sm text-muted-foreground">{stat.title}</h2><Icon className={`size-5 shrink-0 ${stat.accent ? "text-primary" : stat.title === "Booking hari ini" ? "text-accent" : "text-muted-foreground"}`} /></div>
            <p className={`break-words text-3xl font-bold tabular-nums ${stat.accent ? "text-primary" : "text-foreground"}`}>{stat.value}</p>
            <p className="mt-3 text-xs text-muted-foreground">{stat.detail}</p>
          </article>;
        })}
      </section>
      <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="min-w-0">
          <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Booking hari ini</h2><Button asChild variant="link" className="h-auto p-0"><Link to="/owner/$section" params={{ section: "booking" }} search={{ page: 1 }}>Lihat semua<ArrowUpRight /></Link></Button></div>
          <div className="border-t border-border">
            {summary.upcoming.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 border-b border-border text-muted-foreground"><CalendarDays className="size-8 text-accent/70" /><p className="text-sm">Belum ada booking hari ini.</p></div> : summary.upcoming.map(booking => (
              <article key={booking.id} className="flex flex-wrap items-center gap-4 border-b border-border py-5">
                <span className="w-14 shrink-0 text-lg font-bold tabular-nums text-primary">{booking.start_time.slice(0, 5)}</span>
                <div className="min-w-0 flex-1"><p className="break-words font-medium">{booking.customer_name}</p><p className="mt-1 text-xs text-muted-foreground">{booking.services?.name ?? "—"} · {booking.employees?.full_name ?? "Belum ditentukan"}</p></div>
                <span className={`text-xs ${booking.status === "cancelled" ? "text-accent" : "text-muted-foreground"}`}>{statuses[booking.status] ?? booking.status}</span>
              </article>
            ))}
          </div>
        </section>
        <section className="min-w-0">
          <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Transaksi terbaru</h2><Button asChild variant="link" className="h-auto p-0"><Link to="/owner/$section" params={{ section: "kasir" }} search={{ page: 1 }} aria-label="Lihat semua transaksi"><ArrowUpRight /></Link></Button></div>
          <div className="border-t border-border">
            {summary.recent.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 border-b border-border text-muted-foreground"><ReceiptText className="size-8 text-primary/70" /><p className="text-sm">Belum ada transaksi hari ini.</p></div> : summary.recent.map(transaction => (
              <article key={transaction.id} className="flex flex-wrap justify-between gap-3 border-b border-border py-5"><div><p className="text-sm font-medium">{transaction.transaction_code}</p><p className="mt-1 text-xs text-muted-foreground">{transaction.status === "completed" ? "Selesai" : "Dibatalkan"}</p></div><p className="text-sm font-bold tabular-nums">{rupiah(transaction.total_amount)}</p></article>
            ))}
          </div>
        </section>
      </div>
      <section className="mt-10 flex flex-wrap items-center justify-between gap-5 border-y border-border py-6">
        <div className="flex items-center gap-3"><Scissors className="size-6 text-accent" /><h2 className="text-sm font-medium">SOHOBARBER<span className="mt-1 block text-xs text-muted-foreground">{summary.timezone}</span></h2></div>
        <Button asChild variant="outline"><Link to="/owner/$section" params={{ section: "laporan" }} search={{ page: 1 }}>Laporan hari ini<ArrowUpRight /></Link></Button>
      </section>
    </OwnerShell>
  );
}