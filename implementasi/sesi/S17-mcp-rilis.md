# S17 · Dokumentasi, uji klien nyata & rilis MCP

> **Fase:** 3 · **Status:** belum (garis besar)
> **Prasyarat:** S16 selesai · Tugas pemilik: **T-18** (uji connector di Claude.ai) dikerjakan di langkah 2
> **Perkiraan:** 1 percakapan agent

## Tujuan

Orang awam bisa memakai Surau dari Claude atau ChatGPT dalam 2 menit, dan MCP dirilis publik.

## Langkah (garis besar)

1. Halaman `/mcp` (atau `/pakai-dengan-ai`) dalam bahasa Indonesia: apa itu MCP, langkah menambahkan connector di Claude.ai, Claude Desktop, Claude Code (`claude mcp add --transport http surau https://mcp.<domain>/mcp`), dan klien lain, contoh pertanyaan, keterbatasan (jawaban akhir ditulis oleh AI pengguna; gunakan `verify_quote`), dan lisensi.
2. Uji klien nyata: Claude Code, Claude.ai custom connector (dilakukan pemilik), dan Cloudflare AI Playground. Catat contoh percakapan yang baik dan buruk, lalu perbaiki deskripsi tool.
3. Pantau 1 minggu di preview/produksi: volume per tool, error, dan biaya D1. Sesuaikan rate limit.
4. Opsional, setelah stabil: `server.json` dan publikasi ke MCP Registry (preview); pemilik login `mcp-publisher`. Pengajuan ke Anthropic Connectors Directory juga opsional.
5. Opsional: Agent Skill "surau" (pola seperti Ansari) yang mengarahkan AI memakai tool Surau dengan benar.
6. Lengkapi syarat rilis R3, lalu sarankan `/rilis 3`.

## Selesai bila

- [ ] Halaman panduan MCP tayang dan diuji pemilik
- [ ] Claude Code dan Claude.ai berhasil memanggil `search_text` dan `read_page`; contoh tercatat
- [ ] Syarat rilis R3 di FASE.md terpenuhi
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Catatan hasil

*(diisi agent)*
