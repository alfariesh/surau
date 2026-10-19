# Panduan tinjau jawaban

S18 · 2026-10-19 · Penilai yang ditunjuk pemilik: **Anas**. Halaman: [surau.org/tinjau](https://surau.org/tinjau). Ini ruang evaluasi internal; layanan Jawab belum dirilis. **Status 2026-10-19: halaman sudah terpublikasi melalui [PR #48](https://github.com/alfariesh/surau/pull/48), berisi 60 draf soal; persetujuan soal dan penilaian manusia masih T-24.**

## Untuk Anas dan pemilik (T-24)

1. Buka halaman tinjau, masukkan email yang sudah didaftarkan pemilik, lalu masukkan PIN dari email di halaman Cloudflare. Jangan mengirim PIN ke chat. Jika email Anas berbeda, pemilik perlu menambahkannya ke daftar izin dahulu; saat ini hanya satu email yang diberikan pemilik.
2. Pilih soal. Baca pertanyaan, panduan penilaian, jawaban, dan sumber Arab. Tautan sumber membuka halaman kitab. Label **Contoh evaluasi** berarti jawaban buatan agent untuk menguji penilaian; sebagian sengaja salah. **Cari saja** berarti belum ada jawaban yang merangkum sumber.
3. Isi nama sendiri (**Anas** untuk penilaian Anas). Untuk menyetujui soal, periksa pertanyaan, lokasi, dan semua poin kunci. Pilih **Setujui soal**, **Perlu diperbaiki**, atau **Tolak soal**, lalu jelaskan alasannya. Jangan menyetujui berdasarkan jawaban contoh saja.
4. Untuk menilai jawaban, pilih **Benar/Kurang/Salah**, kualitas bahasa **1–5**, apakah semua klaim didukung sumber, dan apakah atribusi penulis/nukilan tepat. Bila belum bisa menilai suatu aspek, biarkan pilihan tersebut. Jawaban kosong tidak dianggap penolakan benar. Takhrij al-'Iraqi dibedakan dari pendapat al-Ghazali.
5. Tekan **Simpan penilaian**. Pastikan pesan tersimpan muncul, lalu coba muat ulang satu soal untuk memastikan isian tetap ada. Mulai dengan **10 penilaian** untuk menguji kenyamanan halaman. Laporkan kendala kepada pemilik.
6. Lanjutkan persetujuan sedikitnya **50 dari 60 soal** dan penilaian sekitar **30 Contoh evaluasi** untuk kalibrasi judge. Soal yang perlu perbaikan boleh ditandai; target tidak boleh memaksa persetujuan yang keliru. Setelah selesai, beri tahu agent agar ekspor dan laporan kesepakatan dihitung.

Penilaian dapat diperbarui oleh akun yang sama. Jangan memakai satu akun untuk dua penilai yang ingin memiliki catatan terpisah: kunci penilai diturunkan dari akun Access. Jangan memasukkan email, nomor telepon, atau pertanyaan pribadi ke alasan. Ekspor memuat soal privat: simpan untuk evaluasi internal, jangan unggah ke repo atau tautan publik.

## Akses dan penyimpanan

Cloudflare Access **Surau Tinjau** melindungi `surau.org/tinjau` dan `surau.org/api/review` beserta turunannya. Login hanya One-time PIN, sesi 24 jam, satu email yang diberikan pemilik. Email hanya ada di kebijakan Cloudflare. Wildcard preview dan `/admin` belum dikonfigurasi.

Aplikasi juga memeriksa tanda tangan JWT RS256, issuer, audience, waktu berlaku, subjek, tipe aplikasi, dan email pada setiap rute. Tanpa JWT sah, Preview/workers.dev tidak memberikan data. Halaman dinamis; API dan ekspor `private, no-store`, `noindex`; POST memeriksa Origin dan membatasi body 12 KB. JWT/email tidak disimpan di DB; kunci penilai adalah hash issuer+subjek. Nama penilai dan alasan tetap berada di penyimpanan internal.

`answer_log` dan `review` berada di **surau-app**, terpisah dari pergantian korpus blue-green. Snapshot jawaban tidak ditimpa; review mengikat hash jawaban. Korpus/hash/sumber yang tidak cocok menutup penilaian. Penilai dapat menyimpan keputusan soal saja, atau jawaban beserta skor bahasa; data invalid ditolak server dan constraint DB.

Retensi awal P-7: **12 bulan**. Baris kedaluwarsa langsung dikeluarkan dari daftar, pembacaan, mutasi, dan ekspor. **Penghapusan fisik belum otomatis**; operator perlu menghapus baris kedaluwarsa, beserta review melalui FK cascade. S20 wajib menjadwalkan pembersihan sebelum data pertama kedaluwarsa Oktober 2027, termasuk salinan ekspor/R2. S18 hanya menyimpan soal terkurasi; penerimaan pertanyaan pengguna umum dan penyamaran PII belum diaktifkan.

## Operasi agent

Perintah dijalankan dari root repo. Migrasi `0002_answer_review.sql` diterapkan workflow Deploy sebelum web. Isi antrean menggunakan SQL aditif hasil `eval:jawab seed`; periksa jumlah run dahulu dan **jangan ulangi INSERT** bila sudah ada:

```bash
pnpm wrangler d1 execute APP --config packages/db/wrangler.jsonc --remote --command "SELECT run_id, COUNT(*) AS n FROM answer_log GROUP BY run_id"
pnpm wrangler d1 execute APP --config packages/db/wrangler.jsonc --remote --file evals/private/jawab-runs/s18-tinjau-v1-seed.sql
```

Antrean `s18-tinjau-v1` sudah dimasukkan pada 2026-10-19 dan diverifikasi: 60 soal, 18 privat; 30 contoh kalibrasi publik dan 30 baseline Cari. Ekspor API menggunakan `offset=0`, `offset=50`, dan seterusnya; `X-Next-Offset` memberi halaman berikutnya. Ekspor tidak memuat kunci akun, tetapi masih memuat nama/alasan penilai dan soal privat. Cara golden dan laporan ada di [README eval Jawab](../evals/jawab/README.md).

Untuk pembersihan retensi, baca jumlahnya terlebih dahulu:

```bash
pnpm wrangler d1 execute APP --config packages/db/wrangler.jsonc --remote --command "SELECT COUNT(*) AS expired FROM answer_log WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')"
```

Setelah izin penghapusan produksi dari pemilik, jalankan `DELETE FROM answer_log WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')` melalui perintah yang sama. Jangan menghapus atau menimpa run aktif. Inventaris salinan privat berada di [evals/README](../evals/README.md).

## Bukti dan batas verifikasi

- `pnpm verify` lokal: 485 tes Node + 218 Workers, smoke teks, build web/MCP lolos; peringatan lama lint `search-client.tsx` dan CSS `::highlight` tetap.
- Regresi retrieval: 31 soal resmi, hit@10 **100%**, MRR **0,795**.
- Unit/integrasi: JWT palsu/kedaluwarsa/issuer-audience salah; API anonim tidak membaca DB; Origin asing/input berlebih; persistensi/upsert; hash kedaluwarsa; ekspor privat; kutipan invalid; klaim hadits ganda; persetujuan soal bertentangan; manifest judge berubah.
- Browser: komponen aktual dengan fixture Arab buatan dan API mock lokal; simpan→muat ulang mempertahankan isian; desktop dan ponsel 390 px; RTL, font Noto Naskh 20 px/line-height 40 px, tanpa overflow horizontal. Ini bukan penilaian ustadz dan bukan bukti login produksi.
- Judge: 30 contoh dikirim atas izin ≤ US$1; **29 valid, 1 `max_tokens`**, biaya **US$0,112528**. **0 penilaian manusia**; belum terkalibrasi. Tidak ada retry berbayar otomatis.
- [CI/Preview PR #48](https://github.com/alfariesh/surau/pull/48/checks) hijau (99 tes browser lolos/1 dilewati); [deploy produksi](https://github.com/alfariesh/surau/actions/runs/39206240675) web/MCP hijau. D1 berisi 60 soal/18 privat/30 contoh; saat seed belum ada review. Akses anonim menuju login Access; API Preview menolak 401 dengan no-store.
- Login PIN produksi dikonfirmasi pemilik dan berhasil diperiksa. Uji simpan→muat ulang j001 mempertahankan satu ulasan **Agent QA**, dengan kelayakan soal belum diputuskan; bukan penilaian manusia. Anas boleh menggantinya dengan penilaian sendiri pada akun yang sama. ≥10 penilaian Anas masih perlu T-24. Jangan menandai S18 selesai sebelum persetujuan ≥50 soal dan kalibrasi dicatat.

## Dokumentasi teknis yang diperiksa

Docs-terbaru S18 (2026-10-18): Next 16.4.1 bundled (async headers, Route Handlers, caching); HeroUI MCP (NativeSelect, TextField, TextArea, Button); [Cloudflare validasi JWT](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [One-time PIN](https://developers.cloudflare.com/cloudflare-one/identity/one-time-pin/); [jose](https://github.com/panva/jose); [Anthropic Batches](https://platform.claude.com/docs/en/build-with-claude/batch-processing), [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), dan pricing/SDK 0.135.0. Skill `claude-api` tidak tersedia lokal; panduan resmi build-eval/eval-audit dipakai melalui subagen docs-terbaru.
