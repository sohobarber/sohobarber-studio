import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const ownerSections = ["kasir", "booking", "barber", "laporan", "produk", "layanan", "pengaturan"] as const;
export type OwnerSection = (typeof ownerSections)[number];
export const sectionLabels: Record<OwnerSection, string> = {
  kasir: "Kasir", booking: "Booking", barber: "Barber", laporan: "Laporan",
  produk: "Produk", layanan: "Layanan", pengaturan: "Pengaturan",
};

export function businessDay(now: Date, timezone: string) {
  const date = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const tomorrow = next.toISOString().slice(0, 10);
  return {
    date,
    start: fromZonedTime(`${date}T00:00:00`, timezone).toISOString(),
    end: fromZonedTime(`${tomorrow}T00:00:00`, timezone).toISOString(),
  };
}

export function completedRevenue(rows: { total_amount: number; status: string }[]) {
  return rows.filter(row => row.status === "completed").reduce((sum, row) => sum + Number(row.total_amount), 0);
}

export const rupiah = (amount: number) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
}).format(amount);

export function dashboardHead(title: string) {
  const description = `${title} pemilik SOHOBARBER.`;
  return { meta: [
    { title: `${title} — SOHOBARBER` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — SOHOBARBER` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] };
}