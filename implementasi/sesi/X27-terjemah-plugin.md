# X27 · Terjemahan Inggris per paragraf lewat plugin

> **Fase:** Sisipan · **Status:** selesai (alat); produksi terjemahan berjalan bertahap
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

- [ ] `pnpm verify` lolos; tes core (unit, cek, kesiapan), MCP (12 tool, dua era), CLI/plugin
- [ ] MCP produksi `/redaksi` melayani 12 tool (`uji-mcp.sh` mode `redaksi`)
- [ ] Satu berkas pilot `data/terjemah/en/…` berstatus `siap` dengan periksa independen tanpa Salah
- [ ] STATUS, LOG, ADR-132, X26, pedoman redaksi diperbarui; `peninjau` dijalankan

## Di luar cakupan

- Memuat terjemahan Inggris ke korpus dan peralihan MCP (X26).
- Ringkasan, judul, dan gloss Inggris (X26).
- Batch API (butuh izin pemilik).

## Catatan hasil

*(diisi agent di akhir sesi)*
