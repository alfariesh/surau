# Laporan validasi ingest: Bidayat al-Hidayah (Shamela 12718)

> Dibuat otomatis oleh `pnpm ingest korpus` (`tools/ingest`, S07). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka, ID judul Shamela (`t<title.id>`), dan rujukan juz/halaman cetak.

- Sumber: Shamela `book/718/12718.db`, sha256 `c41459f5c9a2f42354ba4fede121e5db5ddccdf94e1132db9805b35c568956ca`
- Patch daftar isi: `–` · peta ID: `data/ids/bidayat-al-hidayah-12718.json`
- Korpus: `kitab-v10` · NORM_VERSION 2

## Invarian (ingest gagal bila ada yang ✗)

| Invarian | Hasil | Rincian |
|---|---|---|
| Jumlah halaman | ✓ | 46 (harapan 46) |
| Halaman per juz | ✓ | 46 (harapan 46) |
| (juz, halaman) unik | ✓ | 0 ganda |
| Jumlah judul sumber | ✓ | 46 (harapan 46) |
| Daftar isi utuh (tanpa judul yatim, siklus, atau patch gagal) | ✓ | 0 masalah |
| Urutan halaman daftar isi monoton | ✓ | ya |
| Paragraf tidak kosong dan muat satu statement D1 | ✓ | 0 kosong; terpanjang 4146 byte (batas 90000) |
| Penanda (١) tidak hilang saat takhrij dipisah | ✓ | ya |
| Integritas lintas tabel (edisi halaman/node = edisi paragraf; penanda badan → catatan kaki halaman sama) | ✓ | 0 paragraf beda edisi atau tanpa node; 0 footnote_ref salah arah |
| Matan = OpenITI (≥0,95 per halaman) | ✓ | 46/46 halaman (gerbang ≥46); 0 halaman tidak ada di OpenITI |
| Sumber Qur'an utuh (ayat = jumlah per surah; terjemahan + transliterasi tiap ayat; penomoran QUL = Tanzil) | ✓ | 114 surah, 6236/6236 ayat, 12472 baris terjemahan/transliterasi; 6 ayat beda teks QUL vs Tanzil (batas 20) |
| Rujukan ayat sah (offset di dalam teks tanpa spasi tepi, tidak tumpang tindih, ayat ada) | ✓ | 24 rujukan; 0 tidak sah |
| Kutipan exact ada di teks ayat rujukannya (ayat utuh = sama persis) | ✓ | 24 rujukan exact; 0 tidak sesuai |
| Kutipan {…} tervalidasi cocok persis ≥95% | ✓ | 0/0 (100,0%); mirip 0, tidak cocok 0 |
| Terjemahan & ringkasan AI dimuat | ✓ | tanpa path hasil LLM (harapan cakupan 0%) |
| Revisi terjemahan manusia (X08): status tinjauan = asal tinjauannya | ✓ | 0 revisi berlaku |
| ID paragraf rilis stabil (ADR-059) | ✓ | 391 ID lama ada dengan teks sama |

## Daftar isi

- 46 node (46 judul Shamela + node patch); 0 node ditandai `patched`.
- Judul tanpa span di teks (dimulai di awal `title.page`): –.
- Judul yang span-nya di halaman lain dari `title.page`: –.
- Judul yang dimulai di tengah paragraf (paragraf itu ikut node baru): 2.

## Paragraf

- Badan: 391 paragraf; panjang (karakter) min 5 · median 140 · p90 453 · p99 1.083 · maks 2.309.
- Catatan kaki: 0 paragraf; panjang (karakter) min 0 · median 0 · p90 0 · p99 0 · maks 0.
  - 0 dari bagian bawah halaman (setelah `_________`), 0 takhrij menempel yang dipotong dari badan.
  - 0 catatan memanjang lebih dari satu baris (baris dipisah `\n`).
- Tag HTML tak dikenal (dibiarkan sebagai teks): –.

## Penanda catatan kaki (١)

- 0 penanda di badan teks; 0 tertaut ke catatan bernomor sama (`footnote_ref`).
- Penanda yatim (tanpa catatan): 0.
- Penanda di dalam takhrij menempel (ikut terpotong, tidak ditautkan): 0. Penanda pembuka takhrij tetap di matan.
- Catatan bawah halaman yang tidak dirujuk penanda matan (ditandai `footnote_orphan`): 0; 0 di antaranya karena penandanya ada di dalam takhrij menempel.

## Takhrij yang menempel ke matan (`//`)

- 0 halaman memuat `//` di badan teks.
- Takhrij sesudah `//`: 0 · sebelum `//`: 0 · tidak dikenali (paragraf tidak dipecah, `inline_unsplit`): 0 (–).
- Akhir takhrij "sesudah `//`" tidak ditandai di sumber (juga tidak di OpenITI), jadi dipotong sampai akhir paragraf. 0 potongan ≥400 karakter kemungkinan ikut membawa matan lanjutan: –.
- Semua potongan ditandai `takhrij_inline` di `passage_needs_review` untuk ditinjau manusia.

## Ditandai perlu ditinjau (`passage_needs_review`)

| Alasan | Paragraf |
|---|---|
| **paragraf unik** | **0** |
