# X29 · Patch ayat: kutipan yang terlewat pencocok tampil dengan Kemenag

> **Fase:** Sisipan · **Status:** belum
> **Prasyarat:** X28 (audit, ADR-133) · Tugas pemilik: izin build + promote korpus; izin biaya bila terjemahan Indonesia diulang lewat batch API
> **Perkiraan:** 2 percakapan agent (alat + patch; penerjemahan ulang menyusul)

## Tujuan

Kutipan ayat yang terverifikasi di audit X28 tetapi belum punya `passage_ayah_ref` mendapat rujukan lewat berkas patch yang bisa diaudit. Sesudah build berikutnya kutipan itu menjadi placeholder `⟦QS s:a⟧` dan tampil dengan terjemahan Kemenag. Terjemahan AI paragraf yang terkena diterjemahkan ulang.

## Baca dulu (hanya ini)

- [ADR-133](../keputusan/ADR-133.md), [ADR-040](../keputusan/ADR-040.md), [ADR-042](../keputusan/ADR-042.md)
- Laporan audit: [data/reports/ayat-audit-2026-10-29.md](../../data/reports/ayat-audit-2026-10-29.md)
- `tools/ingest/src/quran/matcher.ts` (keluaran `passage_ayah_ref`), `tools/ingest/src/quran/audit.ts`, `packages/db/migrations/corpus/0005_quran.sql`
- Pola patch yang sudah ada: `data/patches/ihya-9472*.yaml`

## Langkah

1. **Format patch** `data/patches/ihya-9472-ayat.yaml`: satu entri per kutipan berisi `passage_id`, `char_start`, `char_end`, `span_sha256` (sha256 potongan `text_raw`, supaya patch gagal keras bila teks berubah), `surah`, `ayah_from`, `ayah_to`, `partial`, `sumber` (`audit-2026-10-29`), dan `catatan` (tanpa huruf Arab). Berkas ini tidak memuat teks kitab.
2. **Isi patch dari vonis audit.** Mulai dari 112 kutipan terverifikasi di `data/reports/ayat-audit-2026-10-29-vonis.tsv`. Lalu verifikasi 409 tebakan iqtibas dan 242 tebakan formula yang belum dicek (perkiraan ±70 kutipan lagi) dengan agen Sonnet memakai kriteria ADR-133. Offset berlaku untuk korpus produksi 2026-10-29: jalankan ulang `pnpm ayat:audit` bila korpus sudah berubah. Batas dan nomor ayat dicek terhadap Tanzil oleh kode: rentang harus cocok `exact` atau `similar` dengan ambang ADR-040, kalau tidak entri ditolak.
3. **Pemuat di pipeline** (`pipeline.ts`/`rows.ts`): patch dibaca sesudah pencocok, entri yang menimpa rujukan yang sudah ada ditolak, `bracketed = 0`, `match` dihitung kode. Validasi build gagal bila `span_sha256` tidak cocok atau rentang memotong kata.
4. **Tes:** patch baik dimuat; sha salah, rentang tumpang tindih, ayat tak ada, dan rentang bukan ayat ditolak. Tes integrasi dengan DB Ihya lokal dilewati bila DB tidak ada.
5. **Daftar paragraf terkena:** paragraf yang mendapat rujukan baru dan sudah punya terjemahan AI Indonesia (dan Inggris di `data/terjemah/en`). Tandai terjemahan itu `source_stale` agar tidak lolos kesiapan sampai diterjemahkan ulang.
6. **Build korpus staging** dan cek: jumlah `passage_ayah_ref` bertambah sesuai patch, placeholder muncul di bahan terjemahan. Promote ke produksi hanya atas izin pemilik.
7. **Terjemahan ulang:** Inggris lewat plugin (`terjemah-inggris`, tiga lapis cek), termasuk 3 paragraf tunda yang berisi kutipan (`data/terjemah/tunda-en.md`). Indonesia lewat batch API (butuh izin biaya) atau lewat plugin bila pemilik memilihnya.

## Selesai bila

- [ ] `pnpm verify` lolos, termasuk tes pemuat patch
- [ ] `data/patches/ihya-9472-ayat.yaml` berisi semua kutipan terverifikasi, tanpa huruf Arab
- [ ] Build staging memuat patch tanpa galat; jumlah rujukan baru = jumlah entri patch
- [ ] Daftar paragraf terkena tercatat di laporan; terjemahannya ditandai usang
- [ ] STATUS, LOG, dan file sesi ini sudah diperbarui

## Di luar cakupan

- Rujukan iqtibas (X30).
- Mengubah ambang pencocok otomatis (`matcher.ts`): patch lebih bisa diaudit daripada melonggarkan aturan.
- Kitab selain Ihya.

## Catatan hasil

*(diisi agent di akhir sesi)*
