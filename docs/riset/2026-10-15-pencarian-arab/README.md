# Eksperimen pencarian teks Arab (FTS5) · 15 Oktober 2026

Eksperimen ini mengukur cara mencari teks Ihya dengan SQLite FTS5, mesin yang sama dengan Cloudflare D1. Eksperimen dijalankan pada salinan `book/472/9472.db` di luar repo; data Shamela tidak masuk git. Dua file di folder ini adalah **prototipe referensi** yang sudah teruji (7/7 tes lolos di Node 24.22). File ini **bukan kode produksi**: sesi S05 memindahkannya ke `packages/text` dengan Vitest.

- [`normalize.ts`](normalize.ts): `normalizeArabic` (dengan peta offset mentah↔normal), `toRawSpan`, `stemToken` (proklitik konservatif), `expandQueryToken`, `splitFootnotes`, `findQuote` (verifikasi kutipan, mengembalikan substring mentah verbatim), dan `buildFtsMatch` (penyusun MATCH yang aman dari injeksi).
- [`normalize.test.ts`](normalize.test.ts): tes dengan `node:test`.

Jalankan ulang tesnya: `node --test normalize.test.ts` (Node 24).

## Data Ihya (Shamela 9472)

1.706 halaman (jilid 1–4: 361/386/413/546), 5.511.044 karakter, ±991 ribu kata, 311 judul, dan 20.738 paragraf (16.080 badan teks, 4.658 catatan kaki). Paragraf dipisah `\r`, dan judul ditandai `<span data-type="title" id=toc-N>`. Sebanyak 1.124 halaman punya catatan kaki setelah `\r_________\r`, dengan penanda `(١)`. `title.page` menunjuk ke `page.id`, **bukan** ke halaman cetak; halaman cetak = (`part`, `page`), dengan `page` bertipe TEXT. Sekitar 10,8% kata bervokal sebagian.

## Temuan utama

1. **Jangan mengindeks teks mentah.** Tokenizer `unicode61` menganggap harakat (kategori Mn) sebagai pemisah, sehingga كَيْفَ terpecah menjadi ك ي ف. Opsi `remove_diacritics` hanya berlaku untuk huruf Latin dan **tidak berpengaruh** pada Arab.
2. **Klitik adalah masalah utama.** Tanpa penanganan, query والصبر hanya mencapai recall 0,24, بالنية 0,09, dan أبو هريرة 0,20 (teks menulis أبي هريرة 812×).
3. **Strategi terpilih:** teks dinormalisasi di kode, lalu diindeks dengan `unicode61 remove_diacritics 0`. Ada kolom stem proklitik konservatif, ekspansi proklitik dan kunyah di sisi query, dan frasa dengan varian di token pertama. Hasilnya recall makro **1,000** dengan 6 hit melenceng pada 18 query nyata. Gold set-nya berbasis regex, jadi tetap perlu set relevansi yang dinilai manusia.
4. Ranking bm25 masuk akal. Contohnya, 9 dari 10 hasil teratas untuk التوكل berada di *Kitab at-Tawhid wa at-Tawakkul*, dan hasil teratas untuk الصبر adalah j4 h72.
5. **Ukuran dan kecepatan:** indeks paragraf norm+stem (contentless) 6,86 MB untuk Ihya, dengan median kueri lokal 0,14 ms. Pada skala 60× (±59 juta kata) indeks menjadi 394 MB: الصبر 12,6 ms, frasa 9–59 ms, tetapi **الله 245 ms**. Kata yang sangat umum butuh pengaman.
6. **Ditolak:** trigram (3,7× lebih besar dan banyak hit melenceng), Postgres `arabic` (recall 0,72, stem tidak konsisten: النية → الن), dan stemming agresif ala Larkey (merusak kata dasar: فضيله → ضيله).
7. Semua fitur yang dibutuhkan berjalan di **D1 lokal** (wrangler 4.151): FTS5, trigram, fts5vocab, `contentless_delete=1`, filter kolom, dan bm25 berbobot. `rows_read` lokal kira-kira 3× jumlah kecocokan. **Belum diuji di D1 remote.**
8. `findQuote` memetakan kutipan tanpa harakat ke substring mentah bervokal yang persis sama dalam ±0,4 ms per halaman. Inilah dasar aturan "kode menyalin, model menunjuk".

## Skema yang diusulkan (diputuskan final di S06/S11)

```sql
CREATE TABLE passage(id INTEGER PRIMARY KEY, edition_id INTEGER NOT NULL, page_id INTEGER NOT NULL,
  toc_node_id INTEGER, kind TEXT NOT NULL CHECK(kind IN ('body','foot')), ord INTEGER, text_raw TEXT NOT NULL);
CREATE VIRTUAL TABLE passage_fts USING fts5(body, foot, sbody, sfoot,
  content='', contentless_delete=1, tokenize='unicode61 remove_diacritics 0');
-- body/foot = normalizeArabic(raw).text ; sbody/sfoot = stemText(norm) ; simpan NORM_VERSION di tabel meta
-- query: ... WHERE passage_fts MATCH ?1 ORDER BY bm25(passage_fts, 2.0, 1.0, 1.0, 0.5) LIMIT 20
```

## Jebakan

- `sqlite3` pertama di PATH mesin pemilik adalah build Android SDK **tanpa FTS5**. Pakai `node:sqlite`, `/usr/bin/sqlite3`, atau `wrangler d1 execute --local`.
- Normalisasi di sisi indeks dan sisi query harus identik. Simpan `NORM_VERSION`; satu perubahan aturan berarti reindex penuh.
- Tabel contentless tidak bisa memakai `highlight()`/`snippet()`. Highlight dibuat di JS lewat peta offset.
- Setiap token query harus di-quote dan dikirim sebagai satu parameter terikat. Query yang kosong setelah normalisasi tidak dijalankan.
- Regex harakat ditulis dalam escape `\uXXXX`. Jangan biarkan editor mengubahnya menjadi karakter literal.
- Pertanyaan berbahasa Indonesia ("sabar") tidak akan mengenai indeks Arab. Perlu indeks atas terjemahan/ringkasan Indonesia (Fase 2).
