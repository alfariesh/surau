# Catatan Rilis Surau

Ditulis untuk pengguna, dalam bahasa awam. Detail teknis ada di `implementasi/LOG.md`.

## Fase 3 · MCP publik — calon rilis (`rilis-f3` belum dibuat)

Kini AI Anda bisa mencari dan membaca *Ihya' 'Ulum ad-Din* dari Surau melalui koneksi MCP. Panduan pemasangan dan contoh pemakaian tersedia di https://surau.org/mcp; alamat koneksinya https://mcp.surau.org/mcp, tanpa login.

**Yang baru**
- AI bisa membuka daftar karya dan daftar isi, membaca halaman atau bagian kitab, mencari dengan kata Indonesia maupun Arab, memeriksa kecocokan kutipan, dan mengambil catatan takhrij yang tertaut.
- Hasil menyertakan teks sumber, rujukan halaman cetak, tautan ke pembaca Surau, serta atribusi dan lisensi. Terjemahan dan ringkasan tetap berlabel AI; ayat yang dikenali memakai terjemahan Kemenag.
- Sudah dicoba dari Claude Code, Claude.ai, dan Cloudflare AI Playground. Panduan juga memuat Claude Desktop, ChatGPT, dan klien MCP lain.
- Server Surau menyediakan data tanpa memanggil model AI. Pemakaian layanan AI Anda mengikuti biaya dan ketentuan penyedianya.

**Keterbatasan yang diketahui**
- Korpus saat ini baru *Ihya'*. AI yang Anda pakai masih bisa salah mengutip atau menafsirkan hasil; gunakan tautan sumber dan pemeriksaan kutipan.
- Catatan takhrij disajikan sesuai teks yang tertaut. Status hadits yang tidak tersedia tetap tidak diketahui.
- Claude Desktop dan ChatGPT belum diuji langsung dengan akun nyata. Hasil satu halaman penuh bisa besar; gunakan pembacaan per bagian bila konteks AI terbatas.
- Ada batas pemakaian. Pengguna Claude.ai dapat berbagi batas IP penyedianya. Pemantauan 17–24 Oktober masih berjalan; kestabilan satu minggu belum dinyatakan.

Calon rilis ini menunggu pemeriksaan akhir, preview, dan persetujuan pemilik sebelum rilis fase/tag.

## Fase 2 · Cari — 17 Oktober 2026 (`rilis-f2`)

Kini Anda bisa mencari di mana al-Ghazali membahas sesuatu di *Ihya'*, dengan kata Indonesia maupun Arab, lalu langsung membuka halaman kitabnya. Mulai dari https://surau-web.alfarieshsalman.workers.dev/cari

**Yang baru**
- **Cari** (menu Cari, atau ⌘K / Ctrl+K dari halaman mana pun): ketik kata Indonesia (misalnya *sabar*, *niat*, *adab murid kepada guru*) atau kata Arab. Hasilnya dikelompokkan per halaman cetak, dengan kata yang dicari disorot di teks asli, dan bisa disaring per rub' atau kitab. "Buka di pembaca" membawa Anda ke paragrafnya.
- **Terjemahan AI per paragraf dan ringkasan AI di awal bab.** Keduanya selalu berlabel "AI" dan ditampilkan bersama teks Arab aslinya, supaya bisa dibandingkan. Terjemahan ini alat bantu memahami, bukan pengganti teks kitab.
- **Rujukan ayat Al-Qur'an:** kutipan ayat di dalam kitab ditandai "QS surah:ayat". Ketuk untuk melihat teks ayat (Tanzil), transliterasi, dan terjemahan resmi Kemenag apa adanya. Ayat tidak pernah diterjemahkan AI.
- **Mutu pencarian diukur:** 31 pertanyaan uji yang disetujui pemilik; untuk semuanya, tempat yang benar muncul di 10 hasil teratas (target 90%).

**Keterbatasan yang diketahui**
- Baru satu kitab (*Ihya'*). Kitab lain menyusul.
- Terjemahan AI bisa keliru. Dari 20 sampel acak yang dinilai, 14 benar; kesalahan yang ditemukan sudah diperbaiki, tetapi belasan ribu terjemahan lainnya belum diperiksa manusia satu per satu. Bila ragu, rujuk teks Arabnya, dan laporkan lewat tombol "Laporkan kesalahan".
- Sebagian kecil kutipan ayat mungkin belum dikenali, sehingga ikut diterjemahkan AI sebagai bagian kalimat.
- Hasil yang paling tepat belum selalu ada di urutan pertama (baru tepat di urutan pertama untuk sekitar dua pertiga pertanyaan uji); periksa beberapa hasil teratas.
- Alamat situs masih memakai `workers.dev`; domain sendiri menyusul.

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
