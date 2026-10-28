# X27 · Terjemahan Inggris per paragraf lewat plugin

> **Fase:** Sisipan · **Status:** selesai (alat dan pilot); produksi terjemahan berjalan bertahap
> **Prasyarat:** X23 (plugin `surau-redaksi`, MCP `/redaksi`), ADR-130 · Tugas pemilik: T-33 (plugin terpasang)
> **Perkiraan:** 1 percakapan agent untuk alat; ±400 percakapan untuk seluruh Ihya

## Tujuan

Terjemahan Inggris per paragraf bisa dibuat lewat langganan Claude (Sonnet), tanpa batch API, dengan bahan dan pemeriksa yang sama dengan batch terjemahan Indonesia ([ADR-132](../keputusan/ADR-132.md)).

## Langkah

1. Pemeriksa batch (`checkTranslation`) dipindah ke `@surau/core` sebagai `checkPassageTranslation(output, input, lang)`. `@surau/llm` mengekspor ulang tanpa perubahan perilaku.
2. Format `surau-terjemah/1` (`translation-schema.ts`), `listTranslationUnits` dan `checkTranslationDraft` (`translation-draft.ts`), serta `translationReadinessIssues`.
3. MCP `/redaksi`: `list_translation_units` dan `check_translation_draft` (12 tool). Instruksi tetap ≤ 2.000 karakter; `uji-mcp.sh` mode `redaksi` ikut diperbarui.
4. CLI `pnpm terjemah cek|impor|daftar`. Folder `data/terjemah/en`.
5. Skill `terjemah-inggris` (aturan dari `translate-passage@5`, glosarium Inggris), plugin 0.2.0, agen `pemeriksa-konten` diperluas untuk terjemahan.
6. Pilot satu bagian lewat skill (Sonnet) dan periksa independen, sesudah deploy MCP.

## Selesai bila

- [x] `pnpm verify` lolos; tes core (unit, cek, kesiapan), MCP (12 tool, dua era), CLI/plugin (PR #217)
- [x] MCP produksi `/redaksi` melayani 12 tool: `uji-mcp.sh https://mcp.surau.org/redaksi redaksi` lolos di dua era, dan `/mcp` tetap 8
- [x] Satu berkas pilot `data/terjemah/en/100007-10000123.json` berstatus `siap`: periksa independen putaran final B16/K2/S0 ([laporan](../../data/reports/terjemah-en-qa-2026-10-28.md))
- [x] STATUS, LOG, ADR-132, X26, pedoman redaksi diperbarui; `peninjau` dijalankan (PR #217)

## Di luar cakupan

- Memuat terjemahan Inggris ke korpus dan peralihan MCP (X26).
- Ringkasan, judul, dan gloss Inggris (X26).
- Batch API (butuh izin pemilik).

## Catatan hasil

- **Alat (PR #217):**
  - pemeriksa batch dipindah ke core;
  - `surau-terjemah/1`;
  - dua tool `/redaksi` (12 tool di produksi);
  - `pnpm terjemah`, ditambah `bahan` di PR pilot;
  - skill `terjemah-inggris`; plugin 0.2.1 (aturan sisa lafaz ayat dan salawat nabi lain ditambahkan sesudah pilot).
- **Pilot 100007 (Sonnet, 18 paragraf):**
  - Periksa mandiri menilai 18 benar, tetapi periksa independen putaran 1 menemukan 1 Salah: pelaku "mengamalkan" tertukar di atsar Umar.
  - Sesudah diperbaiki dan dinilai ulang oleh agen baru: B16/K2/S0.
  - Pelajarannya: lapis 3 wajib untuk setiap berkas.
- **Agen di Claude Code** tidak punya konektor `/redaksi`. Bahan diambil dengan `pnpm terjemah bahan <bagian>` (fungsi yang sama), dan penilai membaca JSON bahan itu. Agen `pemeriksa-konten` baru terdaftar di sesi baru, jadi di sesi ini dijalankan sebagai agen umum Sonnet dengan instruksi berkas agen itu.
- **Kuota:** ±400 ribu token agen per bab 18 paragraf (penerjemah + dua penilai). Pantau sebelum produksi besar.
- **Utang (X26):** kueri bagian besar (memuat seluruh subpohon per panggilan), sidik per paragraf untuk loader, dan sisa lafaz ayat di luar rentang `passage_ayah_ref` (data, bukan aturan).
