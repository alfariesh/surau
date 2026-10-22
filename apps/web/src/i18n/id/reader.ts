// Bagian `id.reader` dari kamus UI (src/i18n/id.ts), dipisah per bagian (X09) supaya komponen
// klien hanya membawa string yang dipakainya.

export const reader = {
  listTitle: "Kitab",
  listHeading: "Kitab",
  listLead:
    "Kitab yang bisa dibaca di Surau. Teks Arab ditampilkan persis seperti sumber digitalnya, lengkap dengan alamat cetak (juz dan halaman) untuk dirujuk.",
  soonHeading: "Pembaca kitab segera hadir",
  soonBody:
    "Pembaca Ihya sedang disiapkan dan diperiksa sebelum dibuka untuk umum. Sementara itu, kenali dulu prinsip Surau.",
  soonCta: "Kenali Surau",
  by: "karya",
  editionsLabel: "Edisi",
  openWork: (title: string) => `Buka kitab ${title}`,
  startReading: "Mulai membaca",
  volumes: (n: number) => `${n} jilid`,
  deathHijri: (n: number) => `w. ${n} H`,
  publisherLabel: "Penerbit",
  licenseLabel: "Lisensi teks digital",
  attributionLabel: "Atribusi",
  tocHeading: "Daftar isi",
  tocLabel: "Daftar isi kitab",
  // Judul daftar isi Indonesia (X04 W8): satu label di kepala pohon untuk semua judul Indonesia.
  tocTitleBadge: "Terjemahan AI",
  tocTitleHint:
    "Judul Indonesia ini diterjemahkan otomatis oleh AI dari judul Arabnya; judul Arab adalah rujukannya.",
  tocTitleNote: (models: string, prompts: string, dates: string, review: string) =>
    `Judul Indonesia diterjemahkan AI (${models}, ${prompts}, ${dates}), ${review}; judul Arab di bawahnya adalah rujukannya.`,
  tocOpen: "Daftar isi",
  breadcrumbLabel: "Letak di kitab",
  pageHeading: (juz: number, page: number) => `Juz ${juz} · Halaman ${page}`,
  pageMetaTitle: (bab: string | null, title: string, juz: number, page: number) =>
    `${bab ? `${bab} · ` : ""}${title} j. ${juz} h. ${page}`,
  pageMetaDescription: (title: string, author: string | null, juz: number, page: number) =>
    `Baca ${title}${author ? ` karya ${author}` : ""}, juz ${juz} halaman ${page}: teks Arab asli beserta takhrij hadits, dengan sitasi dan tautan tetap.`,
  workMetaDescription: (title: string, author: string | null) =>
    `Baca ${title}${author ? ` karya ${author}` : ""} di Surau: teks Arab asli per halaman cetak, daftar isi, takhrij hadits, dan sitasi.`,
  textLabel: "Teks kitab",
  pageNavLabel: "Navigasi halaman",
  prevShort: "Sebelumnya",
  nextShort: "Berikutnya",
  pageShort: (juz: number, page: number) => `j.${juz} h.${page}`,
  keyboardHint: "Tombol panah ← → di papan ketik juga membalik halaman (arah kitab Arab).",
  jump: "Lompat",
  jumpHeading: "Lompat ke halaman",
  jumpJuz: "Juz",
  jumpPage: "Halaman",
  jumpGo: "Buka",
  copyCitation: "Salin sitasi",
  copied: "Sitasi disalin",
  copiedDescription: "Sitasi dan tautan tetap sudah ada di papan klip.",
  copyFailed: "Gagal menyalin",
  copyFailedDescription: "Browser menolak akses papan klip. Salin tautan dari bilah alamat.",
  fontSmaller: "Perkecil huruf Arab",
  fontLarger: "Perbesar huruf Arab",
  passageActions: "Aksi paragraf",
  copyPassage: "Salin sitasi paragraf",
  sharePassage: "Bagikan tautan paragraf",
  // Gulir bersambung (X04 W6): halaman cetak berikutnya dimuat di bawah halaman ini.
  continuedRegion: (juz: number, page: number) => `Halaman sambungan, juz ${juz} halaman ${page}`,
  loadingNext: "Memuat halaman berikutnya…",
  loadNext: "Muat halaman berikutnya",
  loadNextFailed: "Halaman berikutnya gagal dimuat.",
  loadNextRate: "Terlalu banyak permintaan dalam waktu singkat. Tunggu sebentar, lalu coba lagi.",
  loadNextRetry: "Coba lagi",
  // Posisi baca terakhir di browser ini (X04 W5).
  continueReading: "Lanjutkan membaca",
  continueWhere: (title: string, juz: number, page: number) =>
    `${title} · Juz ${juz} · Halaman ${page}`,
  linkCopied: "Tautan disalin",
  linkCopiedDescription: "Tautan paragraf sudah ada di papan klip.",
  reportPassage: "Laporkan kesalahan di paragraf ini",
  footnotesHeading: "Catatan kaki",
  footnoteHeading: (marker: string) => `Catatan kaki (${marker})`,
  footnoteGoto: "Lihat di daftar catatan kaki",
  footnoteBack: "Kembali ke teks",
  // Diawali label yang terlihat ("QS 27:90"), supaya perintah suara "klik QS 27:90" bekerja
  // (WCAG 2.5.3 Label in Name).
  ayahChipLabel: (short: string, label: string) =>
    `${short}: rujukan ayat ${label}, buka teks dan terjemahan Kemenag`,
  ayahPartial: "Kitab mengutip sebagian ayat ini.",
  ayahSimilar: "Lafaz di kitab sedikit berbeda ejaan dari teks mushaf.",
  ayahAlt: (n: number) => `Lafaz yang sama juga ada di ${n} tempat lain dalam Al-Qur'an.`,
  ayahTranslation: "Terjemahan Kemenag",
  ayahTranslationFull: "Terjemahan ayat lengkap (Kemenag)",
  ayahNoTranslation: "Terjemahan tidak tersedia.",
  ayahTextSource: "Teks ayat",
  ayahTranslationSource: "Terjemahan",
  ayahTransliterationSource: "Transliterasi",
  ayahTranslationAndTransliterationSource: "Terjemahan dan transliterasi",
  ayahKemenag: "Kementerian Agama RI",
  ayahAuto:
    "Rujukan dicocokkan otomatis ke teks mushaf, bukan oleh AI. Teks ayat, transliterasi, dan terjemahan ditampilkan tanpa diubah.",
  ayahOpenTanzil: "Buka ayat ini di Tanzil",
  quranNotice: "Ayat Al-Qur'an",
  quranNoticeText: "teks dari",
  quranNoticeTranslation: "terjemahan dan transliterasi dari",
  quranNoticeVerbatim: "Ditampilkan tanpa diubah; rujukan ayat dicocokkan otomatis.",
  needsReview: "perlu ditinjau",
  needsReviewReasons: {
    takhrij_inline: "Takhrij ini dipisahkan otomatis dari teks utama.",
    takhrij_boundary: "Batas antara teks utama dan takhrij ditentukan otomatis.",
    takhrij_unmatched: "Takhrij ini belum cocok dengan salinan pembanding (OpenITI JK000001).",
    inline_unsplit: "Paragraf ini mungkin masih bercampur dengan takhrij.",
    footnote_orphan: "Catatan kaki ini tidak dirujuk penanda di teks halaman ini.",
  },
  needsReviewNote:
    "Tanda “perlu ditinjau” berasal dari pemeriksaan otomatis saat impor, bukan hasil tinjauan. Teksnya tetap persis seperti sumber.",
  sourceHeading: "Sumber dan lisensi",
  licenseText: "teks lisensi",
  sourceDigital: "Materi sumber",
  modified:
    "Diolah Surau: teks dibagi per paragraf, catatan kaki takhrij dipisahkan dari teks utama, dan daftar isi diperbaiki lewat patch yang tercatat. Huruf teks Arab tidak diubah.",
  sourceShamela: "Halaman ini di al-Maktaba al-Shamela",
  licenseMoreShort: "Lisensi, atribusi, dan perubahan",
  licenseMore: "Lisensi dan atribusi lengkap",
  report: "Laporkan kesalahan",
  reportHeading: "Laporkan kesalahan",
  reportLead:
    "Laporan Anda membantu memperbaiki teks dan struktur kitab. Jangan menulis data pribadi; Surau tidak menyimpan nama, email, atau alamat IP.",
  reportPassageNote: (label: string) => `Paragraf: ${label}`,
  reportKind: "Jenis kesalahan",
  reportKinds: {
    text: "Teks (salah ketik, terpotong, bercampur)",
    translation: "Terjemahan atau ringkasan AI",
    citation: "Nomor halaman atau sitasi",
    toc: "Daftar isi atau judul bab",
    other: "Lainnya",
  },
  reportMessage: "Keterangan",
  reportMessageHint: "Maksimal 2.000 karakter.",
  reportHoneypot: "Jangan isi kolom ini",
  reportSubmit: "Kirim laporan",
  reportCancel: "Batal",
  reportSending: "Mengirim…",
  reportThanks: "Terima kasih, laporan Anda tersimpan.",
  reportErrorRate: "Terlalu banyak laporan dalam waktu singkat. Coba lagi sebentar lagi.",
  reportErrorInvalid: "Laporan belum lengkap atau terlalu panjang.",
  reportErrorGeneric: "Laporan gagal dikirim. Coba lagi nanti.",
  // Terjemahan dan ringkasan AI (S13, tampil sejak S14). Selalu berlabel (teks-arab.md aturan 8).
  aiTranslation: "Terjemahan AI",
  aiTranslationHint:
    "Diterjemahkan otomatis oleh AI dari teks Arab paragraf ini dan belum ditinjau manusia. Rujuk selalu teks Arabnya.",
  // Tinjauan manusia (X08, ADR-082): asal AI tetap disebut; nama dari daftar editor terdaftar.
  trChecked: (by: string) => `Terjemahan AI · diperiksa ${by}`,
  trCorrected: (by: string) => `Terjemahan AI · dikoreksi ${by}`,
  trCheckedDetail: (by: string, date: string) =>
    `Terjemahan AI ini diperiksa ${by} pada ${date} dan dinyatakan sesuai teks Arabnya.`,
  trCorrectedDetail: (by: string, date: string) =>
    `Terjemahan AI ini dikoreksi ${by} pada ${date}. Kata dalam kurung siku [ … ] adalah tambahan penerjemah.`,
  trReviewer: { ustadz: "ustadz", editor: "editor" },
  trAdded: "tambahan penerjemah, tidak ada di teks Arab",
  // Catatan di awal teks halaman (X04 W3), menggantikan baris label di setiap paragraf; lencana
  // "Terjemahan AI" per paragraf tetap ada.
  aiNoticeTitle: "Terjemahan Indonesia dibuat AI",
  aiNoticeBody:
    "Terjemahan di halaman ini dibuat AI dan belum ditinjau manusia, jadi bisa keliru. Teks Arab adalah rujukannya.",
  // Halaman yang sebagian terjemahannya sudah dikoreksi/diperiksa manusia (X10, ADR-082).
  aiNoticeBodyMixed:
    "Terjemahan berlabel “Terjemahan AI” tanpa keterangan dikoreksi atau diperiksa dibuat AI dan belum ditinjau manusia, jadi bisa keliru. Teks Arab adalah rujukannya.",
  aiNoticeMore: "Prinsip Surau",
  aiNoticeClose: "Tutup catatan terjemahan AI",
  aiSummary: "Ringkasan AI",
  summaryMore: "Baca selengkapnya",
  summaryLess: "Tutup ringkasan",
  aiReview: {
    ai_generated: "belum ditinjau manusia",
    reviewed: "sudah ditinjau",
    ustadz_verified: "diverifikasi ustadz",
    rejected: "ditolak peninjau",
  },
  aiMeta: (model: string, review: string) => `Dibuat ${model}, ${review}.`,
  ayahInTranslation: (label: string) => `${label} · Terjemahan Kemenag`,
  ayahInTranslationFull: (label: string) => `${label} · Terjemahan ayat lengkap (Kemenag)`,
  ayahInTranslationMissing: (label: string) => `${label} (terjemahan ayat tidak tersedia)`,
  translationToggle: "Tampilkan terjemahan AI",
  translationToggleHint: "Terjemahan Indonesia per paragraf, dibuat AI dan belum ditinjau.",
  // Panel Tampilan (ukuran, font Arab, kertas, jarak baris, terjemahan), disimpan per browser.
  toolbarLabel: "Alat baca",
  moreActions: "Aksi lain",
  style: "Tampilan",
  styleHeading: "Tampilan baca",
  styleFont: "Huruf Arab",
  styleFontSize: "Ukuran huruf",
  stylePaper: "Warna kertas",
  stylePapers: { light: "Terang", sepia: "Sepia", dark: "Gelap" },
  styleLeading: "Jarak baris",
  styleLeadings: { tight: "Rapat", normal: "Sedang", loose: "Longgar" },
  styleAlign: "Perataan teks",
  styleAligns: { auto: "Otomatis", justify: "Rata kanan-kiri", start: "Rata kanan" },
  styleAlignHint: "Otomatis: rata kanan-kiri di layar lebar, rata kanan di ponsel.",
  styleTrSize: "Ukuran terjemahan",
  styleTrLayout: "Tata letak terjemahan",
  styleTrLayouts: { interleave: "Di bawah paragraf", fold: "Dilipat", side: "Berdampingan" },
  styleTrLayoutHint:
    "Dilipat: ketuk Terjemahan AI di bawah paragraf untuk membukanya. Berdampingan hanya di layar lebar.",
  // Contoh huruf di panel Tampilan memakai paragraf pertama halaman ini (disalin dari DB).
  stylePreviewNote: "Contoh dari halaman ini",
  progressLabel: "Posisi baca di halaman ini",
  /** Catatan AI di kaki halaman (X10): menurut konten AI halaman itu (`PageModel.ai`). */
  aiFootNote: ({
    translation,
    summary,
    reviewed,
  }: {
    translation: boolean;
    summary: boolean;
    reviewed: boolean;
  }) =>
    !translation
      ? "Ringkasan AI belum ditinjau manusia dan bisa keliru; teks Arab tetap rujukan utamanya."
      : reviewed
        ? `Terjemahan AI tanpa keterangan dikoreksi atau diperiksa${summary ? " dan ringkasan AI" : ""} belum ditinjau manusia dan bisa keliru; teks Arab tetap rujukan utamanya.`
        : "Terjemahan dan ringkasan AI belum ditinjau manusia dan bisa keliru; teks Arab tetap rujukan utamanya.",
  errorHeading: "Halaman kitab gagal dimuat",
  errorBody: "Terjadi gangguan saat membaca data kitab. Coba muat ulang.",
  errorRetry: "Coba lagi",
} as const;
