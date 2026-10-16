// Semua string UI Surau (bahasa Indonesia) dikumpulkan di sini (KONVENSI: Bahasa).
// Komponen tidak menulis string UI langsung; ambil dari objek `id`.

export const id = {
  meta: {
    siteName: "Surau",
    title: "Surau · Asisten riset kitab klasik Islam",
    description:
      "Surau membantu Anda menemukan, membaca, dan memahami kitab-kitab klasik Islam dalam bahasa Indonesia. Setiap jawaban bisa ditelusuri ke teks aslinya. Nirlaba dan open source.",
  },

  brand: {
    name: "Surau",
    tagline: "Pintu ke kitab klasik",
  },

  nav: {
    label: "Navigasi utama",
    home: "Beranda",
    books: "Kitab",
    search: "Cari",
    ask: "Tanya",
    about: "Tentang",
    soon: "segera",
    soonHint: "Fitur ini sedang dibangun",
    openMenu: "Buka menu",
    toggleSidebar: "Buka atau tutup panel samping",
  },

  theme: {
    toLight: "Ganti ke tema terang",
    toDark: "Ganti ke tema gelap",
  },

  common: {
    newTab: "(membuka tab baru)",
    close: "Tutup",
  },

  footer: {
    nonprofit: "Nirlaba · open source",
    source: "Kode sumber di GitHub",
  },

  home: {
    eyebrow: "Sedang dibangun",
    heading: "Asisten riset kitab klasik Islam, dalam bahasa Indonesia",
    lead: "Surau membantu Anda menemukan, membaca, dan memahami apa yang tertulis di kitab-kitab klasik. Setiap jawaban punya alamat: kitab, jilid, halaman cetak, dan kutipan Arab aslinya.",
    firstBook: "Kitab pertama: Ihya 'Ulum al-Din karya al-Ghazali.",
    ctaAbout: "Kenali Surau",
    ctaSource: "Lihat kode sumber",
    demoCaption: "Basmalah, sebagai contoh tipografi teks Arab di Surau.",
    demoSource: "Sumber teks:",
    principlesHeading: "Tiga prinsip utama",
    principles: [
      {
        title: "Verbatim atau tidak sama sekali",
        body: "Teks Arab selalu disalin kode dari sumbernya, tidak pernah ditulis AI. Kutipan yang tidak cocok dengan sumber tidak ditampilkan.",
      },
      {
        title: "Setiap klaim ada alamatnya",
        body: "Kitab, edisi, jilid, halaman cetak, dan tautan tetap ke bagian teksnya, supaya Anda bisa memeriksa sendiri.",
      },
      {
        title: "Atribusi, bukan fatwa",
        body: "Surau menyampaikan isi kitab beserta siapa yang mengatakannya. Keputusan hukum untuk kasus pribadi tetap di tangan ulama.",
      },
    ],
    roadmapHeading: "Peta pembangunan",
    roadmapLead:
      "Surau dibangun bertahap. Setiap tahap bisa dipakai sebelum tahap berikutnya dimulai.",
    roadmapNow: "sekarang",
    roadmapPhase: "Fase",
    roadmap: [
      {
        phase: "0",
        title: "Fondasi",
        body: "Situs ini: tentang Surau, prinsip, dan status.",
        current: true,
      },
      {
        phase: "1",
        title: "Pembaca Ihya",
        body: "Membaca Ihya lengkap dengan daftar isi, halaman cetak, dan takhrij al-'Iraqi.",
      },
      {
        phase: "2",
        title: "Cari",
        body: "Pencarian Arab dan Indonesia, ayat dengan terjemahan Kemenag.",
      },
      {
        phase: "3",
        title: "Untuk asisten AI lain",
        body: "Isi Surau bisa dipakai dari Claude, ChatGPT, dan asisten AI lain.",
      },
      {
        phase: "4",
        title: "Tanya",
        body: "Tanya-jawab dengan kutipan Arab yang diperiksa kode.",
      },
      {
        phase: "5–7",
        title: "Lebih banyak kitab",
        body: "Karya al-Ghazali lainnya, wiki istilah dan tokoh, lalu ±92 kitab kurikulum pesantren.",
      },
    ],
  },

  about: {
    pageTitle: "Tentang",
    heading: "Tentang Surau",
    lead: "AI untuk ilmu agama dengan sumber yang kuat, untuk masa depan umat.",
    visionHeading: "Visi",
    vision:
      "Surau membantu orang menemukan, membaca, dan memahami apa yang tertulis di kitab-kitab klasik. Setiap jawaban bisa diperiksa sendiri ke teks aslinya. Kitab pertamanya Ihya karya al-Ghazali, lalu karya al-Ghazali lainnya, kemudian kitab-kitab kurikulum pesantren.",
    audienceHeading: "Untuk siapa",
    audience: [
      "Santri, mahasiswa, dan pengkaji yang mencari di mana seorang ulama membahas sesuatu.",
      "Ustadz dan pengajar yang menyiapkan kajian dan mengecek rujukan.",
      "Masyarakat umum yang ingin memahami isi kitab tanpa kehilangan jejak sumbernya.",
      "Pengguna asisten AI lain dan peneliti, lewat akses data terbuka.",
    ],
    notHeading: "Yang bukan Surau",
    not: [
      {
        title: "Bukan mufti dan bukan pemberi fatwa",
        body: "Surau menyampaikan isi kitab beserta atribusinya. Untuk kasus pribadi, bertanyalah kepada ulama setempat. Ini sejalan dengan sikap MUI (2025) bahwa AI tidak bisa dijadikan rujukan hukum agama.",
      },
      {
        title: "Bukan “chat dengan ulama”",
        body: "Surau tidak memerankan tokoh dalam orang pertama. Ulama hanya “berbicara” lewat kutipan verbatim dari karyanya.",
      },
      {
        title: "Bukan pengganti guru",
        body: "Surau adalah pintu ke kitab, bukan jalan pintas yang melewatinya.",
      },
    ],
    principlesHeading: "Prinsip yang tidak bisa ditawar",
    principles: [
      "Verbatim atau tidak sama sekali: teks Arab disalin kode dari sumber, tidak pernah ditulis AI.",
      "Setiap klaim ada alamatnya: kitab, edisi, jilid, halaman cetak, dan tautan tetap.",
      "Atribusi yang jujur: membedakan pendapat penulis, pendapat yang ia nukil, dan yang ia bantah.",
      "Status hadits diambil dari takhrij para ahlinya, bukan dari tebakan AI.",
      "Ayat Al-Qur'an tidak pernah ditulis atau diterjemahkan AI: teks dari Tanzil, terjemahan dari Kemenag.",
      "Berani bilang “tidak ditemukan”.",
      "Terjemahan dan ringkasan buatan AI selalu diberi label.",
      "Ustadz ada di dalam lingkaran: kebijakan dan sampel jawaban ditinjau ahli.",
    ],
    openHeading: "Terbuka dan nirlaba",
    open: "Surau tidak memasang iklan, tidak memakai paywall, dan tidak menjual akses atas konten. Kode sumbernya terbuka di GitHub.",
    licenseHeading: "Lisensi",
    licenseCode: "Kode: Apache-2.0.",
    licenseContent:
      "Konten turunan (teks, terjemahan, ringkasan, indeks, dan dump data) direncanakan berlisensi CC BY-NC-SA 4.0, dengan atribusi ke sumber aslinya. Keputusan akhirnya masih ditinjau.",
    sourceLink: "Kode sumber Surau di GitHub",
  },

  reader: {
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
    open: "Buka kitab",
    startReading: "Mulai membaca",
    workMetaTitle: "Ihya' 'Ulum ad-Din",
    volumes: (n: number) => `${n} jilid`,
    deathHijri: (n: number) => `w. ${n} H`,
    publisherLabel: "Penerbit",
    licenseLabel: "Lisensi teks digital",
    attributionLabel: "Atribusi",
    tocHeading: "Daftar isi",
    tocLabel: "Daftar isi kitab",
    tocOpen: "Daftar isi",
    tocActive: "(bagian ini)",
    tocCollapse: "Ciutkan semua",
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
    pageNavTopLabel: "Navigasi halaman (atas)",
    toolbarLabel: "Alat baca",
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
    fontSize: "Ukuran huruf Arab",
    passageActions: "Aksi paragraf",
    copyPassage: "Salin sitasi paragraf",
    reportPassage: "Laporkan kesalahan di paragraf ini",
    footnotesHeading: "Catatan kaki · takhrij hadits al-'Iraqi",
    footnotesLead:
      "Catatan kaki edisi ini berisi takhrij al-Hafiz al-'Iraqi atas hadits-hadits Ihya. Status hadits hanya diambil dari teks takhrij ini, tanpa tebakan AI.",
    footnoteOpen: (marker: string) => `Buka catatan kaki ${marker}`,
    footnoteHeading: (marker: string) => `Catatan kaki (${marker})`,
    footnoteGoto: "Lihat di daftar catatan kaki",
    footnoteBack: "Kembali ke teks",
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
    sourceShamela: "Halaman ini di al-Maktaba al-Shamela",
    report: "Laporkan kesalahan",
    reportHeading: "Laporkan kesalahan",
    reportLead:
      "Laporan Anda membantu memperbaiki teks dan struktur kitab. Jangan menulis data pribadi; Surau tidak menyimpan nama, email, atau alamat IP.",
    reportPassageNote: (label: string) => `Paragraf: ${label}`,
    reportKind: "Jenis kesalahan",
    reportKinds: {
      text: "Teks (salah ketik, terpotong, bercampur)",
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
    errorHeading: "Halaman kitab gagal dimuat",
    errorBody: "Terjadi gangguan saat membaca data kitab. Coba muat ulang.",
    errorRetry: "Coba lagi",
  },

  notFound: {
    pageTitle: "Halaman tidak ditemukan",
    heading: "Halaman tidak ditemukan",
    body: "Alamat yang Anda buka tidak ada atau sudah dipindahkan.",
    back: "Kembali ke Beranda",
  },
} as const;

export const SOURCE_URL = "https://github.com/alfariesh/surau";
