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

*Belum ada. Diisi setelah penilai mengirim hasil.*
