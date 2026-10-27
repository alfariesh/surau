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

v4 + "Membaca dengan teliti" + "Kelengkapan dan ketepatan" + "Tambahan glosarium (v5)". Tidak memuat huruf Arab. Dipakai untuk uji lewat `buildTranslateRequest(..., model, { prompt, effort })`. Sesudah uji lolos, `TRANSLATE_PROMPT` dialihkan ke v5 (ADR-109).

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

## Hasil uji kecil (2026-10-26, izin pemilik di chat: batas US$2,00)

Batch `msgbatch_01LVKwMdgp4oAKo6PRX6ARPN`: 204/204 sukses, **biaya aktual US$1,13** (s5 0,41 · s5m 0,35 · s4 0,34 · h5 0,04). Penilaian buta oleh 6 subagen (Opus; 9 butir × 5 kandidat tiap paket; kandidat A–E diacak per butir; kunci tidak dibuka sampai semua selesai), satu penilai per butir, rubrik B/K/S T-17. Nilai per butir (tanpa teks): [`data/reviews/ihya-9472-x21-uji-prompt-penilaian.jsonl`](../../data/reviews/ihya-9472-x21-uji-prompt-penilaian.jsonl). `base` = terjemahan produksi (Haiku + prompt v2).

**Sampel baru, sedang + panjang (n = 24), basis keputusan:**

| Lengan | Benar | Kurang | Salah |
|---|---:|---:|---:|
| base (produksi) | 11 (46%) | 11 | 2 (8%) |
| h5 Haiku + v5 | 13 (54%) | 8 | 3 (13%) |
| s4 Sonnet + v4 | 20 (83%) | 4 | 0 |
| **s5 Sonnet + v5 (effort low)** | **21 (88%)** | 2 | 1 (4%) |
| s5m Sonnet + v5 (effort medium) | 23 (96%) | 1 | 0 |

Semua 30 sampel baru: base 57% B / 7% S · h5 60% / 13% · s4 87% / 0% · s5 90% / 3% · s5m 97% / 0%. Strata panjang saja (n = 12): base 33% B, s5 83%, s5m 100%. Strata pendek (n = 6): semua lengan Sonnet 6/6 Benar, base 6/6, h5 5/6. In-sample (21 butir K/S T-17; bias, tidak masuk keputusan): base 1 B · h5 9 · s4 16 · s5 19 · s5m 17.

**Aturan keputusan (ditetapkan sebelum hasil terlihat):**
1. **Sonnet, bukan Haiku:** s5 − h5 = +34 poin Benar (≥ 15) → Sonnet. Haiku + v5 nyaris tidak lebih baik dari produksi (54% vs 46%) dan punya Salah lebih banyak, jadi prompt saja tidak cukup; modelnya yang menentukan.
2. **Effort medium: tidak dipilih menurut aturan.** s5m − s5 = +8,3 poin (2 butir dari 24), di bawah ambang 10. Catatan jujur: pada uji ini effort medium tidak menambah token keluaran (±32,7 ribu token di kedua lengan) dan biayanya tidak lebih tinggi (cache write berbeda), jadi tidak ada alasan biaya untuk menolaknya; selisihnya hanya 2 butir dan tidak signifikan. Kriteria tidak diubah sesudah melihat hasil. Bila pemilik ingin, effort medium boleh dipilih dengan biaya yang sama.
3. **v5 dipakai:** s5 21 B / 1 S vs s4 20 B / 0 S; selisih ≤ 1 butir → v5 (toleransi aturan). Risiko yang dipantau: s5 menambahkan satu kalimat dalam kurung yang menebak sambungan paragraf (no. 31, tipe "tambahan" di s5 = 2, sama dengan s4 = 2); satu Salah di s5 (no. 14) membalik makna manfaat uzlah, paragraf yang sama dibenarkan oleh s4, h5, dan s5m (variasi antar-jalankan, bukan pola).
4. In-sample dilaporkan terpisah (di atas).

**Keterbatasan:** n kecil (selisih satu butir = 4 poin); penilai Claude Opus, satu keluarga model dengan penerjemah, satu penilai per butir (tanpa kesepakatan antar-penilai); sampel uji dipilih seed 20261030+k dan hanya 12 panjang. Ini memilih lengan, bukan mengesahkan mutu. Pembanding menguatkan kalibrasi: base di sedang+panjang 46% Benar, sejalan dengan 52% perkiraan T-17 (sedang 70%, panjang 35%).

**Biaya terjemahan ulang, dikalibrasi ulang dengan pemakaian aktual** (keluaran Sonnet 0,494 token/karakter terjemahan, bukan 0,59; cache hit di batch 204 request hanya 63–71% karena tiap awalan ditulis berulang, batch S13 4.000 request nyaris 100%). Perkiraan batch Sonnet 5.5 + v5, effort low; "pagu" = perkiraan +30% (ulangan ditolak validasi, cache lebih jelek dari S13):

| Lingkup | Paragraf | Perkiraan | Pagu yang disarankan |
|---|---:|---:|---:|
| Panjang saja | 2.355 | US$13 | US$17 |
| **Panjang + sedang** | 10.492 | **US$28** | **US$36** |
| Semua paragraf | 16.111 | US$33 | US$43 |
| Per jilid, panjang + sedang | j1 2.464 · j2 3.165 · j3 2.291 · j4 2.572 | 6,0 · 6,4 · 6,6 · 8,8 | 7,8 · 8,4 · 8,6 · 11,5 |
| Per jilid, panjang saja | j1 490 · j2 338 · j3 643 · j4 884 | 2,4 · 1,6 · 3,5 · 5,6 | 3,2 · 2,1 · 4,6 · 7,3 |

Ditambah ±US$0,3 untuk 28 paragraf ayat berubah dan 25 paragraf yang belum punya terjemahan. Rekomendasi: **panjang + sedang, Sonnet 5.5 + v5, per jilid** (jilid 4 dulu atau berurutan, berhenti bila biaya melewati pagu). Alasan: ini yang diuji di sampel baru (88% Benar), dan strata sedang membawa separuh bobot dan 15% Salah di T-17. Strata pendek tidak disentuh (6/6 Benar di uji; 10% Salah di T-17 berasal dari 2 butir). Perkiraan dampak T-17, **tidak dijanjikan**: Benar tertimbang ±85–90% dan Salah ±4–6% bila hasil uji bertahan.

## Biaya terjemahan ulang (perkiraan awal sebelum uji; tabel yang berlaku ada di Hasil uji)

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
4. [x] Izin pemilik untuk uji kecil (batas US$2,00, chat 2026-10-26). Batch dikirim, dikumpulkan, dinilai buta; lengan diputuskan dengan aturan di atas (Sonnet 5.5 + v5, effort low).
5. [x] Pemilik memilih lingkup + pagu (chat 2026-10-26): strata sedang + panjang, Sonnet 5.5 + v5, pagu US$36.
6. [x] (kode) Mekanisme terjemahan ulang terarah (ADR-109): pilihan `data/reviews/ihya-9472-terjemahan-ulang.json`, hasil lama dipertahankan sampai hasil baru lolos, ulangan selalu Sonnet, `pnpm llm terjemah-ulang`; prompt v5 aktif; versi prompt dicatat dari objek prompt yang dikirim; rencana lama dengan prompt/model lain ditolak sebagai usang; kirim >2.500 request wajib `--limit`; tes di `retranslate.test.ts`.
   - **Penyimpangan terbuka dari rancangan awal langkah ini:** *effort* tidak dicatat per hasil (tidak ada kolom untuknya di `translation`/ledger); semua terjemahan ulang memakai effort `low` (di-hardcode di `buildTranslateRequest`) dan itu dicatat di ADR-109, bukan per baris. Versi prompt dan model memang dicatat per hasil.
7. [x] T-28 (zip pemilik 2026-10-27, dipasang di `/home/rekanesia/surau`).
8. [x] (US$30,47 + ringkasan US$0,14; lihat ADR-109) `plan` → tanya pemilik dengan angka `count_tokens` → `submit --limit … --budget <terpakai + 36> --confirm` bertahap per jilid → `collect` → `retry` → `report`.
9. [x] Korpus `ihya-v9` dibangun lokal (gerbang ingest lolos). [ ] Muat ke staging, `corpus:qa`, promote hanya atas izin pemilik.
10. [x] (agent, 2026-10-27: Benar 82,1%, Salah 1,1%, lolos belum pasti) Ukur ulang T-17: `pnpm t17 sampel-lanjutan` (40 sampel: 13/14/13, seed 20261024+k, tanpa 60 sampel pertama dan 30 ID uji X21), nilai, `pnpm t17 hasil --lanjutan`; catat di laporan + TUGAS-PEMILIK.

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
