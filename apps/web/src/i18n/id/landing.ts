// String landing page publik di / (ADR-096). `landingNav` dipisah supaya navbar (komponen klien)
// hanya membawa string menu; sisanya dipakai server component.

/** Bagian halaman (id jangkar) yang muncul di menu navbar landing. */
export const LANDING_SECTIONS = [
  "isi",
  "cara-kerja",
  "integrasi",
  "gratis",
  "tanya-jawab",
] as const;
export type LandingSectionId = (typeof LANDING_SECTIONS)[number];

export const landingNav = {
  label: "Bagian halaman",
  sections: {
    isi: "Isi kitab",
    "cara-kerja": "Cara kerja",
    integrasi: "Integrasi AI",
    gratis: "Gratis",
    "tanya-jawab": "Tanya jawab",
  } satisfies Record<LandingSectionId, string>,
  open: "Buka Surau",
  menu: "Buka menu",
  home: "Surau, ke halaman depan",
} as const;

export const landing = {
  eyebrow: "Nirlaba · open source · berbahasa Indonesia",
  heading: "Kitab klasik Islam, bisa ditelusuri sampai halamannya.",
  lead: "Surau membantu Anda mencari, membaca, dan memahami kitab-kitab klasik dalam bahasa Indonesia. Setiap jawaban menunjuk ke teks Arab aslinya: kitab, jilid, dan halaman cetak.",
  start: "Mulai mengkaji",
  ask: "Tanya Maknaz",
  heroArtTitle: "Ilustrasi surau, rak kitab, dan kitab terbuka",
  // Kartu kutipan hero: teks Arab disalin kode dari DB (ID + offset), bukan ditulis di sini.
  quoteLabel: "Kutipan dari kitab",
  quoteBy: (author: string, label: string) => `Menurut ${author}, ${label}`,
  quoteOpen: "Buka halamannya",

  introHeading: "Apa yang bisa Anda lakukan di Surau",
  introLead:
    "Surau dimulai dari satu kitab yang dikerjakan dengan teliti: Ihya' 'Ulum ad-Din karya Abu Hamid al-Ghazali. Karya al-Ghazali lainnya dan kitab-kitab kurikulum pesantren menyusul.",
  features: [
    "Cari kata Indonesia atau Arab di seluruh kitab, dengan atau tanpa harakat.",
    "Baca teks Arab asli bersama terjemahan AI yang selalu diberi label.",
    "Lihat takhrij hadits al-'Iraqi yang tertaut langsung ke teksnya.",
    "Baca ayat Al-Qur'an dengan teks Tanzil dan terjemahan Kemenag, tidak diterjemahkan AI.",
    "Sambungkan Claude, ChatGPT, atau asisten AI lain lewat MCP.",
  ],
  // Hanya tampil bila Maknaz menyala (`jawabRouteOn`), seperti segmen Maknaz di Beranda.
  featureAsk: "Tanyakan sesuatu ke Maknaz dan dapatkan jawaban yang mengutip halaman kitabnya.",
  introCta: "Coba cari sekarang",

  tocHeading: "Isi kitab",
  tocLead:
    "Ihya' 'Ulum ad-Din terbagi dalam empat rub' (perempat), masing-masing berisi sepuluh kitab. Setiap judul membuka halaman cetak tempat bagian itu dimulai.",
  tocNote: "Judul Indonesia adalah terjemahan AI. Judul Arab disalin dari sumbernya.",
  tocAll: "Lihat daftar isi lengkap",
  // Daftar isi gagal dimuat: bagian #isi tetap ada (menu navbar tidak mati) dengan tautan ke rak.
  tocUnavailable: "Daftar isi sedang tidak bisa dimuat. Anda tetap bisa membuka kitab dari rak.",
  tocShelf: "Buka rak kitab",
  tocPage: (juz: number, page: number) => `j. ${juz}, h. ${page}`,
  tocCount: (n: number) => `${n} kitab`,
  stats: {
    volumes: "jilid cetak",
    quarters: "rub'",
    books: "kitab",
    sections: "bagian di daftar isi",
  },

  howHeading: "Cara kerja",
  howLead:
    "Empat langkah dari pertanyaan sampai teks aslinya, dan setiap langkah bisa Anda periksa.",
  howArtTitle: "Ilustrasi langkah",
  stepNumber: (n: number) => `Langkah ${n}`,
  steps: [
    {
      title: "Bertanya",
      body: "Tulis pertanyaan atau kata yang ingin Anda kaji, dalam bahasa Indonesia atau Arab.",
      art: "cara-bertanya",
    },
    {
      title: "Mencari",
      body: "Surau mencari di teks Arab, terjemahan, dan ringkasan, lalu menunjukkan halaman yang memuatnya.",
      art: "cara-mencari",
    },
    {
      title: "Membaca",
      body: "Buka halaman cetaknya: teks Arab asli, terjemahan AI berlabel, takhrij, dan ayat yang dikutip.",
      art: "kitab-rehal",
    },
    {
      title: "Memeriksa",
      body: "Setiap kutipan dicocokkan kode dengan teks sumbernya. Kutipan yang tidak cocok dengan sumbernya tidak ditampilkan.",
      art: "cara-memeriksa",
    },
  ],

  principlesHeading: "Yang dijaga di setiap hasil",
  principlesLead:
    "Surau belum mengumpulkan testimoni. Sebagai gantinya, inilah tiga janji yang bisa Anda periksa sendiri di setiap halaman.",

  mcpHeading: "Pakai Surau dari asisten AI Anda",
  mcpLead:
    "Hubungkan Claude, ChatGPT, atau asisten AI lain ke perpustakaan Surau lewat MCP. Asisten Anda bisa mencari, membaca halaman, dan memeriksa kutipan, dengan teks Arab asli dan tautan ke halaman cetaknya.",
  mcpNote: "Gratis dan tanpa akun Surau. Biaya model ditanggung asisten AI milik Anda.",
  mcpArtTitle: "Ilustrasi asisten AI yang tersambung ke rak kitab",
  mcpGuide: "Panduan menyambungkan",
  resourcesHeading: "Terbuka untuk diperiksa",
  resources: [
    {
      id: "source",
      title: "Kode sumber",
      body: "Seluruh kode Surau terbuka di GitHub, termasuk cara kutipan dicocokkan.",
    },
    {
      id: "license",
      title: "Lisensi dan atribusi",
      body: "Teks kitab berlisensi CC BY-NC-SA 4.0, dengan asal setiap edisi dicatat.",
    },
    {
      id: "about",
      title: "Tentang Surau",
      body: "Visi, kebijakan atribusi, dan siapa yang meninjau isinya.",
    },
  ],

  readHeading: "Baca langsung, tanpa daftar",
  readLead:
    "Tidak perlu akun atau aplikasi. Buka halaman pertama Ihya dan lihat sendiri teks Arab, terjemahan, dan takhrijnya.",
  readFirst: "Buka halaman pertama",
  readShelf: "Lihat rak kitab",

  freeHeading: "Gratis, untuk semua",
  freeLead:
    "Surau proyek nirlaba. Tidak ada iklan, paywall, atau paket berbayar, dan biayanya dilaporkan terbuka.",
  freePrice: "Rp0",
  freeUnit: "tanpa akun, tanpa paket",
  freePoints: [
    "Semua kitab, pencarian, dan pembaca",
    "MCP untuk asisten AI Anda",
    "Tanpa iklan dan tanpa menjual data",
    "Pertanyaan tidak dipakai untuk melatih AI",
  ],
  freeAsk: "Maknaz selama anggaran bulanan masih ada",
  costHeading: "Biaya AI bulan ini",
  costUsedSuffix: "dari plafon terpakai",
  costDetail: (cost: string, cap: string) => `${cost} dari plafon ${cap}`,
  costMore: "Lihat transparansi biaya",
  costFixed: "Ditambah hosting Cloudflare US$5 per bulan dan domain.",
  costUnavailable: "Angka biaya sedang tidak bisa dimuat.",
  costNoCap: "Anggaran Maknaz bulan ini belum dibuka.",

  faqHeading: "Tanya jawab",
  faq: [
    {
      q: "Apakah Surau memberi fatwa?",
      a: "Tidak. Surau menyampaikan isi kitab beserta siapa yang mengatakannya. Untuk keputusan hukum kasus pribadi, tanyakan kepada ulama.",
    },
    {
      q: "Apakah AI bisa mengarang kutipan?",
      a: "Teks Arab di Surau tidak pernah ditulis AI. Kode menyalinnya dari database, dan kutipan yang tidak cocok dengan sumbernya tidak ditampilkan.",
    },
    {
      q: "Apakah terjemahannya bisa dipegang?",
      a: "Terjemahan dan ringkasan dibuat AI dan selalu diberi label. Editor dan ustadz peninjau mulai memeriksanya; terjemahan yang sudah diperiksa diberi label tersendiri. Pegangan utamanya tetap teks Arab, yang selalu tampil bersamanya.",
    },
    {
      q: "Dari mana teks kitabnya?",
      a: "Teks Arab Ihya berasal dari OpenITI dan al-Maktaba al-Shamela, edisi Dar al-Ma'rifah (Beirut), berlisensi CC BY-NC-SA 4.0. Rinciannya ada di halaman Lisensi.",
    },
    {
      q: "Kitab apa saja yang sudah ada?",
      a: "Saat ini Ihya' 'Ulum ad-Din karya al-Ghazali, empat jilid. Karya al-Ghazali lainnya dan kitab-kitab kurikulum pesantren menyusul.",
    },
    {
      q: "Bagaimana dengan privasi?",
      a: "Surau tidak memerlukan akun dan menyimpan sesedikit mungkin data. Jangan menulis data pribadi di pertanyaan. Rinciannya ada di halaman Privasi.",
    },
  ],

  footerTagline: "Asisten riset kitab klasik Islam. Nirlaba dan open source.",
  footerNav: "Tautan Surau",
  footerLinks: {
    home: "Beranda",
    books: "Kitab",
    mcp: "Integrasi AI",
    about: "Tentang",
    license: "Lisensi & atribusi",
    privacy: "Privasi",
    transparency: "Transparansi biaya",
    source: "Kode sumber",
  },
  footerLicense:
    "Teks kitab: CC BY-NC-SA 4.0 (nonkomersial). Ilustrasi dibuat dengan iso-glow (MIT). Bukan fatwa.",
} as const;
