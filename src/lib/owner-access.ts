export type LoginProfile = {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

export function canAccessOwnerDashboard(profile: LoginProfile | null): boolean {
  return profile?.role === "owner";
}

export function loginErrorMessage(error: { code?: string | undefined; status?: number | undefined }): string {
  if (error.code === "invalid_credentials") return "Email atau password salah. Silakan coba lagi.";
  if (error.code === "email_not_confirmed") return "Email belum dikonfirmasi. Periksa email Anda terlebih dahulu.";
  if (error.status === 429) return "Terlalu banyak percobaan masuk. Tunggu beberapa saat lalu coba lagi.";
  return "Tidak dapat masuk. Periksa koneksi internet Anda dan coba lagi.";
}