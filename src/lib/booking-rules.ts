import { z } from "zod";

export const OPEN_MINUTES = 10 * 60;
export const CLOSE_MINUTES = 22 * 60;
export const DEPOSIT_PERCENT = 50;
/** Booking statuses that still occupy a barber's time. */
export const BLOCKING_STATUSES = ["pending_payment", "pending_verification", "confirmed", "checked_in", "in_service"] as const;

export const toMinutes = (t: string) => { const [h = "0", m = "0"] = t.split(":"); return Number(h) * 60 + Number(m); };
export const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const depositFor = (price: number) => Math.ceil((price * DEPOSIT_PERCENT) / 100);

type Range = { start_time: string; end_time: string };
export const overlaps = (aStart: number, aEnd: number, b: Range) => aStart < toMinutes(b.end_time) && toMinutes(b.start_time) < aEnd;

/** Start times every `duration` minutes inside opening hours that fit fully and do not clash. */
export function availableSlots(duration: number, busy: Range[], earliest = 0): string[] {
  const slots: string[] = [];
  for (let s = OPEN_MINUTES; s + duration <= CLOSE_MINUTES; s += duration) {
    if (s < earliest) continue;
    if (busy.some(b => overlaps(s, s + duration, b))) continue;
    slots.push(toTime(s));
  }
  return slots;
}

export const bookingInput = z.object({
  serviceId: z.string().uuid(),
  barberId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2, "Nama wajib diisi.").max(100),
  phone: z.string().trim().regex(/^\+?\d[\d\s-]{7,18}$/, "Nomor WhatsApp tidak valid."),
  paymentMethod: z.enum(["bank_transfer", "qris"]),
  address: z.string().trim().max(300).optional(),
  note: z.string().trim().max(300).optional(),
});
export type BookingInput = z.infer<typeof bookingInput>;
