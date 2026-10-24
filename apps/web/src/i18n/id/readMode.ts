// Bagian `id.readMode` dari kamus UI: mode baca (X11, ADR-091) di panel Tampilan pembaca, menu ⋮
// navbar, dan Cari. Terpisah dari kamus pembaca supaya shell tidak membawa kamus itu (ADR-079).

export const readMode = {
  label: "Mode baca",
  options: { ar: "Arab", both: "Keduanya", tr: "Terjemahan" },
  /** Penjelasan mode terpilih, di bawah pilihan. */
  hints: {
    ar: "Hanya teks Arab kitab; terjemahan dan ringkasan AI tampil hanya bila cocok dengan kata cari.",
    both: "Teks Arab bersama terjemahan AI-nya.",
    tr: "Terjemahan AI sebagai teks utama; teks Arab tiap paragraf dibuka dengan satu ketukan.",
  },
  noTranslation: "Halaman ini belum punya terjemahan, jadi yang tampil teks Arab.",
  /** Pratinjau panel Tampilan di mode Arab, menggantikan contoh terjemahan. */
  previewNoTranslation: "Terjemahan AI tidak tampil di mode Arab.",
  /** Kontrol terjemahan di panel Tampilan yang tidak berlaku di mode terpilih. */
  trControlsOff: "Ukuran dan tata letak terjemahan berlaku saat terjemahan tampil.",
  layoutOnlyBoth: "Tata letak terjemahan berlaku di mode Keduanya.",
  // Mode Terjemahan di pembaca (bagian B).
  /** Tombol di awal paragraf yang membuka/menutup teks Arab paragraf itu. */
  arabicToggle: "Teks Arab",
  /** Paragraf yang belum punya terjemahan: teks Arabnya yang tampil. */
  noTranslationNote: "Paragraf ini belum diterjemahkan; teks Arabnya ditampilkan.",
  /** Tambahan catatan AI di awal teks, hanya di mode Terjemahan. */
  aiNoticeTr: "Teks Arab tiap paragraf tetap ada: ketuk Teks Arab untuk membukanya.",
  // Petunjuk sekali tampil di halaman baca (X14), bagi pengunjung yang belum memilih mode.
  hintTitle: "Pilih cara membaca",
  hintBody: "Berlaku di semua halaman dan bisa diganti kapan saja lewat tombol Tampilan.",
  hintClose: "Tutup petunjuk mode baca",
  /** Ringkasan AI yang dibuka sementara oleh kata cari di mode Arab (X14). */
  summaryPeekClose: "Sembunyikan lagi ringkasan AI ini",
} as const;
