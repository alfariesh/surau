// Bagian `id.search` dari kamus UI (src/i18n/id.ts), dipisah per bagian (X09) supaya komponen
// klien hanya membawa string yang dipakainya.

export const search = {
  pageTitle: "Cari",
  metaDescription:
    "Cari kata Indonesia atau Arab di kitab Ihya 'Ulum ad-Din: hasil per halaman cetak dengan teks Arab asli, terjemahan AI berlabel, dan tautan ke pembaca.",
  heading: "Cari di kitab",
  lead: "Kata Indonesia dicari di terjemahan dan ringkasan AI, kata Arab di teks aslinya.",
  inputLabel: "Kata yang dicari",
  placeholder: "mis. sabar, adab murid kepada guru, الصبر",
  submit: "Cari",
  // Jembatan ke Maknaz di hasil Cari (ADR-087): kata yang sama dikirim sebagai pertanyaan.
  askBefore: "Tanyakan",
  askAfter: "ke Maknaz",
  askHint: "Jawaban disusun AI dari paragraf kitab, dengan kutipan Arab yang diperiksa kode.",
  askQuestion: (q: string) => `Apa yang dikatakan kitab tentang ${q}?`,
  examplesLabel: "Contoh:",
  examples: ["sabar", "niat", "adab murid kepada guru", "cinta kedudukan", "الصبر", "التوكل"],
  loading: "Mencari…",
  resultsHeading: "Hasil pencarian",
  soonHeading: "Pencarian sedang disiapkan",
  soonBody:
    "Data kitab versi baru (dengan indeks pencarian dan terjemahan) belum dipasang di situs ini. Sementara itu, kitab tetap bisa dibaca dari menu Kitab.",
  summary: (pages: number, hits: number) => `${pages} halaman · ${hits} paragraf`,
  shownPages: (pages: number) => `${pages} halaman ditampilkan`,
  summaryFused:
    "Diurutkan menurut kecocokan gabungan teks Arab, terjemahan AI, dan ringkasan bagian (100 paragraf teratas per jalur).",
  pageLabel: (label: string) => `Halaman ${label}`,
  openInReader: "Buka di pembaca",
  moreOnPage: (n: number) => `${n} paragraf cocok lainnya di halaman ini`,
  openSection: "Buka bagian",
  matchedBy: {
    arabic: "teks Arab",
    translation: "terjemahan AI",
    summary: "ringkasan bagian",
  },
  matchedByLabel: "Cocok di",
  partialMatch: "sebagian kata",
  ayahPlaceholder: (ref: string) => `QS ${ref}`,
  ayahPlaceholderHint: "Kutipan ayat: terjemahannya (Kemenag) tampil di pembaca",
  commonTerms:
    "Semua kata yang Anda cari sangat umum (misalnya الله), jadi hasil tidak diurutkan menurut relevansi dan hanya kemunculan pertama yang tampil. Tambahkan kata yang lebih khusus.",
  commonTermsIgnored:
    "Kata Arab dalam pencarian Anda sangat umum sehingga tidak ikut dicari; hasil berasal dari kata Indonesianya.",
  emptyHeading: "Tidak ada hasil",
  emptyTips: [
    "Periksa ejaannya, atau pakai bentuk dasar katanya (sabar, bukan kesabarannya).",
    "Coba kata Arabnya, misalnya الصبر untuk sabar.",
    "Kurangi jumlah kata yang dicari.",
    "Hapus filter bagian kitab.",
  ],
  idleHeading: "Mulai mencari",
  idleBody:
    "Hasil berupa halaman cetak kitab: teks Arab asli dengan kata yang cocok disorot, terjemahan AI berlabel, dan tautan ke paragrafnya di pembaca.",
  loadMore: "Muat lebih banyak",
  errorRate: "Terlalu banyak pencarian dalam waktu singkat. Coba lagi sebentar lagi.",
  errorUnavailable: "Pencarian belum tersedia untuk versi data ini. Coba lagi nanti.",
  errorInvalid: "Kata yang dicari terlalu panjang atau tidak bisa diproses.",
  errorGeneric: "Pencarian gagal. Coba lagi.",
  retry: "Coba lagi",
  palettePlaceholder: "Cari kata Indonesia atau Arab…",
  paletteHint: "Tekan Enter untuk mencari di seluruh kitab",
  paletteOpen: "Cari",
  paletteLabel: "Palet pencarian",
  paletteGo: (q: string) => `Cari “${q}”`,
  paletteExamples: "Contoh pencarian",
} as const;
