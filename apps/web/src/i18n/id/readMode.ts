// Bagian `id.readMode` dari kamus UI: mode baca (X11, ADR-091) di panel Tampilan pembaca, menu ⋮
// navbar, dan Cari. Terpisah dari kamus pembaca supaya shell tidak membawa kamus itu (ADR-079).

export const readMode = {
  label: "Mode baca",
  options: { ar: "Arab", both: "Keduanya", tr: "Terjemahan" },
  /** Penjelasan mode terpilih, di bawah pilihan. */
  hints: {
    ar: "Hanya teks Arab kitab, tanpa terjemahan dan ringkasan AI.",
    both: "Teks Arab bersama terjemahan AI-nya.",
    tr: "Terjemahan AI sebagai teks utama; teks Arab tiap paragraf dibuka dengan satu ketukan.",
  },
  noTranslation: "Halaman ini belum punya terjemahan, jadi yang tampil teks Arab.",
  /** Kontrol terjemahan di panel Tampilan yang tidak berlaku di mode terpilih. */
  trControlsOff: "Ukuran dan tata letak terjemahan berlaku saat terjemahan tampil.",
  layoutOnlyBoth: "Tata letak terjemahan berlaku di mode Keduanya.",
} as const;
