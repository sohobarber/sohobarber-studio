import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type FormEvent } from "react";
import { CircleDollarSign, Printer, ReceiptText, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelCashierTransaction, createCashierTransaction, getCashierWorkspace } from "@/lib/cashier.functions";
import { transactionTotals } from "@/lib/cashier-rules";
import { rupiah } from "@/lib/dashboard-data";

type Data = Awaited<ReturnType<typeof getCashierWorkspace>>;
type Transaction = Data["transactions"][number];

export function CashierWorkspace({ data }: { data: Data }) {
  const router = useRouter();
  const create = useServerFn(createCashierTransaction);
  const cancel = useServerFn(cancelCashierTransaction);
  const [bookingId, setBookingId] = useState("");
  const [serviceId, setServiceId] = useState(data.services[0]?.id ?? "");
  const [barberId, setBarberId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("Pelanggan walk-in");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris" | "bank_transfer">("cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const booking = data.bookings.find(b => b.id === bookingId);
  const service = data.services.find(s => s.id === serviceId);
  const product = data.products.find(p => p.id === productId);
  const totals = useMemo(() => transactionTotals(Number(service?.price ?? 0), Number(product?.price ?? 0), product ? quantity : 0, discount, Number(booking?.deposit_paid ?? 0)), [service, product, quantity, discount, booking]);
  const select = "h-11 w-full rounded-sm border border-input bg-background px-3 text-sm text-foreground";

  function chooseBooking(id: string) {
    setBookingId(id);
    const b = data.bookings.find(x => x.id === id);
    if (!b) return;
    const linkedService = data.services.find(s => s.name === b.services?.name);
    if (linkedService) setServiceId(linkedService.id);
    setCustomerName(b.customer_name);
    setAmountPaid(0);
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      const result = await create({ data: {
        ...(bookingId ? { bookingId } : {}), serviceId, ...(barberId ? { barberId } : {}), ...(productId ? { productId } : {}),
        productQuantity: productId ? quantity : 0, customerName, ...(customerPhone ? { customerPhone } : {}), discount, amountPaid, paymentMethod,
      } });
      setSuccess(`Transaksi ${result.code} selesai. Kembalian ${rupiah(result.change)}.`);
      setBookingId(""); setDiscount(0); setAmountPaid(0); setProductId(""); await router.invalidate({ sync: true });
    } catch (err) { setError(err instanceof Error ? err.message : "Transaksi tidak dapat disimpan."); }
    finally { setBusy(false); }
  }
  async function cancelTransaction(t: Transaction) {
    const reason = window.prompt(`Alasan membatalkan ${t.transaction_code}:`)?.trim();
    if (!reason) return;
    setBusy(true); setError("");
    try { await cancel({ data: { transactionId: t.id, reason } }); setReceipt(null); await router.invalidate({ sync: true }); }
    catch (err) { setError(err instanceof Error ? err.message : "Transaksi tidak dapat dibatalkan."); }
    finally { setBusy(false); }
  }
  async function shareReceipt(t: Transaction) {
    const text = receiptText(t);
    if (navigator.share) await navigator.share({ title: `Struk ${t.transaction_code}`, text });
    else await navigator.clipboard.writeText(text);
  }

  return <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
    <section>
      <div className="mb-6"><p className="text-xs font-bold uppercase text-primary">Transaksi nyata</p><h1 className="mt-2 font-display text-3xl">Kasir SOHOBARBER</h1><p className="mt-2 text-sm text-muted-foreground">Booking selesai atau pelanggan walk-in, layanan dan produk dalam satu struk.</p></div>
      <form onSubmit={submit} className="space-y-5 rounded-md border border-border bg-card p-5">
        <label className="grid gap-2 text-xs font-bold uppercase text-muted-foreground">Booking (opsional)<select className={select} value={bookingId} onChange={e => chooseBooking(e.target.value)}><option value="">Walk-in tanpa booking</option>{data.bookings.map(b => <option key={b.id} value={b.id}>{b.booking_code} · {b.customer_name} · {b.services?.name}</option>)}</select></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-xs font-bold uppercase text-muted-foreground">Nama pelanggan<Input required minLength={2} value={customerName} onChange={e => setCustomerName(e.target.value)} /></label>
          <label className="grid gap-2 text-xs font-bold uppercase text-muted-foreground">No. WhatsApp<Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} inputMode="tel" /></label>
          <label className="grid gap-2 text-xs font-bold uppercase text-muted-foreground">Layanan<select required className={select} value={serviceId} onChange={e => setServiceId(e.target.value)} disabled={Boolean(booking)}>{data.services.map(s => <option key={s.id} value={s.id}>{s.name} · {rupiah(s.price)}</option>)}</select></label>
          <label className="grid gap-2 text-xs font-bold uppercase text-muted-foreground">Barber<select className={select} value={barberId} onChange={e => setBarberId(e.target.value)} disabled={Boolean(booking)}><option value="">Belum ditentukan</option>{(data.barbers ?? []).map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}</select></label>
          <label className="grid gap-2 text-xs font-bold uppercase text-muted-foreground">Produk (opsional)<select className={select} value={productId} onChange={e => setProductId(e.target.value)}><option value="">Tanpa produk</option>{data.products.map(p => <option key={p.id} value={p.id}>{p.name} · {rupiah(p.price)} · stok {p.stock}</option>)}</select></label>
          <label className="grid gap-2 text-xs font-bold uppercase text-muted-foreground">Jumlah produk<Input type="number" min={1} max={20} value={quantity} onChange={e => setQuantity(Number(e.target.value))} disabled={!productId} /></label>
          <label className="grid gap-2 text-xs font-bold uppercase text-muted-foreground">Diskon (Rp)<Input type="number" min={0} value={discount} onChange={e => setDiscount(Number(e.target.value))} /></label>
          <label className="grid gap-2 text-xs font-bold uppercase text-muted-foreground">Metode bayar<select className={select} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)}><option value="cash">Tunai</option><option value="qris">QRIS</option><option value="bank_transfer">Transfer</option></select></label>
        </div>
        <dl className="space-y-2 border-y border-border py-4 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-bold">{rupiah(totals.total)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">DP dipotong</dt><dd className="text-primary">− {rupiah(totals.depositApplied)}</dd></div><div className="flex justify-between text-base"><dt>Sisa bayar</dt><dd className="font-bold text-accent">{rupiah(totals.remaining)}</dd></div></dl>
        <label className="grid gap-2 text-xs font-bold uppercase text-muted-foreground">Uang diterima di kasir (Rp)<Input required type="number" min={0} value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} /></label>
        {error && <p role="alert" className="text-sm text-accent">{error}</p>}{success && <p role="status" className="text-sm text-primary">{success}</p>}
        <Button type="submit" className="h-12 w-full" disabled={busy || !serviceId || data.services.length === 0}><CircleDollarSign />{busy ? "Menyimpan…" : "Selesaikan transaksi"}</Button>
      </form>
    </section>
    <section className="min-w-0"><h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><ReceiptText className="size-5 text-primary" />Transaksi terbaru</h2>
      <div className="border-t border-border">{data.transactions.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">Belum ada transaksi.</p> : data.transactions.map(t => <article key={t.id} className="border-b border-border py-4"><button type="button" className="w-full text-left" onClick={() => setReceipt(t)}><span className="flex justify-between gap-3"><span className="font-medium">{t.transaction_code}</span><span className="font-bold tabular-nums text-primary">{rupiah(t.total_amount)}</span></span><span className={`mt-1 block text-xs ${t.status === "cancelled" ? "text-accent" : "text-muted-foreground"}`}>{t.status === "completed" ? "Selesai" : `Dibatalkan · ${t.cancellation_reason}`}</span></button></article>)}</div>
    </section>
    {receipt && <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-5" role="dialog" aria-modal="true" aria-label={`Struk ${receipt.transaction_code}`}><section className="w-full max-w-md rounded-md border border-border bg-card p-6 print:border-0 print:bg-background"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-2xl">SOHO<span className="text-primary">BARBER</span></h2><p className="mt-2 text-xs text-muted-foreground">{receipt.transaction_code}<br />{new Date(receipt.created_at).toLocaleString("id-ID")}</p></div><Button size="icon" variant="ghost" aria-label="Tutup struk" onClick={() => setReceipt(null)}><X /></Button></div><div className="my-5 border-y border-border py-4">{receipt.transaction_items.map((item, i) => <div key={i} className="mb-2 flex justify-between gap-3 text-sm"><span>{item.item_name} × {item.quantity}</span><span>{rupiah(Number(item.line_total))}</span></div>)}</div><dl className="space-y-2 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{rupiah(receipt.subtotal)}</dd></div><div className="flex justify-between"><dt>Diskon</dt><dd>− {rupiah(receipt.discount_amount)}</dd></div><div className="flex justify-between font-bold"><dt>Total</dt><dd>{rupiah(receipt.total_amount)}</dd></div><div className="flex justify-between"><dt>DP</dt><dd>− {rupiah(receipt.deposit_applied)}</dd></div><div className="flex justify-between"><dt>Dibayar di kasir</dt><dd>{rupiah(receipt.amount_paid - receipt.deposit_applied)}</dd></div></dl>{receipt.cancellation_reason && <p className="mt-4 text-sm text-accent">Dibatalkan: {receipt.cancellation_reason}</p>}<div className="mt-6 flex flex-wrap gap-2 print:hidden"><Button variant="outline" onClick={() => window.print()}><Printer />Cetak</Button><Button variant="outline" onClick={() => shareReceipt(receipt)}><Share2 />Bagikan</Button>{receipt.status === "completed" && <Button variant="ghost" className="text-accent" disabled={busy} onClick={() => cancelTransaction(receipt)}>Batalkan transaksi</Button>}</div></section></div>}
  </div>;
}

function receiptText(t: Transaction) {
  return [`SOHOBARBER`, t.transaction_code, ...t.transaction_items.map(i => `${i.item_name} x${i.quantity}: ${rupiah(Number(i.line_total))}`), `Total: ${rupiah(t.total_amount)}`, `DP: ${rupiah(t.deposit_applied)}`, `Sisa: ${rupiah(t.total_amount - t.deposit_applied)}`].join("\n");
}
