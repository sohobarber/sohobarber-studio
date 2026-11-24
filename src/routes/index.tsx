import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!supabase) {
      setMsg({ type: "error", text: "Koneksi Supabase belum dikonfigurasi." });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    setMsg(error ? { type: "error", text: "Email atau password salah." } : { type: "ok", text: "Berhasil masuk." });
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
          <button type="submit" disabled={loading} className="w-full rounded-sm bg-primary py-3 font-bold uppercase tracking-widest text-primary-foreground transition hover:shadow-glow disabled:opacity-60">
            {loading ? "Memproses..." : "Masuk"}
          </button>
          {!isSupabaseConfigured && (
            <p className="text-center text-xs text-muted-foreground">Menunggu koneksi ke Supabase.</p>
          )}
        </form>
        <p className="mt-8 text-center text-xs text-muted-foreground">© SOHOBARBER</p>
      </div>
    </main>
  );
}
