# Catatan Rilis Surau

Ditulis untuk pengguna, dalam bahasa awam. Detail teknis ada di `implementasi/LOG.md`.

## Fase 1 · Pembaca Ihya — 16 Oktober 2026 (`rilis-f1`)

Kitab pertama Surau, *Ihya' 'Ulum ad-Din* karya al-Ghazali, bisa dibaca lengkap: 4 jilid, 1.706 halaman, dengan takhrij hadits al-'Iraqi. Mulai dari https://surau-web.alfarieshsalman.workers.dev/kitab

**Yang baru**
- **Pembaca kitab** (menu Kitab): halaman per halaman sesuai edisi cetak Dar al-Ma'rifah, daftar isi lengkap, lompat ke jilid/halaman, tombol berikutnya/sebelumnya (juga panah ← → di laptop), dan ukuran huruf yang bisa diatur.
- **Takhrij di tempat:** ketuk penanda (١) di teks Arab untuk membaca catatan takhrij al-'Iraqi tanpa meninggalkan halaman.
- **Alamat yang tepat untuk setiap kutipan:** setiap halaman dan paragraf punya tautan tetap, dan tombol "Salin sitasi" menyalin rujukan lengkap (kitab, jilid, halaman).
- **Laporkan kesalahan:** tombol di setiap halaman kitab untuk melaporkan salah ketik, teks terpotong, atau nomor halaman yang keliru, tanpa menyimpan nama, email, atau alamat IP.
- **Lisensi dan atribusi** (`/lisensi`): siapa pemilik teks, apa yang boleh dilakukan dengannya (CC BY-NC-SA 4.0), dan cara meminta koreksi atau penghapusan. Setiap halaman kitab menautkan halaman yang sama di al-Maktaba al-Shamela.
- **Teks diperiksa:** 30 halaman acak dicocokkan otomatis dengan sumbernya huruf demi huruf (30/30 cocok), dan 10 halaman dicocokkan manusia dengan edisi cetak (10/10 cocok).

**Keterbatasan yang diketahui**
- Belum ada pencarian (Fase 2) dan belum ada terjemahan.
- 609 paragraf ditandai "perlu ditinjau": sebagian takhrij yang di sumbernya tercampur ke teks utama dipisahkan otomatis, dan batasnya belum ditinjau manusia. Teksnya tetap persis seperti sumber.
- Halaman yang pertama kali dibuka butuh ±1 detik; setelah itu cepat.
- Alamat situs masih memakai `workers.dev`; domain sendiri menyusul.
- Laporan koreksi atau permintaan penghapusan sementara lewat tombol "Laporkan kesalahan" dan GitHub; alamat email kontak menyusul.

## Fase 0 · Fondasi — 15 Oktober 2026 (`rilis-f0`)

Surau kini punya rumah di web: https://surau-web.alfarieshsalman.workers.dev

**Yang baru**
- **Beranda:** apa itu Surau, tiga prinsip utama (verbatim atau tidak sama sekali, setiap klaim ada alamatnya, atribusi bukan fatwa), dan peta pembangunan tahap demi tahap.
- **Tentang:** visi, untuk siapa Surau dibuat, apa yang *bukan* Surau, prinsip lengkap, keterbukaan, dan lisensi.
- **Tampilan teks Arab** yang rapi dan nyaman dibaca: huruf Noto Naskh Arabic, arah kanan-ke-kiri, ruang lega untuk harakat. Contohnya basmalah, diambil apa adanya dari teks Tanzil.
- **Tema terang dan gelap**, nyaman di ponsel maupun desktop, dan bisa dipakai dengan keyboard serta pembaca layar (skor aksesibilitas Lighthouse 100).
- Kode sumbernya terbuka di GitHub.

**Keterbatasan yang diketahui**
- Belum ada isi kitab. Menu Kitab, Cari, dan Tanya masih berlabel "segera"; kitab pertama (*Ihya*) hadir di Fase 1.
- Alamat situs masih memakai `workers.dev`; domain sendiri menyusul.
- Lisensi konten (CC BY-NC-SA 4.0) masih rencana dan menunggu keputusan akhir.
- Tombol tema hanya terang atau gelap; belum ada pilihan "ikuti sistem" setelah ditekan.
