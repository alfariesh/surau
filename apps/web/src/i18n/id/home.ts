// Bagian `id.home` dari kamus UI (src/i18n/id.ts), dipisah per bagian (X09) supaya komponen
// klien hanya membawa string yang dipakainya.

export const home = {
  heading: "Apa yang ingin Anda kaji?",
  shelfLabel:
    "Rak kitab Surau: seret, gulir, atau pakai panah untuk memutar; pilih buku terdepan untuk membukanya",
  shelfOf: "dari",
  // Kotak cari Beranda (ADR-086): satu kotak, dua cara (Cari biasa / Maknaz).
  searchLabel: "Cari di Surau",
  // Pemilih kitab (kiri kepala kotak cari). Kosong = semua kitab.
  sourceLabel: "Kitab yang dicari",
  sourceAll: "Semua kitab",
  sourceSearch: "Cari kitab",
  sourceEmpty: "Kitab tidak ditemukan",
  searchTooLong: (max: number) => `Kata yang dicari paling panjang ${max} huruf.`,
  askUseSearch: "Pakai Cari",
  modeLabel: "Cara mencari",
  modeSearch: "Cari",
  modeAsk: "Maknaz",
  searchPlaceholder: "Kata Indonesia atau Arab, mis. sabar, الصبر",
  examplesLabel: "Contoh",
  principlesHeading: "Tiga prinsip utama",
  principlesLead: "Yang dijaga Surau di setiap hasil, supaya Anda bisa memeriksanya sendiri.",
  principleNumber: (n: number) => `Prinsip ${n}`,
  // judul iframe ilustrasi (dekoratif, aria-hidden); tetap diisi supaya pemeriksa aksesibilitas tidak menandainya
  principleArtTitle: "Ilustrasi prinsip",
  principles: [
    {
      title: "Verbatim atau tidak sama sekali",
      body: "Teks Arab selalu disalin kode dari sumbernya, tidak pernah ditulis AI. Kutipan yang tidak cocok dengan sumber tidak ditampilkan.",
      art: "prinsip-verbatim",
    },
    {
      title: "Setiap klaim ada alamatnya",
      body: "Kitab, edisi, jilid, halaman cetak, dan tautan tetap ke bagian teksnya, supaya Anda bisa memeriksa sendiri.",
      art: "prinsip-alamat",
    },
    {
      title: "Atribusi, bukan fatwa",
      body: "Surau menyampaikan isi kitab beserta siapa yang mengatakannya. Keputusan hukum untuk kasus pribadi tetap di tangan ulama.",
      art: "prinsip-atribusi",
    },
  ],
} as const;
