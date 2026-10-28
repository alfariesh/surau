---
name: sesi
description: Kerjakan satu sesi implementasi Surau dari folder implementasi/sesi/, mulai dari cek prasyarat sampai verifikasi, pencatatan, dan laporan ke pemilik. Pakai saat pemilik bilang "kerjakan sesi", "sesi berikutnya", "lanjutkan sesi", "kerjakan sesi 4", atau mengetik /sesi.
argument-hint: "[nomor sesi, misalnya 4 atau X01; kosongkan untuk sesi berikutnya]"
---

# /sesi: kerjakan satu sesi implementasi

Argumen: `$ARGUMENTS`. Bila kosong, pakai **sesi berikutnya** dari `implementasi/STATUS.md`.

Pemilik proyek adalah product designer, bukan developer. Ia mengandalkan Anda untuk menyelesaikan sesi ini secara mandiri dan rapi. Pertanyaan dan laporan untuknya harus bisa dipahami tanpa latar belakang teknis.

## 0. Orientasi (singkat, jangan membaca semua dokumen)

1. Baca `implementasi/STATUS.md`. Tentukan file sesi target di `implementasi/sesi/`.
2. Baca file sesi itu sampai habis, lalu hanya dokumen yang ditautkan di bagian **Baca dulu**.
3. Cek `git status`, branch aktif, dan `git log --oneline -5`.
   - Ada perubahan yang belum di-commit dari sesi lain → berhenti dan tanyakan ke pemilik. Usulkan commit bila isinya catatan atau dokumen sesi sebelumnya.
   - Pengecualian sebelum S01: folder `web/` yang belum di-track itu normal (dipindahkan di S01).
4. **Gerbang sesi sisipan:** bila STATUS menulis bahwa gerbang X01 terakhir dicek lebih dari 7 hari lalu, cek dengan `/docs-terbaru @opennextjs/cloudflare dukungan Next 16.4`. Catat tanggal ceknya di STATUS. Bila gerbang terpenuhi, tandai X01 "siap" dan beri tahu pemilik.
5. Bila file sesi masih **garis besar**, rinci dulu langkah dan "Selesai bila"-nya di file itu (sesuai `FASE.md` dan `ARSITEKTUR-TEKNIS.md`) sebelum coding, lalu commit rinciannya.

## 1. Cek prasyarat

- Sesi prasyarat harus berstatus **selesai** dan hasilnya **sudah masuk ke `main`**. Cek dengan `git log main`, dan setelah ada remote, `gh pr list --state open`. Bila belum masuk:
  - Tanyakan ke pemilik: "Hasil Sesi NN belum digabung ke main. Gabungkan sekarang?"
  - Setelah dijawab ya, lakukan squash merge (lewat PR bila sudah ada remote, atau secara lokal bila belum), lalu `git switch main` dan `git pull` bila ada remote.
- Tugas pemilik (T-NN) yang ditulis sebagai **prasyarat** di header sesi harus sudah selesai. Verifikasi sendiri bila bisa, misalnya `node -v`, `pnpm wrangler whoami`, `gh auth status`, `gh secret list`, atau ketersediaan tool MCP lewat ToolSearch. `/mcp` hanya bisa diketik pemilik; minta ia melaporkan hasilnya bila perlu. Tugas yang ditulis "dikerjakan di langkah sesi" bukan prasyarat; selesaikan di langkah itu.
- **Bila terblokir:** jangan diakali. Ubah status sesi menjadi `terblokir`, tulis **MENUNGGU PEMILIK** di STATUS.md beserta ID tugasnya, lalu jelaskan ke pemilik langkah demi langkah dengan bahasa awam (perintah apa diketik di aplikasi Terminal, klik apa di dashboard mana). Setelah itu berhenti.

## 2. Siapkan

- Buat branch `sesi/sNN-slug` dari `main` yang sudah memuat sesi sebelumnya.
- Ubah status sesi menjadi `berjalan` di file sesi dan STATUS.md.
- Untuk setiap teknologi yang disentuh sesi ini, panggil `/docs-terbaru <paket> <pertanyaan>`. Skill ini berjalan di subagen terpisah sehingga konteks utama tetap ringan. Jangan menulis kode dari ingatan untuk API yang mungkin sudah berubah.

## 3. Kerjakan

- Ikuti **Langkah** di file sesi. Bila temuan di lapangan menuntut perubahan rencana, ubah secara terbuka: tulis alasannya di `KEPUTUSAN.md`. Jangan diam-diam keluar dari cakupan.
- Ikuti `implementasi/KONVENSI.md`. Untuk teks Arab, kutipan, atau atribusi, berlaku aturan `.claude/rules/teks-arab.md` (dimuat otomatis saat file kode dibuka).
- Commit kecil dengan pesan yang jelas (lihat KONVENSI). Jalankan `pnpm check` sesering mungkin (setelah S01).
- Jangan pernah menaruh data Shamela, token, atau `.env` di git. Jangan membuka dotfile pemilik (`~/.zshrc`, dan lain-lain).

## 4. Verifikasi (wajib, dengan bukti)

- Jalankan setiap butir **Selesai bila** satu per satu dan simpan bukti singkatnya (perintah + ringkasan keluaran).
- Jalankan subagen `peninjau` dengan rentang yang jelas, misalnya "tinjau `git diff main...HEAD` ditambah perubahan yang belum di-commit". Perbaiki temuan yang valid.
- Bila ada UI, buka di browser (preview) dan cek tampilan teks Arab (RTL, font) serta tampilan di layar ponsel.
- Butir yang gagal **tidak boleh dicentang**, dan butir "Selesai bila" **tidak boleh diubah** supaya sesi tampak lolos. Bila tidak bisa diselesaikan, tulis apa adanya di Catatan hasil dan STATUS.

## 5. Catat

1. **File sesi:** centang butir yang lolos, ubah status, isi *Catatan hasil* (apa yang dibuat, utang teknis, dan pesan untuk sesi berikutnya).
2. **`STATUS.md`:** perbarui bagian *Sekarang* dan *Mulai di sini* bila perlu, *Sesi berikutnya*, *Menunggu pemilik*, dan tabel progres.
3. **`LOG.md`:** tambahkan entri di paling atas, mengikuti format di file itu.
4. **`KEPUTUSAN.md`:** tambahkan ADR untuk setiap keputusan teknis baru.
5. **`STACK.md`:** perbarui versi yang dipasang dan tanggal docs dicek.
6. **`TUGAS-PEMILIK.md`:** tambahkan tugas baru yang ditemukan.
7. **Papan status:** ikuti aturan *Papan status* di `CLAUDE.md`. Buat isu `T-NN · …` (label `tugas-pemilik`) untuk tugas baru, tutup isu tugas yang terverifikasi selesai, dan pasang PR sesi ke papan.
8. Commit catatan ini.

## 6. Gabungkan ke main (tanpa bertanya)

- **Sudah ada remote GitHub:** push, buka PR, tunggu CI hijau, lalu squash merge sendiri. Bila CI merah, perbaiki dulu; jangan merge yang merah.
- **Belum ada remote:** squash merge branch sesi ke `main` secara lokal setelah `pnpm verify` lolos.
- Bila pemilik belum mau menggabungkan, catat di STATUS bahwa sesi berikutnya menunggu merge ini.

## 7. Lapor ke pemilik

Gunakan format ini, dalam bahasa Indonesia yang awam dan maksimal ±15 baris:

```
Sesi NN selesai: <judul>
Yang sekarang bisa dilihat/dicoba: <tautan preview / perintah / halaman>
Yang dikerjakan: <3-5 poin, bahasa awam>
Belum/ditunda: <bila ada, jujur>
Butuh Anda: <tugas pemilik T-NN, izin biaya LLM, atau "tidak ada">
Berikutnya: Sesi MM · <judul>. Ketik /sesi untuk lanjut (sebaiknya di percakapan baru).
```
