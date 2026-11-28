import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Copy, MessageCircle, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelOwnBooking, getBookingStatus, uploadBookingProof } from "@/lib/booking.functions";
import { BOOKING_RULES } from "@/lib/booking-rules";
import { rupiah } from "@/lib/dashboard-data";

export const Route = createFileRoute("/booking_/$bookingId")({
  loader: ({ params }) => getBookingStatus({ data: { bookingId: params.bookingId } }),
  head: () => ({ meta: [
    { title: "Status Booking — SOHOBARBER" },
    { name: "description", content: "Cek status booking, unggah bukti DP, atau batalkan booking SOHOBARBER." },
    { property: "og:title", content: "Status Booking — SOHOBARBER" },
    { property: "og:description", content: "Cek status dan pembayaran DP booking SOHOBARBER." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  errorComponent: () => <main className="grid min-h-screen place-items-center bg-background p-6 text-center text-muted-foreground"><div><p>Booking tidak ditemukan atau tidak dapat dimuat.</p><Button asChild variant="outline" className="mt-5"><Link to="/booking">Buat booking</Link></Button></div></main>,
  component: BookingStatusPage,
});

const labels: Record<string, string> = {
  pending_payment: "Menunggu pembayaran DP", pending_verification: "Bukti menunggu verifikasi OWNER",
  confirmed: "Booking dikonfirmasi", checked_in: "Sudah check-in", in_service: "Sedang dilayani",
  completed: "Layanan selesai", cancelled: "Booking dibatalkan", no_show: "Tidak hadir",
};

function BookingStatusPage() {
  const booking = Route.useLoaderData();
  const upload = useServerFn(uploadBookingProof);
  const cancel = useServerFn(cancelOwnBooking);
  const router = useRouter();
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const canCancel = ["pending_payment", "pending_verification", "confirmed"].includes(booking.status);
  const waText = encodeURIComponent(`Halo SOHOBARBER, saya ${booking.name}. Kode booking ${booking.code}, ${booking.service}, ${booking.date} pukul ${booking.time} WIB. ${BOOKING_RULES}`);
  const deadline = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: booking.timezone }).format(new Date(booking.deadline));

  async function submitProof(e: FormEvent) {
    e.preventDefault(); setError(""); setMessage("");
    if (!proof) return setError("Pilih foto bukti pembayaran terlebih dahulu.");
    setBusy(true);
    try {
      const form = new FormData(); form.set("bookingId", booking.id); form.set("proof", proof); form.set("website", "");
      await upload({ data: form }); setProof(null); setMessage("Bukti berhasil diunggah dan menunggu verifikasi OWNER."); await router.invalidate({ sync: true });
    } catch (err) { setError(err instanceof Error ? err.message : "Bukti tidak dapat diunggah."); }
    finally { setBusy(false); }
  }
  async function cancelBooking() {
    if (!window.confirm("Batalkan booking ini? Aturan pengembalian DP berlaku.")) return;
    setBusy(true); setError("");
    try { const result = await cancel({ data: { bookingId: booking.id } }); setMessage(result.refundable ? "Booking dibatalkan. DP layak dikembalikan; hubungi SOHOBARBER untuk pengembalian manual." : "Booking berhasil dibatalkan."); await router.invalidate({ sync: true }); }
    catch (err) { setError(err instanceof Error ? err.message : "Booking tidak dapat dibatalkan."); }
    finally { setBusy(false); }
  }
  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href); setCopied(true);
  }

  return <main className="grid-bg min-h-screen bg-background px-5 py-10 text-foreground"><div className="mx-auto max-w-2xl">
    <header className="mb-8 text-center"><h1 className="font-display text-4xl sm:text-5xl">SOHO<span className="text-primary">BARBER</span></h1><p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">Status booking</p></header>
    <section className="rounded-md border border-border bg-card p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">{booking.code}</p><h2 className="mt-2 font-display text-2xl">{labels[booking.status] ?? booking.status}</h2></div>{booking.status === "cancelled" ? <XCircle className="size-8 text-accent" /> : <CheckCircle2 className="size-8 text-primary" />}</div>
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Layanan</dt><dd className="text-right">{booking.service} · {booking.barber}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Jadwal</dt><dd>{booking.date} · {booking.time} WIB</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Harga</dt><dd>{rupiah(booking.price)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">DP</dt><dd className="font-bold text-primary">{rupiah(booking.deposit)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Status pembayaran</dt><dd>{booking.paymentStatus ?? "—"}</dd></div>
      </dl>
      {booking.status === "pending_payment" && <div className="mt-6 rounded-sm border border-primary/40 bg-primary/5 p-4"><p className="text-sm font-bold text-primary">Bayar DP sebelum {deadline}</p><p className="mt-2 text-sm text-muted-foreground">Lewat 30 menit, booking batal otomatis. Unggah bukti JPG/PNG maksimal 2 MB setelah membayar.</p>
        <form onSubmit={submitProof} className="mt-4 space-y-3"><input type="file" required accept="image/jpeg,image/png" aria-label="Bukti pembayaran" onChange={e => setProof(e.target.files?.[0] ?? null)} className="w-full rounded-sm border border-input bg-background px-3 py-3 text-sm file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:font-bold file:text-primary-foreground" /><input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" /><Button type="submit" disabled={busy || !proof} className="w-full"><Upload />Kirim bukti DP</Button></form>
      </div>}
      {booking.paymentStatus === "rejected" && booking.status === "pending_payment" && <p className="mt-4 text-sm text-accent">Bukti sebelumnya ditolak. Silakan unggah bukti yang benar sebelum batas pembayaran.</p>}
      {booking.cancellationReason && <p className="mt-5 text-sm text-accent">{booking.cancellationReason}</p>}
      <p className="mt-6 border-l-2 border-accent pl-3 text-xs leading-relaxed text-muted-foreground">{BOOKING_RULES}</p>
      {message && <p role="status" className="mt-4 text-sm text-primary">{message}</p>}{error && <p role="alert" className="mt-4 text-sm text-accent">{error}</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><Button asChild variant="outline"><a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer"><MessageCircle />Bagikan via WhatsApp</a></Button><Button variant="outline" onClick={copyLink}><Copy />{copied ? "Tautan disalin" : "Salin tautan status"}</Button></div>
      {canCancel && <Button variant="ghost" disabled={busy} onClick={cancelBooking} className="mt-3 w-full text-accent">Batalkan booking</Button>}
    </section>
    <p className="mt-6 text-center text-xs text-muted-foreground"><Link to="/booking" className="hover:text-primary">Buat booking lain</Link> · Simpan tautan ini untuk memeriksa status.</p>
  </div></main>;
}
