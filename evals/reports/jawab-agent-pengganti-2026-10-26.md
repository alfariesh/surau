# Penilaian agent pengganti ustadz sementara · Jawab · 2026-10-26

> **Penilai: agent (Claude), bukan ustadz dan bukan manusia.** Pemilik meminta agent menggantikan
> tugas ustadz untuk sementara ("eval/gantikan ustad untuk sementara", 2026-10-26) supaya rilis
> bisa disiapkan. Hasil di sini **tidak** dihitung sebagai "disetujui ustadz" atau "ditinjau ustadz"
> di mana pun, termasuk di `disetujui_oleh`, label situs, dan gerbang R4. Apakah penilaian agent boleh
> menggantikan syarat ustadz diputuskan pemilik di `/rilis 4` sebagai penyimpangan (ADR-105). Contoh
> sebelumnya: T-16/T-17 tahap 2 di Rilis 2, T-31 butir 4.

Semua penilaian membaca teks Arab `text_raw` korpus `ihya-v7` (ekspor hanya-baca D1
`surau-corpus-ihya-v7`). Terjemahan AI dipakai hanya sebagai alat bantu navigasi. Tidak ada panggilan
API berbayar terpisah. Teks kitab, soal (termasuk 18 holdout), dan jawaban dibaca sesi agent Claude
Code, sehingga ikut diproses Anthropic seperti percakapan agent lainnya (dicatat di
`evals/README.md`, ADR-045). Setiap bagian
dinilai subagen terpisah, dan sebagian temuan dicek ulang oleh agent induk terhadap teks Arab
(j038, T-17 no. 13/23/40; semuanya terkonfirmasi).

## 1. Soal eval Jawab (60 draf, T-24 butir 3)

| Set | n | Disetujui apa adanya | Perlu revisi | Ditolak | Kunci keliru |
|---|---:|---:|---:|---:|---:|
| Publik (`jNNN`) | 42 | 34 | 8 | 0 | 2 (j014, j023) |
| Holdout privat (`pNNN`) | 18 | 14 | 4 | 0 | 3 |
| **Jumlah** | **60** | **48** | **12** | **0** | **5** |

Rincian per soal publik: [`evals/jawab/tinjauan/agent-2026-10-26.jsonl`](../jawab/tinjauan/agent-2026-10-26.jsonl).
Rincian holdout hanya di penyimpanan privat (`evals/private/jawab-agent-tinjau-2026-10-26.jsonl`,
salinan R2 `surau-evals/jawab/2026-10-26-tinjau-agent-privat.jsonl`). Kategori revisi holdout:
status hadits tidak cocok dengan takhrij yang ada (1), poin kunci tidak setia pada teks Arab (2),
jebakan premis kurang tegas (1). `disetujui_oleh` tetap `null` di semua soal.

**Empat kunci yang dicurigai terlalu ketat (X13):**

- **j018, j019, j021:** halaman j1 h55 memang wajib untuk sebagian soal, tetapi **rumusan pertanyaannya**
  bisa dijawab dari halaman lain yang sama benarnya (j019: j1 h10, j1 h12, j1 h58, j2 h163, Kitab Niat
  j4; j021: j3 h225, j1 h12–13; j018: j1 h13 bisa diganti j1 h55–56). Usulannya **menulis ulang
  pertanyaan** supaya menunjuk konteks halaman gold, bukan melonggarkan kunci. Kunci baru tanpa
  penulisan ulang akan menaikkan angka lokasi secara tidak jujur.
- **j023 (dan j014):** kuncinya keliru. Pembahasan obat dalam Kitab Tawakal mencakup j4 h283–292,
  dan h292 (10017931) sama kuatnya dengan h290. Usulannya: sisi rida = bagian daftar isi 100279
  (j4 h351–353), sisi obat = rentang j4 h283–292 (satu halaman cukup). j014 sama: rentang
  h290–292 menggantikan h290 saja.
- Revisi lain: j009 (sumber kurang), j014 ("secara mutlak" tidak ada di teks), j020 (rumusan terlalu luas untuk h160), j041 (poin "bukan petunjuk keselamatan" bukan isi
  teks; pindah ke catatan sebagai gaya Surau).

Revisi **belum diterapkan** ke `ihya-draf-v1.jsonl`: soal yang ditulis ulang harus dijalankan ulang
(berbayar, ±US$0,12 untuk 42 soal publik) supaya angkanya bermakna.

## 2. Jawaban nyata Maknaz (42 jawaban, T-24 butir 3 + T-25 tambahan)

Yang dinilai: run `x06-publik-takhrij-v1` (Haiku 5.5, `answer@6+answer-route@2+pipeline@6`, korpus
`ihya-v7`, 2026-10-21), 42 jawaban yang tersimpan di D1 `surau-app` (`answer_log`). Prompt jawaban
produksi sekarang masih `answer@6`. Rincian per jawaban ada di arsip privat
(`evals/private/jawab-runs/x06-agent-nilai-2026-10-26.jsonl`, salinan R2).

| Ukuran | Hasil agent | Syarat R4 | |
|---|---|---|---|
| Benar / Kurang / Salah | 19 / 20 / 3 | — | |
| Kesetiaan | **76,2%** (32/42) | ≥ 95% | tidak lolos |
| Atribusi benar | 97,6% (41/42) | ≥ 95% | lolos |
| Kualitas bahasa Indonesia | **3,74** / 5 | ≥ 4 | tidak lolos |
| Bahasa fatwa | **1** (j021) | 0 | tidak lolos |
| Menolak dengan benar | 8/8 | ≥ 90% | lolos |
| Status hadits benar | **4/6** (j024, j028 keliru) | 100% | tidak lolos |
| Lokasi benar (kode, kunci sekarang) | 85,3% (29/34) | ≥ 90% | tidak lolos |
| Kutipan valid (kode) | 100% (166/166) | 100% | lolos |
| Soal disetujui (agent, apa adanya) | 48/60 | ≥ 50 disetujui ustadz | tidak lolos |

Per jenis (Benar/Kurang/Salah): lokasi+isi 9/7/1, topik tersebar 1/4/1, status hadits 0/5/1, di luar
cakupan 4/0/0, premis keliru 2/2/0, atribusi 3/2/0. Metrik kode menghitung status hadits 5/6. Agent
juga menilai j028 keliru, karena label "tidak ditemukan penakhrij" muncul padahal al-'Iraqi hanya
tidak menemukannya sebagai sabda Nabi (marfu'); riwayat al-Baihaqi tetap ada.

**Salah (3):** j016 (menyatakan Ihya tidak membandingkan dua golongan, padahal 10000182 tepat sesudah
paragraf yang disitasi membahasnya), j019 (alasan turunnya QS 18:110 terbalik; QS 98:5 diparafrasekan
model sendiri, melanggar aturan ayat), j024 (menyatakan takhrij tidak tersedia; takhrijnya ada di
j1 h2, 10000010, tetapi tidak terambil pencarian. Gagalnya aman, karena model tidak menebak).

**Pola kegagalan berulang** (bahan perbaikan prompt/pipeline):

1. **Kalimat status yang bertentangan (j025–j029).** Takhrij disampaikan benar, lalu ditutup kalimat
   "Status hadits: tidak ditampilkan (… tidak dapat dipastikan)". Pembaca bingung. Kalau ini diperbaiki,
   empat jawaban naik ke Benar.
2. **Label "tidak ditemukan penakhrij" untuk "tidak kutemukan sebagai marfu'"** (j028, juga label j024). Lihat §4. Penyebab utama j024 adalah pola 3 (pencarian).
3. **Takhrij hanya ada di kemunculan pertama hadits.** Kemunculan berikutnya hanya merujuk balik
   ("taqaddama"), sehingga pencarian harus menjangkau kemunculan pertama (j024).
4. **"Kitab tidak menyebut …" padahal paragraf sesudahnya menyebut** (j016, j006). Kesimpulan negatif
   ditarik dari potongan.
5. **Poin kunci kedua hilang** di ±10 jawaban, terutama topik tersebar.
6. **Pelaku/negasi tertukar saat membaca Arab** (j006, j009, j019, j022, j035, j036, j038). j038
   (terkonfirmasi induk): ijmak dinyatakan 'Abd al-Wahid bin Zaid yang dinukil al-Ghazali, bukan
   al-Ghazali sendiri.
7. **Bahasa pipeline bocor ke pembaca** ("dokumen yang dilampirkan", "terjemahan AI yang disertakan")
   di ±15 jawaban, ditambah celah "…" di tempat isi seharusnya dijelaskan dalam bahasa Indonesia
   (j015, j029, j041).
8. **Nama kitab/bab keliru** (j005, j022, j036). Nama itu seharusnya diambil dari daftar isi, bukan ditebak.
9. **Riwayat disebut "sabda Nabi"** tanpa catatan, padahal takhrij menyebut tidak ditemukan sebagai
   marfu' (j006, j038). Ini melanggar docs/05 §4: riwayat sangat lemah atau tanpa asal harus diberi tanda
   setiap kali dikutip.
10. **Nada putusan di paragraf rangkuman** ("wajib berikhtiar", j021). Detektor fatwa heuristik tidak
    menangkapnya.

## 3. Prompt sistem dan kebijakan (R4: "kebijakan dan prompt direview ustadz")

Ditinjau agent induk: `packages/llm/prompts/answer-v6.ts`, `answer-route-v2.ts`, dan docs/05 §1–5, §9.
Hal yang sudah baik: bahasa atribusi, larangan fatwa dan roleplay, larangan menulis huruf Arab, ayat
hanya dirujuk, status hadits hanya dari takhrij, kalimat baku penolakan, isi dokumen sebagai data, dan
anjuran bertanya kepada ulama setempat untuk kasus pribadi. Usulan:

1. **Penilai yang dinukil al-'Iraqi.** Bila al-'Iraqi menukil penilaian ulama lain (at-Tirmidzi,
   al-Hakim, al-Mundziri) atau membantahnya, jawaban harus menyebut penilainya dan bantahannya. Sekarang
   prompt hanya menyebut "penilaian al-'Iraqi" (lihat §4 takhrij, pola 9 dan 4).
2. **Tanda riwayat lemah saat isinya dipakai.** Bila paragraf yang dikutip memuat hadits yang takhrijnya
   lemah, palsu, tanpa asal, atau tidak ditemukan marfu', jawaban jangan menyebutnya "sabda Nabi" tanpa
   catatan, walaupun pertanyaannya bukan soal status.
3. **Jangan menyebut "dokumen", "lampiran", atau "terjemahan AI yang disertakan"** di jawaban; sebut
   "teks Ihya" atau "bagian yang ditemukan".
4. **Kesimpulan negatif** ("kitab tidak membahas …") hanya untuk bagian yang ditemukan: "di bagian
   yang ditemukan, …".
5. **Nama kitab/bab** hanya dari judul bagian di konteks dokumen.
6. **Rangkuman tetap atribusi.** Paragraf penutup tidak boleh berbentuk anjuran atau kewajiban dengan
   suara Surau.
7. **Kalimat status pengganti pipeline** (`HADITH_NOT_CITED`/varian yang tersimpan di x06) perlu
   dirumuskan ulang atau dihapus bila status sudah disampaikan dengan benar di kalimat lain.
8. **docs/05 §5 belum sejalan dengan prompt.** Kebijakan menyebut premis keliru dijawab "tidak
   ditemukan …", sedangkan prompt (sejak `answer@3`) memakai kalimat baku tersendiri lalu menjelaskan
   isi teks. Rumusan prompt lebih baik; teks kebijakan perlu diperbarui.
9. **Usulan kebijakan baru (keputusan pemilik/dewan):** kisah atau praktik dalam Ihya yang bisa
   membahayakan kesehatan atau keselamatan bila ditiru (lapar berkepanjangan, tawakal tanpa ikhtiar
   seperti kisah sumur di j041) disampaikan sebagai riwayat yang dinukil, disertai anjuran bertanya
   kepada ulama atau ahli. Prompt sekarang tidak mengatur ini.
10. **Ayat.** Model masih memparafrasekan ayat sendiri (j019). Ini temuan yang sama dengan T-17: ayat
    tanpa placeholder ikut diterjemahkan AI. Perlu pemeriksaan kode, karena larangan di prompt saja
    tidak cukup.

## 4. Label status hadits per catatan kaki (X07, T-24 butir 5)

Ringkasan di [`data/reports/ihya-9472-takhrij-agent-2026-10-26.md`](../../data/reports/ihya-9472-takhrij-agent-2026-10-26.md):
253 catatan kaki (sampel berstrata, aturan versi 1), 192 disetujui, 42 dikoreksi, 19 ragu, dan 41
label bisa menyesatkan pembaca. Istilah pada 8 takhrij yang dikutip jawaban x06 semuanya benar,
tetapi gloss `lam_ajid` di 2 di antaranya menyesatkan. Presisi deteksi istilah 94,0%.

## 5. Kesimpulan untuk `/rilis 4`

Walaupun penilaian agent diterima sebagai pengganti ustadz, **syarat R4 belum terpenuhi**. Yang
belum lolos: soal disetujui (48 < 50), kesetiaan (76% < 95%), bahasa (3,74 < 4), nol fatwa (1),
status hadits (4/6), lokasi (85,3% < 90%), dan mutu label takhrij (41/253 sampel menyesatkan). Agent tidak menyarankan `/rilis 4`
sampai perbaikan prompt/pipeline (§2–3), aturan takhrij versi 2 (§4), dan revisi soal (§1) selesai,
lalu satu run publik baru (berbayar, izin pemilik) dinilai ulang dengan cara yang sama.

Catatan bias: subagen penilai jawaban dan penilai soal sama-sama model Claude. Penilaian ini tidak
mengkalibrasi judge Sonnet; kesepakatan antar-model bukan kalibrasi manusia (docs/06).
