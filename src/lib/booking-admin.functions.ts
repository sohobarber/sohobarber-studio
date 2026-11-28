import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ownerOrThrow(context: { supabase: any; userId: string }) {
  const { activeOwner } = await import("@/lib/owner.server");
  const profile = await activeOwner(context.supabase, context.userId);
  if (!profile) throw new Error("Hanya OWNER aktif yang dapat mengelola booking.");
  return profile;
}

export const listOwnerBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await ownerOrThrow(context);
    const result = await context.supabase.from("bookings")
      .select("id, booking_code, customer_name, customer_phone, booking_date, start_time, service_price, deposit_required, deposit_paid, status, cancellation_reason, special_request, created_at, services(name), employees(full_name)")
      .order("created_at", { ascending: false }).limit(100);
    if (result.error) throw new Error("Booking tidak dapat dimuat.");
    const ids = result.data.map((b: { id: string }) => b.id);
    const payments = ids.length ? await context.supabase.from("payments").select("id, booking_id, amount, payment_method, payment_status, proof_url, created_at").in("booking_id", ids).order("created_at", { ascending: false }) : { data: [], error: null };
    if (payments.error) throw new Error("Pembayaran DP tidak dapat dimuat.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = await Promise.all(result.data.map(async (b: any) => {
      const payment = payments.data.find((p: { booking_id: string | null }) => p.booking_id === b.id) ?? null;
      let proofUrl: string | null = null;
      if (payment?.proof_url) {
        const signed = await supabaseAdmin.storage.from("payment-proofs").createSignedUrl(payment.proof_url, 300);
        if (!signed.error) proofUrl = signed.data.signedUrl;
      }
      return {
        id: b.id as string, code: b.booking_code as string, name: b.customer_name as string, phone: b.customer_phone as string,
        date: b.booking_date as string, time: (b.start_time as string).slice(0, 5), service: b.services?.name ?? "—",
        barber: b.employees?.full_name ?? "—", price: Number(b.service_price), deposit: Number(b.deposit_required), depositPaid: Number(b.deposit_paid),
        status: b.status as string, cancellationReason: b.cancellation_reason as string | null, request: b.special_request as string | null,
        paymentStatus: payment?.payment_status ?? null, paymentMethod: payment?.payment_method ?? null, proofUrl,
      };
    }));
    return { profile, rows };
  });

export const reviewBookingDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ bookingId: z.string().uuid(), decision: z.enum(["approve", "reject"]) }))
  .handler(async ({ context, data }) => {
    await ownerOrThrow(context);
    const booking = await context.supabase.from("bookings").select("id, status").eq("id", data.bookingId).eq("status", "pending_verification").maybeSingle();
    if (booking.error || !booking.data) throw new Error("Booking tidak lagi menunggu verifikasi.");
    const payment = await context.supabase.from("payments").select("id, amount, payment_status").eq("booking_id", data.bookingId).eq("payment_status", "waiting_verification").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (payment.error || !payment.data) throw new Error("Bukti pembayaran tidak ditemukan.");
    const approved = data.decision === "approve";
    const paymentUpdate = await context.supabase.from("payments").update({
      payment_status: approved ? "verified" : "rejected", verified_by: context.userId, verified_at: new Date().toISOString(),
    }).eq("id", payment.data.id).eq("payment_status", "waiting_verification");
    if (paymentUpdate.error) throw new Error("Status DP tidak dapat disimpan.");
    const bookingUpdate = await context.supabase.from("bookings").update({
      status: approved ? "confirmed" : "pending_payment", deposit_paid: approved ? Number(payment.data.amount) : 0,
    }).eq("id", data.bookingId).eq("status", "pending_verification");
    if (bookingUpdate.error) throw new Error("Status booking tidak dapat disimpan.");
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId, action: approved ? "dp_approved" : "dp_rejected", table_name: "bookings", record_id: data.bookingId,
      details: { payment_id: payment.data.id, amount: Number(payment.data.amount) },
    });
    return { ok: true };
  });
