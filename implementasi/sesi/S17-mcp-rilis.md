# S17 · Dokumentasi, uji klien nyata & rilis MCP

> **Fase:** 3 · **Status:** berjalan
> **Prasyarat:** S16 selesai · Tugas pemilik: **T-18** (uji connector di Claude.ai) dikerjakan di langkah 2
> **Perkiraan:** 1 percakapan agent

## Tujuan

Orang awam bisa memakai Surau dari Claude atau ChatGPT dalam 2 menit, dan MCP dirilis publik.

## Baca dulu

- [FASE.md · R3](../FASE.md#fase-3--mcp-publik), [ARSITEKTUR-TEKNIS.md](../ARSITEKTUR-TEKNIS.md) §1–2, §7–8, dan [KONVENSI.md](../KONVENSI.md).
- [Worker MCP](../../apps/mcp/README.md), [T-18/T-19](../TUGAS-PEMILIK.md#fase-3-mcp), dan `.claude/rules/teks-arab.md`.

## Langkah

1. Buat halaman `/mcp` berbahasa Indonesia dengan pola halaman informasi yang sudah ada; semua teks di `src/i18n/id.ts`. Cantumkan URL produksi, langkah Claude.ai, Claude Desktop, Claude Code dan klien lain sesuai docs resmi terbaru, contoh pertanyaan, alur cari → baca → verifikasi → sitasi, keterbatasan AI pengguna, label terjemahan AI, dan lisensi. Tautkan dari navigasi dan sitemap; periksa desktop/ponsel, dua tema, aksesibilitas, dan tautan.
2. Uji klien nyata: Claude Code, Claude.ai custom connector (dilakukan pemilik), dan Cloudflare AI Playground. Catat perintah, hasil, contoh yang baik/buruk tanpa menyimpan isi kitab; perbaiki instruksi/deskripsi bila ada temuan nyata. Jalankan kembali Inspector dua era dan periksa sitasi/lisensi. Tidak memakai LLM berbayar tanpa izin. T-18 (2026-10-17): pemilik telah mengonfirmasi pencarian dan pembacaan halaman berikut tautan berhasil; lengkapi contoh dan uji panduan setelah preview tersedia.
3. Mulai catatan pemantauan produksi untuk 17–24 Oktober 2026 (WIB): volume per tool, error dan baca/biaya D1, batas per IP Anthropic, serta ukuran hasil `read_page`. Catat angka yang benar-benar tersedia beserta sumber dan periode; jangan mengklaim pengamatan satu minggu telah selesai pada hari pertama. Sesuaikan rate limit hanya bila pengukuran mendukungnya, dengan tindak lanjut bila pengamatan belum selesai.
4. Opsional, setelah stabil: `server.json` dan publikasi ke MCP Registry (preview); pemilik login `mcp-publisher`. Pengajuan ke Anthropic Connectors Directory juga opsional.
5. Opsional: Agent Skill "surau" (pola seperti Ansari) yang mengarahkan AI memakai tool Surau dengan benar.
6. Jalankan `pnpm verify`, smoke/e2e UI, uji MCP dua era dan peninjau; simpan bukti R3 di laporan sesi. Perbarui STATUS/LOG/STACK/TUGAS-PEMILIK dan ADR bila perlu. Push PR, tunggu CI hijau, squash merge, cek panduan di produksi. Lengkapi syarat R3 sesuai bukti, lalu sarankan `/rilis 3` kepada pemilik (rilis fase/tag tetap lewat skill rilis yang dipanggil pemilik).

## Selesai bila

- [ ] Halaman panduan MCP tayang dan diuji pemilik
- [x] Claude Code dan Claude.ai berhasil memanggil `search_text` dan `read_page`; contoh tercatat
- [x] Syarat rilis R3 di FASE.md terpenuhi
- [x] STATUS, LOG, dan file sesi ini diperbarui

## Catatan hasil

- Halaman `/mcp` statis: panduan koneksi Claude.ai/Desktop/Code, ChatGPT dan klien lain; URL tanpa login, tiga contoh, alur cari → baca → verifikasi → sitasi, batas AI pengguna, takhrij, lisensi dan bantuan. Semua string di i18n, akses dari navigasi/sitemap dan README.
- Klien nyata: Claude Code 2.1.299 `search_text` → `read_page` j.1 h.48, hasil tool diperiksa langsung (sitasi, permalink dan lisensi/atribusi). Biaya CLI US$0,00344562 atas izin pemilik ≤ US$0,10. Claude.ai: pemilik mengonfirmasi hasil dan tautan muncul (T-18). Playground model demo GLM-4.7-Flash: server Ready, 7 tool, kedua panggilan Completed. Claude Desktop dan ChatGPT hanya docs, belum uji akun nyata.
- Bukti rinci tanpa transkrip/teks kitab: [docs/mcp-operasional.md](../../docs/mcp-operasional.md). Hasil baik dan keluaran klien yang belum mengikuti seluruh instruksi dicatat; bukan jaminan semua kutipan AI terverifikasi. Deskripsi S16 tetap, sudah memuat ukuran dan alur yang tepat.
- Verifikasi: `pnpm verify` → 466 Node + 210 Workers lolos dan build kedua app; `bash .github/scripts/uji-mcp.sh https://mcp.surau.org/mcp` lengkap → lolos kedua era. Integrasi `index.test.ts` memeriksa lisensi + atribusi semua tool dan sitasi hasil berteks. Peninjau kode dan dokumen: tanpa temuan.
- Lokal: putaran awal terganggu timeout dan ENOSPC; ±2 GB cache Next/hasil tes dibersihkan (tanpa menghapus korpus/data batch), verify serial lolos. E2E lokal berikutnya: 97 lolos, 1 dilewati, 2 gagal pada navigasi pembaca ke 1/201; trace RSC 200 serta galat React script tag belum menetapkan penyebab. **E2E Worker Preview PR #43: 99 lolos, 1 dilewati**, termasuk navigasi pembaca dan panduan di desktop/ponsel dua tema. CI verify + preview + preview mcp hijau; log preview 501 request, 0 error (23 clientDisconnected). Run `39043047128`/`39043047143`, commit `5d0c6e6`; log memakai cadangan `__unknown__`, dapat tercampur Preview lain (ADR-031).
- Observability: event `mcp_tool` per callback hanya nama/outcome/durasi, tanpa input/output/IP; error limiter tertangkap tanpa detail. Snapshot D1 bersama web/MCP: 365.605 baris baca/24 jam, 1.134 kueri baca. Tarif Paid dikoreksi 25 miliar termasuk. Batas pemakaian S16 dipertahankan.
- Pemantauan satu minggu 17–24 Oktober **masih berjalan**, automation harian 09.00 WIB selama tujuh kali (`pantau-mcp-surau-selama-satu-minggu`) aktif di chat ini, tanpa pemberitahuan rutin yang tidak bermakna. Belum ada klaim stabil satu minggu. Registry/directory dan Agent Skill opsional ditunda.
- ADR-050; tidak ada dependensi baru atau perubahan korpus. `/rilis 3` tetap dipanggil pemilik setelah sesi selesai; tag rilis fase belum dibuat.
