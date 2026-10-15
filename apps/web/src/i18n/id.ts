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
    logoLabel: "Surau, ke Beranda",
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

  footer: {
    nonprofit: "Nirlaba · open source",
    source: "Kode sumber di GitHub",
  },

  home: {
    pageTitle: "Beranda",
    eyebrow: "Sedang dibangun",
    heading: "Asisten riset kitab klasik Islam, dalam bahasa Indonesia",
    lead: "Surau membantu Anda menemukan, membaca, dan memahami apa yang tertulis di kitab-kitab klasik. Setiap jawaban punya alamat: kitab, jilid, halaman cetak, dan kutipan Arab aslinya.",
    firstBook: "Kitab pertama: Ihya 'Ulum al-Din karya al-Ghazali.",
    ctaAbout: "Kenali Surau",
    ctaSource: "Lihat kode sumber",
    demoLabel: "Contoh tampilan teks Arab",
    demoCaption: "Basmalah, sebagai contoh tipografi teks Arab di Surau.",
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
    roadmap: [
      { phase: "0", title: "Fondasi", body: "Situs ini: tentang Surau, prinsip, dan status." },
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
      "Konten turunan (teks, terjemahan, ringkasan, indeks, dan dump data): CC BY-NC-SA 4.0, dengan atribusi ke sumber aslinya.",
    sourceLink: "Kode sumber Surau di GitHub",
  },

  notFound: {
    pageTitle: "Halaman tidak ditemukan",
    heading: "Halaman tidak ditemukan",
    body: "Alamat yang Anda buka tidak ada atau sudah dipindahkan.",
    back: "Kembali ke Beranda",
  },
} as const;

export const SOURCE_URL = "https://github.com/alfariesh/surau";
