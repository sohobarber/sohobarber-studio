import { z } from "zod";

export const serviceInput = z.object({
  name: z.string().trim().min(1, "Nama layanan wajib diisi.").max(100, "Nama layanan maksimal 100 karakter."),
  price: z.number({ message: "Harga harus berupa angka." }).int("Harga harus bilangan bulat.").min(0, "Harga tidak boleh negatif.").max(100_000_000, "Harga terlalu besar."),
});
export type ServiceInput = z.infer<typeof serviceInput>;

export function parsePrice(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits === "" ? Number.NaN : Number(digits);
}
