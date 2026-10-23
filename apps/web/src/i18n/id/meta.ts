// Bagian `id.meta` dari kamus UI (src/i18n/id.ts), dipisah per bagian (X09) supaya komponen
// klien hanya membawa string yang dipakainya.

export const meta = {
  siteName: "Surau",
  // Sama dengan src/app/opengraph-image.alt.txt (berkas itu dibaca Next untuk segmen root).
  ogImageAlt:
    "Ilustrasi garis kitab terbuka di atas rehal, dengan tulisan Surau: Kitab klasik, bisa ditelusuri.",
  title: "Surau · Asisten riset kitab klasik Islam",
  description:
    "Surau membantu Anda menemukan, membaca, dan memahami kitab-kitab klasik Islam dalam bahasa Indonesia. Setiap jawaban bisa ditelusuri ke teks aslinya. Nirlaba dan open source.",
} as const;
