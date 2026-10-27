# T-17 tahap 3 · Mutu terjemahan AI Ihya tanpa bias (pra-registrasi)

> Ditulis dan di-commit **sebelum** sampel diambil atau dilihat siapa pun (X04, 2026-10-21). Seed, ukuran
> sampel, strata, rubrik, dan aturan keputusan di bawah tidak boleh diubah sesudah sampel terlihat. Bila
> ada perubahan, tulis sebagai penyimpangan bertanggal di bagian *Hasil*, bukan dengan menyunting bagian
> ini. Dasar: rancangan T-17 tahap 3 di [`implementasi/sesi/X04-mutu-baca.md`](../../implementasi/sesi/X04-mutu-baca.md)
> dan target T-17 di `implementasi/TUGAS-PEMILIK.md` (Benar ≥ 80%, Salah ≤ 10%).

## Tujuan

Memperkirakan mutu **seluruh** terjemahan AI Ihya di korpus produksi, bukan sampel yang sudah
diperbaiki. Angka T-17 tahap 2 sesudah X02 (20/20) bias: sampelnya sama dan penilainya agent yang
memperbaiki (ADR-047).

## Populasi

Semua baris `translation` berbahasa Indonesia (`lang = 'id'`) di korpus produksi `ihya-v7`
(`surau-corpus-ihya-v7`): **16.092 terjemahan**, termasuk yang pernah diterjemahkan ulang di X02. Tidak
ada pengecualian manual. Terjemahan yang ditolak lapisan koreksi (ADR-047) tidak terbit di korpus, jadi
tidak ada di populasi.

## Sampel

- **60 terjemahan, berstrata menurut panjang teks Arab paragrafnya** (`length(passage.text_raw)`,
  karakter UTF-16), masing-masing 20:

  | Strata | Panjang Arab | Populasi | Bobot | Sampel |
  |---|---|---:|---:|---:|
  | pendek | < 100 | 5.617 | 0,3491 | 20 |
  | sedang | 100–499 | 8.132 | 0,5053 | 20 |
  | panjang | ≥ 500 | 2.343 | 0,1456 | 20 |

- **Seed: 20261021** (baru; bukan `QA_SEED` 9473). Strata ke-k (pendek = 0, sedang = 1, panjang = 2)
  diambil dengan `samplePages(id paragraf strata itu, 20, 20261021 + k)` dari
  `tools/ingest/src/qa-sample.ts` (Fisher–Yates parsial, PRNG mulberry32; masukan diurutkan dulu,
  jadi hasilnya tidak bergantung urutan kueri).
- **Urutan tampil** di halaman nilai diacak dengan seed **20261121** (Fisher–Yates mulberry32 atas 60
  sampel yang sudah diurutkan menurut ID), supaya penilai tidak tahu strata dari urutannya.
- Perintah: `pnpm t17 sampel` menulis daftar ID ke `data/reviews/ihya-9472-t17-tahap3-sampel.json`
  (tanpa teks kitab), lalu di-commit sebelum halaman nilai dibuat.

## Buta (blind)

Halaman nilai (`pnpm t17 halaman`, file HTML lokal di `data/build/llm/qa/`, bukan artifact publik)
hanya menampilkan teks Arab (`text_raw`), terjemahan AI, dan terjemahan Kemenag untuk kutipan ayat yang
dikenali (konteks, tidak dinilai). Halaman **tidak** menampilkan model, versi prompt, status koreksi,
maupun strata. Tautan "konteks di Surau" membuka paragraf yang sama di pembaca (yang juga tidak
menampilkan model).

## Penilai

Manusia yang bisa membaca Arab (pemilik, Anas, atau orang yang ditunjuk pemilik), **bukan agent**. Nama
penilai diisi di halaman nilai. Bila ada dua penilai, **nomor 1–20 di halaman nilai** dinilai keduanya
untuk mengukur kesepakatan (persentase sama dan kappa Cohen); estimasi mutu memakai penilai pertama
yang menyelesaikan 60 nomor.

## Rubrik

Yang dinilai hanya teks terjemahan AI (bagian Kemenag tidak dinilai).

- **Benar:** makna setia pada teks Arab; gaya boleh kurang halus.
- **Kurang:** makna utama benar, tetapi ada yang janggal, istilah kurang tepat, atau bagian kecil hilang
  atau bertambah tanpa membalik makna.
- **Salah:** makna keliru di bagian penting.

Kategori kesalahan (boleh lebih dari satu, untuk Kurang dan Salah): makna terbalik/negasi; pelaku
tertukar; istilah fikih/tasawuf; bagian hilang; tambahan yang tidak ada di teks; nama/angka/satuan;
ayat/hadits; lainnya (tulis di catatan). Perkiraan waktu 60–90 menit.

## Analisis

- Persentase Benar, Kurang, dan Salah **per strata** dengan interval Wilson 95%.
- **Estimasi keseluruhan tertimbang** bobot populasi di atas: p = Σ bobot·p_strata. Interval 95%
  keseluruhan: Wilson atas p dengan n efektif desain berstrata (n_eff = p(1−p) / Σ bobot²·p_strata(1−p_strata)/20,
  paling banyak 60; bila semua strata 0% atau 100%, n_eff = 60).
- Dihitung `pnpm t17 hasil <berkas hasil>`; angka dicatat di bagian *Hasil* file ini, `implementasi/LOG.md`,
  dan `implementasi/TUGAS-PEMILIK.md` (T-17).

## Aturan keputusan (memakai estimasi titik tertimbang; tanpa ambang baru)

1. **Lolos** (Benar ≥ 80% **dan** Salah ≤ 10%): tidak ada terjemahan ulang massal; setiap kesalahan yang
   ditemukan masuk lapisan koreksi (ADR-047). Bila batas atas interval Salah > 10%, hasil ditandai
   **"belum pasti"** dan diusulkan tambahan 40 sampel dengan seed lanjutan (20261024–20261026 untuk
   strata 0–2, masing-masing ±13–14 sampel menurut bobot) tanpa mengulang sampel pertama.
2. **Tidak lolos, Salah ≤ 15%** (termasuk Benar < 80% dengan Salah rendah): usulan terjemahan ulang
   **terarah** untuk strata/kategori yang dominan, dengan perkiraan biaya dan izin pemilik.
3. **Salah > 15%:** usulan terjemahan ulang luas (Sonnet ±US$40–65 penuh, atau per rub') sebagai
   keputusan anggaran pemilik.

## Hasil

### Penilai agent (pengganti sementara, **bukan manusia**, bukan estimasi resmi) · 2026-10-26

**Penyimpangan dari pra-registrasi (bertanggal 2026-10-26):** bagian *Penilai* di atas mensyaratkan
penilai manusia, bukan agent. Pemilik meminta agent menggantikan penilai manusia untuk sementara
("eval/gantikan ustad untuk sementara … kerjakan semuanya: … T-17 tahap 3"), ADR-105. Hasil ini
dicatat sebagai **penilai agent** dan belum memenuhi syarat penilai manusia. Penilaian manusia (pemilik,
Anas, atau orang yang ditunjuk) tetap bisa dilakukan kapan saja dengan halaman nilai yang sama; nomor
1–20 bisa dipakai untuk kesepakatan agent vs manusia (`pnpm t17 hasil a b`). **Penilai manusia
pertama yang menyelesaikan 60 nomor menjadi estimasi resmi (bagian *Penilai*) dan menggantikan hasil
agent ini.** Seed, sampel, strata, rubrik, dan aturan keputusan tidak berubah. Catatan bias: penilai
ini satu keluarga model (Claude) dengan penerjemahnya.

Pelaksanaan: subagen menilai buta (teks Arab, terjemahan AI, dan konteks Kemenag saja; tanpa model,
versi prompt, status koreksi, atau strata), dari ekspor hanya-baca `surau-corpus-ihya-v7`. Agent induk
mengecek ulang tiga butir Salah (no. 13, 23, 40) terhadap teks Arab, dan ketiganya terkonfirmasi.
Hasil: [`data/reviews/ihya-9472-t17-tahap3-hasil-agent.txt`](../reviews/ihya-9472-t17-tahap3-hasil-agent.txt)
(format "Salin hasil") dan [`…-detail-agent.jsonl`](../reviews/ihya-9472-t17-tahap3-detail-agent.jsonl)
(usulan koreksi Indonesia untuk setiap K/S). `pnpm t17 hasil data/reviews/ihya-9472-t17-tahap3-hasil-agent.txt`:

| Strata | n | Benar | Kurang | Salah |
|---|---:|---|---|---|
| pendek | 20 | 90,0% (69,9–97,2%) | 0,0% (0,0–16,1%) | 10,0% (2,8–30,1%) |
| sedang | 20 | 70,0% (48,1–85,5%) | 15,0% (5,2–36,0%) | 15,0% (5,2–36,0%) |
| panjang | 20 | 35,0% (18,1–56,7%) | 50,0% (29,9–70,1%) | 15,0% (5,2–36,0%) |
| **tertimbang** | 60 | **71,9%** (59,3–81,8%) | 14,9% (8,0–26,0%) | **13,3%** (6,4–25,3%) |

Kategori: pelaku tertukar 7, makna terbalik/negasi 4, bagian hilang 3, tambahan 2, nama/angka 2,
istilah 2, ayat/hadits 1, lainnya 11.

**Keputusan (aturan 2 pra-registrasi): tidak lolos, Salah ≤ 15% → usulan terjemahan ulang terarah.**
Pemicu tinjau ulang ADR-048 ("T-17 tahap 3 … menemukan Salah > 10%") terpenuhi oleh penilai agent
ini; diteruskan ke ADR-105 dan `/rilis 4`.
Strata **panjang** (≥ 500 karakter Arab, 2.343 terjemahan) paling lemah, dengan Benar hanya 35%.
Kategori terbanyak adalah "lainnya" (11, salah tangkap makna kalimat), lalu pelaku tertukar (7) dan
negasi terbalik (4), terutama di kisah dan nukilan ucapan tokoh. Terjemahan ulang terarah butuh perkiraan biaya dan izin pemilik. Usulan koreksi untuk 8 butir Salah dan 13
butir Kurang ada di berkas detail; usulan itu belum masuk lapisan koreksi (ADR-047). Usulan dibuat
agent, jadi perlu dicek sebelum dipakai.

Temuan pipeline (bukan nilai makna): kutipan ayat tanpa placeholder ⟦QS⟧ ikut diterjemahkan AI
(no. 12, QS 15:98), padahal ayat wajib memakai terjemahan Kemenag (aturan teks Arab 9). Ini sisa
risiko ADR-042 yang terulang; perbaikan deteksi ayat masuk langkah berikutnya.

### Klarifikasi dan penyimpangan (bertanggal)

- **2026-10-21, sebelum ada hasil yang terlihat (temuan peninjau X04):** frasa "masing-masing ±13–14
  sampel menurut bobot" di aturan keputusan 1 bisa dibaca dua cara (alokasi sama seperti sampel pertama,
  atau proporsional bobot = 14/20/6). Yang berlaku, mengikuti angka yang tertulis: tambahan 40 dibagi
  **13/14/13** (pendek/sedang/panjang); "menurut bobot" hanya menentukan strata yang mendapat sisa satu
  sampel (sedang, bobot terbesar). Strata ke-k ditarik dengan `samplePages(id strata itu sesudah
  mengeluarkan 20 ID sampel pertamanya, n, 20261024 + k)`. Analisis gabungan memakai bobot populasi yang
  sama; di rumus n_eff, pembagi 20 menjadi n strata itu (33/34/33) dan batasnya 100. Seed, strata,
  rubrik, dan sampel pertama tidak berubah.
- **2026-10-21, alat (sebelum hasil):** isian halaman nilai disimpan per nama penilai (penilai kedua
  tidak melihat nilai penilai pertama); `pnpm t17 hasil a b` menghitung kesepakatan + kappa Cohen untuk
  nomor 1–20; berkas hasil divalidasi dan dicocokkan dengan sidik sampel (`344d2b8f695d`).
- **2026-10-21, alat (sebelum hasil, tinjauan ulang peninjau):** versi halaman nilai sebelumnya memuat
  isian penilai terakhir saat dibuka, jadi penilai kedua di browser yang sama bisa melihat nilai penilai
  pertama sebelum menekan *Penilai baru*. Kini formulir selalu kosong dan terkunci sampai nama diisi,
  isian tersimpan dibuka lewat tombol *Lanjutkan sebagai …*, dan isian dari versi halaman sebelumnya
  dipindahkan otomatis ke nama penilainya. Saat perubahan ini dibuat, agent belum menerima isian penilai
  mana pun.

### Sampel lanjutan sesudah terjemahan ulang X21 (penilai agent, 2026-10-27)

**Penyimpangan dari pra-registrasi (bertanggal 2026-10-27, ditulis sebelum hasil terlihat di commit sampel `d08e358`):**
- Populasi 16.092 pra-registrasi tidak bisa direproduksi (D1 `ihya-v7` memuat 16.086 terjemahan, `ihya-v8` 16.097). Sampel lanjutan ditarik dari populasi korpus yang sedang diukur, `ihya-v9` (16.106 terjemahan: pendek 5.618, sedang 8.135, panjang 2.353).
- Prosedur sesuai klarifikasi 2026-10-21: `samplePages` atas ID strata itu, 13/14/13, seed 20261024 + k (`pnpm t17 sampel-lanjutan`). Dikeluarkan dari populasi tarikan: 60 sampel pertama **dan** 30 ID sampel uji prompt X21 (`data/reviews/ihya-9472-x21-sampel-uji.json`), supaya paragraf yang sudah dilihat saat memilih prompt tidak dinilai lagi.
- Terjemahan di 60 sampel pertama (terutama sedang dan panjang) ikut diganti, jadi penggabungan 60 + 40 tidak sah; estimasi memakai **hanya 40 sampel lanjutan**.
- Penilai: dua subagen Claude Opus buta (hanya teks Arab + satu terjemahan, tanpa model/versi/strata), bekerja paralel dan mandiri; **bukan manusia** (ADR-105). Penilaian manusia kapan pun tetap menggantikan penilaian agent ini.

Hasil (`pnpm t17 hasil --lanjutan …`; berkas: `data/reviews/ihya-9472-t17-tahap3-lanjutan-agent-{A,B}.json`, tanpa teks kitab):

| Strata | n | Benar | Kurang | Salah | Asal terjemahan |
|---|---:|---|---|---|---|
| pendek | 13 | 61,5% (35,5–82,3%) | 38,5% (17,7–64,5%) | 0,0% (0,0–22,8%) | Haiku + v2 (tidak diterjemahkan ulang) |
| sedang | 14 | 100,0% (78,5–100,0%) | 0,0% | 0,0% (0,0–21,5%) | Sonnet 5.5 + v5 |
| panjang | 13 | 69,2% (42,4–87,3%) | 23,1% (8,2–50,3%) | 7,7% (1,4–33,3%) | Sonnet 5.5 + v5 |
| **tertimbang** | 40 | **82,1%** (67,6–91,0%) | 16,8% (8,3–31,1%) | **1,1%** (0,1–10,7%) | |

Kategori: istilah 4, bagian hilang 3, tambahan 2, lainnya 3. Dua penilai sepakat di 40 dari 40 nomor (kappa 1,00 pada nomor 1–20); catatan keduanya berbeda kalimat, tetapi keduanya satu keluarga model dengan penerjemah, jadi kesepakatan ini bukan bukti keandalan.

**Keputusan (aturan 1 pra-registrasi): "lolos, belum pasti"**: estimasi titik memenuhi target (Benar 82,1% ≥ 80%; Salah 1,1% ≤ 10%), tetapi batas atas Salah (10,7%) melewati 10%. Dibanding penilaian agent atas 60 sampel pertama (71,9% / 13,3%), terjemahan paragraf sedang dan panjang membaik jelas (sedang 100%, panjang 69%), sedangkan strata pendek (belum diterjemahkan ulang) 5 dari 13 Kurang, tanpa Salah. Satu-satunya Salah ada di strata panjang (1 dari 13).

**Strata pendek sesudah diterjemahkan ulang (penilai agent, 2026-10-27, atas izin pemilik; sesudah-hasil, bukan bagian pra-registrasi).** Ke-13 sampel pendek di atas ikut diterjemahkan ulang (Sonnet 5.5 + v5) dan dinilai lagi oleh dua penilai buta ([berkas](../reviews/ihya-9472-t17-tahap3-lanjutan-pendek-ulang-agent.json)). Sebelum: 8 Benar, 5 Kurang, 0 Salah (Haiku + v2). Sesudah: **12 Benar**, 1 butir (no. 31) dinilai Kurang oleh satu penilai dan Salah oleh yang lain (terjemahan menambah negasi "tidak dicintai" di kalimat keheranan penulis); 12 dari 13 nomor sama. Ini sampel yang sudah pernah dilihat sebelumnya, jadi hanya perbandingan sebelum/sesudah, bukan estimasi tak bias. Sebagai gambaran kasar saja, bila strata pendek di populasi berperilaku seperti ini, estimasi tertimbang bergeser dari 82,1% ke sekitar 90%+ Benar; pengukuran tak bias untuk korpus akhir butuh sampel baru (atau penilai manusia).
