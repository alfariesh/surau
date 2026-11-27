# Laporan validasi ingest: at-Tibyan fi Adab Hamalat al-Qur'an (Shamela 1969)

> Dibuat otomatis oleh `pnpm ingest korpus` (`tools/ingest`, S07). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka, ID judul Shamela (`t<title.id>`), dan rujukan juz/halaman cetak.

- Sumber: Shamela `book/969/1969.db`, sha256 `3455f0e5e215d9ef1621b606d7b4d89e1acfdfa67d747e83523d0ee14ba30124`
- Patch daftar isi: `–` · peta ID: `data/ids/at-tibyan-1969.json`
- Korpus: `kitab-v11` · NORM_VERSION 2

## Invarian (ingest gagal bila ada yang ✗)

| Invarian | Hasil | Rincian |
|---|---|---|
| Jumlah halaman | ✓ | 224 (harapan 224) |
| Halaman per juz | ✓ | 224 (harapan 224) |
| (juz, halaman) unik | ✓ | 0 ganda |
| Jumlah judul sumber | ✓ | 127 (harapan 127) |
| Daftar isi utuh (tanpa judul yatim, siklus, atau patch gagal) | ✓ | 0 masalah |
| Urutan halaman daftar isi monoton | ✓ | ya |
| Paragraf tidak kosong dan muat satu statement D1 | ✓ | 0 kosong; terpanjang 2209 byte (batas 90000) |
| Penanda (١) tidak hilang saat takhrij dipisah | ✓ | ya |
| Integritas lintas tabel (edisi halaman/node = edisi paragraf; penanda badan → catatan kaki halaman sama) | ✓ | 0 paragraf beda edisi atau tanpa node; 0 footnote_ref salah arah |
| Kelas catatan kaki modern_editor dipatuhi (ADR-138) | ✓ | 27 catatan di sumber; 0 paragraf catatan dan 0 footnote_ref dimuat |
| Matan = OpenITI (≥0,95 per halaman) | ✓ | 224/224 halaman (gerbang ≥224); 0 halaman tidak ada di OpenITI |
| Sumber Qur'an utuh (ayat = jumlah per surah; terjemahan + transliterasi tiap ayat; penomoran QUL = Tanzil) | ✓ | 114 surah, 6236/6236 ayat, 12472 baris terjemahan/transliterasi; 6 ayat beda teks QUL vs Tanzil (batas 20) |
| Rujukan ayat sah (offset di dalam teks tanpa spasi tepi, tidak tumpang tindih, ayat ada) | ✓ | 65 rujukan; 0 tidak sah |
| Kutipan exact ada di teks ayat rujukannya (ayat utuh = sama persis) | ✓ | 65 rujukan exact; 0 tidak sesuai |
| Kutipan {…} tervalidasi cocok persis ≥95% | ✓ | 0/0 (100,0%); mirip 0, tidak cocok 0 |
| Terjemahan AI: setiap kutipan ayat diisi terjemahan Kemenag (tidak diterjemahkan model) | ✓ | 34 terjemahan berisi ayat; 0 bermasalah |
| Terjemahan AI: cakupan paragraf badan ≥ 99% | ✓ | 602/602 (100,00%); usang 0, tidak sah 0, ditolak tinjauan 0, terblokir (rujukan ayat tak bisa ditandai) 0 |
| Ringkasan AI: cakupan bagian × 2 bahasa ≥ 99% | ✓ | 237/238 (99,58%); usang 0, tidak sah 0 |
| Judul daftar isi Indonesia (terjemahan AI): cakupan node + subjudul ≥ 99% | ✓ | 122/122 (100,00%): node 122, subjudul 0 |
| Revisi terjemahan manusia (X08): status tinjauan = asal tinjauannya | ✓ | 0 revisi berlaku |
| Intisari: kutipan cocok sidik dan tanpa ayat, gagasan berjangkar, indeks hanya gagasan tampil (X15b) | ✓ | 0/119 node, 0 gagasan, 0 kutipan (0 memakai terjemahan paragraf, 0 ditahan), 0 istilah glosarium, 0 abstrak menggantikan ringkasan |
| Konten chat (X24): unit siap jadi Intisari, kutipan di dalam paragraf dan tanpa ayat, unit ditarik tidak dimuat | ✓ | 11 unit, 64 gagasan, 15 kutipan, 64 soal berjawaban; menggantikan batch 0 (–), induk batch basi dibuang 0 (–); 0 unit ditarik |
| Intisari termuat ≥ 11 (tidak berkurang dari korpus tayang) | ✓ | 11 Intisari dari at-tibyan/intisari |
| Teks badan penyunting tidak dimuat (ADR-150) | ✓ | 40 paragraf, 5 node, 4 halaman dibuang (3 bagian, data/patches/at-tibyan-1969-pentahqiq.yaml); 0 baris masih merujuknya |
| ID paragraf rilis stabil (ADR-059) | ✓ | 614 ID lama ada dengan teks sama; 40 dikecualikan sebagai teks penyunting (ADR-150) |

## Daftar isi

- 127 node (127 judul Shamela + node patch); 0 node ditandai `patched`.
- Judul tanpa span di teks (dimulai di awal `title.page`): t15 (j1 h43), t31 (j1 h68).
- Judul yang span-nya di halaman lain dari `title.page`: –.
- Judul yang dimulai di tengah paragraf (paragraf itu ikut node baru): 0.

## Paragraf

- Badan: 654 paragraf; panjang (karakter) min 4 · median 87 · p90 512 · p99 948 · maks 1.209.
- Catatan kaki: 0 paragraf; panjang (karakter) min 0 · median 0 · p90 0 · p99 0 · maks 0.
  - 0 dari bagian bawah halaman (setelah `_________`), 0 takhrij menempel yang dipotong dari badan.
  - 0 catatan memanjang lebih dari satu baris (baris dipisah `\n`).
- Tag HTML tak dikenal (dibiarkan sebagai teks): –.

## Penanda catatan kaki (١)

- 32 penanda di badan teks; 0 tertaut ke catatan bernomor sama (`footnote_ref`).
- Penanda yatim (tanpa catatan): 0.
- Penanda di dalam takhrij menempel (ikut terpotong, tidak ditautkan): 0. Penanda pembuka takhrij tetap di matan.
- Catatan bawah halaman yang tidak dirujuk penanda matan (ditandai `footnote_orphan`): 0; 0 di antaranya karena penandanya ada di dalam takhrij menempel.
- Catatan kaki penyunting modern tidak dimuat (kelas `modern_editor`, ADR-138): 27 catatan dibuang; 32 penanda (١) di badan tetap di `text_raw` sebagai teks biasa tanpa tautan.

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

### Mukadimah pentahqiq (7 paragraf)

Pengantar Muhammad al-Hajjar sebelum teks an-Nawawi (memuji Allah, menyebut tiga karya an-Nawawi yang ia tahqiq), ditutup tanda tangannya. Karya penyunting modern.

Paragraf: 30000002, 30000003, 30000004, 30000005, 30000006, 30000007, 30000008

### al-Fawa'id al-Mazidah 'ala al-Kitab (27 paragraf, 4 node)

Tiga "latifah" tambahan pentahqiq sesudah kitab berakhir, merujuk karya dan cetakan modern (Manaqib Ahmad terbitan 1977 M, al-Itqan); bukan bagian at-Tibyan.

Paragraf: 30000622, 30000623, 30000624, 30000625, 30000626, 30000627, 30000628, 30000629, 30000630, 30000631, 30000632, 30000633, 30000634, 30000635, 30000636, 30000637, 30000638, 30000639, 30000640, 30000641, 30000642, 30000643, 30000644, 30000645, 30000646, 30000647, 30000648
Node: 300123, 300124, 300125, 300126

### Kalimat al-Khitam (6 paragraf, 1 node)

Kata penutup pentahqiq tentang penyempurnaan cetakan ketiga, bertanda tangan Muhammad Mahmud al-Hajjar.

Paragraf: 30000649, 30000650, 30000651, 30000652, 30000653, 30000654
Node: 300127
