import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getOwnerProfile } from "@/lib/profile.functions";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/owner")({
  loader: async () => {
    const profile = await getOwnerProfile();
    if (!profile) throw redirect({ to: "/" });
    return profile;
  },
  head: () => ({ meta: [
    { title: "Dashboard OWNER — SOHOBARBER" },
    { name: "description", content: "Dashboard pemilik SOHOBARBER." },
    { property: "og:title", content: "Dashboard OWNER — SOHOBARBER" },
    { property: "og:description", content: "Dashboard pemilik SOHOBARBER." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: OwnerDashboard,
});

function OwnerDashboard() {
  const profile = Route.useLoaderData();
  const { queryClient } = Route.useRouteContext();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      const result = await supabase.auth.signOut();
      if (result.error) throw result.error;
      await navigate({ to: "/auth", replace: true });
    } catch {
      setError("Tidak dapat keluar. Silakan coba lagi.");
    } finally { setBusy(false); }
  }

  return (
    <main className="grid-bg min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-6">
          <p className="font-display text-2xl">SOHO<span className="text-primary">BARBER</span></p>
          <Button variant="outline" disabled={busy} onClick={signOut}><LogOut />{busy ? "Memproses..." : "Keluar"}</Button>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="mb-5 flex items-center gap-2 text-primary"><ShieldCheck className="size-5" /><span className="text-sm font-bold">OWNER</span></div>
        <h1 className="font-display text-3xl sm:text-4xl">Dashboard OWNER</h1>
        <p className="mt-5 break-words text-lg">Selamat datang, {profile.full_name}.</p>
        {error && <p role="alert" className="mt-5 text-accent">{error}</p>}
      </section>
    </main>
  );
}