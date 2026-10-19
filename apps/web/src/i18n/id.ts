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
    mcp: "Pakai dengan AI",
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
    onThisPage: "Di halaman ini",
  },

  footer: {
    nonprofit: "Nirlaba · open source",
    source: "Kode sumber di GitHub",
    license: "Lisensi & atribusi",
  },

  home: {
    heading: "Asisten riset kitab klasik Islam",
    lead: "Surau membantu Anda menemukan, membaca, dan memahami apa yang tertulis di kitab-kitab klasik. Setiap jawaban punya alamat: kitab, jilid, halaman cetak, dan kutipan Arab aslinya.",
    shelfLabel:
      "Rak kitab Surau: seret, gulir, atau pakai panah untuk memutar; pilih buku terdepan untuk membukanya",
    shelfOf: "dari",
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

  mcp: {
    pageTitle: "Pakai Surau dengan AI",
    eyebrow: "Untuk pengguna Claude, ChatGPT, dan asisten AI lain",
    heading: "Pakai Surau dari AI Anda",
    lead: "Hubungkan asisten AI Anda ke perpustakaan Surau untuk mencari dan membaca Ihya karya al-Ghazali, dengan teks Arab asli dan tautan ke halaman cetaknya.",
    endpointHeading: "Satu alamat, tanpa akun Surau",
    endpointLead:
      "MCP adalah cara asisten AI mengakses sumber tambahan. Salin alamat ini saat diminta URL server atau connector:",
    cost: "Akses Surau gratis dan tanpa login. Paket, kuota, atau biaya asisten AI yang Anda gunakan tetap berlaku. Surau tidak menjalankan model AI saat Anda memakai koneksi ini.",
    connectHeading: "Hubungkan asisten Anda",
    officialGuide: "Panduan resmi",
    clients: [
      {
        id: "claude",
        name: "Claude.ai dan Claude Desktop",
        steps: [
          "Buka Customize → Connectors → + Add → Add custom connector. Pada tampilan lain, buka Settings → Connectors. Di akun organisasi, pengelola mungkin perlu mengaktifkan connector terlebih dahulu.",
          "Beri nama Surau, masukkan alamat di atas, lalu pilih No sign in sebagai metode autentikasi dan simpan. Claude Desktop memakai menu connector yang sama untuk server jarak jauh.",
          "Mulai percakapan baru, aktifkan Surau dari menu + → Connectors, lalu coba pertanyaan di bawah. Bila diminta, izinkan pencarian dan pembacaan dari Surau.",
        ],
        docs: "https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp",
      },
      {
        id: "claude-code",
        name: "Claude Code",
        steps: [
          "Di aplikasi Terminal, jalankan perintah di bawah dari folder proyek Anda.",
          "Buka Claude Code, ketik /mcp untuk memeriksa koneksi Surau, lalu coba salah satu pertanyaan contoh. Izinkan tool Surau saat diminta.",
        ],
        command: "claude mcp add --transport http surau https://mcp.surau.org/mcp",
        docs: "https://code.claude.com/docs/en/mcp",
      },
      {
        id: "chatgpt",
        name: "ChatGPT",
        steps: [
          "Buka halaman Plugins di ChatGPT, lalu + → Add custom MCP server bila tersedia untuk akun Anda. Ketersediaan fitur mengikuti akun dan kebijakan organisasi; Developer mode mungkin perlu diaktifkan di Settings → Security and login.",
          "Isi nama Surau, deskripsi singkat perpustakaan Ihya, dan alamat server di atas. Pilih autentikasi tanpa login, tinjau izin baca tool, lalu buat dan pasang plugin.",
          "Di percakapan baru, ketik @ dan pilih Surau, lalu ajukan pertanyaan contoh. Ikuti panduan resmi bila nama menu di akun Anda berbeda.",
        ],
        docs: "https://developers.openai.com/api/docs/guides/custom-mcp-server",
      },
      {
        id: "klien-lain",
        name: "Klien MCP lain",
        steps: [
          "Tambahkan server jarak jauh dengan transport Streamable HTTP, alamat di atas, dan tanpa autentikasi. Pilih klien yang mendukung pemanggilan tool MCP.",
          "Untuk mencoba di Cloudflare AI Playground, buka Model mode → Custom MCP → Add server, isi Server URL, lalu Add server. Biaya atau kuota model mengikuti layanan yang Anda pilih.",
        ],
        docs: "https://developers.cloudflare.com/agents/model-context-protocol/guides/test-remote-mcp-server/",
      },
    ],
    examplesHeading: "Coba pertanyaan ini",
    examplesLead:
      "Sebut Surau supaya asisten memakai sumber yang baru Anda hubungkan. Anda bisa menyalin contoh berikut:",
    examples: [
      "Gunakan Surau untuk mencari adab murid kepada guru dalam Ihya. Baca salah satu halaman hasilnya dan sertakan edisi, jilid, halaman, serta tautan sumber.",
      "Gunakan Surau untuk membaca Ihya jilid 1 halaman 200. Jelaskan isinya dalam bahasa Indonesia, tandai terjemahan AI, dan sertakan sumbernya.",
      "Ambil satu kutipan pendek dari halaman Ihya yang tadi dibaca melalui Surau. Periksa dengan verify_quote sebelum menampilkannya, lalu sertakan teks yang cocok dan tautan paragraf. Jika membahas status hadits, periksa get_hadith_takhrij; bila tidak ada takhrij, katakan status belum diketahui.",
    ],
    checkHeading: "Periksa jawaban yang Anda terima",
    checkLead:
      "Jawaban akhir ditulis oleh asisten AI Anda. Koneksi ke Surau memberi sumber, tetapi asisten masih bisa salah memahami atau mengabaikan instruksi. Alur yang bisa Anda minta:",
    checks: [
      "Cari pembahasan dengan search_text, lalu baca konteksnya dengan read_page atau read_section. Potongan hasil pencarian belum tentu mewakili pendapat penulis secara utuh.",
      "Untuk kutipan Arab, minta verify_quote dan gunakan teks hasil verifikasi. Kecocokan kutipan membuktikan teksnya ada, bukan membuktikan penafsiran AI benar.",
      "Pastikan ada nama karya dan edisi, jilid, halaman cetak, serta tautan yang bisa dibuka di Surau. Bedakan pendapat al-Ghazali dari pendapat yang ia nukil atau bantah.",
    ],
    readerLink: "Coba periksa halaman tentang adab belajar di pembaca Surau",
    limitsHeading: "Yang perlu diketahui",
    limits: [
      "Korpus saat ini hanya Ihya 'Ulum ad-Din, edisi Dar al-Ma'rifah, empat jilid. Bila rujukan tidak ditemukan, minta AI mengatakannya dengan jelas.",
      "Terjemahan dan ringkasan berlabel AI bisa keliru. Kutipan ayat yang dikenali sistem menyediakan teks Tanzil serta terjemahan Kemenag; pencocokan ayat belum sempurna.",
      "Status hadits mengikuti teks takhrij al-'Iraqi yang tertaut. Tanpa takhrij, status belum diketahui. Surau membantu riset dan belajar; keputusan hukum pribadi tetap perlu dibahas dengan ulama.",
      "Satu halaman cetak dapat menghasilkan jawaban tool yang panjang. Untuk bacaan bertahap, minta read_section dan lanjutkan dengan next_cursor bila tersedia.",
      "Pertanyaan Anda mengikuti kebijakan layanan AI yang dipakai. Surau membatasi frekuensi permintaan agar akses bersama tetap tersedia.",
    ],
    troubleHeading: "Jika belum tersambung",
    troubles: [
      {
        title: "Menu connector atau plugin tidak tersedia",
        body: "Periksa panduan resmi dan izin akun atau organisasi Anda. Nama menu dan ketersediaan fitur bisa berubah. Anda tetap bisa memakai pembaca dan pencarian di situs Surau.",
      },
      {
        title: "Diminta login ke Surau",
        body: "Periksa bahwa alamatnya berakhir dengan /mcp dan metode autentikasinya tanpa login (No sign in atau padanannya). Surau tidak meminta API key.",
      },
      {
        title: "Terlalu banyak permintaan atau rate_limited",
        body: "Tunggu sekitar satu menit, lalu coba lagi dengan satu pertanyaan. Pengguna layanan AI yang sama dapat berbagi batas jaringan.",
      },
      {
        title: "Halaman tidak ditemukan atau hasil terlalu panjang",
        body: "Minta AI mencari dengan search_text terlebih dahulu dan memakai alamat dari hasilnya. Untuk bacaan panjang, gunakan read_section per potongan.",
      },
    ],
    licenseHeading: "Sumber dan lisensi tetap ikut",
    license:
      "Saat memakai ulang hasil Surau, pertahankan sitasi dan atribusi sumbernya. Konten kitab memakai CC BY-NC-SA 4.0: sebut sumber, gunakan untuk tujuan nonkomersial, dan bagikan adaptasi dengan lisensi yang sama. Teks Tanzil dan terjemahan Kemenag memiliki ketentuan sumber masing-masing yang ikut di hasil tool.",
    licenseMore: "Baca lisensi, atribusi, dan cara meminta koreksi",
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
      "Teks ayat Al-Qur'an tidak pernah ditulis AI (dari Tanzil); kutipan ayat yang dikenali sistem memakai terjemahan Kemenag, bukan terjemahan AI.",
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
    quranHeading: "Ayat Al-Qur'an",
    quranLead:
      "Kutipan ayat di dalam kitab dikenali otomatis dengan mencocokkannya ke teks mushaf, lalu ditautkan ke surah dan ayatnya. Teks ayat, terjemahan, dan transliterasi disalin apa adanya dari sumber di bawah; AI tidak pernah menulis atau menerjemahkan ayat.",
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
    passageActions: "Aksi paragraf",
    copyPassage: "Salin sitasi paragraf",
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
    // Terjemahan dan ringkasan AI (S13, tampil sejak S14). Selalu berlabel (teks-arab.md aturan 8).
    aiTranslation: "Terjemahan AI",
    aiTranslationHint:
      "Diterjemahkan otomatis oleh AI dari teks Arab di atasnya dan belum ditinjau manusia. Rujuk selalu teks Arabnya.",
    aiSummary: "Ringkasan AI",
    aiSummaryOf: "Ringkasan AI bagian ini",
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
    style: "Tampilan",
    styleHeading: "Tampilan baca",
    styleFont: "Huruf Arab",
    styleFontSize: "Ukuran huruf",
    stylePaper: "Warna kertas",
    stylePapers: { light: "Terang", sepia: "Sepia", dark: "Gelap" },
    styleLeading: "Jarak baris",
    styleLeadings: { tight: "Rapat", normal: "Sedang", loose: "Longgar" },
    // Contoh huruf di panel Tampilan memakai paragraf pertama halaman ini (disalin dari DB).
    stylePreviewNote: "Contoh dari halaman ini",
    progressLabel: "Posisi baca di halaman ini",
    aiNoticeHeading: "Terjemahan dan ringkasan AI",
    aiNotice:
      "Terjemahan Indonesia per paragraf dan ringkasan bagian dibuat otomatis oleh model AI dari teks Arab, dan belum ditinjau manusia, jadi bisa keliru. Teks Arab tetap rujukan utamanya. Kutipan ayat yang dikenali sistem tidak diterjemahkan AI: yang tampil adalah terjemahan Kemenag. Kutipan ayat yang belum dikenali bisa ikut diterjemahkan AI.",
    errorHeading: "Halaman kitab gagal dimuat",
    errorBody: "Terjadi gangguan saat membaca data kitab. Coba muat ulang.",
    errorRetry: "Coba lagi",
  },

  search: {
    pageTitle: "Cari",
    metaDescription:
      "Cari kata Indonesia atau Arab di kitab Ihya 'Ulum ad-Din: hasil per halaman cetak dengan teks Arab asli, terjemahan AI berlabel, dan tautan ke pembaca.",
    heading: "Cari di kitab",
    lead: "Ketik kata Indonesia atau Arab. Kata Indonesia dicari di terjemahan dan ringkasan AI; kata Arab dicari langsung di teks aslinya.",
    inputLabel: "Kata yang dicari",
    placeholder: "mis. sabar, adab murid kepada guru, الصبر",
    submit: "Cari",
    examplesLabel: "Contoh:",
    examples: ["sabar", "niat", "adab murid kepada guru", "cinta kedudukan", "الصبر", "التوكل"],
    filterLabel: "Bagian kitab",
    filterAll: "Seluruh kitab",
    filterKitab: "Kitab",
    filterKitabAll: "Semua kitab di rub' ini",
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
  },

  notFound: {
    pageTitle: "Halaman tidak ditemukan",
    heading: "Halaman tidak ditemukan",
    body: "Alamat yang Anda buka tidak ada atau sudah dipindahkan.",
    back: "Kembali ke Beranda",
  },
} as const;

export const SOURCE_URL = "https://github.com/alfariesh/surau";
export const MCP_URL = "https://mcp.surau.org/mcp";
/** Laporan publik (koreksi, takedown) sampai ada email kontak (T-10 butir 3, dijawab 2026-10-16). */
export const ISSUES_URL = `${SOURCE_URL}/issues/new`;
