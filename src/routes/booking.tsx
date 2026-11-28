import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { createBooking, getAvailableSlots, getBookingOptions } from "@/lib/booking.functions";
import { BOOKING_RULES, depositFor } from "@/lib/booking-rules";
import { rupiah } from "@/lib/dashboard-data";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Booking Online — SOHOBARBER" },
      { name: "description", content: "Pilih layanan, barber, dan jadwal di SOHOBARBER. DP 50% via transfer atau QRIS." },
      { property: "og:title", content: "Booking Online — SOHOBARBER" },
      { property: "og:description", content: "Pilih layanan, barber, dan jadwal di SOHOBARBER." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: () => getBookingOptions(),
  errorComponent: () => <main className="grid min-h-screen place-items-center bg-background p-6 text-muted-foreground">Data booking tidak dapat dimuat. Silakan muat ulang halaman.</main>,
  component: BookingPage,
});

function BookingPage() {
  const { services, barbers, today, depositPercent, openingTime, closingTime } = Route.useLoaderData();
  const fetchSlots = useServerFn(getAvailableSlots);
  const submit = useServerFn(createBooking);
  const navigate = useNavigate();
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [method, setMethod] = useState<"bank_transfer" | "qris" | "dana">("dana");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const service = services.find(s => s.id === serviceId);
  const rules = BOOKING_RULES.replace("DP 50%", `DP ${depositPercent}%`);

  useEffect(() => {
    setTime(""); setSlots(null);
    if (!serviceId || !barberId || !date) return;
    let off = false;
    fetchSlots({ data: { serviceId, barberId, date } }).then(s => { if (!off) setSlots(s); }).catch(() => { if (!off) { setSlots([]); setError("Jadwal tidak dapat dimuat."); } });
    return () => { off = true; };
  }, [serviceId, barberId, date, fetchSlots]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const result = await submit({ data: { serviceId, barberId, date, time, name, phone, paymentMethod: method, website, ...(address ? { address } : {}), ...(note ? { note } : {}) } });
      await navigate({ to: "/booking/$bookingId", params: { bookingId: result.id } });
    } catch (err) {
      setError(err instanceof Error && err.message.length < 180 ? err.message : "Booking tidak dapat disimpan.");
      if (serviceId && barberId) fetchSlots({ data: { serviceId, barberId, date } }).then(setSlots).catch(() => {});
    } finally { setBusy(false); }
  }

  const box = "w-full rounded-sm border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-primary";
  const pick = (on: boolean) => `rounded-sm border px-4 py-3 text-left transition ${on ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-card hover:border-primary/60"}`;

  return (
    <main className="grid-bg min-h-screen bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 text-center">
          <h1 className="font-display text-4xl sm:text-5xl">SOHO<span className="text-primary">BARBER</span></h1>
          <div className="mx-auto mt-3 h-1 w-16 bg-brand-gradient" />
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">Booking Online · {openingTime}–{closingTime} WIB</p>
        </header>
        <form onSubmit={onSubmit} className="space-y-8 rounded-md border border-border bg-card p-5 sm:p-8">
          <fieldset className="space-y-3">
            <legend className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">1 · Layanan</legend>
            {services.length === 0 && <p className="text-sm text-muted-foreground">Belum ada layanan aktif.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map(s => <button type="button" key={s.id} onClick={() => setServiceId(s.id)} className={pick(s.id === serviceId)} aria-pressed={s.id === serviceId}>
                <span className="block font-medium">{s.name}</span><span className="mt-1 block text-sm text-primary">{rupiah(s.price)}</span>
                <span className="block text-xs text-muted-foreground">{s.duration_minutes} menit · DP {rupiah(depositFor(s.price, depositPercent))}</span>
              </button>)}
            </div>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">2 · Barber</legend>
            {barbers.length === 0 ? <p className="text-sm text-accent">Belum ada barber aktif. Booking belum dapat dilakukan.</p> : <div className="grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => setBarberId("any")} className={pick(barberId === "any")} aria-pressed={barberId === "any"}>Siapa saja<span className="mt-1 block text-xs text-muted-foreground">Pilihkan yang tersedia</span></button>
              {barbers.map(b => <button type="button" key={b.id} onClick={() => setBarberId(b.id)} className={pick(b.id === barberId)} aria-pressed={b.id === barberId}>{b.full_name}</button>)}
            </div>}
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">3 · Tanggal & jam</legend>
            <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)} className={box} aria-label="Tanggal" required />
            {!serviceId || !barberId ? <p className="text-sm text-muted-foreground">Pilih layanan dan barber untuk melihat jam tersedia.</p>
              : slots === null ? <p className="text-sm text-muted-foreground">Memuat jam…</p>
              : slots.length === 0 ? <p className="text-sm text-accent">Tidak ada jam tersedia di tanggal ini.</p>
              : <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{slots.map(t => <button type="button" key={t} onClick={() => setTime(t)} className={pick(t === time) + " text-center tabular-nums"} aria-pressed={t === time}>{t}</button>)}</div>}
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">4 · Data Anda</legend>
            <input className={box} placeholder="Nama lengkap" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
            <input className={box} placeholder="Nomor WhatsApp" value={phone} onChange={e => setPhone(e.target.value)} required inputMode="tel" autoComplete="tel" />
            {service?.homeService && <textarea className={box} placeholder="Alamat lengkap Home Service (wajib)" value={address} onChange={e => setAddress(e.target.value)} required rows={3} />}
            <textarea className={box} placeholder="Catatan (opsional)" value={note} onChange={e => setNote(e.target.value)} rows={2} />
            <input value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">5 · Pembayaran DP</legend>
            <div className="grid grid-cols-3 gap-3">
              <button type="button" onClick={() => setMethod("dana")} className={pick(method === "dana")} aria-pressed={method === "dana"}>DANA</button>
              <button type="button" onClick={() => setMethod("bank_transfer")} className={pick(method === "bank_transfer")} aria-pressed={method === "bank_transfer"}>Transfer bank</button>
              <button type="button" onClick={() => setMethod("qris")} className={pick(method === "qris")} aria-pressed={method === "qris"}>QRIS</button>
            </div>
            {service && <p className="text-sm">DP {depositPercent}%: <span className="font-bold text-primary">{rupiah(depositFor(service.price, depositPercent))}</span> <span className="text-muted-foreground">dari {rupiah(service.price)}. Dibayar manual, lalu unggah bukti dalam 30 menit.</span></p>}
            <p className="text-xs text-muted-foreground">Nomor tujuan pembayaran diberikan pada kanal resmi SOHOBARBER. Pengaturan rekening di dalam aplikasi memerlukan penambahan kolom pengaturan yang belum diizinkan.</p>
          </fieldset>
          <p className="border-l-2 border-accent pl-3 text-xs leading-relaxed text-muted-foreground">{rules}</p>
          {error && <p role="alert" className="text-sm text-accent">{error}</p>}
          <Button type="submit" disabled={busy || !serviceId || !barberId || !time} className="h-12 w-full font-bold uppercase tracking-widest">{busy ? "Memproses..." : "Kirim booking"}</Button>
        </form>
        <p className="mt-8 text-center text-xs text-muted-foreground"><Link to="/" className="hover:text-primary">Masuk staf</Link> · © SOHOBARBER</p>
      </div>
    </main>
  );
}
