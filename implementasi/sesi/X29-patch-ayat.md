# X29 · Patch ayat: kutipan yang terlewat pencocok tampil dengan Kemenag

> **Fase:** Sisipan · **Status:** sebagian (patch aktif dengan opsi b; build staging, promote, dan terjemahan ulang menunggu izin pemilik)
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
   Build ini dijalankan **di mesin agent** (`/home/rekanesia/surau`), tempat data LLM terbaru berada (T-35). Perintahnya, dari checkout utama:
   1. `git switch main && git pull` (patch aktif sejak PR #228).
   2. `SURAU_SHAMELA_ROOT=/home/rekanesia/shamela/database pnpm ingest ihya`. Harapannya: semua gerbang ✓; "Rujukan ayat sah" 2.693 (= 2.514 + 179); ringkasan tetap 623/626; terjemahan ≥ 15.950 (perkiraan ±15.953, usang ±153 + sebelumnya); tidak ada galat `data/patches/ihya-9472-ayat.yaml`.
   3. Bila gagal karena satu entri patch, catat galatnya dan jangan longgarkan patch. Perbaiki di Mac dengan `pnpm ayat:patch`.
   4. `pnpm corpus:load:staging`, lalu `pnpm corpus:qa` untuk staging.
   5. Laporkan angka-angka di atas ke pemilik. Laporan ingest (`data/reports/ihya-9472-*.md`) di-commit lewat PR dari mesin itu.
7. **Terjemahan ulang:** Inggris lewat plugin (`terjemah-inggris`, tiga lapis cek), termasuk 3 paragraf tunda yang berisi kutipan (`data/terjemah/tunda-en.md`). Indonesia lewat batch API (butuh izin biaya) atau lewat plugin bila pemilik memilihnya.

## Selesai bila

- [x] `pnpm verify` lolos, termasuk tes pemuat patch (lokal 2026-10-29: 142 berkas tes lolos, build hijau; diulang sesudah perbaikan peninjau, lihat PR)
- [x] `data/patches/ihya-9472-ayat.yaml` berisi semua kutipan terverifikasi, tanpa huruf Arab (179 entri; `pnpm ayat:patch cek` → 179 lolos, 0 gagal; `grep` huruf Arab → 0)
- [ ] Build staging memuat patch tanpa galat; jumlah rujukan baru = jumlah entri patch (**menunggu izin pemilik**)
- [ ] Daftar paragraf terkena tercatat di laporan; terjemahannya ditandai usang (daftar: [laporan](../../data/reports/ayat-patch-terkena-2026-10-29.md); penandaan usang baru terjadi saat build, belum dibuktikan)
- [x] STATUS, LOG, dan file sesi ini sudah diperbarui

## Di luar cakupan

- Rujukan iqtibas (X30).
- Mengubah ambang pencocok otomatis (`matcher.ts`): patch lebih bisa diaudit daripada melonggarkan aturan.
- Kitab selain Ihya.

## Catatan hasil

- **Alat** ([ADR-134](../keputusan/ADR-134.md)):
  - `tools/ingest/src/quran/ayah-patch.ts` berisi skema, `ayahCandidates`, dan `applyAyahPatch`, dengan tes mushaf buatan;
  - pemuat di `pipeline.ts` (`ayahPatchRefs`, `WorkConfig.ayahPatch`) dan baris laporan `patched`;
  - `pnpm ayat:patch buat|cek [--terkena]`;
  - `readStrictYaml` dipisah dari `readTocPatch`.
- **Patch:** 179 kutipan di 153 paragraf (153 persis, 26 mirip). Asalnya:
  - 112 dari vonis X28;
  - 67 dari verifikasi sisa 651 calon tebakan iqtibas dan formula oleh 6 agen Sonnet (kutipan 67, iqtibas 198, formula 310, bukan 76).

  Daftar vonis gabungan ada di [data/reports/ayat-audit-2026-10-29-vonis.tsv](../../data/reports/ayat-audit-2026-10-29-vonis.tsv): 179 kutipan dan 253 iqtibas (iqtibas untuk X30).
- **Koreksi kecil oleh agen utama:**
  - istirja' p765: rentang audit terbelah dua, diperluas ke lafaz utuh;
  - p13428: lafaz "wa la taziru" ada di empat surat, bukan 53:38; dipilih letak pertama mushaf;
  - basmalah yang dibaca Nabi tetap formula (ADR-133).
- **Temuan peninjau (BLOCKER):** hash ringkasan AI dan Intisari juga memakai teks bertanda ayat. Patch akan menggugurkan 245/623 ringkasan dan 7/19 Intisari yang tayang, dan build gagal di gerbang cakupan ringkasan. Karena itu patch belum diaktifkan (`WorkConfig.ayahPatch` dikomentari) sampai pemilik memilih opsi di ADR-134 butir 5.
- **Dampak terjemahan:** 153 terjemahan AI Indonesia yang tayang akan gugur di build berikutnya. Paragrafnya tampil tanpa terjemahan sampai diterjemahkan ulang. 5 paragraf Inggris di repo ikut usang ([daftar](../../data/reports/ayat-patch-terkena-2026-10-29.md)).
- **Sisa langkah (butuh pemilik):**
  - build korpus staging dan cek jumlah rujukan (+179);
  - promote;
  - terjemahan ulang Indonesia 153 paragraf: batch API (izin biaya, perkiraan kecil) atau plugin;
  - terjemahan ulang Inggris 8 paragraf lewat plugin sesudah promote.
- **Utang:**
  - rentang patch mengikuti deret audit, sehingga bisa lebih pendek dari kutipan bila ejaan berbeda di ujungnya;
  - calon "lemah" (4.364) belum diaudit;
  - catatan kaki tidak diaudit.
- **Opsi (b) (pilihan pemilik, 2026-10-29):** ringkasan dan Intisari memakai rujukan pencocok saja (`matcherRefs`), dan patch diaktifkan. Build lokal tanpa vs dengan patch:
  - ringkasan 544/626 di keduanya;
  - terjemahan 16.070 → 15.922;
  - rujukan 2.514 → 2.693.

  Build lokal tetap gagal di gerbang ringkasan karena data LLM di Mac ini tertinggal (82 ringkasan usang dan Intisari kosong sebelum patch). Bukti build sungguhan menunggu build staging.
- **Perbaikan sumber Tanzil:** alat `ayat:patch` dan `ayat:audit` kini membaca Tanzil XML yang dipin, sama dengan ingest. Versi teks menempelkan basmalah ke ayat 1, sehingga entri p20357 (QS 108:1) sempat lolos `cek` tetapi gagal di ingest. Rentangnya kini dimulai sesudah basmalah.
- **Temuan peninjau opsi (b), sudah ditangani:**
  - bendera "blok berayat" Intisari diambil dari rujukan lengkap (`passageBlocks` `ayahFlag`), supaya batch menolak kutipan yang juga ditolak build;
  - akibat permanen opsi (b) ditulis di ADR-134;
  - 28 kutipan Intisari produksi dan staging tidak menyentuh rentang patch.
- **Utang:** tes bahwa `summaryPlan`/`digestPlan` memberi hash sama dengan dan tanpa baris patch (sekarang dibuktikan lewat build lokal: ringkasan 544/626 di keduanya). `matcherRefs` terkunci ke `IHYA.ayahPatch`, jadi kitab kedua perlu meneruskan path dari `WorkConfig`.

