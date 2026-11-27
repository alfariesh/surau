# Laporan validasi ingest: al-Ajurrumiyyah (Shamela 11371)

> Dibuat otomatis oleh `pnpm ingest korpus` (`tools/ingest`, S07). Jangan disunting tangan.
> Tanpa teks kitab: hanya angka, ID judul Shamela (`t<title.id>`), dan rujukan juz/halaman cetak.

- Sumber: Shamela `book/371/11371.db`, sha256 `c4ac77d505163ba2c5484e77521193a0b6b1c72da5c4ab08e42461087013621e`
- Patch daftar isi: `–` · peta ID: `data/ids/al-ajurrumiyyah-11371.json`
- Korpus: `kitab-v11` · NORM_VERSION 2

## Invarian (ingest gagal bila ada yang ✗)

| Invarian | Hasil | Rincian |
|---|---|---|
| Jumlah halaman | ✓ | 19 (harapan 19); dari 31 halaman Shamela, 12 digabung ke nomor cetak yang sama (ADR-139) |
| Halaman per juz | ✓ | 19 (harapan 19) |
| (juz, halaman) unik | ✓ | 0 ganda |
| Jumlah judul sumber | ✓ | 25 (harapan 25) |
| Daftar isi utuh (tanpa judul yatim, siklus, atau patch gagal) | ✓ | 0 masalah |
| Urutan halaman daftar isi monoton | ✓ | ya |
| Paragraf tidak kosong dan muat satu statement D1 | ✓ | 0 kosong; terpanjang 709 byte (batas 90000) |
| Penanda (١) tidak hilang saat takhrij dipisah | ✓ | ya |
| Integritas lintas tabel (edisi halaman/node = edisi paragraf; penanda badan → catatan kaki halaman sama) | ✓ | 0 paragraf beda edisi atau tanpa node; 0 footnote_ref salah arah |
| Kelas catatan kaki modern_editor dipatuhi (ADR-138) | ✓ | 4 catatan di sumber; 0 paragraf catatan dan 0 footnote_ref dimuat |
| Matan = OpenITI (≥0,95 per halaman) | ✓ | 19/19 halaman (gerbang ≥19); 0 halaman tidak ada di OpenITI |
| Sumber Qur'an utuh (ayat = jumlah per surah; terjemahan + transliterasi tiap ayat; penomoran QUL = Tanzil) | ✓ | 114 surah, 6236/6236 ayat, 12472 baris terjemahan/transliterasi; 6 ayat beda teks QUL vs Tanzil (batas 20) |
| Rujukan ayat sah (offset di dalam teks tanpa spasi tepi, tidak tumpang tindih, ayat ada) | ✓ | 0 rujukan; 0 tidak sah |
| Kutipan exact ada di teks ayat rujukannya (ayat utuh = sama persis) | ✓ | 0 rujukan exact; 0 tidak sesuai |
| Kutipan {…} tervalidasi cocok persis ≥95% | ✓ | 0/0 (100,0%); mirip 0, tidak cocok 0 |
| Terjemahan AI: setiap kutipan ayat diisi terjemahan Kemenag (tidak diterjemahkan model) | ✓ | 0 terjemahan berisi ayat; 0 bermasalah |
| Terjemahan AI: cakupan paragraf badan ≥ 99% | ✓ | 137/137 (100,00%); usang 0, tidak sah 0, ditolak tinjauan 0, terblokir (rujukan ayat tak bisa ditandai) 0 |
| Ringkasan AI: cakupan bagian × 2 bahasa ≥ 99% | ✓ | 50/50 (100,00%); usang 0, tidak sah 0 |
| Judul daftar isi Indonesia (terjemahan AI): cakupan node + subjudul ≥ 99% | ✓ | 25/25 (100,00%): node 25, subjudul 0 |
| Revisi terjemahan manusia (X08): status tinjauan = asal tinjauannya | ✓ | 0 revisi berlaku |
| Intisari: kutipan cocok sidik dan tanpa ayat, gagasan berjangkar, indeks hanya gagasan tampil (X15b) | ✓ | 0/25 node, 0 gagasan, 0 kutipan (0 memakai terjemahan paragraf, 0 ditahan), 0 istilah glosarium, 0 abstrak menggantikan ringkasan |
| Konten chat (X24): unit siap jadi Intisari, kutipan di dalam paragraf dan tanpa ayat, unit ditarik tidak dimuat | ✓ | 25 unit, 60 gagasan, 26 kutipan, 60 soal berjawaban; menggantikan batch 0 (–), induk batch basi dibuang 0 (–); 0 unit ditarik |
| Intisari termuat ≥ 25 (tidak berkurang dari korpus tayang) | ✓ | 25 Intisari dari al-ajurrumiyyah/intisari |
| ID paragraf rilis stabil (ADR-059) | ✓ | 139 ID lama ada dengan teks sama |

## Daftar isi

- 25 node (25 judul Shamela + node patch); 0 node ditandai `patched`.
- Judul tanpa span di teks (dimulai di awal `title.page`): –.
- Judul yang span-nya di halaman lain dari `title.page`: –.
- Judul yang dimulai di tengah paragraf (paragraf itu ikut node baru): 0.

## Paragraf

- Badan: 139 paragraf; panjang (karakter) min 3 · median 67 · p90 185 · p99 341 · maks 389.
- Catatan kaki: 0 paragraf; panjang (karakter) min 0 · median 0 · p90 0 · p99 0 · maks 0.
  - 0 dari bagian bawah halaman (setelah `_________`), 0 takhrij menempel yang dipotong dari badan.
  - 0 catatan memanjang lebih dari satu baris (baris dipisah `\n`).
- Tag HTML tak dikenal (dibiarkan sebagai teks): –.

## Penanda catatan kaki (١)

- 0 penanda di badan teks; 0 tertaut ke catatan bernomor sama (`footnote_ref`).
- Penanda yatim (tanpa catatan): 0.
- Penanda di dalam takhrij menempel (ikut terpotong, tidak ditautkan): 0. Penanda pembuka takhrij tetap di matan.
- Catatan bawah halaman yang tidak dirujuk penanda matan (ditandai `footnote_orphan`): 0; 0 di antaranya karena penandanya ada di dalam takhrij menempel.
- Catatan kaki penyunting modern tidak dimuat (kelas `modern_editor`, ADR-138): 4 catatan dibuang; 0 penanda (١) di badan tetap di `text_raw` sebagai teks biasa tanpa tautan.

## Takhrij yang menempel ke matan (`//`)

- 0 halaman memuat `//` di badan teks.
- Takhrij sesudah `//`: 0 · sebelum `//`: 0 · tidak dikenali (paragraf tidak dipecah, `inline_unsplit`): 0 (–).
- Akhir takhrij "sesudah `//`" tidak ditandai di sumber (juga tidak di OpenITI), jadi dipotong sampai akhir paragraf. 0 potongan ≥400 karakter kemungkinan ikut membawa matan lanjutan: –.
- Semua potongan ditandai `takhrij_inline` di `passage_needs_review` untuk ditinjau manusia.

## Ditandai perlu ditinjau (`passage_needs_review`)

| Alasan | Paragraf |
|---|---|
| **paragraf unik** | **0** |
