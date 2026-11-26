import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { getLoginProfile } from "@/lib/profile.functions";
import { canAccessOwnerDashboard, loginErrorMessage } from "@/lib/owner-access";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Masuk — SOHOBARBER" },
      { name: "description", content: "Masuk ke sistem manajemen barbershop SOHOBARBER." },
      { property: "og:title", content: "Masuk — SOHOBARBER" },
      { property: "og:description", content: "Masuk ke sistem manajemen barbershop SOHOBARBER." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);
  const navigate = useNavigate();
  const fetchProfile = useServerFn(getLoginProfile);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user || cancelled) return;
        setSignedIn(true);
        const profile = await fetchProfile();
        if (cancelled) return;
        if (canAccessOwnerDashboard(profile)) await navigate({ to: "/owner", replace: true });
        else setMsg({ type: "error", text: profile ? "Akun Anda tidak memiliki akses dashboard OWNER." : "Profil pengguna tidak ditemukan. Hubungi pemilik barbershop." });
      } catch {
        if (!cancelled) setMsg({ type: "error", text: "Profil pengguna tidak dapat dimuat. Silakan coba lagi." });
      }
    }
    void restoreSession();
    return () => { cancelled = true; };
  }, [fetchProfile, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setMsg({ type: "error", text: loginErrorMessage(error) });
        return;
      }
      if (!data.user || !data.session) {
        setMsg({ type: "error", text: "Sesi login tidak tersedia. Silakan coba lagi." });
        return;
      }
      setSignedIn(true);
      const profile = await fetchProfile();
      if (!profile) {
        setMsg({ type: "error", text: "Profil pengguna tidak ditemukan. Hubungi pemilik barbershop." });
        return;
      }
      if (!canAccessOwnerDashboard(profile)) {
        setMsg({ type: "error", text: "Akun Anda tidak memiliki akses dashboard OWNER." });
        return;
      }
      await navigate({ to: "/owner", replace: true });
    } catch {
      setMsg({ type: "error", text: "Koneksi atau profil pengguna tidak dapat dimuat. Silakan coba lagi." });
    } finally { setLoading(false); }
  }

  async function signOut() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSignedIn(false);
      setMsg(null);
      setPassword("");
    } catch {
      setMsg({ type: "error", text: "Tidak dapat keluar. Silakan coba lagi." });
    } finally { setLoading(false); }
  }

  const input =
    "w-full rounded-sm border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:shadow-glow";

  return (
    <main className="grid-bg flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">
            SOHO<span className="text-primary">BARBER</span>
          </h1>
          <div className="mx-auto mt-3 h-1 w-16 bg-brand-gradient" />
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">Barbershop Management</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 rounded-md border border-border bg-card p-6 sm:p-8">
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" className={input} />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Password</label>
            <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={input} />
          </div>
          {msg && (
            <p role="alert" className={`text-sm ${msg.type === "error" ? "text-accent" : "text-primary"}`}>{msg.text}</p>
          )}
          <Button type="submit" disabled={loading} className="h-12 w-full rounded-sm font-bold uppercase tracking-widest transition hover:shadow-glow">
            {loading ? "Memproses..." : "Masuk"}
          </Button>
          {signedIn && <Button type="button" variant="outline" disabled={loading} onClick={signOut} className="w-full">Keluar</Button>}
          {!isSupabaseConfigured && (
            <p className="text-center text-xs text-muted-foreground">Menunggu koneksi ke Supabase.</p>
          )}
        </form>
        <p className="mt-8 text-center text-xs text-muted-foreground"><Link to="/booking" className="text-primary hover:underline">Booking sebagai pelanggan</Link> · © SOHOBARBER</p>
      </div>
    </main>
  );
}
