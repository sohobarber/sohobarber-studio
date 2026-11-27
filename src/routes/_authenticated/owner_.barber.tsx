import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Check, Pencil, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { OwnerShell, OwnerError, OwnerNotFound } from "@/components/owner-shell";
import { createBarber, listBarbers, setBarberActive, updateBarber } from "@/lib/barbers.functions";
import { dashboardHead } from "@/lib/dashboard-data";
import { barberInput, FIRST_BARBER_NAME } from "@/lib/barber-rules";

export const Route = createFileRoute("/_authenticated/owner_/barber")({
  loader: async () => {
    const data = await listBarbers();
    if (!data) throw redirect({ to: "/" });
    return data;
  },
  head: () => dashboardHead("Barber"),
  errorComponent: OwnerError,
  notFoundComponent: OwnerNotFound,
  pendingComponent: () => <main className="min-h-screen bg-background p-8"><p className="text-muted-foreground">Memuat barber…</p></main>,
  component: BarbersPage,
});

type Barber = { id: string; full_name: string; phone: string | null; employee_code: string | null; is_active: boolean };

function validate(full_name: string, phone: string) {
  const r = barberInput.safeParse({ full_name, phone });
  return r.success ? { data: r.data } : { error: r.error.issues[0]?.message ?? "Data tidak valid." };
}

function BarbersPage() {
  const { profile, barbers } = Route.useLoaderData();
  const router = useRouter();
  const create = useServerFn(createBarber);
  const [name, setName] = useState(barbers.length === 0 ? FIRST_BARBER_NAME : "");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    const v = validate(name, phone);
    if (!v.data) return setError(v.error ?? "Data tidak valid.");
    setBusy(true); setError("");
    try { await create({ data: { full_name: name, phone } }); setName(""); setPhone(""); await router.invalidate({ sync: true }); }
    catch (err) { setError(err instanceof Error ? err.message : "Barber tidak dapat disimpan."); }
    finally { setBusy(false); }
  }

  return <OwnerShell profile={profile} active="barber">
    <div className="mb-8 flex items-end justify-between gap-3">
      <div><p className="mb-2 text-xs font-bold uppercase text-primary">OWNER WORKSPACE</p><h1 className="font-display text-3xl sm:text-4xl">Barber</h1></div>
      <p className="text-sm text-muted-foreground">{barbers.length} barber</p>
    </div>
    <form onSubmit={add} className="mb-8 grid gap-3 border border-border bg-card p-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
      <label className="grid gap-2 text-xs font-bold uppercase text-muted-foreground">Nama barber<Input value={name} onChange={e => setName(e.target.value)} placeholder="Nama barber" maxLength={100} /></label>
      <label className="grid gap-2 text-xs font-bold uppercase text-muted-foreground">No. HP (opsional)<Input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="08…" maxLength={30} /></label>
      <Button type="submit" disabled={busy}><Plus />Tambah Barber</Button>
      {error && <p role="alert" className="text-sm text-accent sm:col-span-3">{error}</p>}
    </form>
    <section className="border-y border-border">
      {barbers.length === 0
        ? <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-muted-foreground"><Users className="size-9" /><p>Belum ada barber.</p></div>
        : barbers.map(b => <BarberRow key={b.id} barber={b} />)}
    </section>
    <p className="mt-4 text-xs text-muted-foreground">Barber aktif tampil di halaman booking pelanggan. Barber tidak dihapus agar riwayat booking dan transaksi tetap utuh.</p>
  </OwnerShell>;
}

function BarberRow({ barber }: { barber: Barber }) {
  const router = useRouter();
  const update = useServerFn(updateBarber);
  const toggle = useServerFn(setBarberActive);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(barber.full_name);
  const [phone, setPhone] = useState(barber.phone ?? "");
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
    const v = validate(name, phone);
    if (!v.data) return setError(v.error ?? "Data tidak valid.");
    if (await run(() => update({ data: { id: barber.id, full_name: name, phone } }))) setEditing(false);
  }

  return <article className={`border-b border-border py-5 last:border-b-0 ${barber.is_active ? "" : "opacity-60"}`}>
    {editing
      ? <form onSubmit={save} className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-center">
          <Input aria-label="Nama barber" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
          <Input aria-label="No. HP" value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" maxLength={30} />
          <div className="flex gap-2"><Button type="submit" size="icon" disabled={busy} aria-label="Simpan"><Check /></Button><Button type="button" size="icon" variant="outline" aria-label="Batal" onClick={() => { setEditing(false); setName(barber.full_name); setPhone(barber.phone ?? ""); setError(""); }}><X /></Button></div>
        </form>
      : <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0"><h2 className="break-words font-medium">{barber.full_name}</h2><p className="mt-1 text-xs text-muted-foreground">{barber.phone ?? "—"} · <span className={barber.is_active ? "text-primary" : "text-accent"}>{barber.is_active ? "Aktif" : "Nonaktif"}</span></p></div>
          <div className="flex shrink-0 items-center gap-3">
            <Switch checked={barber.is_active} disabled={busy} aria-label={barber.is_active ? "Nonaktifkan barber" : "Aktifkan barber"} onCheckedChange={checked => run(() => toggle({ data: { id: barber.id, is_active: checked } }))} />
            <Button size="icon" variant="ghost" disabled={busy} aria-label="Ubah barber" onClick={() => { setName(barber.full_name); setPhone(barber.phone ?? ""); setError(""); setEditing(true); }}><Pencil /></Button>
          </div>
        </div>}
    {error && <p role="alert" className="mt-2 text-sm text-accent">{error}</p>}
  </article>;
}
