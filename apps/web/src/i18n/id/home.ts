// Bagian `id.home` dari kamus UI (src/i18n/id.ts), dipisah per bagian (X09) supaya komponen
// klien hanya membawa string yang dipakainya.

export const home = {
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
      title: "Maknaz",
      body: "Asisten AI Surau: tanya-jawab dengan kutipan Arab yang diperiksa kode.",
    },
    {
      phase: "5–7",
      title: "Lebih banyak kitab",
      body: "Karya al-Ghazali lainnya, wiki istilah dan tokoh, lalu ±92 kitab kurikulum pesantren.",
    },
  ],
} as const;
