# S14 · Cari bahasa Indonesia + UI Cari

> **Fase:** 2 · **Status:** belum
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

- [ ] Query Indonesia ("sabar", "niat", "adab murid kepada guru") dan Arab memberi hasil relevan di 5 teratas (diperiksa manual, dicatat)
- [ ] Setiap terjemahan tampil berlabel AI; teks Arab di kartu adalah substring `text_raw`
- [ ] Latensi p95 staging < 300 ms (tanpa cache)
- [ ] E2E lolos; Lighthouse aksesibilitas ≥ 90; pemilik menyetujui tampilan
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Embedding/Vectorize (diputuskan di S15 berdasarkan eval). Jawaban LLM (Fase 4).

## Catatan hasil

*(diisi agent)*
