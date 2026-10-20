// Halaman /privasi (S20, docs/05 §8, P-7 usulan). Bahasa awam; angka retensi sama dengan
// RETENTION_DAYS (packages/db) dan tabel docs/05 §8. Fakta Anthropic dicek 2026-10-21
// (privacy.claude.com: input/output API dihapus dalam 30 hari; Commercial Terms: tidak dipakai
// melatih model; konten yang ditandai pelanggaran bisa disimpan hingga 2 tahun).
export const privacyText = {
  pageTitle: "Kebijakan privasi",
  heading: "Kebijakan privasi",
  lead: "Surau menyimpan sesedikit mungkin data tentang Anda. Halaman ini menjelaskan apa yang diproses, di mana, dan berapa lama.",
  updated: "Diperbarui 21 Oktober 2026.",
  summaryHeading: "Ringkasan",
  summary: [
    "Tanpa akun dan tanpa login.",
    "Alamat IP tidak pernah disimpan mentah.",
    "Teks pertanyaan Tanya tidak disimpan di database Surau.",
    "Pertanyaan Anda tidak dipakai untuk melatih model AI.",
  ],
  readHeading: "Membaca dan Cari",
  readText:
    "Membaca kitab dan mencari tidak memakai cookie. Kata yang Anda cari tidak disimpan di database Surau. Supaya pencarian yang sama cepat, hasilnya disimpan sementara di cache Cloudflare paling lama 7 hari dalam bentuk kata yang sudah dinormalkan, tanpa keterangan siapa yang mencari. Log teknis mencatat alamat halaman tanpa kata yang dicari.",
  askHeading: "Tanya (jawaban AI)",
  askNotice: "Fitur Tanya belum dibuka untuk umum. Bagian ini berlaku saat fitur tersebut dibuka.",
  ask: [
    "Pertanyaan Anda dikirim ke Anthropic (model Claude) melalui Cloudflare AI Gateway untuk dijawab. Gateway diatur tanpa menyimpan isi pertanyaan maupun jawaban; yang tercatat hanya angka seperti jumlah token dan biaya.",
    "Anthropic menghapus isi permintaan API dalam 30 hari dan tidak memakainya untuk melatih model. Konten yang ditandai melanggar kebijakan penggunaan Anthropic bisa disimpan lebih lama, hingga 2 tahun. Data diproses di server Anthropic dan disimpan di Amerika Serikat.",
    "Cloudflare Turnstile memastikan penanya bukan program otomatis, hanya saat diperlukan. Setelah lolos, browser Anda menerima cookie surau_anon: kode acak bertanda tangan yang berlaku 24 jam dan hanya dikirim ke alamat Tanya.",
    "Kuota harian dihitung dari kode acak (HMAC) cookie dan jaringan internet Anda, dengan kunci yang berganti setiap hari. Alamat IP hanya dipakai sesaat dan tidak disimpan.",
    "Jawaban yang lolos verifikasi disimpan 30 hari tanpa teks pertanyaannya, supaya pertanyaan yang sama tidak perlu dijawab AI dua kali. Jawaban bisa mengulang hal yang Anda tulis, jadi jangan menulis nama, nomor telepon, alamat, atau detail kasus pribadi.",
  ],
  reportHeading: "Laporan kesalahan",
  reportText:
    "Formulir laporan tidak meminta nama atau email, dan alamat IP tidak disimpan. Email, nomor telepon, nomor identitas, dan tautan luar yang ikut terketik disamarkan otomatis sebelum disimpan. Nama orang belum bisa dikenali otomatis, jadi jangan menuliskannya. Laporan disimpan sampai ditangani, lalu dihapus otomatis 12 bulan kemudian.",
  retentionHeading: "Lama penyimpanan",
  retentionLead: "Penghapusan berjalan otomatis setiap hari.",
  retention: [
    { data: "Token Turnstile", where: "Tidak disimpan", how: "Sekali pakai, berlaku 5 menit" },
    { data: "Cookie surau_anon", where: "Browser Anda", how: "24 jam" },
    { data: "Kuota harian (kode acak)", where: "Database Surau", how: "7 hari" },
    { data: "Cache jawaban (tanpa teks pertanyaan)", where: "Database Surau", how: "30 hari" },
    {
      data: "Catatan biaya per pertanyaan (token dan biaya, tanpa teks)",
      where: "Database Surau",
      how: "24 bulan",
    },
    { data: "Laporan kesalahan", where: "Database Surau", how: "Sampai ditangani + 12 bulan" },
    {
      data: "Log teknis (tanpa IP dan tanpa teks pertanyaan; jejak kinerja mencatat perkiraan negara/kota dan jenis peramban)",
      where: "Cloudflare",
      how: "7 hari",
    },
    {
      data: "Hasil pencarian (kata yang sudah dinormalkan, tanpa identitas)",
      where: "Cache Cloudflare",
      how: "Paling lama 7 hari",
    },
    {
      data: "Pertanyaan dan jawaban saat diproses AI",
      where: "Anthropic",
      how: "Maksimal 30 hari (lebih lama bila ditandai pelanggaran)",
    },
    {
      data: "Statistik kunjungan",
      where: "Cloudflare Web Analytics",
      how: "Tanpa cookie dan tanpa data pribadi",
    },
  ],
  dataLabel: "Data",
  whereLabel: "Disimpan di",
  howLabel: "Lama",
  partiesHeading: "Pihak yang memproses",
  parties:
    "Cloudflare (hosting, Turnstile, AI Gateway, Web Analytics) dan Anthropic (model AI untuk Tanya). Surau tidak memasang iklan atau pelacak pihak ketiga lain.",
  contactHeading: "Pertanyaan dan permintaan",
  contactText:
    "Ajukan pertanyaan atau permintaan tentang data lewat formulir laporan di halaman mana pun atau lewat GitHub Issues. Karena Surau tidak menyimpan identitas Anda, kami tidak bisa mencari data milik orang tertentu; yang bisa kami lakukan adalah menghapus laporan atau isi yang Anda tunjukkan.",
  issues: "GitHub Issues Surau",
} as const;
