// Bagian `id.upcoming`: kitab kandidat "Segera hadir" di /kitab dan popup minatnya (ADR-115).

export const upcoming = {
  heading: "Segera hadir",
  lead: "Kitab yang sedang kami pertimbangkan untuk Surau. Ini rencana, belum janji: urutannya ikut ditentukan minat pembaca dan kejelasan lisensi teksnya.",
  filterLabel: "Saring menurut bidang",
  all: "Semua",
  fields: {
    tasawuf: "Tasawuf & adab",
    quran: "Al-Qur'an",
    fikih: "Fikih",
    ushul: "Ushul fikih",
    bahasa: "Bahasa Arab",
    istilah: "Istilah",
  },
  dialogLead:
    "Dua pertanyaan singkat supaya kami tahu kitab mana yang paling dibutuhkan dan bantuan apa yang perlu disiapkan.",
  purposeLabel: "Untuk apa Anda ingin membacanya?",
  purposes: {
    self_study: "Belajar sendiri",
    teaching: "Mengajar atau mengisi kajian",
    research: "Riset atau menulis",
    other: "Lainnya",
  },
  arabicLabel: "Seberapa lancar Anda membaca teks Arab tanpa harakat?",
  arabicLevels: {
    beginner: "Belum bisa, butuh terjemahan",
    with_help: "Bisa dengan bantuan kamus atau terjemahan",
    fluent: "Lancar",
  },
  privacy:
    "Tanpa nama atau email. Yang disimpan hanya hitungan per hari untuk kitab ini dan dua pilihan Anda; alamat IP hanya dipakai sesaat untuk membatasi kiriman beruntun.",
  privacyLink: "Kebijakan privasi",
  cancel: "Batal",
  submit: "Kirim",
  sending: "Mengirim…",
  thanks: "Terima kasih. Pilihan Anda ikut menentukan kitab berikutnya.",
  alreadyVoted: "Anda sudah memilih kitab ini dari browser ini. Terima kasih.",
  errorRate: "Terlalu banyak kiriman dalam waktu singkat. Coba lagi sebentar lagi.",
  errorGeneric: "Pilihan belum bisa dikirim sekarang. Coba lagi nanti.",
  errorNetwork: "Gagal mengirim. Periksa koneksi lalu coba lagi.",
  honeypot: "Jangan isi kolom ini",
} as const;
