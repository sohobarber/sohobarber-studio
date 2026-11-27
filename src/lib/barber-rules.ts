import { z } from "zod";

export const barberInput = z.object({
  full_name: z.string().trim().min(1, "Nama barber wajib diisi.").max(100, "Nama barber maksimal 100 karakter."),
  phone: z.string().trim().max(30, "Nomor HP maksimal 30 karakter.").regex(/^[0-9+\-\s]*$/, "Nomor HP hanya boleh berisi angka.").optional().transform(v => (v ? v : null)),
});

export const FIRST_BARBER_NAME = "SOHO BARBERSHOP";
