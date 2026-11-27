# Laporan validasi ingest: at-Ta'rifat (Shamela 7312)

> Dibuat otomatis oleh `pnpm ingest korpus` (`tools/ingest`, S07). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka, ID judul Shamela (`t<title.id>`), dan rujukan juz/halaman cetak.

- Sumber: Shamela `book/312/7312.db`, sha256 `42fc284c431b3d6267e63345f83959248574f42b1b8c265d49397531bdd553b9`
- Patch daftar isi: `data/patches/at-tarifat-7312.yaml` · peta ID: `data/ids/at-tarifat-7312.json`
- Korpus: `kitab-v11` · NORM_VERSION 2

## Invarian (ingest gagal bila ada yang ✗)

| Invarian | Hasil | Rincian |
|---|---|---|
| Jumlah halaman | ✓ | 257 (harapan 257) |
| Halaman per juz | ✓ | 257 (harapan 257) |
| (juz, halaman) unik | ✓ | 0 ganda |
| Jumlah judul sumber | ✓ | 31 (harapan 31) |
| Daftar isi utuh (tanpa judul yatim, siklus, atau patch gagal) | ✓ | 0 masalah |
| Urutan halaman daftar isi monoton | ✓ | ya |
| Paragraf tidak kosong dan muat satu statement D1 | ✓ | 0 kosong; terpanjang 1652 byte (batas 90000) |
| Penanda (١) tidak hilang saat takhrij dipisah | ✓ | ya |
| Integritas lintas tabel (edisi halaman/node = edisi paragraf; penanda badan → catatan kaki halaman sama) | ✓ | 0 paragraf beda edisi atau tanpa node; 0 footnote_ref salah arah |
| Kelas catatan kaki none dipatuhi (ADR-138) | ✓ | 0 catatan di sumber; 0 paragraf catatan dan 0 footnote_ref dimuat |
| Matan = OpenITI (≥0,95 per halaman) | ✓ | 257/257 halaman (gerbang ≥257); 0 halaman tidak ada di OpenITI |
| Sumber Qur'an utuh (ayat = jumlah per surah; terjemahan + transliterasi tiap ayat; penomoran QUL = Tanzil) | ✓ | 114 surah, 6236/6236 ayat, 12472 baris terjemahan/transliterasi; 6 ayat beda teks QUL vs Tanzil (batas 20) |
| Rujukan ayat sah (offset di dalam teks tanpa spasi tepi, tidak tumpang tindih, ayat ada) | ✓ | 77 rujukan; 0 tidak sah |
| Kutipan exact ada di teks ayat rujukannya (ayat utuh = sama persis) | ✓ | 75 rujukan exact; 0 tidak sesuai |
| Kutipan {…} tervalidasi cocok persis ≥95% | ✓ | 74/76 (97,4%); mirip 2, tidak cocok 0 |
| Terjemahan AI: setiap kutipan ayat diisi terjemahan Kemenag (tidak diterjemahkan model) | ✓ | 62 terjemahan berisi ayat; 0 bermasalah |
| Terjemahan AI: cakupan paragraf badan ≥ 99% | ✓ | 2189/2191 (99,91%); usang 0, tidak sah 0, ditolak tinjauan 0, terblokir (rujukan ayat tak bisa ditandai) 0 |
| Ringkasan AI: cakupan bagian × 2 bahasa ≥ 99% | ✓ | 58/58 (100,00%); usang 0, tidak sah 0 |
| Judul daftar isi Indonesia (terjemahan AI): cakupan node + subjudul ≥ 99% | ✓ | 29/29 (100,00%): node 29, subjudul 0 |
| Revisi terjemahan manusia (X08): status tinjauan = asal tinjauannya | ✓ | 0 revisi berlaku |
| Intisari: kutipan cocok sidik dan tanpa ayat, gagasan berjangkar, indeks hanya gagasan tampil (X15b) | ✓ | 0/29 node, 0 gagasan, 0 kutipan (0 memakai terjemahan paragraf, 0 ditahan), 0 istilah glosarium, 0 abstrak menggantikan ringkasan |
| Konten chat (X24): unit siap jadi Intisari, kutipan di dalam paragraf dan tanpa ayat, unit ditarik tidak dimuat | ✓ | 29 unit, 155 gagasan, 34 kutipan, 155 soal berjawaban; menggantikan batch 0 (–), induk batch basi dibuang 0 (–); 0 unit ditarik |
| Intisari termuat ≥ 29 (tidak berkurang dari korpus tayang) | ✓ | 29 Intisari dari at-tarifat/intisari |
| Teks badan penyunting tidak dimuat (ADR-150) | ✓ | 35 paragraf, 2 node, 2 halaman dibuang (2 bagian, data/patches/at-tarifat-7312-pentahqiq.yaml); 0 baris masih merujuknya |
| ID paragraf rilis stabil (ADR-059) | ✓ | 2192 ID lama ada dengan teks sama; 35 dikecualikan sebagai teks penyunting (ADR-150) |

## Daftar isi

- 31 node (31 judul Shamela + node patch); 30 node ditandai `patched`.
- Judul tanpa span di teks (dimulai di awal `title.page`): –.
- Judul yang span-nya di halaman lain dari `title.page`: –.
- Judul yang dimulai di tengah paragraf (paragraf itu ikut node baru): 0.

## Paragraf

- Badan: 2.227 paragraf; panjang (karakter) min 3 · median 85 · p90 262 · p99 611 · maks 914.
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

## Teks badan penyunting tidak dimuat (ADR-150)

### Label jilid Shamela (1 paragraf, 1 node)

Title 1 hanya label jilid ("jilid pertama") dari Shamela untuk kitab satu jilid. Semua bab dinaikkan ke tingkat teratas lewat patch daftar isi, sehingga node ini hanya berisi label itu.

Paragraf: 80000001
Node: 800001

### Daftar isi penerbit (34 paragraf, 1 node)

Bab "al-Faharis" di akhir edisi: daftar isi penerbit (nama bab dan nomor halaman cetak), bukan teks al-Jurjani. Isinya sudah tersedia sebagai daftar isi pembaca.

Paragraf: 80002194, 80002195, 80002196, 80002197, 80002198, 80002199, 80002200, 80002201, 80002202, 80002203, 80002204, 80002205, 80002206, 80002207, 80002208, 80002209, 80002210, 80002211, 80002212, 80002213, 80002214, 80002215, 80002216, 80002217, 80002218, 80002219, 80002220, 80002221, 80002222, 80002223, 80002224, 80002225, 80002226, 80002227
Node: 800031
