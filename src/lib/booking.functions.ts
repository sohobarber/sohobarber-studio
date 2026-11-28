import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { availableSlots, BLOCKING_STATUSES, bookingInput, cancellationRefundEligible, depositFor, isPaymentExpired, overlaps, paymentDeadline, toMinutes, toTime, validProofImage } from "@/lib/booking-rules";

// Public booking endpoints expose only safe columns. All table access is validated here;
// browser clients still cannot read the OWNER-only booking tables directly.
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
type Db = Awaited<ReturnType<typeof admin>>;
const isHomeService = (name: string) => /home\s*service/i.test(name);

async function settings(db: Db) {
  const r = await db.from("business_settings").select("opening_time, closing_time, deposit_percent, timezone").eq("id", 1).maybeSingle();
  if (r.error) throw new Error("Pengaturan booking tidak dapat dimuat.");
  return {
    open: toMinutes(r.data?.opening_time ?? "10:00"), close: toMinutes(r.data?.closing_time ?? "22:00"),
    depositPercent: Number(r.data?.deposit_percent ?? 50), timezone: r.data?.timezone ?? "Asia/Jakarta",
  };
}

async function expireUnpaid(db: Db) {
  const cutoff = new Date(Date.now() - 30 * 60_000).toISOString();
  const { error } = await db.from("bookings").update({ status: "cancelled", cancellation_reason: "Batas bayar 30 menit terlampaui" })
    .eq("status", "pending_payment").lt("created_at", cutoff);
  if (error) console.error("expireUnpaid", error.code);
}

export const getBookingOptions = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  await expireUnpaid(db);
  const [s, e, config] = await Promise.all([
    db.from("services").select("id, name, price, duration_minutes, description").eq("is_active", true).order("price"),
    db.from("employees").select("id, full_name").eq("is_active", true).order("full_name"),
    settings(db),
  ]);
  if (s.error || e.error) { console.error("booking options", s.error?.message, e.error?.message); throw new Error("Data booking tidak dapat dimuat."); }
  return {
    services: s.data.map(x => ({ ...x, price: Number(x.price), homeService: isHomeService(x.name) })),
    barbers: e.data,
    today: formatInTimeZone(new Date(), config.timezone, "yyyy-MM-dd"),
    depositPercent: config.depositPercent,
    openingTime: toTime(config.open), closingTime: toTime(config.close),
  };
});

async function slotsFor(db: Db, serviceId: string, barberId: string, date: string) {
  const config = await settings(db);
  const [svc, closed] = await Promise.all([
    db.from("services").select("id, name, price, duration_minutes").eq("id", serviceId).eq("is_active", true).maybeSingle(),
    db.from("closed_dates").select("id").eq("closed_date", date).limit(1),
  ]);
  if (svc.error || closed.error) throw new Error("Jadwal tidak dapat dimuat.");
  if (!svc.data) throw new Error("Layanan tidak tersedia.");
  const barbersQuery = db.from("employees").select("id, full_name").eq("is_active", true).order("full_name");
  const barbersResult = barberId === "any" ? await barbersQuery : await barbersQuery.eq("id", barberId).limit(1);
  if (barbersResult.error) throw new Error("Barber tidak dapat dimuat.");
  if (!barbersResult.data.length) throw new Error("Barber tidak tersedia.");
  const barberIds = barbersResult.data.map(b => b.id);
  const today = formatInTimeZone(new Date(), config.timezone, "yyyy-MM-dd");
  if (date < today || closed.data.length) return { service: svc.data, config, barbers: barbersResult.data, slotsByBarber: {} as Record<string, string[]> };
  const [busy, schedules] = await Promise.all([
    db.from("bookings").select("barber_id, start_time, end_time").in("barber_id", barberIds).eq("booking_date", date).in("status", [...BLOCKING_STATUSES]),
    db.from("barber_schedules").select("employee_id, start_time, end_time, is_available").in("employee_id", barberIds).eq("work_date", date),
  ]);
  if (busy.error || schedules.error) throw new Error("Jadwal tidak dapat dimuat.");
  const earliest = date === today ? toMinutes(formatInTimeZone(new Date(), config.timezone, "HH:mm")) + 1 : 0;
  const slotsByBarber: Record<string, string[]> = {};
  for (const id of barberIds) {
    const blocked = [...busy.data.filter(x => x.barber_id === id), ...schedules.data.filter(x => x.employee_id === id && !x.is_available)];
    slotsByBarber[id] = availableSlots(svc.data.duration_minutes, blocked, earliest, config.open, config.close);
  }
  return { service: svc.data, config, barbers: barbersResult.data, slotsByBarber };
}

export const getAvailableSlots = createServerFn({ method: "POST" })
  .inputValidator(z.object({ serviceId: z.string().uuid(), barberId: z.union([z.string().uuid(), z.literal("any")]), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
  .handler(async ({ data }) => {
    const db = await admin();
    await expireUnpaid(db);
    const result = await slotsFor(db, data.serviceId, data.barberId, data.date);
    return [...new Set(Object.values(result.slotsByBarber).flat())].sort();
  });

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator(bookingInput)
  .handler(async ({ data }) => {
    if (data.website) throw new Error("Booking tidak dapat diproses.");
    const db = await admin();
    await expireUnpaid(db);
    const { service, config, barbers, slotsByBarber } = await slotsFor(db, data.serviceId, data.barberId, data.date);
    const selectedBarber = barbers.find(b => slotsByBarber[b.id]?.includes(data.time));
    if (!selectedBarber) throw new Error("Jam ini sudah tidak tersedia. Silakan pilih jam lain.");
    const home = isHomeService(service.name);
    if (home && !data.address) throw new Error("Alamat wajib diisi untuk Home Service.");
    const price = Number(service.price);
    const start = toMinutes(data.time);
    const end = start + service.duration_minutes;
    const deposit = depositFor(price, config.depositPercent);

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
      service_id: service.id, barber_id: selectedBarber.id, booking_date: data.date,
      start_time: toTime(start), end_time: toTime(end), duration_minutes: service.duration_minutes,
      service_price: price, deposit_required: deposit, deposit_paid: 0,
      status: "pending_payment", booking_source: "online", special_request: request,
    }).select("id, created_at").single();
    if (b.error) throw new Error("Booking tidak dapat disimpan.");

    // Re-check after insert; the earlier of two racing bookings keeps the slot.
    const clash = await db.from("bookings").select("id, start_time, end_time, created_at").eq("barber_id", selectedBarber.id).eq("booking_date", data.date).in("status", [...BLOCKING_STATUSES]).neq("id", b.data.id);
    if (clash.error || clash.data.some(x => overlaps(start, end, x) && x.created_at <= b.data.created_at)) {
      await db.from("bookings").update({ status: "cancelled", cancellation_reason: "Bentrok jadwal otomatis" }).eq("id", b.data.id);
      throw new Error("Jam ini baru saja dipesan orang lain. Silakan pilih jam lain.");
    }
    const p = await db.from("payments").insert({ booking_id: b.data.id, amount: deposit, payment_method: data.paymentMethod, payment_status: "pending" });
    if (p.error) { console.error("deposit payment record failed", p.error.code); throw new Error("Booking tersimpan, tetapi catatan DP gagal dibuat. Hubungi SOHOBARBER dengan kode booking Anda."); }
    return { id: b.data.id, code, deposit, price, date: data.date, time: toTime(start), service: service.name, deadline: paymentDeadline(b.data.created_at).toISOString() };
  });

const bookingIdInput = z.object({ bookingId: z.string().uuid() });

async function publicBooking(db: Db, bookingId: string) {
  const r = await db.from("bookings").select("id, booking_code, customer_name, booking_date, start_time, end_time, service_price, deposit_required, deposit_paid, status, cancellation_reason, created_at, services(name), employees(full_name)").eq("id", bookingId).maybeSingle();
  if (r.error) throw new Error("Status booking tidak dapat dimuat.");
  if (!r.data) throw new Error("Booking tidak ditemukan.");
  if (r.data.status === "pending_payment" && isPaymentExpired(r.data.created_at)) {
    await db.from("bookings").update({ status: "cancelled", cancellation_reason: "Batas bayar 30 menit terlampaui" }).eq("id", bookingId).eq("status", "pending_payment");
    r.data.status = "cancelled";
    r.data.cancellation_reason = "Batas bayar 30 menit terlampaui";
  }
  const payment = await db.from("payments").select("payment_status, payment_method, amount, created_at").eq("booking_id", bookingId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (payment.error) throw new Error("Status pembayaran tidak dapat dimuat.");
  const config = await settings(db);
  return {
    id: r.data.id, code: r.data.booking_code, name: r.data.customer_name, date: r.data.booking_date,
    time: r.data.start_time.slice(0, 5), endTime: r.data.end_time.slice(0, 5), service: r.data.services?.name ?? "—",
    barber: r.data.employees?.full_name ?? "—", price: Number(r.data.service_price), deposit: Number(r.data.deposit_required),
    depositPaid: Number(r.data.deposit_paid), status: r.data.status, cancellationReason: r.data.cancellation_reason,
    paymentStatus: payment.data?.payment_status ?? null, paymentMethod: payment.data?.payment_method ?? null,
    deadline: paymentDeadline(r.data.created_at).toISOString(), timezone: config.timezone,
  };
}

export const getBookingStatus = createServerFn({ method: "POST" }).inputValidator(bookingIdInput)
  .handler(async ({ data }) => publicBooking(await admin(), data.bookingId));

export const uploadBookingProof = createServerFn({ method: "POST" })
  .inputValidator((input: FormData) => {
    if (!(input instanceof FormData)) throw new Error("Berkas tidak valid.");
    return input;
  })
  .handler(async ({ data }) => {
    const bookingId = String(data.get("bookingId") ?? "");
    if (!z.string().uuid().safeParse(bookingId).success || String(data.get("website") ?? "")) throw new Error("Permintaan tidak valid.");
    const file = data.get("proof");
    if (!(file instanceof File) || !(await validProofImage(file))) throw new Error("Bukti harus berupa JPG atau PNG asli, maksimal 2 MB.");
    const db = await admin();
    const booking = await db.from("bookings").select("id, status, created_at").eq("id", bookingId).maybeSingle();
    if (booking.error || !booking.data) throw new Error("Booking tidak ditemukan.");
    if (booking.data.status !== "pending_payment") throw new Error("Bukti hanya dapat diunggah saat booking menunggu DP atau bukti sebelumnya ditolak.");
    if (isPaymentExpired(booking.data.created_at)) {
      await db.from("bookings").update({ status: "cancelled", cancellation_reason: "Batas bayar 30 menit terlampaui" }).eq("id", bookingId).eq("status", "pending_payment");
      throw new Error("Batas pembayaran 30 menit telah berakhir. Silakan buat booking baru.");
    }
    const extension = file.type === "image/png" ? "png" : "jpg";
    const path = `${bookingId}/${crypto.randomUUID()}.${extension}`;
    const upload = await db.storage.from("payment-proofs").upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) { console.error("proof upload", upload.error.message); throw new Error("Bukti tidak dapat diunggah. Silakan coba lagi."); }
    const latest = await db.from("payments").select("id, payment_status").eq("booking_id", bookingId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (latest.error || !latest.data) throw new Error("Catatan pembayaran tidak ditemukan. Hubungi SOHOBARBER.");
    if (latest.data.payment_status !== "pending" && latest.data.payment_status !== "rejected") throw new Error("Pembayaran ini sudah diproses. Hubungi SOHOBARBER.");
    const payment = await db.from("payments").update({ payment_status: "waiting_verification", proof_url: path, verified_by: null, verified_at: null }).eq("id", latest.data.id);
    if (payment.error) throw new Error("Status pembayaran tidak dapat disimpan. Hubungi SOHOBARBER.");
    const updated = await db.from("bookings").update({ status: "pending_verification" }).eq("id", bookingId).eq("status", "pending_payment");
    if (updated.error) throw new Error("Status booking tidak dapat diperbarui. Hubungi SOHOBARBER.");
    return { ok: true };
  });

export const cancelOwnBooking = createServerFn({ method: "POST" }).inputValidator(bookingIdInput)
  .handler(async ({ data }) => {
    const db = await admin();
    const r = await db.from("bookings").select("id, booking_date, start_time, status, deposit_paid").eq("id", data.bookingId).maybeSingle();
    if (r.error || !r.data) throw new Error("Booking tidak ditemukan.");
    if (!["pending_payment", "pending_verification", "confirmed"].includes(r.data.status)) throw new Error("Booking ini tidak dapat dibatalkan lagi.");
    const config = await settings(db);
    const refundable = Number(r.data.deposit_paid) > 0 && cancellationRefundEligible(r.data.booking_date, r.data.start_time, config.timezone, new Date(), fromZonedTime);
    const reason = refundable ? "Dibatalkan pelanggan; DP layak dikembalikan manual" : Number(r.data.deposit_paid) > 0 ? "Dibatalkan pelanggan kurang dari 2 jam; DP hangus" : "Dibatalkan pelanggan";
    const updated = await db.from("bookings").update({ status: "cancelled", cancellation_reason: reason }).eq("id", data.bookingId).in("status", ["pending_payment", "pending_verification", "confirmed"]);
    if (updated.error) throw new Error("Booking tidak dapat dibatalkan.");
    return { ok: true, refundable };
  });
