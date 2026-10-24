# Eval Jawab

Korpus: ihya-v8. Run: x13-publik-takhrij-v1.
Soal: 42; resmi: 0; draf: 42; privat: 0.
Versi jawaban: answer@6+answer-route@2+pipeline@7+rute-tersimpan+makna-berkas. Judge: jawab-judge-v1.

Hasil draf belum menjadi gerbang rilis. Kutipan dihitung per bentang sumber; lokasi benar menuntut semua lokasi gold. Jawaban kosong tidak lulus penolakan. Flag penolakan adalah keluaran pipeline, bukan penilaian kebenaran semantik; kesetiaan dinilai terpisah. Pola bahasa fatwa hanya pemeriksaan heuristik.

| Set | n | Kutipan valid | Lokasi | Penolakan tepat | Tidak salah menolak | Takhrij | Tanpa pola fatwa |
|---|---:|---|---|---|---|---|---|
| Resmi | 0 | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) |
| Draf | 42 | 100.0% (172/172) | 88.2% (30/34) | 87.5% (7/8) | 100.0% (34/34) | 100.0% (6/6) | 100.0% (42/42) |
| Privat (agregat) | 0 | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) | — (0 sampel) |
| lokasi+isi | 17 | 100.0% (83/83) | 100.0% (17/17) | — (0 sampel) | 100.0% (17/17) | — (0 sampel) | 100.0% (17/17) |
| topik tersebar | 6 | 100.0% (47/47) | 33.3% (2/6) | — (0 sampel) | 100.0% (6/6) | — (0 sampel) | 100.0% (6/6) |
| status hadits | 6 | 100.0% (11/11) | 100.0% (6/6) | — (0 sampel) | 100.0% (6/6) | 100.0% (6/6) | 100.0% (6/6) |
| di luar cakupan | 4 | 100.0% (1/1) | — (0 sampel) | 75.0% (3/4) | — (0 sampel) | — (0 sampel) | 100.0% (4/4) |
| premis keliru | 4 | 100.0% (20/20) | — (0 sampel) | 100.0% (4/4) | — (0 sampel) | — (0 sampel) | 100.0% (4/4) |
| atribusi | 5 | 100.0% (10/10) | 100.0% (5/5) | — (0 sampel) | 100.0% (5/5) | — (0 sampel) | 100.0% (5/5) |

Judge valid: 0/42; gagal/hilang: 42.
Kesetiaan: — (0 sampel). Atribusi: — (0 sampel).
Kalibrasi: 0 jawaban berpasangan dengan dua skor manusia. Kesepakatan kesetiaan — (0 sampel); atribusi — (0 sampel). Belum terkalibrasi (target ±30).
Bahasa Indonesia: —/5, n=0.
Jawaban berisi teks: 42/42.
Takhrij: takhrij gold disitasi dan status = label kode takhrij itu (sejak X06, ADR-069; status tidak lagi tulisan model). Klaim status untuk takhrij lain yang disitasi (bukan kegagalan): 4.
Biaya jawaban: $0.111636; latensi rerata 13170 ms. Biaya judge dicatat terpisah di manifest batch.
Rute routing diambil dari arsip run lain (`--rute`, akhiran `+rute-tersimpan`): biaya dan latensi tanpa panggilan routing, dan angka ini mengukur tahap jawaban atas dokumen yang sama, bukan pipeline penuh.
Daftar makna diambil dari berkas peringkat (`--semantik`, akhiran `+makna-berkas`, X13), bukan indeks vektor Worker: pencarian makna di produksi belum menyala.

Soal privat dan teks kitab tidak dimuat dalam laporan ini. Arsip per soal, alasan judge, dan penilaian manusia berada di penyimpanan privat.
