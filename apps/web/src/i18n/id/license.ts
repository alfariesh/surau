// Bagian `id.license` dari kamus UI (src/i18n/id.ts), dipisah per bagian (X09) supaya komponen
// klien hanya membawa string yang dipakainya.

export const license = {
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
  fontHeading: "Font",
  fontText:
    "Teks antarmuka Surau memakai HarmonyOS Sans (hak cipta Huawei Device Co., Ltd.), dipakai tanpa diubah di bawah Perjanjian Lisensi HarmonyOS Sans Fonts. Teks Arab memakai Noto Naskh Arabic, Amiri, Scheherazade New, dan Noto Sans Arabic (SIL OFL 1.1).",
  fontLicenseLink: "Perjanjian lisensi font",
  correctionHeading: "Koreksi dan penghapusan",
  correctionText:
    "Menemukan salah ketik, teks yang terpotong, atau nomor halaman yang keliru? Ketuk tombol “Laporkan kesalahan” di halaman kitab, atau buka laporan di GitHub.",
  takedownText:
    "Pemegang hak atas sebuah teks atau edisi yang keberatan dengan tampilannya di Surau dapat menghubungi kami lewat GitHub. Bila keberatannya beralasan, teks yang bersangkutan kami turunkan sementara selama ditinjau.",
  issueLink: "Buka laporan di GitHub",
  artHeading: "Ilustrasi",
  artLead:
    "Ilustrasi interaktif di Surau dibuat dengan mesin turunan karya terbuka berikut. Teks lisensi MIT ikut di setiap berkas ilustrasi.",
  artCredits: [
    { name: "iso-glow", by: "April Zhu", license: "MIT", url: "https://iso-glow.vercel.app" },
    {
      name: "iso-figure",
      by: "Tolga Cohce",
      license: "MIT",
      url: "https://github.com/MrBongoC/ai-iso-skill",
    },
  ],
  privacyHeading: "Laporan kesalahan dan privasi",
  privacyText:
    "Formulir laporan kesalahan tidak meminta nama atau email, dan alamat IP tidak disimpan. Email dan nomor telepon yang ikut terketik disamarkan otomatis. Laporan disimpan sampai ditangani, lalu dihapus paling lambat 12 bulan kemudian.",
  privacyMore: "Baca kebijakan privasi lengkap",
} as const;
