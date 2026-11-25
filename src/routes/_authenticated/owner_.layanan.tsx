import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Check, Pencil, Plus, Scissors, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { OwnerShell, OwnerError, OwnerNotFound } from "@/components/owner-shell";
import { createService, listServices, setServiceActive, updateService } from "@/lib/services.functions";
import { dashboardHead, rupiah } from "@/lib/dashboard-data";
import { parsePrice, serviceInput } from "@/lib/service-rules";

export const Route = createFileRoute("/_authenticated/owner_/layanan")({
  loader: async () => {
    const data = await listServices();
    if (!data) throw redirect({ to: "/" });
    return data;
  },
  head: () => dashboardHead("Master Layanan"),
  errorComponent: OwnerError,
  notFoundComponent: OwnerNotFound,
  pendingComponent: () => <main className="min-h-screen bg-background p-8"><p className="text-muted-foreground">Memuat layanan…</p></main>,
  component: ServicesPage,
});

type Service = { id: string; name: string; price: number; duration_minutes: number; is_active: boolean };

function validate(name: string, priceText: string) {
  const r = serviceInput.safeParse({ name, price: parsePrice(priceText) });
  return r.success ? { data: r.data } : { error: r.error.issues[0]?.message ?? "Data tidak valid." };
}

function ServicesPage() {
  const { profile, services } = Route.useLoaderData();
  const router = useRouter();
  const create = useServerFn(createService);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    const v = validate(name, price);
    if (!v.data) return setError(v.error ?? "Data tidak valid.");
    setBusy(true); setError("");
    try { await create({ data: v.data }); setName(""); setPrice(""); await router.invalidate({ sync: true }); }
    catch (err) { setError(err instanceof Error ? err.message : "Layanan tidak dapat disimpan."); }
    finally { setBusy(false); }
  }

  return <OwnerShell profile={profile} active="layanan">
    <div className="mb-8 flex items-end justify-between gap-3">
      <div><p className="mb-2 text-xs font-bold uppercase text-primary">OWNER WORKSPACE</p><h1 className="font-display text-3xl sm:text-4xl">Master Layanan</h1></div>
      <p className="text-sm text-muted-foreground">{services.length} layanan</p>
    </div>
    <form onSubmit={add} className="mb-8 grid gap-3 border border-border bg-card p-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
      <label className="grid gap-2 text-xs font-bold uppercase text-muted-foreground">Nama layanan<Input value={name} onChange={e => setName(e.target.value)} placeholder="Nama layanan" maxLength={100} /></label>
      <label className="grid gap-2 text-xs font-bold uppercase text-muted-foreground">Harga (Rp)<Input value={price} onChange={e => setPrice(e.target.value)} inputMode="numeric" placeholder="0" /></label>
      <Button type="submit" disabled={busy}><Plus />Tambah</Button>
      {error && <p role="alert" className="text-sm text-accent sm:col-span-3">{error}</p>}
    </form>
    <section className="border-y border-border">
      {services.length === 0
        ? <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-muted-foreground"><Scissors className="size-9" /><p>Belum ada layanan.</p></div>
        : services.map(s => <ServiceRow key={s.id} service={s} />)}
    </section>
    <p className="mt-4 text-xs text-muted-foreground">Layanan tidak dapat dihapus agar riwayat transaksi tetap utuh. Nonaktifkan layanan yang tidak lagi dipakai.</p>
  </OwnerShell>;
}

function ServiceRow({ service }: { service: Service }) {
  const router = useRouter();
  const update = useServerFn(updateService);
  const toggle = useServerFn(setServiceActive);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(service.name);
  const [price, setPrice] = useState(String(service.price));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await fn(); await router.invalidate({ sync: true }); return true; }
    catch (err) { setError(err instanceof Error ? err.message : "Perubahan gagal."); return false; }
    finally { setBusy(false); }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    const v = validate(name, price);
    if (!v.data) return setError(v.error ?? "Data tidak valid.");
    if (await run(() => update({ data: { id: service.id, ...v.data } }))) setEditing(false);
  }

  return <article className={`border-b border-border py-5 last:border-b-0 ${service.is_active ? "" : "opacity-60"}`}>
    {editing
      ? <form onSubmit={save} className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-center">
          <Input aria-label="Nama layanan" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
          <Input aria-label="Harga" value={price} onChange={e => setPrice(e.target.value)} inputMode="numeric" />
          <div className="flex gap-2"><Button type="submit" size="icon" disabled={busy} aria-label="Simpan"><Check /></Button><Button type="button" size="icon" variant="outline" aria-label="Batal" onClick={() => { setEditing(false); setName(service.name); setPrice(String(service.price)); setError(""); }}><X /></Button></div>
        </form>
      : <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0"><h2 className="break-words font-medium">{service.name}</h2><p className="mt-1 text-xs text-muted-foreground">{service.duration_minutes} menit · <span className={service.is_active ? "text-primary" : "text-accent"}>{service.is_active ? "Aktif" : "Nonaktif"}</span></p></div>
          <div className="flex items-center gap-4">
            <p className="text-sm font-bold tabular-nums text-primary">{rupiah(service.price)}</p>
            <Switch checked={service.is_active} disabled={busy} aria-label={service.is_active ? "Nonaktifkan layanan" : "Aktifkan layanan"} onCheckedChange={checked => run(() => toggle({ data: { id: service.id, is_active: checked } }))} />
             <Button size="icon" variant="ghost" disabled={busy} aria-label="Ubah layanan" onClick={() => { setName(service.name); setPrice(String(service.price)); setError(""); setEditing(true); }}><Pencil /></Button>
          </div>
        </div>}
    {error && <p role="alert" className="mt-2 text-sm text-accent">{error}</p>}
  </article>;
}
