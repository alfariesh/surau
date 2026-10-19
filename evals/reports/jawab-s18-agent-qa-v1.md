# S18 · Evaluasi Agent QA

2026-10-19 · Korpus `ihya-v6` · Run `s18-tinjau-v1` · Penilai **Agent QA S18**.

Pemilik meminta evaluasi agent agar pengembangan tidak menunggu Anas (ADR-053). Ini pemeriksaan sementara, **bukan persetujuan ustadz, kalibrasi manusia, atau mutu pipeline S19**. Contoh sengaja mencakup kesalahan; pipeline Jawab belum tersedia. Tidak ada panggilan API berbayar tambahan.

| Kelompok | Benar | Kurang | Salah | Jumlah |
|---|---:|---:|---:|---:|
| Contoh publik, dibaca terhadap potongan Arab dari DB | 18 | 1 | 11 | 30 |
| Baseline Cari, belum ada jawaban substantif | 0 | 30 | 0 | 30 |
| Total | 18 | 31 | 11 | 60 |

Semua 60 ulasan tersimpan di D1 dengan nama **Agent QA S18**, identitas agent khusus, dan `question_verdict = null`. Satu ulasan **Agent QA** sebelumnya hanya untuk uji simpan–muat ulang UI, tidak ikut hitungan di atas. Penilaian Anas belum ada. Ke-18 holdout termasuk baseline; hanya kekosongan jawaban substantif diperiksa, tanpa memakai isi/kunci holdout untuk tuning. Kesetiaan dan atribusi baseline dibiarkan null, bukan skor lulus karena tidak ada klaim.

## Perbandingan dengan judge yang sudah ada

Penilaian agent dibekukan sebelum membaca skor/alasan judge. Pasangan memakai ID, hash soal/jawaban, dan versi korpus yang sama. Judge `jawab-judge-v1`: 29 valid, satu gagal `max_tokens` dikeluarkan dari penyebut.

| Ukuran | Hasil |
|---|---:|
| Kesepakatan kesetiaan agent–judge | 25/29 (86,2%) |
| Kesepakatan atribusi agent–judge | 28/29 (96,6%) |
| Pasangan manusia | 0 |

Perbedaan kesetiaan pada j011/j019/j020/j021: agent menilai dukungan klaim terhadap sumber, sedangkan judge juga menolak kelengkapan atau kurangnya sintesis hubungan. Pada j011 judge menolak atribusi yang dinilai terlalu umum; agent menerima frasa pembahasan Ihya sebagai atribusi ke karya tanpa klaim tokoh yang salah. Skor awal tidak disesuaikan setelah melihat judge. Perbedaan ini perlu adjudikasi Anas; jangan menggunakan angka kesepakatan sebagai gerbang mutu.

j023 dinilai kurang karena potongan argumen bersyarat tentang lapar/haus/dingin belum memberi konteks lengkap bagi klaim pengobatan. Catatan ini tidak mengubah sumber, kunci, prompt, atau jawaban dalam snapshot. Semua bahasa diberi 4/5: dapat dipahami, tetapi beberapa jawaban memakai pembuka templat, kapitalisasi tidak tepat, atau ungkapan meta dari kunci.

## Bukti dan tindak lanjut

- Arsip privat: `evals/private/jawab-runs/s18-agent-qa-v1-{reviews,export}.jsonl` dan `s18-agent-qa-v1.sql`; ekspor lokal ini dibentuk dari snapshot dan ulasan agent, bukan unduhan seluruh ulasan produksi.
- Validasi: seluruh hash snapshot cocok, 60 record lolos skema proyek, SQL diuji pada SQLite dengan migrasi aktual. Impor produksi insert-only mengikat kedua hash dan expiry; agregat D1 sesuai tabel di atas, tanpa keputusan persetujuan soal.
- Pengembangan S19 boleh lanjut atas keputusan pemilik; T-24 ditunda. Tiga kriteria manusia pada S18 tetap belum dicentang. Gerbang rilis R4 tidak dinyatakan lolos.
