// Bagian `id.error` dari kamus UI (src/i18n/id.ts), dipisah per bagian (X09) supaya komponen
// klien hanya membawa string yang dipakainya.
// Galat tak terduga di luar /kitab (D1 gagal, timeout): (app)/error.tsx dan global-error.tsx.

export const error = {
  pageTitle: "Terjadi gangguan",
  heading: "Halaman gagal dimuat",
  body: "Terjadi gangguan saat memuat data. Coba muat ulang.",
  retry: "Coba lagi",
  home: "Kembali ke Beranda",
} as const;
