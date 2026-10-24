# Fase Rilis

Setiap fase menghasilkan **sesuatu yang bisa dipakai publik** dan dirilis dengan `/rilis`, tanpa menunggu fase berikutnya. Fase berikutnya dimulai hanya setelah syarat rilis fase sebelumnya terpenuhi, atau setelah pemilik memutuskan untuk melewatinya secara sadar dan mencatatnya di KEPUTUSAN.md.

Fase ini memperbarui roadmap di [docs/07](../docs/07-roadmap.md). Perbedaan utamanya: ada Fase 0 (fondasi) dan MCP dirilis sebelum Jawab (ADR-019).

| Fase | Nama | Yang bisa dipakai publik | Sesi | Status |
|---|---|---|---|---|
| 0 | Fondasi | Situs "Surau, segera hadir": tentang, prinsip, dan status pengembangan | S01–S04 | **dirilis 2026-10-15** (`rilis-f0`) |
| 1 | Pembaca Ihya | Membaca Ihya lengkap: daftar isi, halaman cetak, takhrij al-'Iraqi, dan permalink | S05–S10 | **dirilis 2026-10-16** (`rilis-f1`) |
| 2 | Cari | Pencarian Arab dan Indonesia di Ihya, ayat dengan terjemahan Kemenag, serta terjemahan dan ringkasan AI berlabel | S11–S15, X02 | **dirilis 2026-10-17** (`rilis-f2`) |
| 3 | MCP publik | Korpus Surau bisa dipakai dari Claude, ChatGPT, dan AI lain | S16–S17 | **dirilis 2026-10-17** (`rilis-f3`, ADR-051) |
| 4 | Jawab | Tanya-jawab dengan kutipan Arab terverifikasi, berkuota, dengan rem biaya | S18–S21, X03, X05, X06, X13 | belum |
| 5 | Ruang al-Ghazali | 21+ karya al-Ghazali, agen orang ketiga, metadata atribusi | garis besar | belum |
| 6 | Wiki | Kartu tokoh, istilah, hadits, dan indeks tematik (entitas tingkat A dan B) | garis besar | belum |
| 7 | Kurikulum & data terbuka | ±92 kitab, dump data dan benchmark terbuka | garis besar | belum |
| – | Sisipan | [X01](sesi/X01-upgrade-next-16-4.md) upgrade Next 16.4 + React 19.3 setelah OpenNext mendukung | X01 | menunggu gerbang |
| – | Sisipan | [X04](sesi/X04-mutu-baca.md) mutu baca pembaca Ihya: ritme dan tipografi, label AI tenang, subjudul, gulir bersambung, lanjutkan membaca, daftar isi Indonesia, T-17 tahap 3 | X04 | bagian A + T-17 tahap 3 dikerjakan 2026-10-21 (PR #115, ADR-074–076); bagian B dikerjakan 2026-10-21/22 (PR #116, ADR-077–078: daftar isi pembaca + subjudul, judul Indonesia, korpus `ihya-v8` di produksi atas izin pemilik 2026-10-22) |
| – | Sisipan | [X08](sesi/X08-koreksi-terjemahan.md) koreksi terjemahan Indonesia oleh editor dan ustadz di `/tinjau/terjemahan`: teks polos, revisi langsung oleh ustadz terdaftar (pola ADR-070) dengan nama tampil, tayang lewat korpus berikutnya | X08 | rencana, siap dikerjakan |
| – | Sisipan | [X11](sesi/X11-mode-baca.md) mode baca Arab · Keduanya · Terjemahan di pembaca, Cari, dan Maknaz + fondasi bahasa (situs Inggris nanti) | X11 | selesai 2026-10-24 (PR #126 + #127, ADR-091–092) |
| – | Sisipan | [X13](sesi/X13-mutu-jawab.md) mutu Jawab sebelum `/rilis 4`: pencarian makna (ADR-093), cakupan takhrij gold, holdout, kalibrasi judge | X13 | langkah gratis selesai 2026-10-24; langkah berbayar menunggu izin |
| – | Bahasa Inggris | Situs berbahasa Inggris di `/en/…`: antarmuka, terjemahan kitab, Cari, dan Maknaz (ADR-092: arsitektur + daftar bagian yang masih terkunci "id"; butuh sumber terjemahan ayat Inggris berlisensi) | garis besar | belum dijadwalkan |

**Catatan urutan:**
- MCP hanya butuh D1 korpus. Bila pemilik ingin, **MCP v0.1** (tool baca: `list_works`, `get_table_of_contents`, `read_page`, `read_section`) boleh dirilis lebih awal setelah Fase 1, sejajar dengan Fase 2. Tool `search_text` menyusul setelah S11/S14. Keputusan ini dicatat di KEPUTUSAN bila diambil.
- Sesi sisipan (X..) dikerjakan begitu gerbangnya terpenuhi, di sela sesi biasa.

---

## Fase 0 · Fondasi

**Tujuan:** repo rapi untuk agent, CI hijau, deploy otomatis ke Cloudflare, dan identitas Surau yang tampil di domain.

| Sesi | Judul | Hasil |
|---|---|---|
| [S01](sesi/S01-monorepo-toolchain.md) | Monorepo & toolchain | pnpm workspace, Vite+, TS7, Node 24, `pnpm verify` hijau, template berjalan di `apps/web` |
| [S02](sesi/S02-github-ci.md) | GitHub & CI | Repo di GitHub (privat dulu), CI, proteksi branch, dependabot |
| [S03](sesi/S03-deploy-cloudflare.md) | Deploy ke Cloudflare | OpenNext, deploy otomatis dari `main`, preview per PR, domain |
| [S04](sesi/S04-identitas-ui.md) | Identitas & fondasi UI | Shell Surau berbahasa Indonesia, tema, font Arab, komponen `ArabicText`, halaman Tentang |

**Syarat rilis R0:**
- `pnpm verify` dan CI hijau.
- Situs tampil di domain produksi (atau `workers.dev` bila domain belum siap) di desktop dan ponsel.
- Tidak ada sisa branding template, dan tidak ada data atau secret di repo.

## Fase 1 · Pembaca Ihya

**Tujuan:** teks Ihya lengkap bisa dibaca, dinavigasi, dan dikutip dengan alamat yang tepat. **Tanpa LLM.**

| Sesi | Judul | Hasil |
|---|---|---|
| [S05](sesi/S05-paket-teks-arab.md) | Paket teks Arab | `packages/text`: normalisasi, peta offset, stem, `findQuote`, pembersih HTML Shamela + golden tests |
| [S06](sesi/S06-skema-data-d1.md) | Skema data & D1 | `packages/db`: skema korpus dan app, migrasi, DB lokal dan remote, ADR ID/permalink |
| [S07](sesi/S07-importer-ihya.md) | Importer Ihya | `tools/ingest`: Shamela → validasi → patch daftar isi → SQL; termuat di D1 lokal |
| [S08](sesi/S08-core-tools-baca.md) | Core tools baca | `packages/core`: `getToc`, `readSection`, `readPage`, `buildCitation` + tes Worker |
| [S09](sesi/S09-ui-pembaca.md) | UI pembaca | Halaman kitab, daftar isi, halaman cetak, takhrij, permalink, salin sitasi |
| [S10](sesi/S10-korpus-produksi.md) | Korpus produksi & QA | Korpus di D1 remote (blue-green), QA sampel halaman, siap `/rilis 1` |

**Syarat rilis R1:**
- Semua 1.706 halaman dan 311 judul (setelah patch) termuat dan lolos validasi.
- Sampel 30 halaman acak cocok persis dengan sumber.
- Takhrij tampil di halaman yang benar.
- ADR-018 dan ADR-021 (sumber teks dan lisensi) sudah disetujui pemilik, dan retensi laporan kesalahan (`feedback`, bagian P-7) sudah diputuskan.
- Lighthouse aksesibilitas ≥ 90 di ponsel.

**Status R1 (2026-10-16, S10):** korpus `surau-corpus-ihya-v1` aktif di produksi (binding `CORPUS_DB` versi Worker f9046c12, deploy PR #23), hitungan baris = build yang lolos validasi (1.706 halaman, 311 judul + 2 node patch) ✓ · sampel 30 halaman 30/30 byte demi byte, termasuk tautan penanda takhrij ([laporan](../data/reports/ihya-9472-qa-surau-corpus-ihya-v1.md)) ✓ · takhrij di halaman yang benar (S09: 5 penanda dicek; QA `footnote_ref` 30/30) ✓ · ADR-018/021 + retensi `feedback` disetujui pemilik ✓ · Lighthouse a11y ponsel 100 (S09) ✓. QA manusia 10 halaman (T-15) 10/10 oke, tampilan pembaca (T-22) dan teks `/lisensi` disetujui pemilik (2026-10-16) ✓. **Dirilis 2026-10-16** (`rilis-f1`, PR #26, ADR-037).

## Fase 2 · Cari

**Tujuan:** menemukan di mana al-Ghazali membahas sesuatu, dengan query Arab maupun Indonesia. LLM hanya dipakai sekali di depan (batch); pencarian tidak memanggil LLM.

| Sesi | Judul | Hasil |
|---|---|---|
| [S11](sesi/S11-indeks-fts-arab.md) | Indeks FTS Arab | `passage_fts`, `buildFtsMatch`, `searchText` (Arab), sorotan ke teks mentah, pengaman kata umum |
| [S12](sesi/S12-ayat-kemenag.md) | Ayat & terjemahan Kemenag | Pencocokan ayat ke Tanzil (deterministik), terjemahan Kemenag verbatim, placeholder ayat untuk S13 |
| [S13](sesi/S13-batch-terjemahan.md) | Batch terjemahan & ringkasan | Ukur token Arab (`count_tokens`), Message Batches Haiku 5.5: terjemahan per paragraf + ringkasan per bagian; biaya tercatat |
| [S14](sesi/S14-cari-indonesia-ui.md) | Cari Indonesia + UI | FTS terjemahan Indonesia, gabungan RRF, halaman Cari |
| [S15](sesi/S15-eval-retrieval.md) | Eval retrieval | `tools/eval`, 20+ soal yang disetujui, laporan metrik, keputusan perlu atau tidaknya embedding |

**Syarat rilis R2:**
- Lokasi benar ≥ 90% pada set eval retrieval yang disetujui pemilik atau ustadz ([docs/06](../docs/06-evaluasi.md)): **hit@10 ≥ 90%** atas set resmi (≥20 soal ber-`disetujui_oleh`, publik + privat), diukur `pnpm run eval:retrieval --gate` atas D1 lokal berisi korpus yang sama dengan produksi (ADR-045). Laporannya di `evals/reports/` dan angkanya di LOG.
- Pemeriksaan kualitas Fase 2 lainnya sudah dinilai dan dicatat di LOG: 20 sampel ayat (S12, T-16) dan 20 sampel terjemahan AI (S13, T-17 tahap 2), sesuai tabel "Pemeriksaan kualitas lain" di docs/06.
- Semua terjemahan dan ringkasan berlabel AI, dan tidak ada ayat yang diterjemahkan LLM.
- Biaya batch tercatat di LOG.

**Status R2 (2026-10-17, S15):** S11–S15 selesai · set eval resmi 31 soal disetujui pemilik (T-12), `pnpm run eval:retrieval --gate` atas `ihya-v5` (= produksi) **hit@10 100%** ✓ ([laporan](../evals/reports/retrieval-2026-10-17-ihya-v5-resmi.md), ADR-045) · embedding tetap ditunda (ADR-046) · terjemahan/ringkasan berlabel AI dan ayat = Kemenag (S13/S14) ✓, dengan sisa risiko ayat yang luput pencocok (ADR-042) · biaya batch $4,48 di LOG S13 ✓ · T-16 dinilai 20/20 dan T-17 tahap 2 dinilai 70% Benar (di bawah target 80%), keduanya oleh agent lain yang laporannya diteruskan pemilik; temuannya diperbaiki di **X02** (ADR-047, korpus `ihya-v6` QA 30/30 dan eval hit@10 100%, aktif di produksi sejak PR #37). Konfirmasi pemilik atas penilaian agent dilakukan di `/rilis 2`. Sisa risiko: mutu 16 ribu terjemahan v2 lainnya belum diukur ulang tanpa bias (usulan T-17 tahap 3). Pemilik bisa menjalankan `/rilis 2`.

**Dirilis 2026-10-17 (`rilis-f2`, ADR-048):** gerbang eval rilis atas `ihya-v6` hit@10 100% ([laporan](../evals/reports/retrieval-2026-10-17-ihya-v6-rilis.md)); T-16 diterima pemilik; target 80% T-17 tahap 2 dilewati secara sadar (penyimpangan diterima pemilik, keterbatasan di CHANGELOG); batas global pencarian 1.200/menit.

## Fase 3 · MCP publik

**Tujuan:** AI apa pun bisa membaca, mencari, dan memverifikasi kutipan Ihya lewat MCP, gratis bagi Surau (tanpa LLM di sisi server). **Pembeda:** Shamela sudah punya MCP publik untuk pencarian Arab lintas kitab. MCP Surau menonjolkan bahasa Indonesia, status takhrij, ayat dengan terjemahan Kemenag, verifikasi kutipan, dan permalink halaman cetak yang stabil.

| Sesi | Judul | Hasil |
|---|---|---|
| [S16](sesi/S16-worker-mcp.md) | Worker MCP | `apps/mcp`: tools baca, cari, `verify_quote`, `get_hadith_takhrij`; dual-era; rate limit; tes kedua era |
| [S17](sesi/S17-mcp-rilis.md) | Dokumentasi & rilis MCP | Halaman "Pakai Surau dari AI Anda", uji klien nyata, registry (opsional), `/rilis 3` |

**Syarat rilis R3:**
- `tools/list` dan `tools/call` lolos di era modern dan legacy (Inspector CLI di CI).
- Diuji di Claude Code dan Claude.ai custom connector.
- Setiap hasil memuat sitasi dan atribusi lisensi.

**Status R3 (2026-10-17, S17):** Inspector produksi kedua era lolos semua tool + kasus error; job CI Preview MCP PR #43 lolos ✓ · Claude Code 2.1.299 search→read sukses, Claude.ai dikonfirmasi pemilik (T-18), Playground UI juga sukses ✓ · integrasi `apps/mcp/src/index.test.ts` memeriksa lisensi + atribusi semua tool dan sitasi hasil berteks (list_works berupa metadata edisi), serta hasil nyata Claude Code diperiksa ✓. [Bukti dan keterbatasan](../docs/mcp-operasional.md). Panduan `/mcp` diuji pemilik di Preview ("Panduan jelas; contoh lanjutan juga berhasil") ✓; rilis fase/tag difinalkan melalui `/rilis 3` (lihat catatan rilis di bawah). Pengamatan 17–24 Oktober berjalan terpisah; kestabilan satu minggu belum diklaim.

**Dirilis 2026-10-17 (`rilis-f3`, PR #44, ADR-051):** pemilik menyetujui produksi di chat ("ya") setelah Preview. S16–S17 selesai dan PR #42/#43 sudah merge; `main` awal bersih dan sinkron. Instalasi frozen-lockfile, `pnpm verify` (466 Node + 210 Workers, build web/MCP), tinjauan keamanan `rilis-f2..main`, dan gerbang versi lolos; dua advisory transitif dimitigasi tertulis di ADR-003. Preview PR #44: CI verify hijau, e2e 99 lolos/1 dilewati, Inspector seluruh tool modern/legacy dan Origin 403 lolos. Catatan rilis ada di CHANGELOG; bukti deploy dan smoke produksi dicatat pada anotasi tag `rilis-f3`. Pengamatan satu minggu tetap berjalan.

## Fase 4 · Jawab

*Jawab* adalah nama mode layanannya; di UI, mode ini tampil sebagai halaman **Tanya** (`/tanya`).

**Tujuan:** pertanyaan berbahasa Indonesia dijawab dengan kutipan Arab verbatim yang terverifikasi, bahasa atribusi, dan kemampuan berkata "tidak ditemukan", dalam batas anggaran.

| Sesi | Judul | Hasil |
|---|---|---|
| [S18](sesi/S18-eval-jawab.md) | Eval Jawab & halaman tinjau | Dataset 50–100 soal bersama ustadz, runner, metrik, halaman `/tinjau` |
| [S19](sesi/S19-pipeline-jawab.md) | Pipeline Jawab | `packages/llm` + `apps/api`: routing, Citations, verifikasi, refusal, uji passthrough AI Gateway |
| [S20](sesi/S20-pengaman-biaya.md) | Pengaman biaya & penyalahgunaan | Turnstile, kuota, ledger, kill switch, `/admin` (Access) |
| [S21](sesi/S21-ui-tanya.md) | UI Tanya & transparansi | Halaman Tanya, kartu sitasi, laporan kesalahan, halaman transparansi biaya |

**Syarat rilis R4 ([docs/06](../docs/06-evaluasi.md)):**
- Minimal 50 soal disetujui ustadz (target 100).
- Kutipan valid 100%.
- Status hadits benar 100% (untuk hadits yang punya takhrij).
- Lokasi benar ≥ 90%.
- Menolak dengan benar ≥ 90%.
- Kesetiaan ≥ 95%.
- Atribusi benar ≥ 95%.
- Kualitas bahasa Indonesia ≥ 4 (rata-rata skor ustadz 1–5).
- Nol bahasa fatwa ("hukumnya adalah…") di sampel.
- Kebijakan dan prompt sudah direview ustadz.
- Rem biaya teruji: anggaran habis → Jawab mati → situs tetap berjalan sebagai Cari.

## Fase 5 · Ruang al-Ghazali (garis besar)

Import 21 karya al-Ghazali dari Shamela ditambah karya yang tidak ada di sana dari OpenITI. Metadata atribusi, periode, dan bahasa asli ditambahkan. Tumpang tindih dengan Ihya dideduplikasi (*Qawa'id al-'Aqa'id*, *Asnaf al-Maghrurin*). Agen berbicara dalam orang ketiga, dan karya yang atribusinya diperdebatkan diberi label. Ada set eval khusus, dan kemungkinan login (Better Auth, ADR-016). Sesi dirinci saat Fase 4 hampir selesai. **Syarat rilis:** eval khusus lolos dan direview ahli karya al-Ghazali.

## Fase 6 · Wiki (garis besar)

Mulai dari tingkat A (deterministik): ayat (sudah tersedia sejak S12), tautan hadits↔takhrij, dan tokoh dari tabel penulis Shamela + Wikidata. Fakta wiki dan hasil review disimpan **di luar** DB korpus blue-green (lihat ARSITEKTUR-TEKNIS §3.2), supaya review ustadz tidak hilang saat korpus dibangun ulang. Tool MCP untuk entitas (misalnya `get_entity`) dinamai saat fase ini dirinci. Lalu pilot tingkat B di *Kitab al-'Ilm* (ekstraksi TS-native dengan grounding offset; LangExtract Python hanya bila perlu, lihat ADR-007), antrean review, kartu UI, dan indeks tematik. Lihat [docs/04](../docs/04-wiki-dan-entitas.md). **Syarat rilis:** presisi ekstraksi disepakati bersama ustadz.

## Fase 7 · Kurikulum & data terbuka (garis besar)

Mencakup ±92 kitab kurikulum (pipeline yang sama, validasi struktur otomatis per kitab), entitas tingkat C dengan review wajib, rilis dump `.sqlite` di R2 dan benchmark terbuka, serta ruang tokoh lain. **Syarat rilis:** kapasitas review ustadz mencukupi dan lisensi data jelas.
