import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cashierTransactionInput, transactionTotals } from "@/lib/cashier-rules";

async function cashierOrThrow(context: { supabase: any; userId: string }) {
  const { activeStaff } = await import("@/lib/staff.server");
  const profile = await activeStaff(context.supabase, context.userId, ["owner", "cashier"]);
  if (!profile) throw new Error("Hanya OWNER atau Kasir aktif yang dapat menggunakan kasir.");
  return profile;
}
async function admin() { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); return supabaseAdmin; }

export const getCashierWorkspace = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await cashierOrThrow(context);
    const db = await admin();
    const [services, products, barbers, bookings, transactions] = await Promise.all([
      db.from("services").select("id, name, price, duration_minutes").eq("is_active", true).order("name"),
      db.from("products").select("id, name, price, stock").eq("is_active", true).order("name"),
      db.from("employees").select("id, full_name").eq("is_active", true).order("full_name"),
      db.from("bookings").select("id, booking_code, customer_name, service_price, deposit_paid, status, services(name), employees(full_name)").in("status", ["confirmed", "checked_in", "in_service"]).order("booking_date").order("start_time").limit(50),
      db.from("transactions").select("id, transaction_code, subtotal, discount_amount, total_amount, deposit_applied, amount_paid, status, cancellation_reason, created_at, transaction_items(item_name, quantity, unit_price, line_total)").order("created_at", { ascending: false }).limit(25),
    ]);
    for (const result of [services, products, barbers, bookings, transactions]) if (result.error) { console.error("cashier workspace", result.error); throw new Error("Data kasir tidak dapat dimuat."); }
    return {
      profile,
      services: (services.data ?? []).map(s => ({ ...s, price: Number(s.price) })),
      products: (products.data ?? []).map(p => ({ ...p, price: Number(p.price) })),
      barbers: barbers.data ?? [],
      bookings: (bookings.data ?? []).map(b => ({ ...b, service_price: Number(b.service_price), deposit_paid: Number(b.deposit_paid) })),
      transactions: (transactions.data ?? []).map(t => ({ ...t, subtotal: Number(t.subtotal), discount_amount: Number(t.discount_amount), total_amount: Number(t.total_amount), deposit_applied: Number(t.deposit_applied), amount_paid: Number(t.amount_paid) })),
    };
  });

export const createCashierTransaction = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(cashierTransactionInput)
  .handler(async ({ context, data }) => {
    const profile = await cashierOrThrow(context);
    const db = await admin();
    let serviceId = data.serviceId;
    let barberId = data.barberId ?? null;
    let customerId: string | null = null;
    let depositPaid = 0;
    let expectedPrice: number | null = null;
    if (data.bookingId) {
      const booking = await db.from("bookings").select("id, customer_id, customer_name, service_id, barber_id, service_price, deposit_paid, status").eq("id", data.bookingId).in("status", ["confirmed", "checked_in", "in_service"]).maybeSingle();
      if (booking.error || !booking.data) throw new Error("Booking tidak dapat diproses di kasir.");
      if (booking.data.service_id !== data.serviceId) throw new Error("Layanan tidak sesuai dengan booking.");
      serviceId = booking.data.service_id; barberId = booking.data.barber_id; customerId = booking.data.customer_id;
      depositPaid = Number(booking.data.deposit_paid); expectedPrice = Number(booking.data.service_price);
    }
    const service = await db.from("services").select("id, name, price").eq("id", serviceId).eq("is_active", true).maybeSingle();
    if (service.error || !service.data) throw new Error("Layanan tidak tersedia.");
    if (expectedPrice !== null && Number(service.data.price) !== expectedPrice) throw new Error("Harga layanan berubah. Muat ulang kasir sebelum melanjutkan.");
    let product: { id: string; name: string; price: number; stock: number } | null = null;
    if (data.productId && data.productQuantity > 0) {
      const result = await db.from("products").select("id, name, price, stock").eq("id", data.productId).eq("is_active", true).maybeSingle();
      if (result.error || !result.data) throw new Error("Produk tidak tersedia.");
      if (result.data.stock < data.productQuantity) throw new Error("Stok produk tidak mencukupi.");
      product = { ...result.data, price: Number(result.data.price) };
    }
    const totals = transactionTotals(Number(service.data.price), product?.price ?? 0, product ? data.productQuantity : 0, data.discount, depositPaid);
    if (data.amountPaid < totals.remaining) throw new Error(`Pembayaran kurang. Sisa yang harus dibayar ${totals.remaining}.`);
    if (barberId) {
      const barber = await db.from("employees").select("id").eq("id", barberId).eq("is_active", true).maybeSingle();
      if (barber.error || !barber.data) throw new Error("Barber tidak aktif.");
    }
    const code = `TRX-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const inserted = await db.from("transactions").insert({
      transaction_code: code, booking_id: data.bookingId ?? null, customer_id: customerId, barber_id: barberId, cashier_id: profile.id,
      subtotal: totals.subtotal, discount_amount: data.discount, total_amount: totals.total,
      deposit_applied: totals.depositApplied, amount_paid: totals.depositApplied + data.amountPaid, status: "completed",
    }).select("id").single();
    if (inserted.error) { console.error("create transaction", inserted.error); throw new Error("Transaksi tidak dapat disimpan."); }
    const transactionId = inserted.data.id;
    const items = [
      { transaction_id: transactionId, service_id: serviceId, product_id: null, item_name: service.data.name, quantity: 1, unit_price: Number(service.data.price), line_total: Number(service.data.price) },
      ...(product ? [{ transaction_id: transactionId, service_id: null, product_id: product.id, item_name: product.name, quantity: data.productQuantity, unit_price: product.price, line_total: product.price * data.productQuantity }] : []),
    ];
    const itemResult = await db.from("transaction_items").insert(items);
    if (itemResult.error) {
      await db.from("transactions").update({ status: "cancelled", cancelled_by: profile.id, cancellation_reason: "Item transaksi gagal disimpan" }).eq("id", transactionId);
      throw new Error("Item transaksi tidak dapat disimpan.");
    }
    if (product) {
      const stock = await db.from("products").update({ stock: product.stock - data.productQuantity }, { count: "exact" }).eq("id", product.id).eq("stock", product.stock);
      if (stock.error || !stock.count) {
        await db.from("transactions").update({ status: "cancelled", cancelled_by: profile.id, cancellation_reason: "Stok berubah saat transaksi" }).eq("id", transactionId);
        throw new Error("Stok berubah saat transaksi. Silakan muat ulang dan coba lagi.");
      }
    }
    const payment = await db.from("payments").insert({ booking_id: data.bookingId ?? null, transaction_id: transactionId, amount: data.amountPaid, payment_method: data.paymentMethod, payment_status: "verified", verified_by: profile.id, verified_at: new Date().toISOString() });
    if (payment.error) {
      await db.from("transactions").update({ status: "cancelled", cancelled_by: profile.id, cancellation_reason: "Pembayaran gagal dicatat" }).eq("id", transactionId);
      throw new Error("Pembayaran tidak dapat dicatat. Transaksi dibatalkan.");
    }
    if (data.bookingId) await db.from("bookings").update({ status: "completed" }).eq("id", data.bookingId);
    return { id: transactionId, code, ...totals, paid: data.amountPaid, change: data.amountPaid - totals.remaining };
  });

export const cancelCashierTransaction = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ transactionId: z.string().uuid(), reason: z.string().trim().min(3, "Alasan pembatalan wajib diisi.").max(300) }))
  .handler(async ({ context, data }) => {
    const profile = await cashierOrThrow(context);
    const db = await admin();
    const updated = await db.from("transactions").update({ status: "cancelled", cancelled_by: profile.id, cancellation_reason: data.reason }, { count: "exact" }).eq("id", data.transactionId).eq("status", "completed");
    if (updated.error || !updated.count) throw new Error("Transaksi tidak dapat dibatalkan atau sudah dibatalkan.");
    const items = await db.from("transaction_items").select("product_id, quantity").eq("transaction_id", data.transactionId);
    if (!items.error) {
      for (const item of items.data) {
        if (!item.product_id) continue;
        for (let attempt = 0; attempt < 3; attempt++) {
          const product = await db.from("products").select("stock").eq("id", item.product_id).maybeSingle();
          if (product.error || !product.data) break;
          const restored = await db.from("products").update({ stock: product.data.stock + item.quantity }, { count: "exact" }).eq("id", item.product_id).eq("stock", product.data.stock);
          if (!restored.error && restored.count) break;
        }
      }
    }
    return { ok: true };
  });
