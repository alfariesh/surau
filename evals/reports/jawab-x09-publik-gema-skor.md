# Eval Jawab

> **Run gema takhrij (ADR-112), 2026-10-27, izin pemilik di chat.** Run berbayar
> `x09-publik-gema-v1` (staging, `ihya-v8`) terputus di j028: sesi X21 sedang memuat `ihya-v9`
> ke staging dan mengosongkannya (`0000-reset.sql`). j001–j027 tetap dijawab atas `ihya-v8`.
> j028–j042 diulang sebagai `x09-publik-gema-v1c` atas `ihya-v9` lokal. Kedua arsip digabung,
> lalu skornya dihitung atas `ihya-v9` lokal (label versi korpus diganti di salinan gabungan).
> Sebelum itu ke-91 paragraf yang disitasi dan semua kunci dicek **identik** (`text_raw`,
> halaman, jenis) antara `ihya-v8` produksi dan `ihya-v9` lokal. Perbandingan dengan x08:
> takhrij 5/6 → 6/6, lokasi 31/34 → 32/34, kutipan valid 100% → 100%. Biaya jawaban
> US$0,1224, ditambah panggilan j028/j030 yang gagal (tak tercatat, ≤ pagu cadangan).
> Penilaian semantik (agent/manusia) belum dilakukan.

Korpus: ihya-v9. Run: x09-publik-gema-v1, x09-publik-gema-v1c.
Soal: 42; resmi: 0; draf: 42; privat: 0.
Versi jawaban: answer@8+answer-route@2+pipeline@11. Judge: jawab-judge-v1.

Hasil draf belum menjadi gerbang rilis. Kutipan dihitung per bentang sumber; lokasi benar menuntut semua lokasi gold. Jawaban kosong tidak lulus penolakan. Flag penolakan adalah keluaran pipeline, bukan penilaian kebenaran semantik; kesetiaan dinilai terpisah. Pola bahasa fatwa hanya pemeriksaan heuristik.

| Set | n | Kutipan valid | Lokasi | Penolakan tepat | Tidak salah menolak | Takhrij | Tanpa pola fatwa |
|---|---:|---|---|---|---|---|---|
| Resmi | 0 | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) |
| Draf | 42 | 100.0% (130/130) | 94.1% (32/34) | 100.0% (8/8) | 100.0% (34/34) | 100.0% (6/6) | 100.0% (42/42) |
| Privat (agregat) | 0 | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) |
| lokasi+isi | 17 | 100.0% (55/55) | 100.0% (17/17) | — (0 sampel) | 100.0% (17/17) | — (0 sampel) | 100.0% (17/17) |
| topik tersebar | 6 | 100.0% (39/39) | 66.7% (4/6) | — (0 sampel) | 100.0% (6/6) | — (0 sampel) | 100.0% (6/6) |
| status hadits | 6 | 100.0% (12/12) | 100.0% (6/6) | — (0 sampel) | 100.0% (6/6) | 100.0% (6/6) | 100.0% (6/6) |
| di luar cakupan | 4 | — (0 sampel) | — (0 sampel) | 100.0% (4/4) | — (0 sampel) | — (0 sampel) | 100.0% (4/4) |
| premis keliru | 4 | 100.0% (12/12) | — (0 sampel) | 100.0% (4/4) | — (0 sampel) | — (0 sampel) | 100.0% (4/4) |
| atribusi | 5 | 100.0% (12/12) | 100.0% (5/5) | — (0 sampel) | 100.0% (5/5) | — (0 sampel) | 100.0% (5/5) |

Judge valid: 0/42; gagal/hilang: 42.
Kesetiaan: — (0 sampel). Atribusi: — (0 sampel).
Kalibrasi: 0 jawaban berpasangan dengan dua skor manusia. Kesepakatan kesetiaan — (0 sampel); atribusi — (0 sampel). Belum terkalibrasi (target ±30).
Bahasa Indonesia: —/5, n=0.
Jawaban berisi teks: 42/42.
Takhrij: takhrij gold disitasi dan status = label kode takhrij itu (sejak X06, ADR-069; status tidak lagi tulisan model). Klaim status untuk takhrij lain yang disitasi (bukan kegagalan): 1.
Biaya jawaban: $0.122370; latensi rerata 12550 ms. Biaya judge dicatat terpisah di manifest batch.

Soal privat dan teks kitab tidak dimuat dalam laporan ini. Arsip per soal, alasan judge, dan penilaian manusia berada di penyimpanan privat.
