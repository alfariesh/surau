# S12 · Ayat Al-Qur'an (Tanzil) & terjemahan Kemenag

> **Fase:** 2 · **Status:** selesai* (2026-10-17 · *T-16 menunggu pemilik)
> **Prasyarat:** S11 selesai · Tugas pemilik: **T-09** (drive). **T-16** dikerjakan di langkah 4.
> **Perkiraan:** 1 percakapan agent

## Tujuan

Kutipan ayat di dalam Ihya dikenali secara deterministik dan ditautkan ke surah:ayat. Terjemahannya memakai **terjemahan Kemenag yang resmi dan verbatim**, bukan buatan LLM. Ini syarat sebelum batch terjemahan (S13): LLM tidak boleh menerjemahkan ayat ([docs/05](../../docs/05-kebijakan.md)).

## Baca dulu (hanya ini)

- ADR-020 (sumber teks dan terjemahan Al-Qur'an) dan ADR-021 (lisensi data).
- [docs/04](../../docs/04-wiki-dan-entitas.md): entitas Ayat (tingkat A, deterministik).
- `/docs-terbaru` untuk lisensi teks Tanzil (https://tanzil.net/docs/text_license) dan API QuranEnc (https://quranenc.com/en/home/api/).

## Fakta (dicek 15 Okt 2026)

- Tanzil 1.1 berlisensi CC BY 3.0, **hanya boleh verbatim** (dilarang diubah), dengan pemberitahuan dan tautan ke tanzil.net.
- Sebanyak 97,2% bentang `{…}` di Ihya cocok persis dengan `simple-clean` setelah normalisasi. Sisanya berbeda ejaan (أولوا/أولو), sehingga butuh pencocokan fuzzy per token dengan label "mirip".
- Terjemahan Kemenag tersedia di QuranEnc `indonesian_affairs` v1.0.1, dengan syarat: tanpa perubahan, menyebut Kemenag dan QuranEnc beserta nomor versi. Penanda catatan kaki `[5]` di dalam teks ditampilkan apa adanya.
- Di teks Shamela, kurung `{…}` juga dipakai untuk penomoran. Validasi selalu lewat pencocokan ke Tanzil. Tag `@QB@` di OpenITI JK tidak andal.

## Langkah

1. Unduh Tanzil `simple-clean` (indeks) dan `uthmani` (tampilan) ke `data/raw/tanzil/`, serta QuranEnc `indonesian_affairs` (114 surah) ke `data/raw/quranenc/`. Catat versi, tanggal, dan sha256 di `data/SOURCES.md`, dan atribusinya di `data/ATTRIBUTION.md`.
2. Tambahkan tabel korpus `quran_ayah` (surah, ayah, `text_uthmani`, `text_index` untuk pencocokan) dan `quran_translation` (surah, ayah, lang, text, source, version). Tambahkan juga `passage_ayah_ref` (`passage_id`, `char_start`, `char_end`, surah, ayah_from, ayah_to, `match`: `exact`/`similar`, `partial`: kutipan hanya sebagian ayat).
3. **Pencocok ayat** di `tools/ingest`:
   - Kandidat bentang `{…}` (dan bentang tanpa kurung dengan heuristik konservatif).
   - Normalisasi dengan `@surau/text`.
   - Cari substring di Tanzil `simple-clean`, termasuk rentang multi-ayat.
   - Fallback fuzzy per token dengan ambang yang dicatat.
   - Bentang yang tidak cocok **bukan** ayat dan tidak ditautkan.
4. Laporan `data/reports/ihya-ayat.md`: jumlah exact, similar, partial, dan tak cocok, plus 20 sampel acak untuk diperiksa pemilik atau ustadz (T-16; berisi referensi, bukan teks panjang).
5. **Core:** `getAyahRefs(passageId)` dan tampilan. Di UI pembaca, bentang ayat diberi gaya halus dan tooltip "QS al-Baqarah: 255" + terjemahan Kemenag verbatim + atribusi + tautan tanzil.net.
6. Siapkan **penanda ayat untuk S13:** fungsi yang mengganti bentang ayat dalam paragraf dengan placeholder `⟦QS s:a-b⟧` sebelum dikirim ke LLM.
   - `translation.text` **tetap menyimpan placeholder**.
   - Saat tampil, placeholder dirender sebagai segmen terpisah berisi terjemahan Kemenag verbatim, dengan **label dan atribusinya sendiri** ("Terjemahan Kemenag via QuranEnc vX"), bukan di bawah label "terjemahan AI".
   - Untuk kutipan `partial`, tampilkan "terjemahan ayat lengkap (Kemenag)", bukan potongan yang seolah-olah terjemahan bagian itu.
   - `translation_fts` (S14) mengindeks teks AI saja; teks Kemenag diindeks terpisah bila perlu.
7. **Tes:** pencocok (exact, multi-ayat, ejaan berbeda, `{…}` yang bukan ayat) dan round-trip placeholder.

## Selesai bila

- [x] Rasio cocok exact ≥ 95% dari bentang kandidat yang tervalidasi; sisanya `similar` atau ditolak, tercatat di laporan — `pnpm ingest ihya`: invarian "Kutipan {…} tervalidasi cocok persis ≥95%" ✓ 977/1.004 (97,3%), mirip 25, tidak cocok 2 (tidak ditautkan; keduanya ternyata ayat berejaan jauh berbeda, 39:9 dan 13:22, harga ambang konservatif); invarian baru "kutipan exact ada di ayat rujukannya" ✓ 1.587/1.587; rincian + daftar di `data/reports/ihya-9472-ayat.md`
- [ ] 20 sampel acak diperiksa pemilik atau ustadz, dan hasilnya dicatat — **menunggu pemilik (T-16)**: sampel sudah ada di laporan ayat (seed tetap), belum diperiksa manusia
- [x] UI pembaca menampilkan rujukan dan terjemahan Kemenag verbatim dengan atribusi Tanzil dan QuranEnc *(kriteria ini ditulis sebelum ADR-040: "QuranEnc" diganti sumber Kemenag langsung atas arahan pemilik, teks kriteria tidak diubah)* — browser lokal (`pnpm dev`, korpus `ihya-v3`): j1 h103 QS 41:11 (ayat utuh), j1 h119 QS 27:90 ("Terjemahan ayat lengkap (Kemenag)"), j1 h175 (ayat di catatan kaki); desktop + ponsel 375 px, terang + gelap, 0 galat konsol. Atribusi Tanzil (tautan tanzil.net + `#s:a`) dan **Kemenag** (quran.kemenag.go.id): QuranEnc tidak dipakai atas arahan pemilik (ADR-040), jadi atribusinya Kemenag langsung
- [x] Placeholder ayat siap dipakai S13 (tes round-trip lolos), dan aturan render label Kemenag terpisah dari label AI teruji — `packages/core/src/ayah-placeholder.test.ts` (project core): round-trip `maskAyat`/`unmaskAyat`, `checkPlaceholders` (hilang/ganda/karangan ditolak), `translationSegments` (label `ai_translation` vs `kemenag`/`kemenag_full_ayah`, placeholder asing = `invalid`)
- [ ] `pnpm verify` lolos; STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Tafsir. Audio. Wiki ayat lengkap (Fase 6).
- Pertanyaan tashih LPMQ untuk aplikasi digital masih terbuka; tidak memblokir karena terjemahan diambil verbatim dari sumber resmi. Catat di KEPUTUSAN bila ada informasi baru.

## Catatan hasil

**T-16 (2026-10-17, diwakilkan ke agent lain atas permintaan pemilik):** 20/20 rujukan sampel cocok ([laporan](../../data/reports/ihya-9472-review-prarilis-f2-2026-10-17.md)). Tidak mengukur ayat yang luput; kasus QS 54:55 yang terbelah dua paragraf ditangani pencocok lintas paragraf X02 (ADR-047).

**Dibuat (2026-10-17, PR #31, ADR-040):**
- **Sumber.** Tanzil 1.1 XML (`uthmani` + `simple-clean`, `data/raw/tanzil/`; basmalah pembuka surah dari atribut `bismillah`, bukan teks ayat 1) dan **data Kemenag milik pemilik** (`surau-quran-kemenag` → `data/raw/kemenag/`): terjemahan + 678 catatan kaki, transliterasi Latin, metadata surah, juz. Atas arahan pemilik, **QuranEnc tidak dipakai** (menyimpang dari langkah 1 dan ADR-020). Semua sha256 dipin (`data/SOURCES.md`, `tools/ingest/src/quran/source.ts`). Teks Arab QUL di data pemilik tidak ditampilkan; Imlaei hanya cek silang penomoran (6/6.236 beda ejaan, nomor sama).
- **Korpus `ihya-v3`** (migrasi 0005, skema 5): `quran_source`, `quran_surah`, `quran_ayah`, `quran_translation` (terjemahan + transliterasi, dibedakan `quran_source.kind`), `passage_ayah_ref` (+ `bracketed`, `alt_count`). Dimuat ke D1 lokal (±24 dtk) dan `surau-corpus-staging` (±80 dtk). Produksi tetap `ihya-v1`. sha256 build `83d6d0af…`.
- **Pencocok** (`tools/ingest/src/quran/matcher.ts`): `{…}` dengan aturan 1/2/3+ kata, mirip ≥ 0,93; kutipan tanpa kurung sesudah frasa pengantar (jangkar 3 kata, ≥4 kata, kata mirip di ujung dibuang). Ihya: **1.650 rujukan di 1.037 paragraf**, `{…}` tervalidasi 977 persis / 25 mirip / 2 tidak cocok, 648 tanpa kurung (610 persis, 38 mirip), 1.219 sebagian ayat, 162 lebih dari satu ayat, 85 dengan letak lain. ±1,1 dtk untuk seluruh Ihya.
- **Laporan** `data/reports/ihya-9472-ayat.md` (nama mengikuti pola laporan lain, bukan `ihya-ayat.md`): ringkasan, cek silang penomoran, 20 sampel acak T-16, daftar mirip dan tidak cocok.
- **Core**: `Passage.ayah_refs` (juga di `readSection`), `PageView.quran`, `getAyahRefs`, penanda S13 `ayah-placeholder.ts`. **DB**: `getAyahRefs`, `getQuranAyat` (satu batch, `json_each` → kunci utama).
- **Web**: `splitPassage`, `AyahRefChip` (HoverCard/Popover), `QuranNotice` di footer, bagian Ayat di `/lisensi`, `data/ATTRIBUTION.md` dengan blok hak cipta Tanzil.

**Utang / catatan:**
- **T-16 belum** (butir 2 "Selesai bila" tidak dicentang).
- Produksi (`ihya-v1`, skema 3) membayar 1 kueri gagal + 1 kueri `meta` per render ISR halaman baca sampai promote. Rujukan baru tampil di produksi setelah korpus ≥ `ihya-v3` dipromosikan (S14).
- Edisi terjemahan Kemenag (2002 atau 2019) tidak tercatat di data; tidak diklaim. Syarat pakai tertulis Kemenag belum ada (risiko diterima pemilik).
- `alt_count` > 0 (85 rujukan) memilih satu letak secara aturan (ayat utuh → surah yang sama → urutan mushaf); UI menyebut "juga di N tempat lain".
- Keterbatasan diketahui: hadits qudsi yang dibuka "قال الله تعالى" lalu lafaz Qur'ani ≥ 4 kata ikut ditautkan sebagai ayat (ADR-040); 2 ayat berejaan jauh berbeda tidak tertaut.
- Peninjau (1 putaran): 0 blocker; 4 "perbaiki" semuanya diperbaiki (label/alt pencocok tanpa kurung mengikuti letak terpilih, halaman >300 ayat tidak gagal, nama aksesibel + `lang` label, laporan tidak menyebut 2 bentang "bukan ayat"); saran diambil: invarian kutipan exact, sumber dipilih menurut ID, `maskAyat` + penanda catatan kaki, ekspor `quranForRefs`, pola placeholder tanpa `lastIndex` bersama, cek rentang sebelum diurai, nama/lisensi Tanzil dari DB, metrik skor di laporan, label sesudah `}`, `lang` transliterasi, catatan kriteria butir 3.

**Untuk S13:**
- Pakai `maskAyat(text_raw, passage.ayah_refs, passage.footnote_refs)` sebelum mengirim paragraf ke LLM, dan tolak keluaran yang gagal `checkPlaceholders`. Simpan teks bertanda di `translation.text`.
- Saat tampil, pakai `translationSegments(text, masked.slots, await quranForRefs(db, refs))` (atau `PageView.quran`). Label UI: `ai_translation` → "terjemahan AI", `kemenag` → "Terjemahan Kemenag", `kemenag_full_ayah` → "Terjemahan ayat lengkap (Kemenag)".
- `translation` punya FK ke `passage`; reset korpus gagal bila tabel itu sudah berisi (sengaja, lihat `RESET_SQL`).
