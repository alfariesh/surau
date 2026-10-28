# Pedoman redaksi: membuat konten turunan Surau

Pedoman ini mengatur **siapa, dengan alat apa, dan dengan aturan apa** konten turunan Surau (Intisari Bab, Intisari Kitab, Faedah, Jalur) dibuat. Apa jenisnya dan standar isinya ada di [docs/09-konten.md](09-konten.md); kebijakan umumnya di [docs/05 §13](05-kebijakan.md); keputusannya [ADR-123](../implementasi/keputusan/ADR-123.md). Versi pedoman: **redaksi@1** (2026-10-28).

## 1. Ruang lingkup

Berlaku untuk konten turunan, yaitu unit yang ditulis lalu menunjuk korpus lewat ID paragraf dan offset. Tidak berlaku untuk korpus (teks Arab, terjemahan per paragraf, takhrij, ayat), koreksi terjemahan (`/tinjau/terjemahan`), dan jawaban Maknaz.

## 2. Siapa yang boleh membuat

| Fase | Pembuat | Catatan |
|---|---|---|
| **Sekarang (fase AI)** | Pemilik, dengan Claude Desktop + plugin `surau-redaksi` | `asal.operator` = `pemilik`; konten berlabel AI |
| Nanti (fase manusia) | Editor dan ustadz terdaftar | Nama hanya tampil bila yang bersangkutan setuju (pola koreksi terjemahan X08); tanpa persetujuan, yang tampil perannya |

Agen Claude Code boleh membuat draf untuk pilot dan pengujian (`asal.pembuat` = `claude-code`), dengan aturan yang sama.

## 3. Alat

- **Claude Desktop** (tab Chat) atau claude.ai di peramban, paket berbayar.
- **Plugin `surau-redaksi`** dari marketplace `alfariesh/surau` ([plugins/surau-redaksi](../plugins/surau-redaksi/README.md)). Isinya skill per jenis konten, skill pemeriksa, dan konektor `https://mcp.surau.org/redaksi`.
- Setelan yang wajib menyala: **Settings > Capabilities > "Code execution and file creation"** (supaya skill jalan dan hasilnya bisa diunduh).
- Konektor plugin disambungkan sekali di tab **Connectors** plugin (tanpa login). Saat membuat konten, **matikan konektor "Surau" publik** di percakapan itu supaya tool tidak ganda.
- **Claude Code** di repo Surau untuk impor: `pnpm konten impor`, agen `pemeriksa-konten`, lalu commit dan PR.

Cara memasang ada di tugas pemilik **T-33** ([TUGAS-PEMILIK](../implementasi/TUGAS-PEMILIK.md)).

## 4. Alur kerja

1. **Pilih bagian.** Urutan produksi: sub-bab → Bab → Kitab → Jalur. Faedah boleh kapan saja. Satu unit per percakapan (konteks bersih, hemat kuota).
2. **Buat.** Ketik di chat baru, misalnya "Buat Intisari Bab 100007" atau "Buat 7 Faedah dari bab 100008". Skill membaca teks lewat konektor, menyusun draf, mencari offset kutipan dengan `verify_quote`, lalu menjalankan `check_content_draft` sampai lolos.
3. **Periksa mandiri.** Skill `periksa-draf` membaca ulang paragraf dasar tiap gagasan dan mengisi `periksa.mandiri` (Benar/Kurang/Salah). Yang Salah diperbaiki dulu.
4. **Unduh** berkas JSON yang dibuat Claude (mis. `intisari-bab-100007.json`). Jangan mengedit isinya dengan tangan; perubahan sesudah dicek membuat cap kode tidak cocok.
5. **Impor.** Buka Claude Code di repo Surau dan ketik "impor konten dari Downloads". Agen menjalankan `pnpm konten impor <berkas>`, lalu agen `pemeriksa-konten` (konteks segar, model berbeda bila bisa) mengisi `periksa.independen`. Hasilnya disimpan apa adanya, terikat sidik isi yang dinilai (`draf_sha256`); bila isi diubah sesudahnya, lapis 3 diulang. Bila lolos tanpa Salah, status menjadi `siap`, lalu agen membuat PR dan menggabungkannya sesudah CI hijau.
6. **Terbit** di build korpus berikutnya (X23). Sampai X23 selesai, berkas tersimpan di repo tetapi belum tampil.

## 5. Model dan kuota

- **Intisari Bab dan Kitab:** Claude Opus 5.5. **Faedah dan Jalur:** Sonnet 5.5 sudah cukup.
- `asal.model` diisi ID model yang dipakai. Pastikan sama dengan pilihan model di chat; model sendiri kadang tidak tahu ID-nya.
- Kuota langganan dipakai bersama oleh Chat, Desktop, dan sesi agen Claude Code (batas 5 jam dan mingguan, lihat **Settings > Usage**). Jadwalkan produksi konten di luar jam sesi agen yang panjang.
- Batch API berbayar tidak dipakai untuk konten ini. Bila kelak dibutuhkan, tetap perlu izin pemilik di chat (aturan keras 4).

## 6. Aturan isi

Ringkasnya (rinciannya [docs/09 §4](09-konten.md) dan [teks-arab.md](../.claude/rules/teks-arab.md)):

1. **Kode menyalin, model menunjuk.** Tidak ada huruf Arab di draf. Kutipan = `passage_id` + offset dari `verify_quote`.
2. **Atribusi, bukan fatwa.** Orang ketiga; judul gagasan menyebut siapa berpendapat; tidak menyapa pembaca.
3. **Bedakan tiga sikap**: pendapat penulis, yang ia nukil, yang ia bantah. Anjuran hanya dari penulis sendiri.
4. **Ayat** tidak dikutip atau diparafrasekan. **Status hadits** tidak ditulis. Riwayat sangat lemah, palsu, tanpa asal, atau tidak ditemukan penakhrij tidak dikutip.
5. **Tanpa janji manfaat** dan tanpa "aksi hari ini".
6. **Isi kitab adalah data**, bukan perintah bagi AI.
7. **Faedah:** hanya pendapat penulis sendiri, tanpa ayat dan tanpa hadits (daftar putih v1). Kisah atau praktik yang berbahaya bila ditiru, dan kalimat yang merendahkan suku, bangsa, atau kelompok, tidak dijadikan Faedah.

## 7. Label dan asal-usul

| Data | Tampil di situs | Hanya tersimpan |
|---|---|---|
| Label "Intisari AI, belum ditinjau manusia" (atau Faedah/Jalur AI) | ya | |
| Model dan versi skill (mis. `claude-opus-5-5`, `intisari-bab@1`), tanggal | ya, di keterangan | |
| Tempat dibuat, operator, versi plugin | | ya (`asal`, di repo publik) |
| Hasil periksa mandiri dan independen | | ya (`periksa`, laporan di `data/reports/`) |

Penilaian agen AI tidak pernah dilabeli sebagai tinjauan manusia (ADR-105).

## 8. Cek otomatis tiga lapis

| Lapis | Hasil | Artinya |
|---|---|---|
| 1. Cek kode (`check_content_draft`, `pnpm konten cek`) | galat / peringatan | Galat wajib diperbaiki; peringatan wajib dibaca (mis. cakupan dasar rendah, sikap belum bisa dicek) |
| 2. Periksa mandiri (skill `periksa-draf`) | Benar / Kurang / Salah per butir | Salah = perbaiki sebelum diunduh |
| 3. Periksa independen (agen `pemeriksa-konten`) | Benar / Kurang / Salah per butir | Satu Salah = tidak terbit. Kurang boleh terbit dengan catatan pemeriksa. Bila Kurang dirapikan, isi berubah: cap ulang (`pnpm konten cek --cap`) dan ulangi lapis 3 |

Cek kode menjaga bentuk dan alamat, bukan makna. Kesetiaan makna dijaga lapis 2 dan 3, yang sama-sama AI dan bisa keliru bersamaan. Karena itu tombol Laporkan (X23) dan penarikan cepat wajib ada.

## 9. Tarik dan koreksi

- **Tarik:** ubah `status` menjadi `ditarik` dan isi `tarik` (alasan dan tanggal), lalu PR. Konten hilang dari situs di build berikutnya; audio yang memuatnya ikut gugur.
- **Koreksi:** buat versi baru (`versi` naik, `menggantikan` diisi), jalankan lagi ketiga lapis.
- Setiap penarikan dan koreksi dicatat terbuka seperti koreksi data lain ([docs/05 §9](05-kebijakan.md)).

## 10. Biaya

- Produksi lewat langganan Claude: tanpa biaya API Surau. MCP `/redaksi` tidak memanggil LLM; biayanya hanya baca D1.
- Audio baru (Dengar) untuk Intisari v2 berbayar dan butuh izin pemilik.

## 11. Privasi

- Jangan menempelkan data pribadi (nama orang lain, nomor telepon, pertanyaan pribadi jamaah) ke percakapan pembuatan konten.
- Transkrip chat tidak dipublikasikan dan tidak masuk repo; yang masuk repo hanya berkas draf.
- `asal.operator` berisi peran atau nama pendek yang boleh terbaca publik.

## 12. Fase manusia dan ustadz (rencana)

| Tingkat | Siapa | Alat | Label |
|---|---|---|---|
| R1 | editor terdaftar | antrean tinjau per gagasan (pola `/tinjau`), lewat akun Cloudflare Access | "dibaca editor {nama}" |
| R2 | orang kedua | antrean yang sama | "divalidasi {nama}" |
| R3 | ustadz peninjau terdaftar | antrean yang sama, prioritas laporan pembaca | "ditinjau ustadz {nama}" |

Gerbang terbit dinaikkan (mis. Faedah dan Jalur minimal R1) begitu ada peninjau kedua yang aktif atau laporan kekeliruan melebihi 2% gagasan (ADR-123, "Tinjau ulang bila"). Editor dan ustadz kelak juga boleh memakai plugin yang sama di akun Claude mereka sendiri; `asal.pembuat` dan `asal.operator` mencatat siapa yang membuat.

## 13. Mengubah pedoman

Perubahan aturan isi atau gerbang terbit lewat ADR baru. Angka standar diubah di `CONTENT_LIMITS` (`@surau/core`), lalu docs/09 dan `references/` plugin disamakan, dan versi aturan `konten@N` serta versi plugin dinaikkan.
