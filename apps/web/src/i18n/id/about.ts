// Bagian `id.about` dari kamus UI (src/i18n/id.ts), dipisah per bagian (X09) supaya komponen
// klien hanya membawa string yang dipakainya.

export const about = {
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
} as const;
