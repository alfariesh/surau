# Perbandingan Jawab x10 (Haiku 5.5) vs x22 (Sonnet 5.5) di tahap jawaban · 2026-10-28

> **Penilai semantik: agent (Claude), bukan ustadz dan bukan manusia** (ADR-105). Hasil ini tidak
> dihitung sebagai "ditinjau ustadz" di mana pun, termasuk `disetujui_oleh` dan gerbang R4.
> Laporan sebelumnya: [`jawab-x10-elipsis-banding.md`](jawab-x10-elipsis-banding.md).

Pertanyaan: apakah mengganti model tahap jawaban Maknaz dari Haiku 5.5 ke Sonnet 5.5 menaikkan mutu
cukup jauh menuju syarat R4, dan berapa biayanya? Hanya modelnya yang diubah; produksi tetap Haiku.

| | x10 (Haiku) | x22 (Sonnet) |
|---|---|---|
| Model jawaban | `claude-haiku-5-5` (ulangan Sonnet bila refusal) | `claude-sonnet-5-5`, langsung, tanpa ulangan (`--model sonnet`) |
| Prompt | `answer@8`, effort `low` | sama |
| Pipeline | `pipeline@13` (run asal) | `pipeline@15` (main sekarang) |
| Routing | Haiku, langsung | **rute x10 dipakai ulang** (`--rute`): dokumen sama persis, selisih hanya dari model |
| Korpus | `ihya-v9` | `ihya-v9` |
| Biaya jawaban (42 soal) | US$0,1216 (termasuk routing) | **US$2,0761**, pagu US$4 (izin pemilik di chat 2026-10-28), tanpa routing |

Laporan kode: [`jawab-x22-publik-sonnet-v1.md`](jawab-x22-publik-sonnet-v1.md). Penilaian per jawaban
(privat): `evals/private/jawab-runs/x22-agent-nilai-buta-2026-10-28.jsonl`.

## Cara menilai (buta dan acak)

84 jawaban (42 x10 + 42 x22) digabung, diberi ID acak, diacak, dan dibagi ke **enam subagen** (14
jawaban, campuran kedua model). Penilai hanya melihat berkas paket: pertanyaan, jawaban, sitasi (kutipan
dan paragraf lengkap berteks Arab dari D1 staging `ihya-v9`), serta kunci soal (poin kunci, lokasi benar,
teks Arab halaman kunci). Nama model, ID run, biaya, dan versi prompt tidak ada di paket, dan tidak
ada alasan penilai yang menyebut model. Rubrik sama dengan x07–x10: verdict Benar/Kurang/Salah, bahasa
1–5, kesetiaan (semua klaim isi didukung teks Arab), atribusi, nada fatwa, penolakan, status hadits,
lokasi. **Teks prompt penilai x07–x10 tidak tersimpan, jadi rubrik ditulis ulang dari definisi kolom di
arsip nilai** (lihat Keterbatasan).

## Hasil (satu penilaian buta untuk kedua model)

| Ukuran | x10 Haiku | x22 Sonnet | Syarat R4 |
|---|---|---|---|
| Benar / Kurang / Salah | 31 / 7 / 4 | **36 / 5 / 1** | — |
| Kesetiaan | 64,3% (27/42; CI 49–77) | **92,9%** (39/42; CI 81–97) | ≥ 95% |
| Atribusi benar | 83,3% (35/42; CI 69–92) | **100%** (42/42; CI 92–100) | ≥ 95% |
| Bahasa Indonesia (1–5) | 3,55 | **3,76** | ≥ 4 |
| Jawaban berbahasa 4 / 3 / 2 | 26 / 13 / 3 | 34 / 6 / 2 | — |
| Kalimat bernada fatwa | 0 | 0 | 0 |
| Menolak dengan benar | 8/8 | 8/8 | ≥ 90% |
| Status hadits benar, 6 soal (agent) | 5/6 | 5/6 | 100% |
| Status hadits (kode) | 5/6 | 5/6 | 100% |
| Lokasi (kode) | 85,3% (29/34) | 85,3% (29/34) | ≥ 90% |
| Kutipan valid (kode) | 100% (143/143) | 100% (214/214) | 100% |
| Biaya per soal | US$0,0029 | US$0,049 + routing ±US$0,001 | — |
| Panjang jawaban rerata | 1.195 karakter | 1.530 karakter | — |

Berpasangan per soal (42 soal sama): **kesetiaan Sonnet lebih baik di 14 soal, lebih buruk di 2**
(uji tanda p ≈ 0,004); verdict naik di 7, turun di 1, sama di 34 (p ≈ 0,07); bahasa naik di 11, turun di 5
(p ≈ 0,21, tidak bermakna). Mengeluarkan j025 dan j026 (dua soal yang cacatnya diperbaiki kode di
pipeline@14–15, bukan model): bahasa 3,60 → 3,80, kesetiaan 26/40 → 37/40, jadi kesimpulannya sama.

Per jenis soal (Benar/Kurang/Salah, bahasa, kesetiaan; x10 → x22):

| Jenis | n | Verdict | Bahasa | Kesetiaan |
|---|---:|---|---|---|
| lokasi+isi | 17 | 13/2/2 → 15/2/0 | 3,47 → 3,88 | 12 → 15 |
| topik tersebar | 6 | 2/3/1 → 4/2/0 | 3,83 → 3,50 | 0 → 5 |
| status hadits | 6 | 4/1/1 → 4/1/1 | 3,17 → 3,17 | 4 → 6 |
| atribusi | 5 | 4/1/0 → 5/0/0 | 3,60 → 4,00 | 4 → 5 |
| premis keliru | 4 | 4/0/0 → 4/0/0 | 3,50 → 4,00 | 3 → 4 |
| di luar cakupan | 4 | 4/0/0 → 4/0/0 | 4,00 → 4,00 | 4 → 4 |

## Yang berubah dan yang tidak

- **Kesetiaan dan atribusi adalah keuntungan terbesar.** Sonnet hampir tidak menambah klaim yang tidak
  didukung teks. Kegagalan kesetiaannya tinggal tiga: j009 (kalimat penutup tak didukung), j016
  (menyatakan Ihya tidak membandingkan langsung, padahal h13 membandingkan), j018 (sintesis di luar kunci).
- **Salah turun dari 4 ke 1** (hanya j024). Kesimpulan negatif palsu ("tidak ditemukan" padahal ada di
  kunci) masih terjadi di j016, j019, j024: sumbernya pencarian yang tidak membawa paragraf kunci ke model,
  bukan model.
- **Lokasi tidak berubah (85,3%), karena itu terutama masalah retrieval.** Rute dan korpus kedua run sama,
  jadi dokumen yang sampai ke model sama. Penilai mencatat paragraf kunci tidak dipakai di j004, j019, j021,
  j024, j025 (arsip tidak menyimpan daftar dokumen, jadi belum dipisahkan "tidak terambil" vs "tidak dipakai").
- **Bahasa naik sedikit (+0,21) dan belum sampai 4**, dan tidak merata: naik di lokasi+isi (3,47 → 3,88),
  atribusi, dan premis keliru, tetapi turun di topik tersebar (3,83 → 3,50) dan sama di status hadits. Tidak ada jawaban Sonnet yang bernilai 5. Cacat
  yang tersisa di Sonnet: "lihat bagian Status hadits" dan "bahan yang ada" (bahasa sistem, j024, j025),
  kalimat berulang, dan satu salah ketik. "Lihat bagian Status hadits" berasal dari kode pemberitahuan
  (ADR-116), bukan dari model.
- **Status hadits sama 5/6.** Kesetiaan soal hadits naik 4 → 6, tetapi satu soal tetap salah (j024, takhrij
  kemunculan pertama tidak disitasi).
- **Sonnet menulis lebih panjang (+28%).** Latensi rerata 16,9 dtk (tanpa routing) vs 22,2 dtk (x10, dengan
  routing); tidak sebanding langsung, jadi tidak ditarik kesimpulan kecepatan.

## Biaya dan proyeksi ke anggaran P-4

Biaya terukur: US$2,0761 / 42 = **US$0,0494 per jawaban Sonnet** (tanpa routing Haiku, ±US$0,001), lebih
murah dari perkiraan awal (US$0,056). Untuk Haiku, terukur US$0,0029 per soal (routing + jawaban). Sonnet
±17× lebih mahal. Tarif dicek di halaman harga resmi 2026-10-28: Sonnet 5.5 US$2 masuk / US$10 keluar per
juta token, baca cache US$0,10 (0,05×); Haiku 5.5 US$0,10 / US$0,50 sampai 100 ribu token prompt. (Skill
`claude-api` masih menyebut baca cache US$0,20; yang benar US$0,10, sesuai `packages/llm/src/pricing.ts`.)
Prompt jawaban x10 rata-rata 24,8 ribu token (hitungan Haiku, dari diagnostik x10), hampir semuanya
dokumen yang berbeda tiap pertanyaan, jadi cache (hanya prompt sistem yang kecil) tidak menurunkan biaya
Sonnet. Biaya terukur US$0,0494 menyiratkan hitungan token masuk Sonnet sedikit di bawah angka Haiku itu
(24,8 ribu × US$2 saja sudah US$0,0496); selisih tokenizer belum diukur dengan `countTokens`.

| Model jawaban | Per soal | Soal per bulan di US$20 | Anggaran untuk 6.900 soal/bulan |
|---|---|---|---|
| Haiku 5.5 (sekarang) | US$0,0029 | ±6.900 | US$20 |
| Sonnet 5.5 | ±US$0,050 | **±400** | **±US$345** |

Dengan kuota P-4 (10 Jawab/hari per pengunjung), US$20 per bulan cukup untuk sekitar 40 pengunjung-hari
berkuota penuh, yaitu ±1,3 pengunjung per hari. Pada US$100 per bulan: ±2.000 soal. Reservasi ledger
(ADR-065) juga berubah: reservasi awal per pertanyaan naik dari ±US$0,016 ke ±US$0,25, karena
`answerWorstUsd(sonnet)` memakai 40 ribu token tulis cache 1 jam dan 8.000 token keluaran.

## Rekomendasi

1. **Sonnet 5.5 adalah tuas yang bekerja untuk kesetiaan dan atribusi**, tetapi belum cukup sendirian untuk R4:
   kesetiaan 92,9% (CI 81–97) belum terbukti ≥ 95%, bahasa 3,76 < 4, lokasi 85,3% < 90%. Dua dari tiga
   syarat yang masih kurang (lokasi, sebagian bahasa) bukan urusan model.
2. **Biaya tidak muat di P-4 apa adanya.** Ganti produksi ke Sonnet hanya bila pemilik menaikkan anggaran
   (≥ US$100 per bulan untuk ±2.000 soal) dan/atau menurunkan kuota per pengunjung. **Produksi tetap Haiku
   sampai pemilik memutuskan**, dan Jawab produksi tetap mati.
3. Urutan yang masuk akal bila R4 dikejar: (a) perbaiki retrieval lokasi dan pemberitahuan "lihat bagian Status
   hadits" dulu (gratis, di kode), (b) baru putuskan model dan anggaran, (c) ukur ulang dengan penilai manusia,
   karena selisih antar-penilai (di bawah) sudah sebesar selisih sebagian ukuran.
4. Opsi yang belum diuji dan bisa menekan biaya: Sonnet hanya untuk jenis soal berisiko (status hadits, hasil
   "tidak ditemukan"), atau Sonnet hanya sebagai ulangan bila verifikasi Haiku gagal. Keduanya perlu run
   berbayar baru (izin pemilik).

## Keterbatasan

- **Derau penilai besar.** Jawaban x10 yang sama dinilai ulang di sini memberi 31 Benar, kesetiaan 64,3%,
  atribusi 83,3%, bahasa 3,55. Penilaian x10 sebelumnya (laporan x10) memberi 23 Benar, kesetiaan 78,6%,
  atribusi 95,2%, bahasa 3,26 untuk jawaban yang sama. Jadi angka mutlak di sini **tidak sebanding** dengan
  laporan x07–x10; yang sah dibandingkan hanyalah x10 vs x22 dalam penilaian buta yang sama.
- **Rubrik ditulis ulang**, karena teks prompt penilai x07–x10 tidak tersimpan. Definisi kesetiaan di sini
  ("semua klaim isi didukung") lebih ketat dari rata-rata penilai lama, itu sebabnya angka Haiku lebih rendah.
- Satu run per model (Haiku dan Sonnet tidak deterministik). CI Wilson 95% pada n=42 lebar: kesetiaan
  Sonnet 81–97%.
- `pipeline@15` (Sonnet) vs `pipeline@13` (Haiku): perbaikan angka Arab-India dan baris status hadits
  (ADR-114, ADR-116) hanya menyentuh j025 dan j026. Hasil tanpa keduanya ada di atas.
- Rute x10 dipakai ulang, jadi x22 tidak mengukur routing. Biaya routing ±US$0,001 per soal ditambahkan
  sebagai perkiraan. Format arsip sebagian run ini belum menyimpan `usage` dan blok jawaban, sehingga
  token keluaran dan diagnostik bahasa (kalimat berulang, salinan terjemahan) tidak tersedia untuk x22.
  Format itu sudah diperbaiki untuk run berikutnya. Akibatnya diagnostik x22 tidak bisa dipakai sebagai
  `--rute` atau `kandidat --input`, dan `corpus_version` arsip x22 diambil saat arsip disusun (`ihya-v9`,
  sama dengan saat run; korpus tidak berganti di antaranya).
- Run sempat terhenti sesudah semua 42 jawaban tersimpan (koneksi D1 remote putus saat penilaian kode),
  sehingga arsip akhir disusun dari berkas sebagian lewat `eval:jawab arsip-sebagian` (gratis, tanpa panggilan
  LLM). Biaya dihitung dari 42 jawaban yang tersimpan (US$2,0761); tidak ada biaya lain.
- Belum ada penilai manusia.
