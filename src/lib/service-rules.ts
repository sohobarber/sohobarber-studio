import { z } from "zod";

export const serviceInput = z.object({
  name: z.string().trim().min(1, "Nama layanan wajib diisi.").max(100, "Nama layanan maksimal 100 karakter."),
  price: z.number({ message: "Harga harus berupa angka." }).int("Harga harus bilangan bulat.").min(0, "Harga tidak boleh negatif.").max(100_000_000, "Harga terlalu besar."),
});
export type ServiceInput = z.infer<typeof serviceInput>;

type ServiceWriteError = { code: string; message: string; details?: string; constraint?: string };

export function isDuplicateServiceName(error: ServiceWriteError): boolean {
  return error.code === "23505" && (
    error.constraint === "services_name_key" ||
    /\bservices_name_key\b/.test(`${error.message} ${error.details ?? ""}`)
  );
}

export function serviceWriteErrorMessage(error: ServiceWriteError, fallback: string): string {
  return isDuplicateServiceName(error)
    ? "Nama layanan sudah digunakan. Silakan ubah layanan yang sudah ada."
    : fallback;
}

export function parsePrice(text: string): number {
  const digits = text.replace(/\D/g, "");
  return digits === "" ? Number.NaN : Number(digits);
}
