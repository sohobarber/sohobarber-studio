import { z } from "zod";

export const cashierTransactionInput = z.object({
  bookingId: z.string().uuid().optional(),
  serviceId: z.string().uuid(),
  barberId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  productQuantity: z.number().int().min(0).max(20),
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().max(20).optional(),
  discount: z.number().int().min(0).max(100_000_000),
  amountPaid: z.number().int().min(0).max(200_000_000),
  paymentMethod: z.enum(["cash", "qris", "bank_transfer"]),
});
export type CashierTransactionInput = z.infer<typeof cashierTransactionInput>;

export function transactionTotals(servicePrice: number, productPrice: number, quantity: number, discount: number, depositPaid: number) {
  const subtotal = servicePrice + productPrice * quantity;
  const total = Math.max(0, subtotal - discount);
  const depositApplied = Math.min(Math.max(0, depositPaid), total);
  return { subtotal, total, depositApplied, remaining: total - depositApplied };
}
