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
- [ ] Claude Code dan Claude.ai berhasil memanggil `search_text` dan `read_page`; contoh tercatat
- [ ] Syarat rilis R3 di FASE.md terpenuhi
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Catatan hasil

*(diisi agent)*
