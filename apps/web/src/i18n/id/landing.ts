// String landing page publik di / (ADR-096). `landingNav` dan `landingDemo` dipisah supaya komponen
// klien (menu bagian, simulasi) hanya membawa string yang dipakainya; sisanya dipakai server component.

/** Bagian bernomor (01–06) di menu sticky landing, urut tampil di halaman. */
export const LANDING_SECTIONS = [
  "coba",
  "fitur",
  "cara-kerja",
  "koleksi",
  "integrasi",
  "gratis",
] as const;
export type LandingSectionId = (typeof LANDING_SECTIONS)[number];

export const landingNav = {
  label: "Bagian halaman",
  sections: {
    coba: "Coba Surau",
    fitur: "Fitur",
    "cara-kerja": "Cara kerja",
    koleksi: "Koleksi",
    integrasi: "Integrasi AI",
    gratis: "Gratis",
  } satisfies Record<LandingSectionId, string>,
  toggle: "Buka atau tutup daftar bagian",
} as const;

// Simulasi di kartu bertab dan bento (komponen klien). Isi jawaban contoh memakai bahasa atribusi dan
// merangkum terjemahan paragraf yang dikutip; teks Arab kutipannya selalu dari DB.
export const landingDemo = {
  tabsLabel: "Contoh pemakaian Surau",
  tabs: { tanya: "Maknaz", cari: "Cari", baca: "Baca" },
  question: "Apa hubungan ilmu dan amal menurut al-Ghazali?",
  asking: "Pertanyaan",
  answer: (label: string) =>
    `Menurut al-Ghazali dalam ${label}, ilmu melahirkan keadaan batin (hal), dan keadaan batin itulah yang kemudian menghasilkan amal.`,
  answerBy: "Maknaz",
  citation: "Kutipan",
  openPage: "Buka halamannya",
  done: "Kutipan cocok dengan sumber",
  searchLabel: "Kotak cari",
  resultsCount: (n: number) => `Contoh ${n} hasil dari ratusan halaman yang memuat kata ini`,
  readModes: { ar: "Arab", both: "Keduanya", tr: "Terjemahan" },
  readModesLabel: "Mode baca",
  readNote: "Teks Arab dari kitab; terjemahan dibuat AI dan diberi label.",
  // Simulasi MCP: asisten AI milik pengguna memanggil tool Surau.
  mcpUser: "Bagaimana al-Ghazali menjelaskan hubungan ilmu dan amal? Pakai Surau.",
  // Alamat (label) dari data kutipan, jadi simulasi tidak bisa melenceng dari kutipannya.
  mcpTools: (label: string) => [
    { name: "search_text", detail: "ilmu, amal" },
    { name: "read_page", detail: label },
    { name: "verify_quote", detail: "cocok" },
  ],
  mcpTool: "Surau",
  mcpAnswer: (label: string) =>
    `Menurut al-Ghazali dalam ${label}, ilmu melahirkan keadaan batin, lalu keadaan batin menghasilkan amal. Teks Arabnya sudah dicocokkan dengan sumbernya.`,
  mcpAssistant: "Asisten AI Anda",
} as const;

export const landing = {
  eyebrow: "Nirlaba · open source · berbahasa Indonesia",
  heading: "Kitab klasik Islam, bisa ditelusuri sampai halamannya.",
  lead: "Cari, baca, dan pahami kitab-kitab klasik dalam bahasa Indonesia, dengan setiap jawaban menunjuk ke teks Arab aslinya.",
  start: "Mulai mengkaji",
  readFirst: "Baca halaman pertama",
  quoteLabel: "Kutipan dari kitab",
  quoteOpen: "Buka halamannya",
  coverLabel: (title: string) => `Buka ${title}`,

  tryLabel: "Coba Surau",
  tryHeading: "Bertanya, mencari, dan membaca, dengan teks aslinya selalu di depan Anda.",
  tryLead:
    "Maknaz menjawab pertanyaan dengan mengutip halaman kitab. Cari menemukan kata Indonesia atau Arab di seluruh kitab. Pembaca menampilkan teks Arab bersama terjemahannya.",

  featuresLabel: "Fitur",
  featuresHeading: "Dibuat untuk mengkaji, bukan sekadar membaca ringkasan.",
  featuresLead:
    "Setiap fitur Surau berujung di satu tempat: halaman kitab yang bisa Anda buka dan periksa sendiri.",
  bentoAsk: {
    title: "Maknaz, asisten tanya kitab",
    body: "Bertanya dengan bahasa sehari-hari. Maknaz memilih bagian kitab, mengumpulkan paragraf, menyusun jawaban, lalu memeriksa setiap kutipan ke teks sumber.",
  },
  bentoRead: {
    title: "Teks Arab asli, terjemahan berlabel",
    body: "Baca Arab saja, Arab bersama terjemahan, atau terjemahan dengan Arab yang bisa dibuka per paragraf. Terjemahan AI selalu diberi label.",
  },
  // Kartu kecil bento: judul dua kata dan isi satu kalimat pendek yang panjangnya setara, supaya seimbang.
  bentoSmall: [
    {
      id: "search",
      title: "Cari dua bahasa",
      body: "Kata Indonesia atau Arab, dengan atau tanpa harakat.",
    },
    {
      id: "takhrij",
      title: "Takhrij hadits",
      body: "Catatan al-'Iraqi tertaut langsung ke haditsnya.",
    },
    {
      id: "ayah",
      title: "Ayat Kemenag",
      body: "Teks Tanzil dan terjemahan resmi, bukan terjemahan AI.",
    },
    { id: "link", title: "Tautan tetap", body: "Setiap paragraf punya alamat untuk dibagikan." },
  ],

  howLabel: "Cara kerja",
  howHeading: "Setiap langkah bisa Anda periksa.",
  howLead:
    "Surau tidak meminta Anda percaya begitu saja. Di setiap langkah ada alamat yang bisa dibuka dan teks asli yang bisa dibandingkan.",
  howArtTitle: "Ilustrasi langkah",
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
      body: "Setiap kutipan dicocokkan kode dengan teks sumbernya. Kutipan yang tidak cocok tidak ditampilkan.",
      art: "cara-memeriksa",
    },
  ],

  collectionLabel: "Koleksi",
  collectionHeading:
    "Perpustakaan yang tumbuh, satu kitab yang dikerjakan dengan teliti setiap kali.",
  collectionLead:
    "Setiap kitab disiapkan strukturnya, daftar isinya diperbaiki, dan takhrijnya ditautkan sebelum dibuka. Dimulai dari Ihya' 'Ulum ad-Din.",
  collectionAvailable: "Tersedia",
  collectionSoon: "Menyusul",
  collectionStage: (n: number) => `Tahap ${n}`,
  collectionOpen: "Buka kitab",
  collectionStats: { volumes: "jilid", books: "kitab", sections: "bagian" },
  collectionNext: [
    {
      title: "Karya al-Ghazali lainnya",
      body: "Kitab-kitab al-Ghazali sesudah Ihya, disiapkan dengan cara yang sama: struktur, daftar isi, dan takhrij.",
    },
    {
      title: "Kitab kurikulum pesantren",
      body: "Sekitar 92 kitab yang biasa dikaji di pesantren, dibuka satu per satu.",
    },
  ],
  collectionShelf: "Buka rak kitab",

  mcpLabel: "Integrasi AI",
  mcpHeading: "Pakai Surau langsung dari asisten AI Anda.",
  mcpLead:
    "Lewat MCP, Claude, ChatGPT, atau asisten AI lain bisa mencari, membaca halaman, dan memeriksa kutipan di Surau, dengan teks Arab asli dan tautan ke halaman cetaknya. Gratis, tanpa akun Surau; biaya model ditanggung asisten AI Anda.",
  mcpGuide: "Panduan menyambungkan",
  mcpUrlLabel: "Alamat server MCP",
  // Asisten yang bisa memakai server MCP jarak jauh (panduan /mcp: Claude, ChatGPT, klien MCP lain).
  mcpClientsLabel: "Bisa dipakai dari",
  mcpClients: ["Claude", "ChatGPT", "Grok", "Gemini", "Copilot", "Mistral"],
  mcpClientsMore: "dan klien MCP lainnya",

  freeLabel: "Gratis",
  freeStatement: "Gratis untuk semua",
  freeLead:
    "Surau proyek nirlaba. Tidak ada iklan, paywall, atau paket berbayar, dan biaya menjalankannya dilaporkan terbuka.",
  planName: "Membaca dan mencari",
  planBody: "Semua yang ada di Surau, untuk siapa saja.",
  planPrice: "0",
  planCurrency: "Rp",
  planPoints: [
    "Semua kitab, pencarian, dan pembaca",
    "MCP untuk asisten AI Anda",
    "Tanpa iklan dan tanpa menjual data",
    "Pertanyaan tidak dipakai untuk melatih AI",
  ],
  planAsk: "Maknaz selama anggaran bulanan masih ada",
  costName: "Biaya kami, terbuka",
  costBody: "Biaya AI bulan ini, dihitung otomatis dari setiap pertanyaan.",
  costCurrency: "US$",
  costUsedSuffix: "dari plafon terpakai",
  costDetail: (cap: string) => `Plafon bulan ini ${cap}`,
  costFixed: "Ditambah hosting Cloudflare US$5 per bulan dan domain",
  costMore: "Lihat transparansi biaya",
  costUnavailable: "Angka biaya sedang tidak bisa dimuat.",
  costNoCap: "Anggaran Maknaz bulan ini belum dibuka.",

  faqHeading: "Pertanyaan yang sering muncul",
  faqLead: "Hal-hal yang biasanya ditanyakan sebelum orang mulai memakai Surau.",
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
      a: "Terjemahan dan ringkasan dibuat AI dan selalu diberi label. Editor dan ustadz peninjau mulai memeriksanya; terjemahan yang sudah diperiksa diberi label tersendiri. Pegangan utamanya tetap teks Arab.",
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

  closingHeading: "Pintu ke kitab, bukan pengganti guru.",
  closingBody:
    "Surau dibangun sebagai proyek nirlaba dan open source. Kodenya terbuka untuk diperiksa siapa saja, dan isinya mulai ditinjau ustadz peninjau.",
  closingSource: "Kode sumber di GitHub",
  closingArtTitle: "Ilustrasi surau, rak kitab, dan kitab terbuka",

  footerNav: "Tautan Surau",
  footerLinks: {
    home: "Beranda",
    books: "Kitab",
    mcp: "Integrasi AI",
    about: "Tentang",
    license: "Lisensi & atribusi",
    privacy: "Privasi",
    transparency: "Transparansi biaya",
  },
  footerLicense:
    "Teks kitab: CC BY-NC-SA 4.0 (nonkomersial). Ilustrasi dibuat dengan iso-glow (MIT). Bukan fatwa.",
} as const;
