# S05 · Paket teks Arab (`packages/text`)

> **Fase:** 1 · **Status:** selesai (2026-10-15)
> **Prasyarat:** S04 selesai (Fase 0 dirilis atau sengaja dilewati) · Tugas pemilik: –
> **Perkiraan:** 1 percakapan agent

## Tujuan

Satu paket TypeScript murni tanpa dependensi runtime, yang menjadi **satu-satunya** tempat logika teks Arab. Paket ini dipakai oleh pipeline ingest (Node) dan Worker (query/verifikasi). Isinya: normalisasi dengan peta offset, stem proklitik, pemisah catatan kaki, pembersih HTML Shamela, `findQuote`, dan `buildFtsMatch`, semuanya dengan tes yang ketat.

## Baca dulu (hanya ini)

- [docs/riset/2026-10-15-pencarian-arab/README.md](../../docs/riset/2026-10-15-pencarian-arab/README.md), beserta prototipe `normalize.ts` dan `normalize.test.ts` di folder yang sama (sudah teruji 7/7).
- `.claude/rules/teks-arab.md` (seluruhnya).
- ARSITEKTUR-TEKNIS §3.1 dan §6, serta KONVENSI bagian *TypeScript* dan *Tes*.
- `/docs-terbaru vite-plus` untuk konfigurasi `vp test` di paket workspace.

## Langkah

1. **Mulai rinci fase.** Ini sesi pertama Fase 1. Baca cepat S06–S10 dan perbaiki urutan atau isinya bila perlu (catat di KEPUTUSAN/LOG).
2. Buat `packages/text` (`@surau/text`): `package.json` (ESM, `exports` ke `src/index.ts`, tanpa dependensi runtime) dan `tsconfig` yang extend base dengan `erasableSyntaxOnly`, supaya bisa dipakai langsung oleh `node` lewat type stripping di `tools/ingest`. Impor relatif di dalam paket **wajib** berekstensi `.ts` (KONVENSI). Verifikasi pola ini dengan skrip kecil di `tools/` sebelum lanjut.
3. Pindahkan prototipe ke modul-modul terpisah:
   - `normalize.ts`: `normalizeArabic` dengan peta offset dan `toRawSpan`. Konstanta `NORM_VERSION = 1`.
   - `stem.ts`: `stemToken`, `stemText`, `expandQueryToken`, daftar `PROTECTED`, dan kunyah.
   - `shamela.ts`: `splitFootnotes`, `stripTitleSpans` dan `extractTitles` (span `data-type="title" id=toc-N`), `splitParagraphs` (`\r`), serta pemetaan penanda `(١)` ke catatan kaki.
   - `quote.ts`: `findQuote`.
   - `fts.ts`: `buildFtsMatch`, quote token, batas frasa, dan opsi `suffix`.
   - Hapus varian agresif (hanya untuk eksperimen).
   - **Tambahkan yang belum ada di prototipe** (lihat `.claude/rules/teks-arab.md`):
     - NFKC per karakter untuk *presentation forms* (U+FB50–U+FDFF, U+FE70–U+FEFF) di dalam loop, supaya peta offset tetap benar;
     - rentang tanda Qur'ani yang persis (U+06DD/U+06DE/U+06E9 menjadi pemisah);
     - `findQuote` yang menolak kecocokan di tengah ekspansi satu karakter mentah.
4. **Tes (Vitest via `vp test`):**
   - Port semua tes prototipe.
   - Tambahkan `test/golden.json`: ±40 pasangan input→output normal dan stem, mencakup harakat, alif, ى, ة, ؤ/ئ, tatweel, NFKC/presentation forms, angka Arab-India, ligatur ﷺ, HTML, dan penanda catatan kaki.
   - Uji round-trip offset (setiap karakter normal memetakan ke karakter mentah yang setara).
   - Uji `findQuote` menolak kalimat karangan dan menghormati batas kata.
   - Uji injeksi `buildFtsMatch`.
   - Property-based test sederhana (loop acak dengan seed tetap) untuk invarian `map.length === text.length` dan monotonik.
5. Fixture tes **tanpa** teks Shamela: pakai kalimat pendek buatan atau potongan OpenITI dengan atribusi di kepala file.
6. Dokumentasikan API dengan komentar JSDoc singkat yang menjelaskan *kenapa*, terutama keputusan normalisasi seperti ؤ→و dan alasannya.
7. Benchmark kecil: normalisasi 5 juta karakter harus < 2 detik di Node 24 (prototipe: ±0,8 detik). Catat angkanya.

## Selesai bila

- [x] `@surau/text` bisa diimpor dari `apps/web` (build Next) **dan** dari skrip Node di `tools/` (dibuktikan dengan skrip kecil `node tools/…/smoke.ts`) · bukti: `pnpm --filter @surau/web build` → rute `ƒ /api/version` ter-build; e2e `API versi…` lolos (chromium + ponsel, `next dev`); `node tools/ingest/scripts/smoke-text.ts` → "lolos" (Node 24.22.0), kini bagian dari `pnpm test`
- [x] Semua tes lolos, termasuk golden (≥40 kasus) dan property test; cakupan fungsi publik 100% · bukti: `pnpm test` → 126 tes lolos (golden **50** kasus, property 3×2.000 string acak, integrasi Ihya 5), cakupan `packages/text/src` fungsi **100% (47/47)**, baris 100%, cabang ±97%
- [x] `NORM_VERSION` diekspor, dan aturan perubahan normalisasi ditulis di README paket · `packages/text/README.md` bagian *Aturan mengubah normalisasi*; tes golden gagal bila `normVersion` ≠ `NORM_VERSION`
- [x] Tidak ada teks Shamela di fixture (cek manual + atribusi OpenITI bila dipakai) · dicek manual: fixture berisi kalimat buatan dan frasa/hadits masyhur pendek; OpenITI tidak dipakai; tes Ihya hanya membaca DB lokal (`readOnly`) dan mencetak angka
- [x] Benchmark tercatat; `pnpm verify` lolos · `pnpm bench:text` → ±0,50 dtk per 5 juta karakter sintetis, ±0,55 dtk per 5 juta untuk Ihya (target < 2 dtk); `pnpm verify` → lolos
- [x] STATUS, LOG, dan file sesi ini diperbarui; sesi S06–S10 sudah ditinjau ulang · urutan S06–S10 tetap; S06 dan S07 diberi catatan kecil (lihat Catatan hasil)

## Di luar cakupan

- Membaca file Shamela (S07). Tabel DB (S06). Stemming sufiks/morfologi penuh (mode "perluas" ditunda ke S11).

## Catatan hasil

**Dibuat:**
- `packages/text` (`@surau/text`, tanpa dependensi runtime): `normalize.ts` (`NORM_VERSION = 1`, `normalizeArabic` + peta offset, `toRawSpan`, `isDroppedChar`, `FOOTNOTE_MARKER_SOURCE`), `stem.ts` (`stemToken`, `stemText`, `expandQueryToken`, `kunyaVariants`, `isProtectedToken`), `quote.ts` (`findQuote`), `fts.ts` (`buildFtsMatch`, `ftsQuote`, batas 32 token/64 frasa), `shamela.ts` (`cleanShamelaHtml`, `extractTitles`, `splitFootnotes`, `splitParagraphs`, `findFootnoteMarkers`, `splitFootnoteEntries`, `linkFootnotes`), README.
- Tambahan wajib dari rules: NFKC per karakter untuk presentation forms; U+06DD/06DE/06E9 sebagai pemisah; `findQuote` menolak kecocokan di tengah ekspansi (termasuk ﷺ yang menempel ke kata). Ditambah: ekspansi ligatur kehormatan Unicode 14 (sering di kitab Shamela lain), iterasi per code point, perbaikan stem kata dilindungi berklitik (ADR-028).
- `tools/ingest` lebih awal: `scripts/smoke-text.ts`, `scripts/bench-normalize.ts` (`pnpm bench:text`), `test/ihya-text.test.ts` (dilewati bila drive Shamela tidak ada).
- `apps/web`: `GET /api/version` → `{ normVersion }` + tes e2e.
- Dependensi baru: `@vitest/coverage-v8` 5.0.4 (MIT, devDependency root) untuk mengukur cakupan; alasannya butir "cakupan fungsi publik 100%" harus dibuktikan dengan angka.

**Penyimpangan rencana (terbuka, ADR-028):** `stripTitleSpans` diganti `cleanShamelaHtml` (satu pembersih untuk semua tag, posisi judul tetap dicatat; `extractTitles` tetap ada). Varian stem agresif dihapus sesuai rencana. Prototipe `اللائي → اللاتي` tidak dipertahankan.

**Temuan di data nyata (Ihya 9472, hanya-baca):** 1.706 halaman, 1.124 berpemisah catatan kaki, 309 span judul (tabel `title` berisi 311), **4.204/4.204 penanda (١) terhubung** ke catatan kaki dan 0 catatan yatim, tidak ada tag tak dikenal. Round-trip `findQuote` jendela 4 token acak di 1.600+ halaman: 0 gagal. Takhrij "باطل لا أصل له" di j1 h200 ditemukan.

**Peninjau:** 0 blocker; 2 "perbaiki" (pembersih HTML menempelkan kata/menghapus teks mirip tag → daftar putih + `unknownTags`; dokumen proses) dan 8 saran. Semua diterapkan kecuali saran panjang minimum kutipan (dicatat untuk S19).

**Utang teknis / untuk sesi berikutnya:**
- S07: pemisah takhrij `//` ditulis di `packages/text/src/shamela.ts` (bukan di tools). Laporkan `unknownTags` di laporan validasi. Tabel `title` Ihya berisi 311 baris, tetapi hanya 309 span judul di `page.content`: periksa 2 judul tanpa span di validasi.
- S11: sintaks MATCH `{sbody sfoot} : (…)` belum diuji ulang di D1 sejak prototipe; uji di S11 bersama tabel FTS.
- S19: `findQuote` atas satu kata umum ("في") pasti cocok; pipeline jawaban perlu panjang minimum kutipan.
- Pelajaran agent: alat Write/Edit mengubah `\uXXXX` menjadi karakter literal. Tulis escape lewat skrip/heredoc bash, lalu cek dengan `grep -c '\\u'`.
