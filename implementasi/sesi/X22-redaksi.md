# X22 · Redaksi Surau: rangka konten turunan, standar, plugin Claude, dan pedoman

> **Fase:** Sisipan · **Status:** selesai (pilot; impor ke korpus di X23)
> **Prasyarat:** riset 2026-10-27 (PR #183) · Tugas pemilik: T-33 (pasang plugin), T-34 (aturan WAF `/redaksi`)
> **Perkiraan:** 1 percakapan agent (tiga bagian: core + MCP, plugin + pedoman, pilot)

## Tujuan

Jenis konten di luar korpus difinalkan (Intisari Bab v2, Intisari Kitab, Faedah, Jalur 7 hari) dengan rangka, standar yang diperiksa kode, pedoman produksi, dan plugin Claude `surau-redaksi` supaya pemilik bisa membuat konten di Claude Desktop (langganan, tanpa biaya API). Gerbang terbit: cek otomatis tiga lapis (keputusan pemilik 2026-10-28, ADR-121).

## Kenapa sesi ini ada

Riset 2026-10-27 menemukan pembungkus Intisari lemah, perbaikan isinya ("Tahap B") tertahan biaya batch API, dan dua gagasan Salah masih tayang. Pemilik memilih produksi lewat chat + plugin untuk sementara, dan fase manusia/ustadz sebagai fase sendiri.

## Baca dulu (hanya ini)

- [docs/riset/2026-10-27-ringkasan-buku-dan-pecahan-produk/](../../docs/riset/2026-10-27-ringkasan-buku-dan-pecahan-produk/README.md) (08 audit Intisari, 09 pecahan produk)
- [ADR-121](../keputusan/ADR-121.md), [docs/09-konten.md](../../docs/09-konten.md), [docs/redaksi-operasional.md](../../docs/redaksi-operasional.md)
- Docs plugin Claude (diakses 2026-10-28): claude.com/docs/plugins (overview, build, platform-support), support.claude.com "Use plugins in Claude"

## Langkah

1. PR riset #183 digabung (konflik LOG diselesaikan).
2. Core: pemeriksa narasi, `quoteInspector`, `digestTierOf`, dan `QUOTE_BANNED_TAKHRIJ_KINDS` dipindah ke `@surau/core` (ekspor ulang di tempat lama); `findQuoteAll`/`isQuoteSpan` di `@surau/text`; modul `content-schema`, `content-lint`, `content-check` (`checkContentDraft`, `listFaedahCandidates`, `readinessIssues`); `listGlossaryTermKeys` di `@surau/db`.
3. MCP: endpoint `/redaksi` (8 tool baca + `check_content_draft` + `list_faedah_candidates`), instruksi ≤ 2.000 karakter, ember batas sendiri, label telemetri `endpoint`; `uji-mcp.sh` mode `redaksi` di Preview dan deploy.
4. CLI `pnpm konten cek|impor|daftar` (korpus remote hanya-SELECT); tes luring untuk `data/konten`.
5. Dokumen: docs/09 (rangka dan standar), pedoman redaksi, docs/05 §11 dan §13, ADR-121, README MCP.
6. Plugin `plugins/surau-redaksi` (6 skill, konektor `/redaksi`, marketplace root `surau`), `pnpm plugin:paket`, tes struktur; agen `pemeriksa-konten`; server `surau` di `.mcp.json`; aturan teks-arab mencakup `plugins/**` dan `data/konten/**`.
7. Pilot: Intisari Bab v2 untuk 100007 dan 100017 (dua bab ber-gagasan Salah) dan satu berkas Faedah, lolos tiga lapis; laporan QA di `data/reports/`.
8. Dokumen X23 dan X24, T-33 dan T-34, STATUS dan LOG.

## Selesai bila

- [x] `pnpm verify` lolos — *lihat Catatan hasil*
- [x] `/mcp` tetap 8 tool; `/redaksi` 10 tool di kedua era (tes integrasi MCP)
- [x] Draf rusak ditolak dengan kode yang benar (tes core, MCP, CLI)
- [x] `claude plugin validate` lolos untuk plugin dan marketplace
- [x] Pilot dua Intisari Bab dan satu Faedah lolos cek kode, periksa mandiri, dan periksa independen tanpa Salah — *lihat Catatan hasil*
- [x] T-33 dan T-34 tertulis dengan isunya; STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Impor ke korpus dan tampil di web/MCP (X23); halaman Faedah dan Jalur (X24).
- Menghapus mp3 lama di R2 (izin pemilik); batch API apa pun; Bahan Kajian dan Rujukan.
- Menarik dua gagasan Salah yang masih tayang di produksi (diusulkan sebagai sesi sendiri).

## Catatan hasil

- **Dibuat:** core `content-schema`/`content-lint`/`content-check`/`narrative-check`/`quote-inspect`; MCP `/redaksi` (`redaksi-tools.ts`, `redaksi-instructions.ts` 1.614 karakter); CLI `tools/ingest/src/content/cli.ts`; plugin `plugins/surau-redaksi` + `.claude-plugin/marketplace.json`; agen `.claude/agents/pemeriksa-konten.md`; docs/09, pedoman redaksi, docs/05 §11 dan §13, ADR-121; sesi X23 dan X24; T-33 (#204) dan T-34 (#205).
- **Bukti:** `pnpm verify` lolos; tes core konten 13, MCP 39, CLI dan plugin 16; `claude plugin validate` lolos; CLI terhadap korpus produksi (remote, hanya-SELECT) bekerja.
- **Pilot:** 100007 (B5/K2/S0), 100017 (B6/K1/S0), Faedah 100008 (B4/K2/S0, satu butir dibuang karena terjemahan sumbernya keliru); semua Kurang diperbaiki sesuai saran pemeriksa; tiga unit `siap`. Kesalahan lama *sanah*/sunah dan sikap lahir-batin tidak terulang ([laporan QA](../../data/reports/konten-qa-2026-10-28.md)).
- **Keputusan kecil:** nama kode berbahasa Inggris (`content-*`, `CONTENT_RULES = "konten@1"`), kunci berkas berbahasa Indonesia; tingkat tinjau R0–R3; tool redaksi memakai limiter ketat dengan ember `global:redaksi`; ambang cakupan mengikuti panjang bagian; `pnpm konten cek --cap` untuk cap ulang.
- **Utang:** `/redaksi` belum di aturan WAF (T-34); `pemeriksa-konten` memakai `mcp__surau__*` dari `.mcp.json` (berlaku di sesi Claude Code baru); pilot memakai pemeriksa CLI karena `/redaksi` belum ter-deploy saat itu; terjemahan AI p165 perlu koreksi; dua gagasan Salah lama tetap tayang sampai X23 atau sesi penarikan; Faedah v2 dari potongan kalimat (paragraf > 90 kata) dan konteks daftar.
