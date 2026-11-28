import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarDays, Check, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OwnerError, OwnerNotFound, OwnerShell } from "@/components/owner-shell";
import { listOwnerBookings, reviewBookingDeposit } from "@/lib/booking-admin.functions";
import { dashboardHead, rupiah } from "@/lib/dashboard-data";

export const Route = createFileRoute("/_authenticated/owner_/booking")({
  loader: async () => {
    const data = await listOwnerBookings();
    if (!data) throw redirect({ to: "/" });
    return data;
  },
  head: () => dashboardHead("Booking & Verifikasi DP"),
  errorComponent: OwnerError,
  notFoundComponent: OwnerNotFound,
  pendingComponent: () => <main className="min-h-screen bg-background p-8"><p className="text-muted-foreground">Memuat booking…</p></main>,
  component: OwnerBookingsPage,
});

const statusLabels: Record<string, string> = {
  pending_payment: "Menunggu DP", pending_verification: "Menunggu verifikasi", confirmed: "Dikonfirmasi",
  checked_in: "Check-in", in_service: "Dilayani", completed: "Selesai", cancelled: "Batal", no_show: "Tidak hadir",
};

function OwnerBookingsPage() {
  const { profile, rows } = Route.useLoaderData();
  return <OwnerShell profile={profile} active="booking">
    <div className="mb-8 flex items-end justify-between gap-3"><div><p className="mb-2 text-xs font-bold uppercase text-primary">OWNER WORKSPACE</p><h1 className="font-display text-3xl sm:text-4xl">Booking & DP</h1></div><p className="text-sm text-muted-foreground">{rows.length} booking terbaru</p></div>
    {rows.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center gap-4 border-y border-border text-muted-foreground"><CalendarDays className="size-9" /><p>Belum ada booking.</p></div>
      : <section className="space-y-5">{rows.map(row => <BookingCard key={row.id} row={row} />)}</section>}
  </OwnerShell>;
}

type Row = Awaited<ReturnType<typeof listOwnerBookings>>["rows"][number];

function BookingCard({ row }: { row: Row }) {
  const review = useServerFn(reviewBookingDeposit);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function decide(decision: "approve" | "reject") {
    setBusy(true); setError("");
    try { await review({ data: { bookingId: row.id, decision } }); await router.invalidate({ sync: true }); }
    catch (err) { setError(err instanceof Error ? err.message : "Verifikasi gagal."); }
    finally { setBusy(false); }
  }
  return <article className="rounded-md border border-border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold tracking-widest text-primary">{row.code}</p><h2 className="mt-1 text-xl font-bold">{row.name}</h2><p className="mt-1 text-sm text-muted-foreground">{row.phone}</p></div>
      <span className={`text-xs font-bold uppercase ${row.status === "cancelled" ? "text-accent" : "text-primary"}`}>{statusLabels[row.status] ?? row.status}</span>
    </div>
    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div><dt className="text-xs text-muted-foreground">Jadwal</dt><dd className="mt-1">{row.date} · {row.time}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Layanan / barber</dt><dd className="mt-1">{row.service} · {row.barber}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Harga / DP</dt><dd className="mt-1 tabular-nums">{rupiah(row.price)} / {rupiah(row.deposit)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Pembayaran</dt><dd className="mt-1">{row.paymentMethod ?? "—"} · {row.paymentStatus ?? "—"}</dd></div>
    </dl>
    {row.request && <p className="mt-4 whitespace-pre-wrap border-l-2 border-accent pl-3 text-sm text-muted-foreground">{row.request}</p>}
    {row.cancellationReason && <p className="mt-4 text-sm text-accent">{row.cancellationReason}</p>}
    {row.proofUrl && <a href={row.proofUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4">Lihat bukti DP <ExternalLink className="size-4" /></a>}
    {row.status === "pending_verification" && row.paymentStatus === "waiting_verification" && <div className="mt-5 flex flex-wrap gap-3"><Button disabled={busy} onClick={() => decide("approve")}><Check />Setujui DP</Button><Button variant="outline" disabled={busy} onClick={() => decide("reject")}><X />Tolak Bukti</Button></div>}
    {error && <p role="alert" className="mt-3 text-sm text-accent">{error}</p>}
  </article>;
}
