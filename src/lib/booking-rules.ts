import { z } from "zod";

export const OPEN_MINUTES = 10 * 60;
export const CLOSE_MINUTES = 22 * 60;
export const DEPOSIT_PERCENT = 50;
export const PAYMENT_WINDOW_MINUTES = 30;
export const CANCELLATION_WINDOW_HOURS = 2;
export const BOOKING_RULES = "DP 50%. Batalkan minimal 2 jam sebelum jadwal agar DP dikembalikan. Terlambat lebih dari 15 menit: slot diberikan ke pelanggan lain atau DP hangus.";
/** Booking statuses that still occupy a barber's time. */
export const BLOCKING_STATUSES = ["pending_payment", "pending_verification", "confirmed", "checked_in", "in_service"] as const;

export const toMinutes = (t: string) => { const [h = "0", m = "0"] = t.split(":"); return Number(h) * 60 + Number(m); };
export const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const depositFor = (price: number, percent = DEPOSIT_PERCENT) => Math.ceil((price * percent) / 100);
export const paymentDeadline = (createdAt: string) => new Date(new Date(createdAt).getTime() + PAYMENT_WINDOW_MINUTES * 60_000);
export const isPaymentExpired = (createdAt: string, now = new Date()) => now > paymentDeadline(createdAt);
export const cancellationRefundEligible = (bookingDate: string, startTime: string, timezone: string, now: Date, fromZonedTime: (value: string, zone: string) => Date) =>
  fromZonedTime(`${bookingDate}T${startTime}`, timezone).getTime() - now.getTime() >= CANCELLATION_WINDOW_HOURS * 3_600_000;

type Range = { start_time: string; end_time: string };
export const overlaps = (aStart: number, aEnd: number, b: Range) => aStart < toMinutes(b.end_time) && toMinutes(b.start_time) < aEnd;

/** Start times every `duration` minutes inside opening hours that fit fully and do not clash. */
export function availableSlots(duration: number, busy: Range[], earliest = 0, open = OPEN_MINUTES, close = CLOSE_MINUTES): string[] {
  const slots: string[] = [];
  for (let s = open; s + duration <= close; s += duration) {
    if (s < earliest) continue;
    if (busy.some(b => overlaps(s, s + duration, b))) continue;
    slots.push(toTime(s));
  }
  return slots;
}

export const bookingInput = z.object({
  serviceId: z.string().uuid(),
  barberId: z.union([z.string().uuid(), z.literal("any")]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2, "Nama wajib diisi.").max(100),
  phone: z.string().trim().regex(/^\+?\d[\d\s-]{7,18}$/, "Nomor WhatsApp tidak valid."),
  paymentMethod: z.enum(["bank_transfer", "qris", "dana"]),
  address: z.string().trim().max(300).optional(),
  note: z.string().trim().max(300).optional(),
  website: z.string().max(0).optional(),
});
export type BookingInput = z.infer<typeof bookingInput>;

export async function validProofImage(file: File): Promise<boolean> {
  if (file.size <= 0 || file.size > 2 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(file.type)) return false;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const png = pngSignature.every((byte, index) => bytes[index] === byte);
  return jpeg || png;
}
