# Perbandingan Jawab x09 → x10: bekas huruf Arab dirapikan (ADR-114) · 2026-10-27

> **Penilai semantik: agent (Claude), bukan ustadz dan bukan manusia** (ADR-105). Hasil ini tidak
> dihitung sebagai "ditinjau ustadz" di mana pun, termasuk `disetujui_oleh` dan gerbang R4.
> Laporan sebelumnya: [`jawab-x09-label-banding.md`](jawab-x09-label-banding.md).

| | x08 | x09 | x10 |
|---|---|---|---|
| Versi | `answer@8`, pipeline@9 | `answer@8`, pipeline@11 | `answer@8`, **pipeline@13** (label ADR-113, perapian ADR-114) |
| Korpus | `ihya-v8` | `ihya-v9` | `ihya-v9`, build sesudah terjemahan ulang strata pendek (teks Arab sama) |
| Biaya jawaban | US$0,1167 | US$0,1181 | **US$0,1216** (izin pemilik di chat 2026-10-27, pagu US$0,50) |

Laporan kode: [`jawab-x10-publik-elipsis-v1.md`](jawab-x10-publik-elipsis-v1.md). Run berjalan utuh dalam
satu kali (42/42, tanpa galat). Penilaian per jawaban (privat):
`evals/private/jawab-runs/x10-agent-nilai-2026-10-27.jsonl`, salinan R2
`surau-evals/jawab-runs/x10-agent-nilai-2026-10-27.jsonl`. Tiga subagen menilai 14 jawaban
masing-masing terhadap teks Arab D1 staging, tanpa melihat nilai run lain.

## Hasil

| Ukuran | x08 | x09 | x10 | Syarat R4 |
|---|---|---|---|---|
| Benar / Kurang / Salah (agent) | 17 / 23 / 2 | 22 / 13 / 7 | **23 / 11 / 8** | — |
| Kesetiaan (agent) | 85,7% (36/42) | 71,4% (30/42) | **78,6%** (33/42) | ≥ 95% |
| Atribusi benar (agent) | 92,9% | 97,6% | **95,2%** (40/42) | ≥ 95% |
| Bahasa Indonesia (agent, 1–5) | 3,55 | 3,36 | **3,26** | ≥ 4 |
| Kalimat bernada fatwa | 0 | 0 | 0 | 0 |
| Menolak dengan benar | 8/8 | 8/8 | 8/8 | ≥ 90% |
| Status hadits benar, 6 soal (agent) | 4/6 | 4/6 | 4/6 | 100% |
| Status hadits (kode) | 5/6 | 5/6 | 5/6 | 100% |
| Lokasi (kode), kunci versi 2 | 91,2% | 85,3% | 85,3% (29/34) | ≥ 90% |
| Kutipan valid (kode) | 100% | 100% | 100% (143/143) | 100% |

Bahasa per jenis soal (x08 → x09 → x10): lokasi+isi 3,29 → 3,35 → 3,18; topik tersebar 3,67 → 3,33 → 3,67;
status hadits 3,00 → 2,83 → 2,50; di luar cakupan 5,00 → 4,00 → 4,00; premis keliru 3,50 → 3,25 → 3,50;
atribusi 3,80 → 3,60 → 3,20.

**Kesimpulan: lubang di kalimat biasa hilang; tersisa di baris status (j026). Rata-rata bahasa tidak naik.**
- Model menulis huruf Arab di 5 jawaban (j024–j027, j042). Tidak ada kalimat yang dibuang
  (`arabic_sentences_dropped` 0). Lubang "…" di kalimat biasa tidak muncul lagi. Pembaca masih melihat
  "… …" sesudah "Status hadits:" di j026 dan "catatan kaki nomor," di j025 (keduanya di bawah).
- Di soal yang terkena lubang di x09, nilainya naik: j008 bahasa 2 → 4 (Kurang → Benar), j014 1 → 3
  (Salah → Benar), j023 2 → 4, j029 Kurang → Benar. Sebagian kenaikan ini juga derau antar-run.
- Rata-rata bahasa turun sedikit (3,36 → 3,26, total skor 141 → 137). **j026 sendiri menyumbang −3** dari
  selisih −4 (bahasa 4 → 1, Benar → Salah), karena "… …" di baris status. j026 juga satu-satunya
  tambahan Salah (7 → 8). Diagnostik `translation_copy` turun (x08: 70 kalimat, x10: 60), tetapi kalimat
  gema dan salinan terjemahan yang kaku tetap dicatat penilai di banyak jawaban, bersama pengulangan,
  bahasa sistem ("dokumen", "bahan yang tersedia"), dan dua jawaban cadangan.
- Selisih antar-run (penilai berbeda, Haiku nondeterministik) masih sebesar perubahan yang diukur.

## Temuan

1. **Angka catatan kaki Arab-India ikut terbuang (j025)**: "pada catatan kaki nomor (١)" menjadi "nomor,".
   Ini regresi dari ADR-114, dan sudah diperbaiki di PR yang sama dengan laporan ini: angka Arab-India yang
   berdiri sendiri kini menjadi angka ASCII (pipeline@14).
2. **j026: "Status hadits: lihat bagian …" diikuti "… …".** Model menulis "Status hadits:" lalu teks Arab
   yang bersitasi. Pernyataan status diganti pemberitahuan, tetapi blok bersitasi berisi "… …" tertinggal
   sesudahnya, sehingga isi takhrij tidak terbaca di teks (klaim terstrukturnya benar). Perilaku "…" di
   pernyataan status sama dengan sebelum ADR-114. Penyebabnya ada di cara `hadithCheck` mengganti rentang
   pernyataan, dan belum diperbaiki.
3. **Dua jawaban cadangan (j005, j009)**: model tidak memberi sitasi sama sekali, jadi Surau menampilkan
   hasil Cari ("tidak dapat memverifikasi kutipan"). Perilaku ini sama dengan j016 di x08, bukan akibat ADR-114.
4. **Kesimpulan negatif palsu dan paragraf gold yang terlewat** tetap penyebab utama "Salah" (j004, j016,
   j019, j024). Retrieval sering mengambil paragraf di sebelah paragraf kunci.
5. **Baris "Status hadits"**: isinya akurat (j027, j028). Di j027 baris itu menjadi kalimat pembuka, dan di
   j028 hanya mengulang paragraf sebelumnya. Di j025, "dinilai lemah, menurut takhrij al-'Iraqi" masih
   menyamarkan bahwa penilainya Ahmad dan al-Baihaqi.

## Keterbatasan

Satu run per versi, dan penilai tiap run adalah subagen yang berbeda dengan rubrik yang sama. Korpus x10
memuat terjemahan AI baru untuk strata pendek, yang ikut ke konteks model. Penilaian manusia belum ada.

## Rekomendasi

1. Tindak lanjuti j026, penyebab terbesar turunnya nilai bahasa di run ini: pernyataan status yang diganti
   pemberitahuan sebaiknya ikut membawa blok bersitasi di kalimat yang sama, supaya tidak tersisa "… …".
2. Cacat bahasa terbesar sekarang adalah kalimat gema dan salinan terjemahan. Perbaikannya di prompt,
   yang butuh run berbayar untuk diukur.
3. Penilaian manusia (Anas) sebelum iterasi berikutnya, karena selisih antar-run sudah sebesar derau penilai.
