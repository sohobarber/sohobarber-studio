import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CashierWorkspace } from "@/components/cashier-workspace";
import { getCashierWorkspace } from "@/lib/cashier.functions";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/kasir")({
  loader: () => getCashierWorkspace(),
  head: () => ({ meta: [
    { title: "Kasir — SOHOBARBER" }, { name: "description", content: "Transaksi layanan, produk, DP, dan struk kasir SOHOBARBER." },
    { property: "og:title", content: "Kasir — SOHOBARBER" }, { property: "og:description", content: "Kasir SOHOBARBER." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CashierPortal,
});

function CashierPortal() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();
  return <main className="min-h-screen bg-background px-5 py-6 text-foreground sm:px-8"><header className="mx-auto mb-8 flex max-w-7xl items-center justify-between gap-4 border-b border-border pb-5"><div><p className="font-display text-2xl">SOHO<span className="text-primary">BARBER</span></p><p className="mt-1 text-xs text-muted-foreground">Kasir · {data.profile.full_name}</p></div><Button variant="outline" onClick={async () => { await supabase.auth.signOut(); await navigate({ to: "/" }); }}><LogOut />Keluar</Button></header><div className="mx-auto max-w-7xl"><CashierWorkspace data={data} /></div></main>;
}
