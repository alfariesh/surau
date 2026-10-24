# 07 · Roadmap

Surau dibangun dalam **fase rilis**. Setiap fase menghasilkan sesuatu yang bisa dipakai publik dan dirilis sendiri (`/rilis`), tanpa menunggu fase berikutnya. Fase berikutnya dimulai setelah syarat rilis fase sebelumnya terpenuhi, atau setelah pemilik secara sadar memutuskan untuk melewatinya dan mencatatnya di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md).

Tabel di bawah adalah ringkasan. **Sumber rinci** (sesi, syarat rilis lengkap, status) ada di [implementasi/FASE.md](../implementasi/FASE.md). Bila ada perbedaan, FASE.md yang berlaku.

## Fase rilis

| Fase | Isi | Sesi | Syarat lanjut (ringkas) |
|---|---|---|---|
| **0 · Fondasi** | Monorepo TypeScript, CI, deploy otomatis ke Cloudflare Workers, identitas dan shell UI berbahasa Indonesia. Publik: situs "Surau, segera hadir". | S01–S04 | CI hijau. Situs tampil di domain (atau `workers.dev`). Tanpa sisa branding template, data, atau secret di repo. |
| **1 · Pembaca Ihya** | Ingest Ihya dari Shamela lokal (pohon diperbaiki, takhrij ditautkan, teks mentah + ternormalisasi), diverifikasi identik dengan OpenITI. Pembaca: daftar isi, halaman cetak, takhrij al-'Iraqi, permalink, dan salin sitasi. **Tanpa LLM.** | S05–S10 | 1.706 halaman dan 311 judul lolos validasi. 30 halaman acak cocok persis dengan sumber. Sumber teks publik (ADR-018) sudah diputuskan. |
| **2 · Cari** | Pencarian Arab (FTS5), ayat dicocokkan ke Tanzil dengan terjemahan Kemenag, batch Haiku 5.5 (terjemahan Indonesia per paragraf + ringkasan Indonesia dan Inggris per bagian, berlabel AI), Cari Indonesia, dan eval retrieval. Pencarian tidak memanggil LLM. | S11–S15 | Lokasi benar (hit@10) ≥ 90% pada set eval retrieval ([06](06-evaluasi.md)). Tidak ada ayat yang diterjemahkan LLM. Biaya batch tercatat. |
| **3 · MCP publik** | Server MCP read-only tanpa LLM di `mcp.<domain>/mcp`: `list_works`, `get_table_of_contents`, `read_page`, `read_section`, `search_text`, `verify_quote`, `get_hadith_takhrij`. Dokumentasi "Pakai Surau dari AI Anda". | S16–S17 | Lolos uji di kedua era spesifikasi MCP. Diuji di Claude Code dan Claude.ai. Setiap hasil memuat sitasi dan atribusi lisensi. |
| **4 · Jawab** | Eval Jawab dan halaman `/tinjau`, pipeline Haiku 5.5 + Citations dengan kutipan diverifikasi kode, refusal diulang ke Sonnet 5.5 atau turun ke Cari. Pengaman biaya (Turnstile, kuota, ledger, sakelar mati) dan halaman transparansi biaya. | S18–S21 | Target eval R4 ([06](06-evaluasi.md)). Kebijakan dan prompt direview ustadz. Rem biaya teruji: anggaran habis → Jawab mati → situs tetap berjalan sebagai Cari. |
| **5 · Ruang al-Ghazali** | 21+ karya al-Ghazali (Shamela + OpenITI), metadata atribusi, periode, dan bahasa asli, deduplikasi dengan Ihya, agen orang ketiga. | garis besar | Eval khusus lolos dan direview ahli karya al-Ghazali. |
| **6 · Wiki** | Entitas tingkat A (deterministik), lalu pilot tingkat B di *Kitab al-'Ilm*. Kartu UI, indeks tematik, dan antrean review. Lihat [04](04-wiki-dan-entitas.md). | garis besar | Presisi ekstraksi disepakati bersama ustadz. |
| **7 · Kurikulum & data terbuka** | ±92 kitab kurikulum, entitas tingkat C dengan review wajib, dump data dan benchmark terbuka, ruang tokoh lain. | garis besar | Kapasitas review ustadz mencukupi dan lisensi data jelas. |

Sesi Fase 5–7 dirinci saat Fase 4 hampir selesai.

## Perubahan dari roadmap lama (v1a–v4)

| Roadmap lama | Sekarang | Alasan |
|---|---|---|
| Langsung mulai dari Ihya | **Fase 0 · Fondasi** ditambahkan | Aplikasi dibangun penuh oleh agent. Repo, CI, dan deploy harus rapi sebelum data masuk. |
| v1a menggabungkan pembaca dan pencarian | Dipecah menjadi **Fase 1 · Pembaca** (tanpa LLM) dan **Fase 2 · Cari** | Pembaca bisa dirilis lebih dulu, dengan biaya LLM nol. |
| Batch terjemahan dan ringkasan di v1a | Pindah ke **Fase 2** (S13) | Dikerjakan setelah ayat dikenali (S12), supaya ayat diisi terjemahan Kemenag, bukan buatan LLM. Faktor token Arab diukur dulu. |
| Ayat tidak dijadwalkan khusus | **Ayat + terjemahan Kemenag di Fase 2** (S12) | Ayat dicocokkan secara deterministik ke Tanzil dan **tidak pernah diterjemahkan LLM** (ADR-020). |
| MCP (v1.5) setelah Jawab | **MCP (Fase 3) sebelum Jawab** | Hampir gratis (tanpa LLM), langsung berguna, dan menguji core tools di dunia nyata sebelum pipeline yang berbiaya (ADR-019). |
| Nama tool Indonesia (`daftar_isi`, `baca_bagian`, `cari`, `status_hadits`) | Nama Inggris snake_case (lihat tabel Fase 3) | Interoperabilitas dengan AI global; deskripsi tool tetap dwibahasa (ADR-012). |
| Turnstile/BotID | Turnstile + kuota D1 + Rate Limiting binding + ledger anggaran + sakelar mati | BotID milik Vercel; Surau di Cloudflare (ADR-002, ADR-014). |
| Pilot LangExtract untuk wiki | Ekstraksi TS-native dengan grounding offset oleh kode; LangExtract (Python) opsional | Satu bahasa di seluruh repo (ADR-007). |
| Uji Jev sebagai gerbang "tidak ditemukan" di v1b | Tidak dijadwalkan di sesi Fase 4 (belum ada ADR) | Penolakan diukur lewat eval Jawab ([06](06-evaluasi.md)). Bila metriknya kurang, uji Jev bisa diusulkan lagi (lihat [08](08-biaya.md)). |

Keputusan teknis di balik perubahan ini tercatat di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md).

## Langkah terdekat

Langkah terdekat, sesi berikutnya, dan tugas yang sedang ditunggu selalu ada di [implementasi/STATUS.md](../implementasi/STATUS.md). Tugas yang hanya bisa dikerjakan pemilik ada di [implementasi/TUGAS-PEMILIK.md](../implementasi/TUGAS-PEMILIK.md).

## Keputusan yang masih terbuka

Keputusan yang menunggu pemilik dicatat di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md) (P-1 sampai P-7). P-2, P-5, dan P-6 wajib dijawab pemilik. Sisanya memakai usulan CTO sebagai default bila tidak dijawab.

| ID | Pertanyaan | Usulan CTO (default) | Memblokir |
|---|---|---|---|
| P-1 | Repo GitHub publik atau privat? Lisensi HeroUI Pro melarang mempublikasikan komponen dan template Pro. | Privat dulu, lalu minta izin tertulis ke HeroUI. | S02 |
| P-2 | Nama domain Surau | Dipilih pemilik, didaftarkan lewat Cloudflare Registrar. | S03 |
| P-3 | Font Arab utama | Noto Naskh Arabic, dengan Amiri sebagai opsi "klasik". | S04 |
| P-4 | Plafon anggaran AI per bulan dan kuota anonim per hari (dasar sakelar mati) | $20/bulan, 10 Jawab/hari per pengunjung. | S13, Fase 4 |
| P-5 | Ustadz pertama untuk eval dan review | Dicari pemilik. | Rilis Fase 4 (dianjurkan sudah ada sejak Fase 2) |
| P-6 | Sumber teks publik dan lisensi konten | Matan dari Shamela lokal yang terverifikasi identik dengan OpenITI (CC BY-NC-SA 4.0), konten turunan CC BY-NC-SA 4.0, dan email pemberitahuan ke Shamela (ADR-018, ADR-021). | Rilis Fase 1 |
| P-7 | Boleh menyimpan pertanyaan/jawaban dan laporan kesalahan pengguna, dan berapa lama retensinya | Simpan tanpa data pribadi: pertanyaan+jawaban (`answer_log`) 12 bulan, laporan kesalahan (`feedback`) sampai ditangani + 12 bulan, `quota_daily` 7 hari, `llm_ledger` 24 bulan; diumumkan di kebijakan privasi. | Rilis Fase 1 (retensi `feedback`, dikumpulkan sejak S09), S18, S20 |

Di luar daftar itu, masih ada beberapa hal terbuka:

- **Bentuk organisasi nirlaba (yayasan atau perkumpulan) dan dewan pengawas.** Badan hukum membuka program kredit (AWS, Microsoft, Google for Nonprofits) dan membuat donasi lebih tepercaya. Lihat [08 Biaya](08-biaya.md).
- **Izin Shamela.** Syarat Shamela (diperbarui 19 Sep 2026) tidak memberi hak pakai ulang. Karena itu teks publik memakai rantai lisensi OpenITI (ADR-018), dan pemilik mengirim email pemberitahuan ke pengelola Shamela (T-10). Jawabannya ditunggu, tetapi tidak memblokir rilis Fase 1 bila ADR-018 sudah diterima. Kitab berikutnya yang tidak punya versi OpenITI butuh kebijakan lisensi tersendiri sebelum ditampilkan publik.
- **Tashih (PMA 44/2016).** Apakah aturan tashih berlaku untuk aplikasi yang hanya mengutip ayat di dalam kitab? Tanyakan ke LPMQ bila perlu (ADR-020).
- **Bahasa dokumentasi publik.** ADR-012 menetapkan dokumen dan UI berbahasa Indonesia, dengan deskripsi tool MCP dwibahasa (Inggris + Indonesia). Dokumentasi tambahan dalam bahasa Inggris atau Arab belum diputuskan.
- **Situs berbahasa Inggris** (diputuskan arahnya 2026-10-24, belum dijadwalkan): antarmuka, terjemahan kitab, dan Maknaz berbahasa Inggris di bawah `/en/…`, tanpa mengubah alamat Indonesia. Arsitektur dan daftar bagian yang masih terkunci bahasa Indonesia ada di ADR-092; mode baca Arab/Keduanya/Terjemahan (ADR-091) sudah netral bahasa.
