// Bagian `id.devBook` dari kamus UI (src/i18n/id.ts): halaman pratinjau mockup buku `/dev/buku`
// (hanya dev, tidak tayang di produksi).

export const devBook = {
  title: "Pratinjau buku",
  lead: "Semua variasi mockup buku dalam posisi terkunci, tanpa perlu hover. Hanya ada di mode dev.",
  empty: "Belum ada karya di database lokal. Isi D1 lokal dulu, lalu muat ulang halaman ini.",
  posesHeading: "Posisi",
  poses: {
    rest: "Diam",
    lifted: "Hover",
    side: "Sisi halaman",
    back: "Sampul belakang",
  },
  colorsHeading: "Warna sampul (hover)",
  directionHeading: "Arah (hover)",
  directions: { rtl: "Kanan ke kiri (kitab Arab)", ltr: "Kiri ke kanan" },
  sizesHeading: "Ukuran (hover)",
  size: (px: number) => `${px} px`,
  plainHeading: "Tanpa warna dan tanpa tekstur (hover)",
} as const;
