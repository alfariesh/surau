# S14 · Cari bahasa Indonesia + UI Cari

> **Fase:** 2 · **Status:** selesai* (2026-10-17; *tampilan menunggu T-23; `ihya-v5` dipromosikan ke produksi atas izin pemilik)
> **Prasyarat:** S13 selesai · Tugas pemilik: **T-09** (drive, bila korpus dibangun ulang); review tampilan di akhir
> **Perkiraan:** 1–2 percakapan agent

## Tujuan

Pengguna bisa mengetik "sabar", "adab murid kepada guru", atau الصبر, lalu mendapat daftar tempat di Ihya yang relevan, lengkap dengan potongan Arab asli yang disorot, terjemahan AI berlabel, dan lokasi persisnya.

## Baca dulu (hanya ini)

- ARSITEKTUR-TEKNIS §5 (alur Cari), README `packages/core` (`searchText`), dan hasil S11 dan S13.
- MCP `heroui-pro`: `SearchField`, `Command` (palet pencarian), `ListBox`/`Card`, `Chip` (filter), dan `EmptyState`.
- `/docs-terbaru` untuk SQLite FTS5 (tokenizer untuk teks Latin Indonesia).

## Langkah

1. **Indeks Indonesia:** tabel `translation_fts` dan `summary_fts` (FTS5, `unicode61 remove_diacritics 2` untuk Latin, contentless). Yang diindeks hanya teks AI; segmen ayat Kemenag tidak ikut (lihat S12). Isinya terjemahan paragraf dan ringkasan bagian. Pertimbangkan daftar stopword Indonesia yang kecil dan stemming ringan (`-nya`, `ber-`, `me-`): uji dulu, dan pakai hanya bila recall naik tanpa merusak.
2. **Deteksi bahasa query:** ada huruf Arab → jalur Arab (S11); tidak ada → jalur Indonesia; campuran → keduanya.
3. **Gabung hasil** dengan Reciprocal Rank Fusion (k=60) dari: FTS Arab, FTS terjemahan, dan FTS ringkasan (hasil ringkasan dipetakan ke paragraf di bagian itu). Hasil dikelompokkan per halaman dan diberi skor yang bisa dijelaskan (dari jalur mana hit berasal).
4. Perbarui `searchText` di core (jalur Indonesia) beserta tesnya.
5. **UI `/cari`:**
   - Input `dir="auto"` dan contoh query.
   - Hasil berupa kartu: judul bab + lokasi (j/h) + potongan Arab asli dengan sorotan (`ArabicText`) + terjemahan AI berlabel "terjemahan AI" + tautan ke paragraf di pembaca.
   - Filter per rub'/kitab.
   - Peringatan untuk kata umum, dan keadaan kosong yang membantu.
   - Query disimpan di URL (`?q=`) supaya bisa dibagikan. Tanpa LLM.
6. Palet pencarian global (⌘K) di shell yang membuka `/cari`.
7. Ubah navigasi "Cari" menjadi aktif. Halaman pembaca menyorot kata yang dicari bila dibuka dari hasil Cari.
8. **Kinerja:** cache respons API pencarian untuk query populer (Cache API, TTL panjang, kunci = query ternormalisasi + `corpus_version`).
9. E2E: query Arab dan Indonesia menghasilkan kartu dengan tautan yang benar.
10. Kode Cari memeriksa `meta.schema_version` sebelum memakai tabel baru (ARSITEKTUR §7 aturan 5). Promosikan korpus versi terbaru (dengan FTS, ayat, dan terjemahan) ke produksi lewat `corpus:promote`, dengan izin. Sebelum itu putuskan rollback: `--switch-only ihya-v1` (skema 3) gagal di smoke sejak S11 (ADR-039, Konsekuensi); longgarkan pemeriksaan skema di `promote.ts` bila `ihya-v1` harus tetap jadi target rollback.

> Dari S11 (ADR-039): jalur Arab sudah ada sebagai `searchText` + `GET /api/search` (Server-Timing, `SEARCH_LIMITER`, 503 bila korpus tanpa indeks). UI memakai `searchView` apa adanya; `highlights`/`snippet` adalah rentang di `text_raw`. Kueri yang semua katanya umum (`warning: "common_terms"`) tidak berperingkat dan tidak punya halaman lanjut.

## Selesai bila

- [x] Query Indonesia ("sabar", "niat", "adab murid kepada guru") dan Arab memberi hasil relevan di 5 teratas (diperiksa manual, dicatat) · daftar 5 teratas di Catatan hasil (D1 lokal `ihya-v5` = isi staging)
- [x] Setiap terjemahan tampil berlabel AI; teks Arab di kartu adalah substring `text_raw` · label "Terjemahan AI"/"Ringkasan AI" di kartu dan pembaca; e2e `search.spec.ts` membandingkan potongan Arab kartu dengan paragraf yang sama di pembaca (text_raw), lolos lokal + Preview PR #33
- [x] Latensi p95 staging < 300 ms (tanpa cache) · Preview PR #33 (cache mati di Preview), 24 kueri × 10 = 240 permintaan, 0 galat: handler **p95 154 ms** (p50 113), SQL D1 p95 19,9 ms
- [ ] E2E lolos; Lighthouse aksesibilitas ≥ 90; pemilik menyetujui tampilan · E2E lolos (lokal 93 lolos + 1 dilewati setelah perbaikan peninjau; Preview PR #33 hijau), Lighthouse 13.5.0 Preview `/cari?q=sabar` a11y **100** ponsel + desktop, pembaca j4 h61 a11y 100; **persetujuan tampilan menunggu pemilik (T-23)**
- [x] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Embedding/Vectorize (diputuskan di S15 berdasarkan eval). Jawaban LLM (Fase 4).

## Catatan hasil

2026-10-17 · PR #33 · ADR-044.

**Yang dibuat**
- **Indeks Indonesia** (migrasi korpus 0006, skema 6, korpus **`ihya-v5`**): `translation_fts` (16.086 paragraf) dan `summary_fts` (313 bagian, bahasa `id`), contentless, `unicode61 remove_diacritics 2`; isinya `latinIndexText` dari teks AI tanpa placeholder ayat. `meta.latin_norm_version`, indeks `toc_node_start`. Dimuat ke D1 lokal dan `surau-corpus-staging` (smoke "sabar" lolos di remote). Produksi tetap `ihya-v1`.
- **`@surau/text` `latin.ts`:** token Latin, stopword kecil (kata fungsi, kata ganti, preposisi berakhiran -nya/-mu/-ku), ejaan baku glosarium (taubat → tobat, shalat → salat, …), stem ringan Tala dengan pengecualian dari tinjauan kosakata. Diuji dulu (langkah 1): tanpa stem vs stem, misalnya sabar 173 → 404 paragraf, syukur 131 → 242, taubat 11 → 248 (varian), tanpa merusak 5 teratas.
- **`@surau/db`:** `searchCorpusFused` (RRF k=60 tiga jalur dalam satu batch, OR-susulan bila < 5 kecocokan semua kata, ringkasan → paragraf awal bagian, filter bagian rekursif), terjemahan di hasil Arab, `getTranslations`, `getSummariesStartingOn`, `tocNodeIdRange`.
- **`@surau/core`:** `searchText` mendeteksi aksara kueri; kontrak bertambah (`latin_terms`, `paths`, `fusion`, `section_id`, `matched_by`, `translation`, `summary`, warning `common_terms_ignored`); `searchCacheKey`; `readPage` membawa `translation` + `summaries`.
- **Web:** `/api/search` + cache Cache API (kunci = versi korpus `SEARCH_CACHE_CORPUS` + rencana kueri; produksi saja; `corpus:promote` mengganti keduanya) + `?section=`; halaman **`/cari`** (contoh kueri, filter rub' + kitab, kartu per halaman cetak, peringatan kata umum, keadaan kosong, muat lebih banyak, pesan "sedang disiapkan" di korpus lama); palet **⌘K/Ctrl+K**; menu Cari aktif; pembaca: **terjemahan AI per paragraf** (ayat = Kemenag berlabel, penanda (١) menaut), **ringkasan AI** di awal bagian, pilihan tampil/sembunyi terjemahan, catatan AI di kaki halaman, sorotan `?q=` lewat CSS Highlight API.
- **Rollback (langkah 10):** `corpus:promote --switch-only` menerima korpus berskema lebih lama (fitur yang hilang dicetak sebagai peringatan), jadi `ihya-v1` tetap target rollback setelah `ihya-v5`.

**Relevansi 5 teratas (diperiksa manual, D1 lokal = staging)**
- *sabar* (71 halaman): j4 h61 بيان فضيلة الصبر · j4 h66 nama-nama sabar · j4 h60 الشطر الأول في الصبر · j4 h67 pembagian sabar · j4 h127 sabar dan syukur → 5/5 relevan (semua di Kitab Sabar dan Syukur, ringkasan bagian ikut cocok).
- *niat* (69): j4 h362 بيان فضيلة النية · j4 h368 rincian amal dan niat · j4 h373 niat bukan pilihan · j4 h365 hakikat niat · j1 h232 niat puasa → 5/5.
- *adab murid kepada guru* (5): j1 h48 الباب الخامس في آداب المتعلم والمعلم · j1 h4 ringkasan Rub' Ibadat (adab guru dan murid) · j1 h76 sifat guru bagi muridnya · j2 h250 murid tidak bepergian kecuali ke guru · j4 h178 adab murid terhadap gurunya → 4/5 tepat (j2 h250 "murid" = salik).
- *الصبر* (205, jalur Arab S11): j4 h72 مظان الحاجة إلى الصبر · j3 h204 ذم الدنيا (hadits sabar) · j2 h224 العزلة · j4 h139 sabar dan syukur · j4 h403 المرابطة → semua membahas sabar, tetapi bab utamanya tidak di peringkat 1–3.
- *النية* (136): j1 h212 niat wali zakat · j2 h261 safar · j4 h373 · j2 h40 nikah · j4 h374 → semua tentang niat; bab utama di peringkat 3 dan 5.
- Kesimpulan: kueri Indonesia sangat terbantu ringkasan bagian; kueri Arab (bm25 paragraf) lebih datar → bahan eval S15.

**Ukuran staging (Preview PR #33, cache mati)**

| Titik ukur | p50 | p95 | maks |
|---|---|---|---|
| SQL D1 | 11,7 ms | 19,9 ms | 34,5 ms |
| Handler Worker (`total`) | 113 ms | **154 ms** | 421 ms |
| Klien (Indonesia) | 195 ms | 271 ms | 827 ms |

rows_read per kueri: Indonesia 493 (adab murid kepada guru) s.d. 15.800 (allah), umumnya 3–8 ribu; Arab 2–4 ribu; campuran 7.166.

**Peninjau (1 putaran): 0 blocker, 7 "perbaiki", semuanya diperbaiki:**
- Produksi `ihya-v1` (skema 3) membuat SEMUA kueri 503 (bukan hanya Indonesia): `/cari` kini memeriksa skema di server dan menampilkan "Pencarian sedang disiapkan"; kalimat ADR-044 dikoreksi.
- Kunci cache tanpa versi kode: kini ikut `SEARCH_RESULT_VERSION` + konstanta peringkat/potongan.
- Pemetaan ringkasan bergantung pada urutan ID (`toc_node_id >= n.id`; node patch Ihya ber-ID lebih besar dari anaknya): kini lewat CTE rekursif turunan yang mulai di halaman yang sama + tes induk ber-ID besar. Baris dibaca tetap setara (sabar 5.681 vs 5.513 semula).
- Rekursi filter bagian tanpa indeks: kini membawa `edition_id` (indeks `toc_node_children`).
- `aria-live` di seluruh daftar hasil: diganti region `role="status"` kecil berisi ringkasan.
- Judul kitab Arab di `<option>` tanpa `lang`/`dir`: ditambahkan.
- Sel tabel STACK ganda: diperbaiki.
- Saran yang diambil: teks AI `rejected` tidak diindeks, tidak dikirim API, tidak tampil; `ORDER BY r LIMIT` di CTE peringkat; isi cache tanpa teks kueri; varian ejaan juga sesudah stem (indeks dibangun ulang, `ihya-v5` dimuat ulang ke lokal + staging); bagian Latin tanpa huruf (angka) tidak memicu jalur Indonesia; `paths` tanpa `arabic` saat `common_terms_ignored`; pola placeholder bersama; string i18n tak terpakai dihapus. Tidak diambil: pengaman kata umum Indonesia (diukur: "allah" p50 113 ms, 15,8 ribu baris; ditinjau ulang di S15), cache daftar isi `/cari` (2 kueri kecil per kunjungan).

**Penyimpangan (ADR-044):** stem Tala lengkap (bukan hanya -nya/ber-/me-) dengan pengecualian dari data; filter bagian butuh parameter API baru `section`; yang dipromosikan versi terbaru `ihya-v5`, bukan `ihya-v2`.

**Utang / pesan untuk sesi berikutnya**
- **Langkah 10 selesai (izin pemilik di chat, 2026-10-17):** `pnpm run corpus:promote ihya-v5 --confirm` → `surau-corpus-ihya-v5` (`fb0f9660-…`, APAC, 46 MB), smoke = hitungan build, `corpus:qa ihya-v5` 30/30 byte demi byte; binding `CORPUS_DB` + `SEARCH_CACHE_CORPUS` lewat PR #34. Rollback: `pnpm run corpus:promote ihya-v1 --switch-only` (skema 3, fitur baru tersembunyi).
- **T-23** (tinjau tampilan Cari + terjemahan di pembaca) belum; butir 4 belum dicentang karenanya.
- Pencarian Indonesia hanya menjangkau 100 paragraf teratas per jalur; kueri Arab saja tidak memakai ringkasan/judul bagian (peringkat datar) → eval S15.
- Tabrakan stem tersisa kecil (kehati-hatian → hati, menempatkan → empat); sinonim (pelajar ≈ murid) belum ada → S15.
- Nonaktifkan atau perluas cache bila banyak kitab (kunci per edisi).

