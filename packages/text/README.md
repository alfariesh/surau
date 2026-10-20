# @surau/text

Satu-satunya tempat logika teks Arab Surau. TypeScript murni **tanpa dependensi runtime**, dipakai oleh pipeline ingest (Node 24 lewat type stripping, tanpa build), Worker, dan Next. Aturan yang diimplementasikan ada di [`.claude/rules/teks-arab.md`](../../.claude/rules/teks-arab.md); riset dan prototipenya ada di [docs/riset/2026-10-15-pencarian-arab](../../docs/riset/2026-10-15-pencarian-arab/README.md).

## API

| Modul | Fungsi | Untuk apa |
|---|---|---|
| `normalize.ts` | `NORM_VERSION`, `normalizeArabic(raw, opts?)` → `{ text, map }`, `toRawSpan`, `isDroppedChar` | Bentuk cocok untuk FTS dan verifikasi kutipan, beserta peta offset normal→mentah |
| `stem.ts` | `stemToken`, `stemText`, `expandQueryToken`, `kunyaVariants`, `isProtectedToken`, `queryProclitics` | Stem proklitik konservatif (kolom `sbody`/`sfoot`) dan ekspansi sisi kueri |
| `quote.ts` | `findQuote(raw, quote, opts?)` | Cari kutipan di teks mentah dan kembalikan substring mentah **verbatim** |
| `fts.ts` | `planFtsQuery(query, opts?)`, `ftsMatchExpression(plan, columns?)`, `buildFtsMatch(query, opts?)`, `ftsQuote`, `FTS_MAX_PHRASES` | Rencana kueri (stem, frasa alternatif, awalan) dan ekspresi `MATCH` FTS5 yang aman dari injeksi |
| `highlight.ts` | `findPlanSpans(raw, plan, limit?)`, `snippetSpan(raw, focus, size?)`, `SNIPPET_CHARS` | Sorotan hasil pencarian di **teks mentah** (S11) dengan aturan yang sama dengan indeks, dan potongan ±160 karakter di batas spasi |
| `shamela.ts` | `cleanShamelaHtml`, `extractTitles`, `splitFootnotes`, `splitParagraphs`, `findFootnoteMarkers`, `splitFootnoteEntries`, `linkFootnotes`, `linkFootnoteMarkers`, `splitInlineTakhrij` | Membersihkan dan memecah `page.content` Shamela secara deterministik, termasuk takhrij yang menempel ke matan lewat `//` (ADR-032) |

```ts
import { buildFtsMatch, findQuote, normalizeArabic, stemText } from "@surau/text";

const raw = "قَالَ رَسُولُ اللَّهِ ﷺ: الصَّبْرُ ضِيَاءٌ (١)";
normalizeArabic(raw).text; // "قال رسول الله صلي الله عليه وسلم الصبر ضياء"
stemText("والصبر ضياء"); // "صبر ضياء"
findQuote(raw, "الصبر ضياء")?.rawText; // "الصَّبْرُ ضِيَاءٌ" (teks sumber, bukan teks model)
buildFtsMatch("الصبر"); // '{sbody sfoot} : ("صبر" OR "وصبر" OR …)', kirim sebagai SATU parameter terikat

const plan = planFtsQuery("الصبر"); // { stems: ["صبر"], phrases: [["صبر"], ["وصبر"], …], prefix: false }
findPlanSpans(raw, plan); // [{ start, end }]: raw.slice(start, end) = "الصَّبْرُ" (dengan harakatnya)
```

Indeks dan sorotan harus memakai rencana yang sama: `searchText` (`@surau/core`) mengirim `ftsMatchExpression(plan)` ke D1 dan memakai `findPlanSpans(text_raw, plan)` untuk sorotan, sehingga yang disorot persis yang dicocokkan indeks (indeks contentless tidak punya `highlight()`/`snippet()`).

## Keputusan normalisasi (NORM_VERSION 2)

- **Harakat, tanda Qur'ani, tatweel, karakter lebar-nol dibuang tanpa memutus kata.** FTS5 `unicode61` menganggap harakat sebagai pemisah dan `remove_diacritics` tidak berlaku untuk Arab, jadi indeks dibangun di atas bentuk normal. U+06DD (akhir ayat), U+06DE (rub'), dan U+06E9 (sajdah) justru menjadi **pemisah** karena berdiri di antara kata.
- **أ إ آ ٱ → ا, ى → ي, ة → ه.** Ejaan ini tidak konsisten antarcetakan dan antarpengetik, sedangkan bedanya hampir tidak pernah menentukan makna dalam pencarian.
- **ؤ → و dan ئ → ي (default aktif).** Kursi hamzah ditulis berbeda antarcetakan (مسئول/مسؤول). Bisa dimatikan dengan `{ hamzaSeats: false }`, tetapi indeks dan kueri harus memakai opsi yang sama.
- **Angka Arab-India dan Persia → ASCII**, huruf Latin → huruf kecil.
- **Presentation forms** (U+FB50–U+FDFF, U+FE70–U+FEFF, umumnya teks salinan PDF) dinormalisasi **per karakter** dengan NFKC, bukan seluruh string, supaya peta offset tetap menunjuk ke karakter mentah asalnya. Ligatur frasa (ﷺ) diberi batas kata; ligatur di dalam kata (ﻻ) tetap menyatu.
- **Ligatur formula kehormatan Unicode 14** (﵀–﵏, ﷏, ﷽, ﷾, ﷿) tidak punya dekomposisi NFKC, jadi diekspansi lewat tabel (`رضي الله عنه`, `عز وجل`, …). Ligatur ini sering muncul di kitab Shamela lain.
- **Tag HTML dan penanda catatan kaki `(١)`** menjadi pemisah (opsi `dropFootnoteRefs: false` mempertahankan angkanya).
- **Stem hanya membuang proklitik yang menempel pada artikel** (والصبر/بالصبر/للصبر → صبر). Stem agresif merusak kata dasar berawalan و/ف (فضيله → ضيله), jadi proklitik tanpa artikel (وصبر) ditangani di sisi kueri lewat `expandQueryToken`. Lafaz Allah dan isim maushul dilindungi (والذين → الذين, bukan ذين).
- **NORM_VERSION 2 (#61, ADR-063): artikel tidak dipotong bila sisanya kata fungsi dua huruf.** الهم, الان, dan الام dulu menjadi هم, ان, dan ام, sehingga bertabrakan dengan kata ganti dan أن/إن/أم. Sekarang bentuknya diseragamkan ke `ال` + sisa (بالهم/والهم/للهم → الهم). Kata benda dua huruf (الحق → حق, الحج → حج) tetap seperti NORM_VERSION 1. Di sisi kueri, token berartikel yang stemnya berawalan ل mendapat varian lam melebur (`lamMergedVariant`: اللسان → سان, stem dari للسان = ل + اللسان).

## Aturan mengubah normalisasi

1. **Naikkan `NORM_VERSION`** bila keluaran `normalizeArabic` atau `stemToken` berubah untuk input apa pun, sekecil apa pun.
2. Perbarui `test/golden.json` secara sadar (termasuk `normVersion`-nya) dan tambahkan kasus regresi untuk perubahan itu. Tes golden gagal bila versinya tidak sama.
3. Catat alasannya sebagai ADR di `implementasi/KEPUTUSAN.md`.
4. Bangun ulang indeks FTS **penuh** untuk semua korpus; `meta.norm_version` di DB harus sama dengan `NORM_VERSION` build yang melayani kueri (`GET /api/version` di web).
5. Jangan menulis regex normalisasi Arab di luar paket ini. Escape harakat ditulis `\uXXXX`, bukan karakter literal.

## Tes dan benchmark

- `pnpm test` (root): Vitest dengan cakupan (fungsi `packages/text/src` wajib 100%), golden ≥40 kasus, property test (2.000 string acak, seed tetap), lalu smoke Node `tools/ingest/scripts/smoke-text.ts` (bukti type stripping).
- Tes integrasi terhadap Ihya Shamela 9472 di `tools/ingest/test/ihya-text.test.ts` berjalan bila drive Shamela terpasang dan dilewati otomatis di CI. Teks kitab tidak disalin ke git.
- `pnpm bench:text`: target < 2 detik per 5 juta karakter. Hasil 15 Okt 2026 (Node 24.22, Mac pemilik): ±0,50 dtk per 5 juta karakter sintetis, ±0,55 dtk per 5 juta untuk Ihya (5,48 juta karakter, 22.159 paragraf).
- Fixture memakai kalimat buatan dan frasa umum yang pendek, **tanpa teks Shamela**.

## Catatan pemakaian

- Paket diekspor langsung dari `src/index.ts`; impor relatif di dalam paket wajib berekstensi `.ts`, dan hanya sintaks TS yang bisa dihapus (`erasableSyntaxOnly`).
- `Normalized.map` adalah `Int32Array`. Jangan dikirim dari Server Component ke klien (ADR-023).
- Kode ini tidak membaca file Shamela. Pembacaan `node:sqlite` ada di `tools/ingest` (S07).
- `splitInlineTakhrij` sengaja konservatif: bila awal takhrij tidak dikenali, paragraf tidak dipecah. Semua hasilnya (dipecah atau tidak) harus ditandai perlu ditinjau oleh pemanggil.
