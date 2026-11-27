# Laporan validasi ingest: al-Waraqat (Shamela 6297)

> Dibuat otomatis oleh `pnpm ingest korpus` (`tools/ingest`, S07). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka, ID judul Shamela (`t<title.id>`), dan rujukan juz/halaman cetak.

- Sumber: Shamela `book/297/6297.db`, sha256 `fb39324f5ccdfbe6a97102a7ff8e985cf09d92740c5235d212668255ba3e9b95`
- Patch daftar isi: `data/patches/al-waraqat-6297.yaml` · peta ID: `data/ids/al-waraqat-6297.json`
- Korpus: `kitab-v11` · NORM_VERSION 2

## Invarian (ingest gagal bila ada yang ✗)

| Invarian | Hasil | Rincian |
|---|---|---|
| Jumlah halaman | ✓ | 25 (harapan 25) |
| Halaman per juz | ✓ | 25 (harapan 25) |
| (juz, halaman) unik | ✓ | 0 ganda |
| Jumlah judul sumber | ✓ | 20 (harapan 20) |
| Daftar isi utuh (tanpa judul yatim, siklus, atau patch gagal) | ✓ | 0 masalah |
| Urutan halaman daftar isi monoton | ✓ | ya |
| Paragraf tidak kosong dan muat satu statement D1 | ✓ | 0 kosong; terpanjang 649 byte (batas 90000) |
| Penanda (١) tidak hilang saat takhrij dipisah | ✓ | ya |
| Integritas lintas tabel (edisi halaman/node = edisi paragraf; penanda badan → catatan kaki halaman sama) | ✓ | 0 paragraf beda edisi atau tanpa node; 0 footnote_ref salah arah |
| Kelas catatan kaki none dipatuhi (ADR-138) | ✓ | 0 catatan di sumber; 0 paragraf catatan dan 0 footnote_ref dimuat |
| Matan = OpenITI (≥0,95 per halaman) | ✓ | 25/25 halaman (gerbang ≥25); 0 halaman tidak ada di OpenITI |
| Sumber Qur'an utuh (ayat = jumlah per surah; terjemahan + transliterasi tiap ayat; penomoran QUL = Tanzil) | ✓ | 114 surah, 6236/6236 ayat, 12472 baris terjemahan/transliterasi; 6 ayat beda teks QUL vs Tanzil (batas 20) |
| Rujukan ayat sah (offset di dalam teks tanpa spasi tepi, tidak tumpang tindih, ayat ada) | ✓ | 5 rujukan; 0 tidak sah |
| Kutipan exact ada di teks ayat rujukannya (ayat utuh = sama persis) | ✓ | 5 rujukan exact; 0 tidak sesuai |
| Kutipan {…} tervalidasi cocok persis ≥95% | ✓ | 5/5 (100,0%); mirip 0, tidak cocok 0 |
| Terjemahan AI: setiap kutipan ayat diisi terjemahan Kemenag (tidak diterjemahkan model) | ✓ | 5 terjemahan berisi ayat; 0 bermasalah |
| Terjemahan AI: cakupan paragraf badan ≥ 99% | ✓ | 108/108 (100,00%); usang 0, tidak sah 0, ditolak tinjauan 0, terblokir (rujukan ayat tak bisa ditandai) 0 |
| Ringkasan AI: cakupan bagian × 2 bahasa ≥ 99% | ✓ | 42/42 (100,00%); usang 0, tidak sah 0 |
| Judul daftar isi Indonesia (terjemahan AI): cakupan node + subjudul ≥ 99% | ✓ | 21/21 (100,00%): node 21, subjudul 0 |
| Revisi terjemahan manusia (X08): status tinjauan = asal tinjauannya | ✓ | 0 revisi berlaku |
| Intisari: kutipan cocok sidik dan tanpa ayat, gagasan berjangkar, indeks hanya gagasan tampil (X15b) | ✓ | 0/20 node, 0 gagasan, 0 kutipan (0 memakai terjemahan paragraf, 0 ditahan), 0 istilah glosarium, 0 abstrak menggantikan ringkasan |
| Konten chat (X24): unit siap jadi Intisari, kutipan di dalam paragraf dan tanpa ayat, unit ditarik tidak dimuat | ✓ | 20 unit, 47 gagasan, 19 kutipan, 47 soal berjawaban; menggantikan batch 0 (–), induk batch basi dibuang 0 (–); 0 unit ditarik |
| Intisari termuat ≥ 20 (tidak berkurang dari korpus tayang) | ✓ | 20 Intisari dari al-waraqat/intisari |
| ID paragraf rilis stabil (ADR-059) | ✓ | 108 ID lama ada dengan teks sama |

## Daftar isi

- 21 node (20 judul Shamela + node patch); 1 node ditandai `patched`.
- Judul tanpa span di teks (dimulai di awal `title.page`): –.
- Judul yang span-nya di halaman lain dari `title.page`: –.
- Judul yang dimulai di tengah paragraf (paragraf itu ikut node baru): 15.

## Paragraf

- Badan: 108 paragraf; panjang (karakter) min 10 · median 98 · p90 210 · p99 281 · maks 350.
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
