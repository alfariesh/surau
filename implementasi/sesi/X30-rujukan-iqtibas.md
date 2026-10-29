# X30 · Rujukan iqtibas: "lih. QS s:a" di samping paragraf

> **Fase:** Sisipan · **Status:** belum
> **Prasyarat:** X28 (audit, ADR-133) · Tugas pemilik: izin build + promote korpus
> **Perkiraan:** 1–2 percakapan agent

## Tujuan

Lafaz Al-Qur'an yang dijalin ke kalimat penulis (iqtibas) diberi rujukan ayat oleh kode, tampil di pembaca dan MCP sebagai "lih. QS s:a". Terjemahannya tetap kalimat penulis dan tidak pernah disebut terjemahan ayat.

## Baca dulu (hanya ini)

- [ADR-133](../keputusan/ADR-133.md) dan laporan [data/reports/ayat-audit-2026-10-29.md](../../data/reports/ayat-audit-2026-10-29.md)
- `tools/ingest/src/quran/audit.ts` (`guessKind`, `FORMULAS`)
- Tampilan rujukan ayat yang sudah ada di pembaca (`apps/web`) dan `read_section` di `apps/mcp/src/tools.ts`

## Langkah

1. **Migrasi korpus** `passage_ayah_allusion` (`passage_id`, `char_start`, `char_end`, `surah`, `ayah_from`, `ayah_to`, `sumber`), terpisah dari `passage_ayah_ref` supaya tidak pernah menjadi placeholder atau segmen Kemenag.
2. **Sumber data:** berkas `data/patches/ihya-9472-iqtibas.yaml` dengan format yang sama seperti patch ayat X29 (`span_sha256`, tanpa huruf Arab). Isinya dari calon audit berjenis iqtibas, diverifikasi agen. Sampel X28 menunjukkan tebakan kode "iqtibas" hanya benar ±32%, jadi setiap calon wajib dicek; yang ternyata kutipan dipindah ke patch X29. Daftar vonis X28 kebanyakan tanpa nomor ayat untuk iqtibas: ambil dari kolom `ayah` hasil `pnpm ayat:audit` (tidak di-commit) lalu validasi terhadap Tanzil.
3. **Pemuat dan validasi** di pipeline, sama dengan X29.
4. **Tampilan:** di pembaca, rujukan iqtibas tampil kecil di bawah atau samping paragraf ("lih. QS 25:70"), tautan ke halaman ayat bila ada. Label tidak memakai kata "terjemahan ayat" atau "Kemenag". MCP `read_section` mendapat field `ayah_allusions`.
5. **Tes:** web (komponen), MCP (dua era), pemuat patch.

## Selesai bila

- [ ] `pnpm verify` lolos
- [ ] Migrasi dan patch iqtibas termuat di build staging
- [ ] Pembaca menampilkan rujukan iqtibas; MCP `read_section` mengembalikan `ayah_allusions`
- [ ] STATUS, LOG, dan file sesi ini sudah diperbarui

## Di luar cakupan

- Menerjemahkan ulang paragraf iqtibas (terjemahan yang ada tetap berlaku, ADR-133).
- Formula zikir (tidak ditautkan).

## Catatan hasil

*(diisi agent di akhir sesi)*
