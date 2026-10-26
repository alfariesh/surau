# X21 · Terjemahan ulang terarah Ihya sesudah T-17 tahap 3

> **Fase:** sisipan (sesudah T-17 tahap 3, sebelum `/rilis 4`) · **Status:** berjalan (rancangan + biaya diajukan; batch berbayar menunggu izin pemilik)
> **Prasyarat:** T-17 tahap 3 dinilai agent 2026-10-26 (ADR-105, [laporan](../../data/reports/ihya-9472-t17-tahap3.md)) · izin pemilik di chat untuk setiap batch berbayar (CLAUDE.md aturan 4) · T-28 (`data/build/llm` dan `data/raw/kemenag` di mesin agent) sebelum korpus berikutnya dibangun
> **Perkiraan:** 2–3 percakapan agent

## Kenapa sesi ini ada

Penilai agent atas 60 sampel berstrata menemukan Benar 71,9% dan Salah 13,3% (tertimbang), di bawah target 80% / ≤ 10%. Aturan keputusan 2 pra-registrasi: tidak lolos dengan Salah ≤ 15% → terjemahan ulang **terarah**, dengan perkiraan biaya dan izin pemilik. Strata panjang (≥ 500 karakter Arab, 2.343 terjemahan) paling lemah: Benar 35%, Kurang 50%. Pemicu tinjau ulang ADR-048 terpenuhi. Sesi ini menyiapkan perbaikannya; belum ada panggilan API berbayar.

## Temuan

### 1. Populasi: hampir semuanya Haiku + prompt v2

Dari 60 sampel, 59 dibuat Haiku 5.5 dengan `translate-passage@2` dan 1 Sonnet 5.5. Di seluruh korpus: 15.788 hasil Haiku v2, 270 Sonnet v2, 26 Sonnet v3, 13 Haiku v3/v4. Jadi aturan v3/v4 (satuan, ungkapan tebusan, *raghiba*) hampir tidak berlaku di populasi, dan sebagian besar kesalahan T-17 tahap 3 bukan pola itu: mereka salah baca kalimat.

### 2. Usulan koreksi agent dicek ulang terhadap teks Arab (21 butir K/S)

Delapan butir Salah semuanya terkonfirmasi sebagai kesalahan terjemahan. Usulan koreksinya **bukan koreksi manusia** dan **tidak** dimasukkan ke lapisan koreksi (ADR-047) atau ke terjemahan mana pun; dipakai hanya sebagai bahan uji (butir in-sample).

| No. | Nilai | Hasil cek terhadap Arab | Catatan usulan agent |
|---|---|---|---|
| 9 | S | benar: subjeknya "pembicaraan di masjid" | usulan menambah "(urusan dunia)" yang tidak ada di teks |
| 13 | S | benar: pepatah *akhbur taqlihi* ("ujilah, niscaya engkau membencinya") | usulan baik |
| 23 | S | terjemahan memang keliru (alasan akhir dijadikan pernyataan penulis); arah koreksinya masuk akal tetapi pembacaan kalimat itu **tidak pasti** | usulan belum pasti |
| 26 | S | dua kekeliruan terkonfirmasi (maksud kalimat pertama dan pelaku "merendahkan"); pembacaan agent atas kalimat pertama masuk akal tetapi bukan satu-satunya | usulan perlu disunting |
| 33 | S | benar: "tidak menahan hak mereka dan tidak memberi mereka hak orang lain"; "menitipkan Tuhanku untuk anakku" | usulan baik |
| 40 | S | benar: *yusy'aru bihi* = tidak diketahui orang | usulan baik |
| 48 | S | benar: sumpah agar tidak ada orang yang pernah belajar darinya ikut menarik | usulan baik |
| 57 | S | benar; sumber memuat salah ketik (bacaan yang lazim "bi-tawakkulika 'alayya", teks "'ala") sehingga terjemahan lama berbalik; bulan keempat hilang | usulan baik |
| 1, 3, 8, 11, 14, 16, 25, 34, 54, 60 | K | terkonfirmasi: perumpamaan ditambah; *isyfa'* dikira "sembuh"; "keempat" jadi "kelima"; analogi terbalik; *hazhz an-nafs* jadi "hak"; rujukan kata ganti ditebak dalam kurung; kalimat pembuka hilang; *ghalib* salah; pelaku (Umar vs laki-laki itu) tertukar; kalimat ambigu | usulan umumnya baik |
| 35, 46, 47 | K | terkonfirmasi sebagian: judul penutup (47) memang hilang; 35 dan 46 sebagian tidak diperiksa baris demi baris | belum dicek penuh |

### 3. Pola kesalahan dan tindakannya

| Pola (butir) | Penyebab yang terlihat | Tindakan |
|---|---|---|
| Salah baca struktur kalimat: pelaku/objek, negasi, "hak mereka" vs "hak orang lain" (33, 26, 54, 35, 34) | Haiku effort rendah, prompt v2 tanpa aturan membaca | Bagian "Membaca dengan teliti" di prompt v5; uji Sonnet dan effort sedang |
| Pendapat orang lain jadi pernyataan penulis (23, 60) | sama | aturan atribusi pendapat/sangkaan di v5 |
| Ungkapan, pepatah, kata jarang (13, 40, 3, 34, 14) | kosakata dan idiom klasik | aturan "baca sebagai ungkapan" + dua entri glosarium (*hazhz an-nafs*, *asyfa 'ala*) |
| Salah ketik sumber (57: "'ala" seharusnya "'alayya") | teks Shamela | **tidak** diberi aturan di prompt: bacaan "sesuai konteks" diam-diam menyimpang dari Arab yang tampil di sebelahnya (usulan peninjau). Dicatat sebagai patch sumber/koreksi manusia, bukan perintah ke model |
| Potongan pembuka/judul penutup hilang (25, 47) | model menganggap bukan isi | aturan kelengkapan di v5 |
| Angka/urutan bergeser (8) | model "membetulkan" menurut konteks | aturan salin angka |
| Kata dalam kurung menebak rujukan, perumpamaan ditambah (1, 16) | kecenderungan menambah | kata ganti ditulis seperti di sumber, tanpa tebakan dalam kurung |
| Kalimat Indonesia ambigu (60, 11) | susunan | aturan satu bacaan |

Catatan jujur: tiga bagian prompt baru dan dua entri glosarium berasal dari butir in-sample. Nilai in-sample karenanya **bias ke atas**; keputusan memakai sampel yang belum pernah dilihat.

### 4. Pencocok ayat: QS 15:98 (T-17 no. 12) dan kutipan serupa

Akar masalah di `unmarkedSpans` (`tools/ingest/src/quran/matcher.ts`): kutipan 5 kata persis, **satu-satunya** di mushaf, ditolak oleh filter konteks hadits (ADR-042). Di p10006163 kata "رسول" (Rasulullah) ada 16 kata sebelum kutipan, jadi lafaz Qur'ani dianggap sabda. Bukan soal 4 kata: kutipannya 5 kata ("بحمد ربك وكن من الساجدين"), tetapi pengantarnya "أوحي إلى رسول الله" bukan pengantar yang dikenal.

Pemindaian seluruh korpus (16.111 paragraf badan, mushaf dari `quran_ayah.text_index` produksi; pencocok lokal menghasilkan 2.484 rujukan, identik dengan produksi) menemukan **87 deret persis ≥ 5 kata yang satu-satunya di mushaf tetapi ditolak**. Setelah dibaca satu per satu, sebagian adalah zikir/hadits sungguhan (64:1, 2:156, 65:2) dan sebagian adalah ayat yang dibacakan Nabi atau sahabat: pasti diterjemahkan AI sekarang.

Perbaikan (ADR-107): di konteks hadits, deret tetap diterima bila (a) ada kata wahyu (*uhiya, yuha, nazalat, unzila, anzala, unzilat*) dalam 16 kata sebelumnya, (b) deret ≥ 8 kata, atau (c) deret seluruhnya satu ayat atau lebih (≥ 5 kata). Zikir yang kebetulan sama dengan ayat (awalan "له الملك وله الحمد وهو على كل شيء قدير", QS 64:1) tetap diblokir. Hasil di korpus: **+30 rujukan di 28 paragraf**, semuanya dibaca dan ayat sungguhan (17:74, 19:42, 4:64, 41:42, 112:3–4, 55:46, 15:98–99 dan lain-lain); 0 rujukan hilang. QS 15:98 di p10006163 kini terdeteksi. Paragraf terdampak otomatis dianggap usang (sha256 teks bertanda berubah) dan ikut diterjemahkan ulang; terjemahan Kemenag tampil di tempatnya.

Sisa risiko (tidak diubah): deret pendek (< 8 kata, sebagian ayat) di konteks hadits tanpa kata wahyu, dan lafaz berulang tanpa pengantar, tetap bisa diterjemahkan AI. Deret berulang di mushaf ≥ 6 kata (31 kandidat) ditinjau; sebagian ayat sungguhan, tetapi letaknya sembarang (ADR-042) sehingga sengaja tidak dilonggarkan. Deret 4–5 kata berulang (±300) tidak ditinjau satu per satu: kebanyakan kata hadits, zikir, atau kebetulan.

## Rancangan

### Prompt v5 (`packages/llm/prompts/translate-passage-v5.ts`)

v4 + "Membaca dengan teliti" + "Kelengkapan dan ketepatan" + "Tambahan glosarium (v5)". Tidak memuat huruf Arab. Belum aktif: `TRANSLATE_PROMPT` tetap v4; `buildTranslateRequest(..., model, { prompt, effort })` memilih v5 dan effort `low|medium|high` untuk uji. Beralih ke v5 hanya sesudah uji lolos.

### Uji kecil (butuh izin)

Satu batch (Message Batches) berisi 51 paragraf × 4 lengan = 204 request:
- **in-sample (21):** butir K/S T-17 tahap 3.
- **sampel baru (30):** 6 pendek, 12 sedang, 12 panjang, ditarik dari populasi `ihya-v8` tanpa 60 sampel T-17, seed `20261030 + k` (k = 0 pendek, 1 sedang, 2 panjang) dengan `samplePages` yang sama. ID dikecualikan dari sampel lanjutan nanti (lihat Klarifikasi). ID: pendek: 10007550, 10008878, 10009751, 10009787, 10014213, 10017916; sedang: 10003482, 10003693, 10005705, 10005709, 10007091, 10008044, 10008643, 10008864, 10010347, 10013015, 10013808, 10017625; panjang: 10000300, 10000441, 10001303, 10004745, 10006824, 10012298, 10012931, 10013373, 10013954, 10015039, 10018457, 10020387.
- **Lengan:** `h5` Haiku+v5 · `s4` Sonnet+v4 · `s5` Sonnet+v5 · `s5m` Sonnet+v5 effort `medium`. Pembanding adalah terjemahan produksi (Haiku v2).
- **Biaya perkiraan US$0,91 (batch, cache terbaca); tanpa satu pun cache hit sampai ±US$1,8; batas yang diminta US$2,00** (dihitung dari panjang teks nyata dan harga di `pricing.ts`; model hitungan yang sama memperkirakan US$2,05 untuk seluruh korpus Haiku, dekat dengan biaya aktual S13 ±US$1,9 untuk terjemahan tahap pertama).
- **Penilaian:** subagen buta (teks Arab + satu terjemahan, urutan dan lengan diacak, tanpa tahu versi), rubrik B/K/S yang sama dengan T-17. Penilai satu keluarga model dengan penerjemah (bias dicatat, seperti ADR-105). Dengan n kecil, uji ini **memilih lengan, bukan mengesahkan mutu**.

### Aturan keputusan uji (ditetapkan sebelum hasil terlihat)

1. Pakai Sonnet (bukan Haiku) bila `s5` melampaui `h5` ≥ 15 poin persentase Benar pada sampel baru sedang+panjang (n = 24); jika tidak, Haiku+v5 (± US$2 untuk seluruh korpus) menjadi pilihan murah.
2. Pakai effort `medium` bila `s5m` melampaui `s5` ≥ 10 poin Benar pada sampel baru sedang+panjang dan biaya tambahannya ≤ 50%.
3. Pakai v5 bila `s5` tidak lebih buruk dari `s4`: selisih Benar atau Salah sampai 1 butir (dari 24) dianggap sama dan v5 dipilih; lebih dari itu, v4 menang. Setiap hasil v5 juga diperiksa untuk dua risiko: kata benda yang ditambahkan dan terjemahan yang diam-diam menyimpang dari Arab.
4. Hasil in-sample dilaporkan terpisah dan tidak masuk keputusan.

## Biaya terjemahan ulang (perkiraan; dihitung ulang dengan `count_tokens` sebelum kirim)

Asumsi: Message Batches (−50%), prompt sistem v5 ±5.700 token dibaca dari cache, Arab 0,716 token/karakter, keluaran 0,59 token per karakter terjemahan lama (dikalibrasi ke ledger S13, sudah termasuk thinking effort low). "Batas atas" mengalikan keluaran 1,6× (Sonnet effort sedang). Tambahkan ±10% untuk ulangan yang ditolak validasi.

| Lingkup | Paragraf | Haiku+v5 | Sonnet 5.5+v5 | Sonnet batas atas |
|---|---:|---:|---:|---:|
| Panjang saja (≥ 500) | 2.355 | US$0,79 | **US$15,1** | US$22,3 |
| Panjang + sedang (≥ 100) | 10.492 | US$1,71 | **US$31,4** | US$44,9 |
| Semua paragraf badan | 16.111 | US$2,05 | US$36,7 | US$51,3 |
| Per jilid, panjang saja | j1 490 · j2 338 · j3 643 · j4 884 | 0,15 · 0,10 · 0,21 · 0,33 | 2,78 · 1,85 · 4,02 · 6,44 | 4,09 · 2,73 · 5,94 · 9,58 |
| Per jilid, panjang + sedang | j1 2.464 · j2 3.165 · j3 2.291 · j4 2.572 | 0,37 · 0,40 · 0,41 · 0,54 | 6,73 · 7,16 · 7,49 · 10,04 | 9,53 · 10,00 · 10,76 · 14,58 |

Tambahan kecil: 28 paragraf yang rujukan ayatnya berubah (±US$0,15 Sonnet) dan 25 paragraf yang belum punya terjemahan (±US$0,15).

Dampak pada target: bila hanya strata panjang membaik (Benar 35% → ±70%), estimasi tertimbang kira-kira Benar 77% dan Salah 11–12%; strata sedang (15% Salah, bobot 50%) tidak tersentuh. Jadi lingkup **panjang + sedang** adalah yang realistis untuk lolos 80% / ≤ 10%; panjang saja belum cukup. Ini perkiraan, bukan janji.

## Klarifikasi untuk pra-registrasi (ditulis sebelum sampel lanjutan ditarik)

- Populasi pra-registrasi 16.092 tidak bisa direproduksi dari D1 (`ihya-v7` memuat 16.086 terjemahan, `ihya-v8` 16.097; sampel asli juga tidak muncul kembali dari populasi mana pun). Populasi persisnya ada di build lokal pemilik. Sampel lanjutan seed 20261024–26 (13/14/13) akan ditarik dari populasi korpus baru yang sedang diukur, dengan mengeluarkan 60 sampel pertama **dan** 30 ID sampel uji di atas; ini dicatat sebagai penyimpangan bertanggal saat sampelnya ditarik.
- Karena terjemahan di 60 sampel pertama (terutama strata panjang) ikut diganti, pengukuran ulang memakai **hanya 40 sampel lanjutan** untuk estimasi tak bias; 60 sampel pertama dilaporkan sebagai pembanding in-sample.

## Langkah

1. [x] Analisis pola, pengecekan 21 usulan koreksi terhadap Arab, selidik pencocok ayat. (sesi ini)
2. [x] Perbaikan pencocok ayat (ADR-107) + tes; prompt v5 + opsi request + tes. (sesi ini)
3. [x] Hitung biaya dan rancang uji; ajukan ke pemilik. (sesi ini)
4. [ ] **Izin pemilik** untuk uji kecil (≤ US$1,50). Kirim batch uji, kumpulkan, nilai buta, putuskan lengan dengan aturan di atas.
5. [ ] Pemilik memilih lingkup + pagu terjemahan ulang berdasarkan hasil uji (tabel biaya di atas).
6. [ ] Selesaikan T-28 (`data/build/llm`, `data/raw/kemenag`; Tanzil/OpenITI diunduh agent). Tambahkan mekanisme terjemahan ulang terarah di `tools/ingest/src/llm` (pilihan paragraf per strata/jilid; hasil lama dipertahankan sampai hasil baru lolos validasi), **catat versi prompt dan effort yang benar-benar dipakai per hasil** (sekarang `batch.ts`, `report.ts`, dan `sample.ts` mencatat konstanta `TRANSLATE_PROMPT.id`, jadi hasil v5 akan tercatat v4 bila tidak diubah; aturan teks-arab 8) dengan tesnya, jalankan batch dalam pagu.
7. [ ] Bangun korpus berikutnya; promote hanya atas izin pemilik. QA `corpus:qa`.
8. [ ] Ukur ulang T-17 dengan 40 sampel lanjutan (seed 20261024–26) dan catat di laporan + TUGAS-PEMILIK.

## T-28 untuk sesi ini (langkah pemilik; agent memandu saat tiba)

Korpus berikutnya butuh `data/build/llm` (hasil batch lama yang sudah dibayar) dan `data/raw/kemenag`. Di Mac, di Terminal, dari folder repo Surau:

```bash
tar czf ~/Desktop/surau-data-x21.tgz data/build/llm data/raw/kemenag
```

Pindahkan berkas itu ke laptop agent (flashdisk atau Google Drive), lalu di Terminal laptop agent:

```bash
tar xzf surau-data-x21.tgz -C /home/rekanesia/surau
```

Jangan hapus folder-folder itu di Mac. Folder `data/` tidak masuk git.

## Selesai bila

- [ ] Rancangan + biaya disetujui pemilik di chat
- [ ] Batch selesai dalam pagu yang disetujui; biaya aktual dicatat dari `usage`
- [ ] Korpus berikutnya dibangun dan (atas izin) dipromote; `corpus:qa` lolos
- [ ] ADR baru di KEPUTUSAN (ADR-107 untuk pencocok ayat; ADR berikutnya untuk prompt/model terjemahan ulang)
- [ ] T-17 diukur ulang dengan sampel lanjutan seed 20261024–26; hasil dibandingkan dengan target Benar ≥ 80% dan Salah ≤ 10%
- [ ] `pnpm verify` lolos; STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Mengedit terjemahan dengan tangan atau memasukkan usulan koreksi agent ke lapisan koreksi sebagai koreksi manusia.
- Mengubah rubrik, strata, atau ambang T-17.
- Terjemahan ulang seluruh korpus tanpa persetujuan pemilik atas angka biaya.

## Catatan hasil

*(diisi di akhir sesi)*
