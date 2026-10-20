// String /transparansi (S21). Angka biaya AI dari ledger D1; biaya tetap ditulis tangan di sini.
export const transparencyText = {
  pageTitle: "Transparansi biaya",
  heading: "Transparansi biaya",
  lead: "Surau nirlaba, tanpa iklan dan tanpa paywall. Halaman ini menampilkan berapa biaya yang dipakai untuk menjalankannya.",
  aiHeading: "Biaya AI untuk Tanya",
  aiLead:
    "Dihitung otomatis dari catatan biaya setiap pertanyaan (tanpa teks pertanyaan). Bila anggaran bulanan habis, Tanya berhenti sampai bulan berikutnya dan Cari tetap berjalan.",
  period: "Bulan",
  questions: "Pertanyaan berbiaya",
  cost: "Biaya AI",
  cap: "Plafon",
  estimatedNote: (usd: string) => `termasuk ${usd} perkiraan (biaya pasti tidak diketahui)`,
  cachedNote:
    "Jawaban yang diambil dari jawaban tersimpan tidak memakai biaya AI dan tidak dihitung di sini.",
  fixedHeading: "Biaya tetap",
  fixed: [
    { item: "Cloudflare Workers (hosting situs, MCP, dan Tanya)", cost: "US$5 per bulan" },
    { item: "Database D1, Turnstile, AI Gateway", cost: "termasuk paket di atas atau gratis" },
    { item: "Domain surau.org", cost: "biaya registrasi tahunan" },
  ],
  principlesHeading: "Prinsip",
  principles: [
    "Tanpa iklan, tanpa paywall, dan tanpa menjual data. Konten kitab berlisensi CC BY-NC-SA 4.0 (nonkomersial).",
    "Pertanyaan tidak dipakai untuk melatih model AI.",
    "Kode sumber terbuka di GitHub.",
  ],
  supportHeading: "Cara mendukung",
  support:
    "Surau belum membuka donasi. Anda bisa membantu dengan melaporkan kesalahan teks atau jawaban, berkontribusi lewat GitHub, dan memperkenalkan Surau kepada yang membutuhkan.",
  source: "Kode sumber di GitHub",
  updated: "Angka bulan berjalan berubah setiap ada pertanyaan baru.",
} as const;
