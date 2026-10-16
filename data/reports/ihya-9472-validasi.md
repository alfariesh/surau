# Laporan validasi ingest: Ihya' 'Ulum ad-Din (Shamela 9472)

> Dibuat otomatis oleh `pnpm ingest ihya` (`tools/ingest`, S07). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka, ID judul Shamela (`t<title.id>`), dan rujukan juz/halaman cetak.

- Sumber: Shamela `book/472/9472.db`, sha256 `36e66c5498b74e6d4fd7542108a29327361cf45534794d1c5a878e7bc2b7d586`
- Patch daftar isi: `data/patches/ihya-9472.yaml` · peta ID: `data/ids/ihya-9472.json`
- Korpus: `ihya-v1` · NORM_VERSION 1

## Invarian (ingest gagal bila ada yang ✗)

| Invarian | Hasil | Rincian |
|---|---|---|
| Jumlah halaman | ✓ | 1706 (harapan 1706) |
| Halaman per juz | ✓ | 361/386/413/546 (harapan 361/386/413/546) |
| (juz, halaman) unik | ✓ | 0 ganda |
| Jumlah judul sumber | ✓ | 311 (harapan 311) |
| 4 rub' × 10 kitab setelah patch | ✓ | t2: 10, t156: 10, t168: 10, t180: 10 |
| Daftar isi utuh (tanpa judul yatim, siklus, atau patch gagal) | ✓ | 0 masalah |
| Urutan halaman daftar isi monoton | ✓ | ya |
| Paragraf tidak kosong dan muat satu statement D1 | ✓ | 0 kosong; terpanjang 7812 byte (batas 90000) |
| Matan = OpenITI (≥0,95 per halaman) | ✓ | 1705/1706 halaman (gerbang ≥1705); 0 halaman tidak ada di OpenITI |

## Daftar isi

- 313 node (311 judul Shamela + node patch); 15 node ditandai `patched`.
- Rub': t2 (j1 h4) 10 kitab · t156 (j2 h2) 10 kitab · t168 (j3 h2) 10 kitab · t180 (j4 h2) 10 kitab.
- Judul tanpa span di teks (dimulai di awal `title.page`): t1 (j1 h1), t2 (j1 h4).
- Judul yang span-nya di halaman lain dari `title.page`: –.
- Judul yang dimulai di tengah paragraf (paragraf itu ikut node baru): 21.

## Paragraf

- Badan: 16.111 paragraf; panjang (karakter) min 2 · median 154 · p90 643 · p99 1.990 · maks 4.188.
- Catatan kaki: 4.398 paragraf; panjang (karakter) min 3 · median 148 · p90 381 · p99 1.305 · maks 2.644.
  - 4.204 dari bagian bawah halaman (setelah `_________`), 194 takhrij menempel yang dipotong dari badan.
  - 220 catatan memanjang lebih dari satu baris (baris dipisah `\n`).
- Tag HTML tak dikenal (dibiarkan sebagai teks): –.

## Penanda catatan kaki (١)

- 4.064 penanda di badan teks; 4.064 tertaut ke catatan bernomor sama (`footnote_ref`).
- Penanda yatim (tanpa catatan): 0
- Catatan bernomor yang tidak dirujuk dari badan: 140. Sebagian besar karena penandanya ikut terpotong bersama takhrij menempel.

## Takhrij yang menempel ke matan (`//`)

- 203 halaman memuat `//` di badan teks.
- Takhrij sesudah `//`: 130 · sebelum `//`: 64 · tidak dikenali (paragraf tidak dipecah, `inline_unsplit`): 9 (j2 h158, j4 h70, j4 h71, j4 h72, j4 h75, j4 h76, j4 h79, j4 h174, j4 h292).
- Akhir takhrij "sesudah `//`" tidak ditandai di sumber (juga tidak di OpenITI), jadi dipotong sampai akhir paragraf. 23 potongan ≥400 karakter kemungkinan ikut membawa matan lanjutan: j3 h21, j3 h32, j3 h33, j3 h35, j3 h44, j3 h45, j3 h94, j3 h101, j3 h130, j3 h143, j3 h273, j3 h318, j3 h332, j4 h61, j4 h84, j4 h89, j4 h97, j4 h99, j4 h104, j4 h165, j4 h171, j4 h196, j4 h407.
- Semua potongan ditandai `takhrij_inline` di `passage_needs_review` untuk ditinjau manusia.

## Ditandai perlu ditinjau (`passage_needs_review`)

| Alasan | Paragraf |
|---|---|
| `inline_unsplit` | 9 |
| `takhrij_inline` | 194 |
| `takhrij_unmatched` | 190 |
| **paragraf unik** | **373** |
