# S12 · Ayat Al-Qur'an (Tanzil) & terjemahan Kemenag

> **Fase:** 2 · **Status:** berjalan
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

- [ ] Rasio cocok exact ≥ 95% dari bentang kandidat yang tervalidasi; sisanya `similar` atau ditolak, tercatat di laporan
- [ ] 20 sampel acak diperiksa pemilik atau ustadz, dan hasilnya dicatat
- [ ] UI pembaca menampilkan rujukan dan terjemahan Kemenag verbatim dengan atribusi Tanzil dan QuranEnc
- [ ] Placeholder ayat siap dipakai S13 (tes round-trip lolos), dan aturan render label Kemenag terpisah dari label AI teruji
- [ ] `pnpm verify` lolos; STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Tafsir. Audio. Wiki ayat lengkap (Fase 6).
- Pertanyaan tashih LPMQ untuk aplikasi digital masih terbuka; tidak memblokir karena terjemahan diambil verbatim dari sumber resmi. Catat di KEPUTUSAN bila ada informasi baru.

## Catatan hasil

*(diisi agent)*
