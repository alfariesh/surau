// Bagian `id.intisari` dari kamus UI: Intisari (X16, ADR-097 butir 7). Hub per karya, halaman
// Intisari Kitab/Bab, kartu ringkasan pembaca, lencana daftar isi, dan kartu Cari. Terpisah dari
// kamus pembaca supaya halaman baca tidak membawa string halaman Intisari (ADR-079).

/** "± 3 menit" (pembulatan ke atas dari core, minimal 1). */
const minutes = (n: number) => `± ${n} menit`;

export const intisari = {
  name: "Intisari",
  /** Lencana label AI di semua tempat Intisari tampil (teks-arab.md aturan 8). */
  aiBadge: "Intisari AI",
  aiBadgeHint:
    "Ringkasan belajar buatan AI dari teks kitab, belum ditinjau manusia. Setiap gagasan menunjuk paragraf sumbernya.",
  // Hub /kitab/<karya>/intisari
  hubHeading: "Intisari",
  hubMetaTitle: (work: string) => `Intisari ${work}`,
  hubMetaDescription: (work: string) =>
    `Ringkasan belajar ${work} per kitab: gagasan kunci, kutipan Arab dari teks kitab, dan dalilnya, masing-masing tertaut ke paragraf sumbernya.`,
  hubLead:
    "Ringkasan belajar per kitab dan per bab untuk dibaca dalam beberapa menit. Setiap gagasan menunjuk paragraf sumbernya, jadi Anda bisa langsung membuka teks kitabnya.",
  hubDoor:
    "Intisari adalah pintu ke kitab, bukan penggantinya. Untuk memahami dan mengamalkan isinya, pelajari kitabnya bersama guru.",
  hubGroupLabel: (title: string) => `Intisari kitab di ${title}`,
  hubSectionCount: (n: number) => `${n} Intisari bab`,
  readMark: "Sudah dibaca",
  breadcrumbLabel: "Lokasi",
  metaTitle: (section: string, work: string) => `Intisari ${section} · ${work}`,
  metaDescription: (section: string, work: string) =>
    `Intisari AI ${section} dari ${work}: gagasan kunci yang menunjuk paragraf sumbernya, kutipan Arab dari teks kitab, dan dalilnya.`,
  // Kepala (halaman, hub, kartu)
  points: (n: number) => `${n} gagasan`,
  readTime: (n: number) => `${minutes(n)} baca`,
  listenTime: (n: number) => `${minutes(n)} dengar`,
  tierBook: "Intisari Kitab",
  tierSection: "Intisari Bab",
  meta: (model: string, prompt: string, date: string, review: string) =>
    `Dibuat ${model} (${prompt}) pada ${date}, ${review}.`,
  review: {
    ai_generated: "belum ditinjau manusia",
    reviewed: "sudah ditinjau",
    ustadz_verified: "diverifikasi ustadz",
    rejected: "ditolak peninjau",
  },
  notice:
    "Intisari ini ringkasan buatan AI dari teks kitab dan bisa keliru. Setiap gagasan punya tautan Dasar teks ke paragraf sumbernya; teks Arab kitab adalah rujukannya.",
  noticeMore: "Prinsip Surau",
  // Isi
  openingHeading: "Yang dibahas",
  abstractHeading: "Ringkasan",
  pointsHeading: "Gagasan kunci",
  pointLabel: (n: number) => `Gagasan ${n}`,
  stance: {
    author: (by: string) => `Pendapat ${by}`,
    reported: (by: string) => `Dinukil ${by}`,
    refuted: (by: string) => `Dibantah ${by}`,
  },
  authorFallback: "penulis",
  advice: "Anjuran penulis",
  adviceNote: "Untuk kasus pribadi, tanyakan kepada ulama.",
  basis: "Dasar teks",
  /** Tautan paragraf jangkar ringkas: "j. 1, h. 200". */
  basisPage: (juz: number, page: number) => `j. ${juz}, h. ${page}`,
  quotesHeading: "Kutipan pilihan",
  quoteKind: { text: "Teks kitab", report: "Riwayat", poetry: "Syair" },
  quoteTranslation: "Terjemahan AI kutipan ini",
  quoteOpen: "Buka paragrafnya",
  quoteReportNote: "Status riwayat hanya dari takhrij: lihat Dalil.",
  termsHeading: "Istilah",
  termsNote: "Definisi singkat buatan AI.",
  evidenceHeading: "Dalil di teks sumber",
  evidenceLead:
    "Ayat dan hadits yang ada di paragraf sumber gagasan, dikenali otomatis oleh kode dari teks kitab (bukan oleh AI).",
  evidenceFor: "Untuk gagasan",
  evidenceOpen: (juz: number, page: number) => `Buka paragrafnya (j. ${juz}, h. ${page})`,
  ayahHeading: "Ayat Al-Qur'an",
  ayahTranslation: "Terjemahan Kemenag",
  ayahPartial: "Dikutip sebagian di kitab; ayat lengkapnya di bawah.",
  ayahSource: (names: string) => `Teks dan terjemahan ayat: ${names}.`,
  hadithHeading: "Hadits dan takhrijnya",
  hadithStatus: "dikenali otomatis dari teks takhrij, belum ditinjau",
  hadithMixed: "Takhrij menyebut penilaian berbeda untuk jalur atau lafaz yang berbeda.",
  hadithWeak: "Takhrij memuat istilah kelemahan",
  hadithText: "Teks takhrij dari kitab",
  hadithTerms: "Istilah di teks takhrij",
  hadithItem: (marker: string, juz: number, page: number) =>
    `Hadits bertanda (${marker}) di j. ${juz}, h. ${page}`,
  hadithFootnoteOpen: "Lihat takhrijnya di pembaca",
  evidenceChipHadith: (marker: string, juz: number, page: number) =>
    `Hadits (${marker}) · j. ${juz}, h. ${page}`,
  questionsHeading: "Uji pemahaman",
  questionsLead: "Coba jawab dulu, lalu buka untuk melihat gagasan yang menjawabnya.",
  questionAnswer: (n: number, title: string) => `Jawabannya di gagasan ${n}: ${title}`,
  questionGoto: "Baca gagasannya",
  closingHeading: "Penutup",
  continueHeading: "Lanjut ke teks lengkap",
  continueText: "Intisari ini hanya pintu. Baca bagian ini utuh di teks kitab.",
  continueButton: "Baca teks lengkap",
  teacherNote:
    "Belajar kitab sebaiknya bersama guru: Intisari membantu mengingat, guru membantu memahami dan mengamalkannya.",
  childrenHeading: "Intisari bab di kitab ini",
  hubLink: "Semua Intisari",
  sourceHeading: "Sumber teks",
  // Halaman karya
  workLink: "Intisari kitab ini",
  workLinkHint: "Ringkasan belajar per kitab dan bab, buatan AI, tertaut ke teks.",
  // Fixture /dev/intisari
  devTitle: "Pratinjau Intisari (fixture)",
  devLead:
    "Data buatan untuk pengembangan dan e2e, tanpa D1. Teks Arab di sini kalimat contoh, bukan teks kitab.",
} as const;
