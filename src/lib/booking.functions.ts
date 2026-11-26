import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";
import { availableSlots, BLOCKING_STATUSES, bookingInput, depositFor, overlaps, toMinutes, toTime } from "@/lib/booking-rules";

// Public booking endpoints. Tables are OWNER-only under RLS, so these handlers use the
// server admin client but only expose safe columns and validate every write themselves.
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function timezone(db: Awaited<ReturnType<typeof admin>>) {
  const r = await db.from("business_settings").select("timezone").eq("id", 1).maybeSingle();
  return r.data?.timezone ?? "Asia/Jakarta";
}
const isHomeService = (name: string) => /home\s*service/i.test(name);

export const getBookingOptions = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const [s, e, tz] = await Promise.all([
    db.from("services").select("id, name, price, duration_minutes, description").eq("is_active", true).order("price"),
    db.from("employees").select("id, full_name").eq("is_active", true).order("full_name"),
    timezone(db),
  ]);
  if (s.error || e.error) { console.error("booking options", s.error?.message, e.error?.message); throw new Error("Data booking tidak dapat dimuat."); }
  return {
    services: s.data.map(x => ({ ...x, price: Number(x.price), homeService: isHomeService(x.name) })),
    barbers: e.data,
    today: formatInTimeZone(new Date(), tz, "yyyy-MM-dd"),
  };
});

async function slotsFor(db: Awaited<ReturnType<typeof admin>>, serviceId: string, barberId: string, date: string) {
  const [svc, barber, closed, busy, sched, tz] = await Promise.all([
    db.from("services").select("id, name, price, duration_minutes").eq("id", serviceId).eq("is_active", true).maybeSingle(),
    db.from("employees").select("id").eq("id", barberId).eq("is_active", true).maybeSingle(),
    db.from("closed_dates").select("id").eq("closed_date", date).limit(1),
    db.from("bookings").select("start_time, end_time").eq("barber_id", barberId).eq("booking_date", date).in("status", [...BLOCKING_STATUSES]),
    db.from("barber_schedules").select("start_time, end_time, is_available").eq("employee_id", barberId).eq("work_date", date),
    timezone(db),
  ]);
  if (svc.error || barber.error || closed.error || busy.error || sched.error) throw new Error("Jadwal tidak dapat dimuat.");
  if (!svc.data || !barber.data) throw new Error("Layanan atau barber tidak tersedia.");
  const today = formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
  if (date < today || closed.data.length) return { service: svc.data, slots: [] as string[] };
  const earliest = date === today ? toMinutes(formatInTimeZone(new Date(), tz, "HH:mm")) + 1 : 0;
  const blocked = [...busy.data, ...sched.data.filter(x => !x.is_available)];
  return { service: svc.data, slots: availableSlots(svc.data.duration_minutes, blocked, earliest) };
}

export const getAvailableSlots = createServerFn({ method: "POST" })
  .inputValidator(z.object({ serviceId: z.string().uuid(), barberId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(async ({ data }) => (await slotsFor(await admin(), data.serviceId, data.barberId, data.date)).slots);

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator(bookingInput)
  .handler(async ({ data }) => {
    const db = await admin();
    const { service, slots } = await slotsFor(db, data.serviceId, data.barberId, data.date);
    if (!slots.includes(data.time)) throw new Error("Jam ini sudah tidak tersedia. Silakan pilih jam lain.");
    const home = isHomeService(service.name);
    if (home && !data.address) throw new Error("Alamat wajib diisi untuk Home Service.");
    const price = Number(service.price);
    const start = toMinutes(data.time);
    const end = start + service.duration_minutes;

    let customerId: string;
    const existing = await db.from("customers").select("id").eq("phone", data.phone).limit(1).maybeSingle();
    if (existing.error) throw new Error("Booking tidak dapat disimpan.");
    if (existing.data) customerId = existing.data.id;
    else {
      const c = await db.from("customers").insert({ full_name: data.name, phone: data.phone }).select("id").single();
      if (c.error) throw new Error("Booking tidak dapat disimpan.");
      customerId = c.data.id;
    }

    const code = `SB-${data.date.replace(/-/g, "").slice(2)}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const request = [home ? `HOME SERVICE — Alamat: ${data.address}` : "", data.note ?? ""].filter(Boolean).join("\n") || null;
    const b = await db.from("bookings").insert({
      booking_code: code, customer_id: customerId, customer_name: data.name, customer_phone: data.phone,
      service_id: service.id, barber_id: data.barberId, booking_date: data.date,
      start_time: toTime(start), end_time: toTime(end), duration_minutes: service.duration_minutes,
      service_price: price, deposit_required: depositFor(price), deposit_paid: 0,
      status: "pending_verification", booking_source: "online", special_request: request,
    }).select("id").single();
    if (b.error) throw new Error("Booking tidak dapat disimpan.");

    // Re-check after insert to catch two customers taking the same slot at once.
    const clash = await db.from("bookings").select("id, start_time, end_time, created_at").eq("barber_id", data.barberId).eq("booking_date", data.date).in("status", [...BLOCKING_STATUSES]).neq("id", b.data.id);
    const mine = await db.from("bookings").select("created_at").eq("id", b.data.id).single();
    if (clash.error || mine.error || clash.data.some(x => overlaps(start, end, x) && x.created_at <= mine.data.created_at)) {
      await db.from("bookings").update({ status: "cancelled", cancellation_reason: "Bentrok jadwal otomatis" }).eq("id", b.data.id);
      throw new Error("Jam ini baru saja dipesan orang lain. Silakan pilih jam lain.");
    }

    const p = await db.from("payments").insert({ booking_id: b.data.id, amount: depositFor(price), payment_method: data.paymentMethod, payment_status: "waiting_verification" });
    if (p.error) console.error("deposit payment record failed", p.error.code);
    return { code, deposit: depositFor(price), price, date: data.date, time: toTime(start), service: service.name };
  });
