// Halaman /privasi (S20, docs/05 §8, P-7 usulan). Bahasa awam; angka retensi sama dengan
// RETENTION_DAYS (packages/db) dan tabel docs/05 §8. Fakta Anthropic dicek 2026-10-21
// (privacy.claude.com: input/output API dihapus dalam 30 hari; Commercial Terms: tidak dipakai
// melatih model; konten yang ditandai pelanggaran bisa disimpan hingga 2 tahun).
export const privacyText = {
  pageTitle: "Kebijakan privasi",
  heading: "Kebijakan privasi",
  lead: "Surau menyimpan sesedikit mungkin data tentang Anda. Halaman ini menjelaskan apa yang diproses, di mana, dan berapa lama.",
  updated: "Diperbarui 27 Oktober 2026.",
  summaryHeading: "Ringkasan",
  summary: [
    "Tanpa akun dan tanpa login.",
    "Alamat IP tidak disimpan mentah. Log teknis lama yang sempat memuatnya terhapus otomatis paling lambat 28 Oktober 2026.",
    "Teks pertanyaan untuk Maknaz tidak disimpan di database Surau, kecuali Anda sendiri melaporkan jawabannya sebagai keliru.",
    "Pertanyaan Anda tidak dipakai untuk melatih model AI.",
  ],
  readHeading: "Membaca dan Cari",
  readText:
    "Membaca kitab dan mencari tidak memakai cookie. Kata yang Anda cari tidak disimpan di database Surau. Supaya pencarian yang sama cepat, hasilnya disimpan sementara di cache Cloudflare paling lama 7 hari dalam bentuk kata yang sudah dinormalkan, tanpa keterangan siapa yang mencari. Log teknis mencatat alamat halaman tanpa kata yang dicari. Pilihan tampilan, posisi baca terakhir (untuk “Lanjutkan membaca”), tanda Intisari yang sudah Anda baca (untuk tanda “Sudah dibaca” di halaman Intisari), dan daftar kitab “Segera hadir” yang sudah Anda pilih hanya disimpan di browser Anda (localStorage) dan tidak dikirim ke Surau. Saat Anda memilih kitab “Segera hadir”, yang disimpan di Surau hanya hitungan per hari untuk kitab itu dan dua jawaban pilihan ganda Anda, tanpa nama atau email. Alamat IP hanya dipakai sesaat untuk membatasi kiriman beruntun dan tidak disimpan.",
  listenHeading: "Dengarkan (audio Intisari)",
  listenText:
    "Audio Intisari dibacakan suara AI dan diputar dari media.surau.org (penyimpanan Cloudflare R2), tanpa cookie. Posisi dengar terakhir dan kecepatan putar hanya disimpan di browser Anda (localStorage, kunci surau:listen:v1) supaya bisa dilanjutkan, dan tidak dikirim ke Surau. Menutup pemutar membuatnya tidak dipulihkan lagi; menghapus data situs menghapus posisinya.",
  askHeading: "Maknaz (asisten AI)",
  askNotice: "Maknaz belum dibuka untuk umum. Bagian ini berlaku saat fitur tersebut dibuka.",
  ask: [
    "Pertanyaan Anda dikirim ke Anthropic (model Claude) melalui Cloudflare AI Gateway untuk dijawab. Gateway diatur tanpa menyimpan isi pertanyaan maupun jawaban; yang tercatat hanya angka seperti jumlah token dan biaya.",
    "Anthropic menghapus isi permintaan API dalam 30 hari dan tidak memakainya untuk melatih model. Konten yang ditandai melanggar kebijakan penggunaan Anthropic bisa disimpan lebih lama, hingga 2 tahun. Data diproses di server Anthropic dan disimpan di Amerika Serikat.",
    "Cloudflare Turnstile memastikan penanya bukan program otomatis, hanya saat diperlukan. Setelah lolos, browser Anda menerima cookie surau_anon: kode acak bertanda tangan yang berlaku 24 jam dan hanya dikirim ke alamat Maknaz.",
    "Kuota harian dihitung dari kode acak (HMAC) cookie dan jaringan internet Anda, dengan kunci yang berganti setiap hari. Alamat IP hanya dipakai sesaat dan tidak disimpan.",
    "Jawaban yang lolos verifikasi disimpan 30 hari tanpa teks pertanyaannya, supaya pertanyaan yang sama tidak perlu dijawab AI dua kali. Jawaban bisa mengulang hal yang Anda tulis, jadi jangan menulis nama, nomor telepon, alamat, atau detail kasus pribadi.",
  ],
  reportHeading: "Laporan kesalahan",
  reportText:
    "Formulir laporan tidak meminta nama atau email, dan alamat IP tidak disimpan. Laporan jawaban Maknaz berisi komentar Anda, pertanyaan Anda, dan awal jawabannya (paling banyak sekitar 900 huruf), supaya kesalahannya bisa diperiksa; isinya terlihat sebelum Anda mengirim. Email, nomor telepon, nomor identitas, dan tautan luar yang ikut terketik disamarkan otomatis sebelum disimpan. Nama orang belum bisa dikenali otomatis, jadi jangan menuliskannya. Laporan disimpan sampai ditangani, lalu dihapus otomatis 12 bulan kemudian.",
  retentionHeading: "Lama penyimpanan",
  retentionLead: "Penghapusan berjalan otomatis setiap hari.",
  retention: [
    { data: "Token Turnstile", where: "Tidak disimpan", how: "Sekali pakai, berlaku 5 menit" },
    { data: "Cookie surau_anon", where: "Browser Anda", how: "24 jam" },
    {
      data: "Pilihan tampilan, posisi baca terakhir, tanda Intisari yang sudah dibaca, dan kitab “Segera hadir” yang sudah Anda pilih",
      where: "Browser Anda (localStorage)",
      how: "Sampai Anda menghapus data situs",
    },
    {
      data: "Posisi dengar dan kecepatan putar audio Intisari",
      where: "Browser Anda (localStorage)",
      how: "Sampai Anda menghapus data situs (50 Intisari terakhir)",
    },
    { data: "Kuota harian (kode acak)", where: "Database Surau", how: "7 hari" },
    { data: "Cache jawaban (tanpa teks pertanyaan)", where: "Database Surau", how: "30 hari" },
    {
      data: "Catatan biaya per pertanyaan (token dan biaya, tanpa teks)",
      where: "Database Surau",
      how: "24 bulan (dibulatkan per bulan)",
    },
    {
      data: "Laporan kesalahan (laporan jawaban: komentar, pertanyaan, dan awal jawaban)",
      where: "Database Surau",
      how: "Sampai ditangani + 12 bulan",
    },
    {
      data: "Minat kitab “Segera hadir” (hitungan per hari, kitab, dan dua jawaban pilihan ganda; tanpa identitas)",
      where: "Database Surau",
      how: "Disimpan sebagai statistik",
    },
    {
      data: "Koreksi terjemahan oleh editor terdaftar (nama tampil, alasan, dan kode akun berupa hash; tanpa email)",
      where: "Database Surau",
      how: "Permanen, sebagai riwayat koreksi kitab",
    },
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
    "Cloudflare (hosting, Turnstile, AI Gateway, Web Analytics) dan Anthropic (model AI untuk Maknaz). Surau tidak memasang iklan atau pelacak pihak ketiga lain.",
  contactHeading: "Pertanyaan dan permintaan",
  contactText:
    "Ajukan pertanyaan atau permintaan tentang data lewat formulir laporan di halaman mana pun atau lewat GitHub Issues. Karena Surau tidak menyimpan identitas Anda, kami tidak bisa mencari data milik orang tertentu; yang bisa kami lakukan adalah menghapus laporan atau isi yang Anda tunjukkan.",
  issues: "GitHub Issues Surau",
} as const;
