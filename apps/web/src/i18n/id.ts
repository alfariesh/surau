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
    license: "Lisensi & atribusi",
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
      "Konten (teks kitab, struktur, terjemahan, ringkasan, indeks, dan dump data): CC BY-NC-SA 4.0, dengan atribusi ke sumber aslinya.",
    licenseMore: "Lisensi, atribusi, dan cara meminta koreksi",
    sourceLink: "Kode sumber Surau di GitHub",
  },

  license: {
    pageTitle: "Lisensi dan atribusi",
    heading: "Lisensi dan atribusi",
    lead: "Siapa pemilik teks yang tampil di Surau, apa yang boleh Anda lakukan dengannya, dan cara meminta koreksi atau penghapusan.",
    summaryHeading: "Ringkasan",
    codeLabel: "Kode program",
    codeLicense: "Apache-2.0",
    contentLabel: "Konten",
    contentScope: "teks kitab, struktur, terjemahan, ringkasan, indeks, dan dump data",
    contentLicense: "CC BY-NC-SA 4.0",
    licenseFile: "teks lisensi",
    noncommercial:
      "Surau nirlaba: tanpa iklan, tanpa paywall, dan tanpa penjualan akses atas konten.",
    reuseHeading: "Memakai ulang konten Surau",
    reuseLead:
      "Anda boleh menyalin, membagikan, dan mengadaptasi konten Surau (misalnya menerjemahkan atau mengutip panjang), dengan tiga syarat dari lisensi CC BY-NC-SA 4.0:",
    reuseRules: [
      {
        title: "Sebut sumbernya",
        body: "Cantumkan kalimat atribusi kitab yang bersangkutan (lihat di bawah), tautkan lisensinya, dan sebutkan bila Anda mengubah isinya.",
      },
      {
        title: "Tidak untuk tujuan komersial",
        body: "Konten tidak boleh dijual, dipasangi paywall, atau dipakai untuk keuntungan komersial.",
      },
      {
        title: "Bagikan dengan lisensi yang sama",
        body: "Karya turunan dari konten Surau juga dibagikan dengan CC BY-NC-SA 4.0.",
      },
    ],
    sourcesHeading: "Sumber teks",
    attributionLabel: "Kalimat atribusi",
    partiesLabel: "Pihak yang berjasa",
    changesLabel: "Yang diubah Surau",
    readLink: "Baca kitab ini",
    detailsLink: "Rincian versi dan sha256 setiap berkas sumber",
    correctionHeading: "Koreksi dan penghapusan",
    correctionText:
      "Menemukan salah ketik, teks yang terpotong, atau nomor halaman yang keliru? Ketuk tombol “Laporkan kesalahan” di halaman kitab, atau buka laporan di GitHub.",
    takedownText:
      "Pemegang hak atas sebuah teks atau edisi yang keberatan dengan tampilannya di Surau dapat menghubungi kami lewat GitHub. Bila keberatannya beralasan, teks yang bersangkutan kami turunkan sementara selama ditinjau.",
    issueLink: "Buka laporan di GitHub",
    privacyHeading: "Laporan kesalahan dan privasi",
    privacyText:
      "Laporan kesalahan disimpan tanpa nama, email, atau alamat IP. Laporan disimpan sampai ditangani, lalu dihapus paling lambat 12 bulan kemudian.",
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
    openWork: (title: string) => `Buka kitab ${title}`,
    startReading: "Mulai membaca",
    volumes: (n: number) => `${n} jilid`,
    deathHijri: (n: number) => `w. ${n} H`,
    publisherLabel: "Penerbit",
    licenseLabel: "Lisensi teks digital",
    attributionLabel: "Atribusi",
    tocHeading: "Daftar isi",
    tocLabel: "Daftar isi kitab",
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
    pageNavTopLabel: "Navigasi halaman (atas)",
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
    footnotesHeading: "Catatan kaki",
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
    licenseText: "teks lisensi",
    sourceDigital: "Materi sumber",
    modified:
      "Diolah Surau: teks dibagi per paragraf, catatan kaki takhrij dipisahkan dari teks utama, dan daftar isi diperbaiki lewat patch yang tercatat. Huruf teks Arab tidak diubah.",
    sourceShamela: "Halaman ini di al-Maktaba al-Shamela",
    licenseMore: "Lisensi dan atribusi lengkap",
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
/** Laporan publik (koreksi, takedown) sampai ada email kontak (T-10 butir 3, dijawab 2026-10-16). */
export const ISSUES_URL = `${SOURCE_URL}/issues/new`;
