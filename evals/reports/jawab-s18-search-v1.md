# Eval Jawab

Korpus: ihya-v6. Run: s18-search-v1.
Soal: 60; resmi: 0; draf: 60; privat: 18.
Versi jawaban: baseline-search-v1. Judge: jawab-judge-v1.

Hasil draf belum menjadi gerbang rilis. Kutipan dihitung per bentang sumber; lokasi benar menuntut semua lokasi gold. Jawaban kosong tidak lulus penolakan. Flag penolakan adalah keluaran pipeline, bukan penilaian kebenaran semantik; kesetiaan dinilai terpisah. Pola bahasa fatwa hanya pemeriksaan heuristik.

| Set | n | Kutipan valid | Lokasi | Penolakan tepat | Tidak salah menolak | Takhrij | Tanpa pola fatwa |
|---|---:|---|---|---|---|---|---|
| Resmi | 0 | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) |
| Draf | 60 | 100.0% (562/562) | 72.9% (35/48) | 0.0% (0/12) | 100.0% (48/48) | 0.0% (0/9) | 100.0% (60/60) |
| Privat (agregat) | 18 | 100.0% (171/171) | 64.3% (9/14) | 0.0% (0/4) | 100.0% (14/14) | 0.0% (0/3) | 100.0% (18/18) |
| lokasi+isi | 24 | 100.0% (224/224) | 95.8% (23/24) | — (0 sampel) | 100.0% (24/24) | — (0 sampel) | 100.0% (24/24) |
| topik tersebar | 9 | 100.0% (86/86) | 0.0% (0/9) | — (0 sampel) | 100.0% (9/9) | — (0 sampel) | 100.0% (9/9) |
| status hadits | 9 | 100.0% (90/90) | 66.7% (6/9) | — (0 sampel) | 100.0% (9/9) | 0.0% (0/9) | 100.0% (9/9) |
| di luar cakupan | 6 | 100.0% (42/42) | — (0 sampel) | 0.0% (0/6) | — (0 sampel) | — (0 sampel) | 100.0% (6/6) |
| premis keliru | 6 | 100.0% (60/60) | — (0 sampel) | 0.0% (0/6) | — (0 sampel) | — (0 sampel) | 100.0% (6/6) |
| atribusi | 6 | 100.0% (60/60) | 100.0% (6/6) | — (0 sampel) | 100.0% (6/6) | — (0 sampel) | 100.0% (6/6) |

Judge valid: 0/60; gagal/hilang: 60.
Kesetiaan: — (0 sampel). Atribusi: — (0 sampel).
Kalibrasi: 0 jawaban berpasangan dengan dua skor manusia. Kesepakatan kesetiaan — (0 sampel); atribusi — (0 sampel). Belum terkalibrasi (target ±30).
Bahasa Indonesia: —/5, n=0.
Jawaban berisi teks: 60/60.
Biaya jawaban: $0.000000; latensi rerata 10 ms. Biaya judge dicatat terpisah di manifest batch.

Soal privat dan teks kitab tidak dimuat dalam laporan ini. Arsip per soal, alasan judge, dan penilaian manusia berada di penyimpanan privat.
