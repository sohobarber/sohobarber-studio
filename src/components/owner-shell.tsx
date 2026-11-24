import { Link, useNavigate, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChartNoAxesCombined, ChevronRight, LayoutDashboard, LogOut, Package, RefreshCw, Scissors, Settings2, ShieldCheck, ShoppingBag, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { ownerSections, sectionLabels, type OwnerSection } from "@/lib/dashboard-data";
import type { LoginProfile } from "@/lib/owner-access";

const sectionIcons = { kasir: ShoppingBag, booking: CalendarDays, barber: Users, laporan: ChartNoAxesCombined, produk: Package, layanan: Scissors, pengaturan: Settings2 };

export function OwnerShell({ profile, active, children }: { profile: LoginProfile; active: "dashboard" | OwnerSection; children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setBusy(true);
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      const result = await supabase.auth.signOut();
      if (result.error) throw result.error;
      await navigate({ to: "/auth", replace: true });
    } catch { setError("Tidak dapat keluar. Silakan coba lagi."); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-border bg-sidebar lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-5 py-6 lg:px-6 lg:py-9">
          <Link to="/owner" className="font-display text-2xl" aria-label="SOHOBARBER dashboard">SOHO<span className="text-primary">BARBER</span></Link>
          <ShieldCheck className="size-5 text-primary lg:hidden" />
        </div>
        <div className="hidden px-6 pb-8 text-xs font-bold text-muted-foreground lg:block">OWNER WORKSPACE</div>
        <nav aria-label="Menu OWNER" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-6">
          <Button asChild variant="ghost" className={`h-11 shrink-0 justify-start px-3 lg:px-4 ${active === "dashboard" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
            <Link to="/owner"><LayoutDashboard />Dashboard</Link>
          </Button>
          {ownerSections.map(section => {
            const Icon = sectionIcons[section];
            return <Button key={section} asChild variant="ghost" className={`h-11 shrink-0 justify-start px-3 lg:px-4 ${active === section ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
              <Link to="/owner/$section" params={{ section }} search={{ page: 1 }}><Icon />{sectionLabels[section]}<ChevronRight className="ml-auto hidden opacity-40 lg:block" /></Link>
            </Button>;
          })}
        </nav>
        <div className="absolute bottom-8 hidden w-full max-w-[240px] px-6 lg:block">
          <div className="flex items-center gap-2 border-t border-border pt-6 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-primary" />SOHOBARBER · OWNER</div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-8 lg:px-10">
          <div className="min-w-0"><p className="truncate text-sm font-medium">{profile.full_name}</p><p className="mt-1 text-xs text-muted-foreground">Pemilik barbershop</p></div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="icon" variant="ghost" title="Muat ulang data" aria-label="Muat ulang data" disabled={busy} onClick={async () => { setBusy(true); try { await router.invalidate({ sync: true }); } finally { setBusy(false); } }}><RefreshCw className={busy ? "animate-spin motion-reduce:animate-none" : ""} /></Button>
            <Button variant="outline" disabled={busy} onClick={signOut}><LogOut /><span>Keluar</span></Button>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          {error && <p role="alert" className="mb-5 text-sm text-accent">{error}</p>}
          {children}
        </main>
      </div>
    </div>
  );
}

export function OwnerError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return <main className="flex min-h-screen items-center justify-center bg-background px-5"><div className="max-w-sm space-y-5"><h1 className="font-display text-2xl">Data tidak dapat dimuat</h1><p className="text-sm text-muted-foreground">Periksa koneksi Anda, lalu coba lagi.</p><div className="flex gap-3"><Button onClick={async () => { await router.invalidate(); reset(); }}><RefreshCw />Coba lagi</Button><Button asChild variant="outline"><Link to="/">Kembali</Link></Button></div></div></main>;
}

export function OwnerNotFound() {
  return <main className="p-8"><h1 className="font-display text-2xl">Halaman tidak ditemukan</h1><Button asChild variant="link"><Link to="/owner">Dashboard</Link></Button></main>;
}