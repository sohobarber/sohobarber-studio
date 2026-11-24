import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OwnerShell, OwnerError, OwnerNotFound } from "@/components/owner-shell";
import { getOwnerSection } from "@/lib/dashboard.functions";
import { dashboardHead, ownerSections, sectionLabels } from "@/lib/dashboard-data";

export const Route = createFileRoute("/_authenticated/owner_/$section")({
  validateSearch: (search: Record<string, unknown>) => ({ page: Math.max(1, Math.floor(Number(search['page']) || 1)) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ params, deps }) => {
    const section = z.enum(ownerSections).safeParse(params.section);
    if (!section.success) throw notFound();
    const data = await getOwnerSection({ data: { section: section.data, page: deps.page } });
    if (!data) throw redirect({ to: "/" });
    return { ...data, section: section.data };
  },
  head: ({ params }) => {
    const section = z.enum(ownerSections).safeParse(params.section);
    return dashboardHead(section.success ? sectionLabels[section.data] : "Menu OWNER");
  },
  errorComponent: OwnerError,
  notFoundComponent: OwnerNotFound,
  pendingComponent: () => <main className="min-h-screen bg-background p-8"><p className="text-muted-foreground">Memuat data…</p></main>,
  component: OwnerSectionPage,
});

function OwnerSectionPage() {
  const { profile, rows, count, section } = Route.useLoaderData();
  const { page } = Route.useSearch();
  const paginated = section !== "laporan" && section !== "pengaturan";
  return <OwnerShell profile={profile} active={section}>
    <div className="mb-8 flex items-end justify-between gap-3"><div><p className="mb-2 text-xs font-bold uppercase text-primary">OWNER WORKSPACE</p><h1 className="font-display text-3xl sm:text-4xl">{sectionLabels[section]}</h1></div>{paginated && <p className="text-sm text-muted-foreground">{count} {section === "booking" ? "booking" : "data"}</p>}</div>
    <section className="border-y border-border">
      {rows.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-muted-foreground"><Inbox className="size-9" /><p>Belum ada data.</p></div> : rows.map(row => <article key={row.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-5 last:border-b-0"><div className="min-w-0"><h2 className="break-words font-medium">{row.label}</h2>{row.detail && <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>}</div><p className="break-words text-sm font-bold tabular-nums text-primary">{row.value}</p></article>)}
    </section>
    {paginated && count > 25 && <nav aria-label="Halaman data" className="mt-6 flex items-center justify-between gap-3"><Button asChild variant="outline" disabled={page === 1}><Link to="/owner/$section" params={{ section }} search={{ page: Math.max(1, page - 1) }} aria-disabled={page === 1} className={page === 1 ? "pointer-events-none opacity-50" : ""}><ChevronLeft />Sebelumnya</Link></Button><span className="text-xs text-muted-foreground">{page} / {Math.ceil(count / 25)}</span><Button asChild variant="outline" disabled={page * 25 >= count}><Link to="/owner/$section" params={{ section }} search={{ page: page + 1 }} aria-disabled={page * 25 >= count} className={page * 25 >= count ? "pointer-events-none opacity-50" : ""}>Berikutnya<ChevronRight /></Link></Button></nav>}
  </OwnerShell>;
}