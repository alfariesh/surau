# X15 · Sesi sisipan: Intisari (ringkasan belajar berlapis) — kontrak data, pipeline, korpus

> **Fase:** sisipan (`packages/db`, `packages/core`, `packages/llm`, `tools/ingest`, dokumen) · **Status:** X15a selesai (2026-10-24, ADR-097, PR #137); X15b selesai kecuali nilai T-31 (2026-10-24, ADR-098); X15c belum
> **Prasyarat:** – · Tugas pemilik: T-31 (QA pilot, X15b), T-28 (data kitab, X15c)
> **Perkiraan:** X15a 1 percakapan, $0 · X15b 1–2 percakapan + pilot LLM ≤ $1 (izin) · X15c 1 percakapan + LLM ±$2,5–4 (izin) + promote `ihya-v9` (izin)

## Tujuan

Setiap kitab dan bab Ihya punya **Intisari**: ringkasan belajar yang bisa dibaca dalam 3–15 menit atau didengarkan (X17). Isinya gagasan kunci yang masing-masing menunjuk paragraf sumbernya, kutipan Arab yang disalin dari DB, istilah, dan pertanyaan ingatan. Format dan model datanya dipakai bersama pembaca, Cari, MCP, dan audio.

## Kenapa sesi ini ada

Permintaan pemilik (2026-10-24): kembangkan "ringkasan per bab" menjadi pengalaman belajar ringkas ala Headway/Blinkist untuk pekerja kota yang sibuk, orang awam, dan peneliti, ditambah audiobook dengan ElevenLabs v4. Ringkasan sekarang hanya satu paragraf ±1.100 karakter per node, tanpa jangkar ke teks.

Riset, keputusan, dan alternatif yang ditolak ada di **ADR-097**. Kebijakannya di [docs/05 §12](../../docs/05-kebijakan.md#12-intisari-dan-suara-ai), aturan TTS di `.claude/rules/teks-arab.md` aturan 11.

**Jawaban pemilik (2026-10-24, pertanyaan pilihan):**
- audio untuk Intisari Kitab + Intisari Bab;
- nama "Intisari";
- fitur belajar (jalur 40 hari, ulas, simpan kutipan) "notes aja dulu, nanti saja", jadi dicatat di FASE (Fase 7) dan belum dikerjakan;
- ElevenLabs paket Starter dulu.

## Model

| | Intisari Kitab (`tier` book) | Intisari Bab (`tier` section) |
|---|---|---|
| Node | muqaddimah + 40 kitab (41) | bagian lain (±270; rub' dari kitab-kitabnya) |
| Durasi | 10–15 menit | 2–4 menit; jumlah gagasan mengikuti panjang teks |
| Dibuat dari (`basis`) | Intisari bab anaknya (`children`, atau `mixed` bila kitab punya teks sendiri) | teks Arab bagian itu (`text`; node panjang per potongan lalu digabung, tetap `text`), atau teks sendiri + Intisari subbagiannya (`mixed`) |
| Model | Sonnet 5.5 (dibandingkan dengan Haiku di pilot) | Haiku 5.5 |
| Isi | pembuka · 5–10 gagasan (120–250 kata) · 2–3 kutipan · penutup | abstrak · 3–7 gagasan (40–90 kata) · 0–2 kutipan · 0–5 istilah |

Keduanya juga memuat:
- sikap tiap gagasan (`author`/`reported`/`refuted`);
- gagasan jenis `advice`, hanya bila ada di teks dan berjangkar;
- 1–2 pertanyaan ingatan per gagasan;
- dalil yang dihitung kode saat dibaca (X16).

**Data (korpus skema 9, migrasi `0009_digest.sql`):**

| Tabel | Isi |
|---|---|
| `digest` | per node per bahasa |
| `digest_point` | gagasan |
| `digest_anchor` | rentang `text_raw` per gagasan |
| `digest_quote` | rentang + `raw_sha256` + jenis kutipan + terjemahan atau rujukan ke terjemahan paragraf |
| `digest_question` | pertanyaan ingatan |
| `glossary_term`, `digest_term` | istilah |
| `audio_track` | diisi X17 |
| `digest_point_fts` | indeks gagasan |

**Baca:** `readDigest` (core) mengembalikan `DigestView`.
- Kutipan disalin dari `text_raw` hanya bila sidiknya cocok dan tidak menyentuh rujukan ayat. Yang ditahan masuk `withheld_quotes`, hanya untuk log.
- Yang ditolak peninjau, gagasan tanpa jangkar, dan teks AI berhuruf Arab tidak dikirim.
- Kepala Intisari (jumlah gagasan yang tampil, panjang teks, durasi audio dengan narator manusia didahulukan) diambil lewat `listDigestHeaders`/`getDigestHeaders` (db).

## Baca dulu (hanya ini)

- ADR-097 (keputusan Intisari), ADR-043/044 (ringkasan dua putaran + Cari), ADR-061 (tanda terima batch), ADR-067 (ringkasan untuk routing Jawab), ADR-077 (keluaran JSON terstruktur, judul daftar isi) di [KEPUTUSAN.md](../KEPUTUSAN.md)
- `.claude/rules/teks-arab.md` aturan 1, 4, 6, 7, 8, 9, 11; [docs/05 §12](../../docs/05-kebijakan.md#12-intisari-dan-suara-ai)
- `tools/ingest/README.md` (urutan `pnpm llm`), `tools/ingest/src/llm/units.ts` (rencana dua putaran), `packages/llm/src/summarize.ts` (`checkSummary`), `packages/llm/prompts/summarize-section-v2.ts`, `packages/llm/src/toc-title.ts` + `prompts/toc-title-schema.ts` (structured outputs)
- `packages/llm/src/jawab/documents.ts` (`segmentText`), `packages/core/src/ayah-placeholder.ts` (`maskAyat`), `packages/core/src/digest.ts` + `packages/db/src/repo/digest.ts` (kontrak X15a)
- Skill `claude-api` sebelum menulis request Anthropic

## Langkah

### X15a · Kontrak (selesai 2026-10-24)

1. Migrasi korpus `0009_digest.sql` (skema 9) + Zod per tabel + `DIGEST_SCHEMA_VERSION` (`packages/db/src/schema/corpus.ts`).
2. `packages/db/src/repo/digest.ts`: `getDigest` (satu batch, termasuk halaman cetak jangkar dan `text_raw` kutipan) dan kepala Intisari (`listDigestHeaders`, `getDigestHeaders`). Di skema < 9 hasilnya null/kosong.
3. `packages/core/src/digest.ts`: `readDigest` → `DigestView` (skema kontrak di `packages/core/src/schema.ts`) dan `readingMinutes`.
4. `tools/ingest`: tabel baru masuk `TABLE_ORDER`, `CorpusRows` (kosong lewat `emptyDigestRows`), reset SQL (`digest_point_fts`), dan smoke D1 (`DIGEST_TABLES`, batasan "belum punya Intisari" di skema < 9).
5. Dokumen: ADR-097, docs/05 §12, teks-arab aturan 11, ARSITEKTUR §1/§3.1, sesi X15–X17, T-28–T-31, FASE, STATUS, LOG.

### X15b · Pipeline + pilot (sesi terpisah)

1. **Glosarium sebagai data:** `GLOSSARY_V1` menjadi daftar berkunci (`term_key`, label, bentuk lisan untuk X17), lalu `GLOSSARY_V2` dibangkitkan darinya. Prompt yang berubah naik versi. `pnpm llm glosarium --budget --confirm` membuat definisi singkat (`glossary_term`).
2. **Unit blok** (`tools/ingest/src/llm/digest-units.ts`):
   - `text_raw` paragraf badan dipecah dengan `segmentText` (target ±220 karakter) tanpa memotong rentang `passage_ayah_ref`.
   - `maskAyat` dijalankan per blok, lalu blok diberi label `b1…bn` per request. Peta blok → `{passage_id, char_start, char_end}` disimpan di catatan request.
   - Node besar dipecah per potongan (pola `CHUNK_MAX_TOKENS`).
   - Tahap `leaf` → `merge` → `book`. Induk merujuk ID gagasan anak `n<node>.g<k>` dan kutipan anak `n<node>.q<k>`, tidak pernah meratakan subpohon. Prompt tetap < 100 ribu token.
   - sha berjenjang menandai hasil basi (`source_sha256`).
3. **Prompt + skema:**
   - `packages/llm/prompts/digest-section-v1.ts`, `digest-merge-v1.ts` (termasuk tier book), `digest-schema.ts`.
   - Keluaran structured outputs berisi pembuka/abstrak/penutup, gagasan (judul, isi, sikap, jenis, ID dasar), kutipan (ID blok dari–sampai + gagasan + terjemahan), kunci istilah (`enum`), pertanyaan.
   - Model tidak menulis huruf Arab sama sekali. Atribusi dan larangan fatwa mengikuti prompt `summarize-section@2`.
   - Bentuk penuh gelar untuk perempuan/jamak (bukan "ra." saja), karena dibacakan X17.
4. **Validator `judgeDigest`** (`packages/llm/src/digest.ts`):
   - `stop_reason` = `end_turn`, lalu Zod ketat.
   - Jumlah dan panjang per tier. Abstrak harus lolos `checkSummary`.
   - Teks bebas huruf Arab, `⟦`/"QS n", Markdown, kalimat pembuka, pola fatwa (dipindah dari `tools/eval/src/answer-metrics.ts` ke `packages/llm/src/check.ts`), orang pertama sebagai ulama, kata status hadits, dan parafrase ayat.
   - ID harus ada di subpohon node.
   - Kutipan: blok bersebelahan dalam satu paragraf, 20–400 karakter, tidak beririsan dengan ayat atau paragraf judul. Riwayat berlabel takhrij sangat lemah/palsu/"tidak ada asalnya" ditolak sebagai kutipan.
   - Butir opsional yang cacat dibuang deterministik dengan alasan tercatat.
5. **CLI:** `pnpm llm intisari plan|submit|status|wait|collect|rejudge|retry|reconcile|report` dengan opsi `--stage leaf|merge|book`, `--kitab <id>`, `--lang id`, `--budget`, `--confirm`, dan `--from staging`.
   - `--from staging` membaca korpus staging hanya dengan SELECT, lewat pola `tools/eval/src/open-corpus.ts`, karena data T-28 tidak ada di mesin agen.
   - `plan` gratis (`count_tokens`).
6. **Attach** (`tools/ingest/src/llm/digest-attach.ts`):
   - hasil yang lolos menjadi baris `digest*` + `digest_point_fts` (`latinIndexText` judul + isi; hanya gagasan yang tampil, yaitu tidak ditolak dan berjangkar);
   - invarian build (gagal bila dilanggar):
     - setiap kutipan cocok sidik dan tidak menyentuh ayat;
     - sumber `passage` hanya untuk kutipan satu paragraf utuh;
     - setiap gagasan punya jangkar;
     - terjemahan kutipan `digest` membawa asal model-nya sendiri, jadi kutipan anak yang dipakai induk tetap berlabel Haiku/`digest-section@1`;
   - abstrak menggantikan `summary.text` (prompt `digest-…`) hanya bila lolos `checkSummary`;
   - sha diperiksa ulang;
   - baris `audio_track` dimuat X17, bukan di sini.
7. **Pilot** (izin pemilik ≤ $1): satu kitab (usul: *Kitab al-'Ilm*) di semua tingkat; Intisari Kitab dibuat dua kali (Haiku dan Sonnet) untuk dibandingkan. Hasilnya:
   - laporan biaya aktual;
   - halaman QA HTML untuk pemilik (T-31: per gagasan Benar/Kurang/Salah, setia pada jangkar, atribusi, bebas fatwa);
   - ukuran blok: persen kutipan terpotong atau > 300 karakter.
8. Bila blok terlalu kasar (> 10% kutipan bermasalah), pakai cadangan ADR-097: penunjuk Arab pendek di dalam blok + `findQuote`, dengan teks Arab model dibuang.
9. **Muat hasil pilot ke staging** supaya X16 (Preview) dan T-30 punya data nyata:
   - terapkan migrasi 0009 ke `surau-corpus-staging`, lalu sisipkan baris Intisari pilot saja (bukan ingest penuh);
   - staging bukan produksi, dan pemuatan penuh tetap lewat X15c;
   - perintah dan batasnya ditulis di `tools/ingest/README.md`.

### X15c · Batch penuh + korpus `ihya-v9` (sesudah pilot lolos, T-28, izin)

1. Batch penuh `id` (izin pemilik, pagu dari `plan`) + `report`.
2. T-28: data kitab tersedia di mesin agen. Lalu `pnpm ingest ihya` → `ihya-v9` (skema 9), `corpus:qa` 30/30, dan muat ke staging.
3. Gerbang gratis: `eval:retrieval --gate` dan `eval:jawab kandidat` tidak turun dari ihya-v8.
4. Preview UI X16 dengan data staging, lalu `corpus:promote ihya-v9` (izin pemilik).

## Selesai bila

**X15a**
- [x] Migrasi 0009 + Zod: `packages/db/test/schema.test.ts` (kolom, nullability, STRICT) lolos untuk 8 tabel baru; `pnpm exec vp test --project db` → 159 lolos
- [x] `getDigest`/kepala Intisari: `packages/db/src/repo/digest.test.ts`. Isinya:
  - urutan, halaman cetak, dan rujukan ayat paragraf kutipan;
  - CHECK untuk asal terjemahan kutipan, rentang, edisi, Intisari Kitab tanpa pembuka/penutup, dan suara AI;
  - gagasan yang ditolak atau tanpa jangkar tidak dihitung;
  - skema < 9 → null/kosong.
- [x] `readDigest`: `packages/core/src/digest.test.ts`. Isinya:
  - kontrak `digestView`;
  - kutipan disalin dari `text_raw`; sidik basi dan yang menyentuh ayat ditahan (`withheld_quotes`);
  - asal terjemahan per kutipan; sumber `passage` hanya untuk paragraf utuh;
  - yang ditolak, tanpa jangkar, atau berhuruf Arab tidak dikirim;
  - node tidak ada → `NotFound`.
  `pnpm exec vp test --project core` → 168 lolos
- [x] Ingest: build kitab buatan berskema 9 dengan tabel Intisari kosong (`tools/ingest/test/pipeline.test.ts`); reset SQL anak sebelum induk (`sql.test.ts`)
- [x] `pnpm verify` lolos; peninjau 0 blocker; PR alfariesh/surau#137 di-squash-merge ke `main` (`4013a0a`, 2026-10-24, CI hijau)

**X15b**
- [x] Tes validator: ID blok karangan, kutipan yang menyentuh ayat, huruf Arab di teks mana pun, pola fatwa, dan kata status hadits ditolak; butir opsional cacat dibuang dengan alasan. `pnpm exec vp test --project node packages/llm/src` → 144 lolos (`digest.test.ts`, `check.test.ts`)
- [x] Blok menutup `text_raw` persis dan tidak memotong ayat; sha deterministik. `digest-units.test.ts` 9 lolos (gabungan blok = `text_raw`, ayat utuh di satu blok, rujukan rusak = paragraf tidak dikirim, sha sama dua kali, sha berjenjang)
- [x] `pnpm llm intisari plan --from staging --kitab <id>` mencetak token dan biaya tanpa memanggil model: `--kitab 100003 --stage leaf` → 22 request, 357.266 token prompt (terbesar 31.243), perkiraan US$0,051 (count_tokens saja)
- [ ] Pilot: biaya aktual ≤ pagu ✓ (US$0,53 ≤ US$1), halaman QA terkirim ✓ (2026-10-25), **nilai pemilik (T-31) ≤ 5% gagasan "Salah": menunggu pemilik**

**X15c**
- [ ] `corpus:qa ihya-v9` 30/30; gerbang eval tidak turun; promote atas izin pemilik

## Di luar cakupan

- UI (X16) dan audio (X17).
- Fitur belajar: jalur 40 hari, ulas, simpan kutipan, catatan pribadi. Dicatat di FASE Fase 7 atas permintaan pemilik.
- Intisari bahasa Inggris (fase /en, ADR-092).
- Koreksi Intisari oleh manusia (pola X08, menyusul).
- Kitab selain Ihya.

## Catatan hasil

*(X15a, 2026-10-24)*
- Kontrak data dan baca selesai tanpa biaya LLM.
- Tabel Intisari kosong sampai X15b; korpus berikutnya berskema 9.
- `corpus:qa` atas staging/produksi lama (skema < 9; produksi `ihya-v8` skema 7) akan gagal sampai dimuat ulang dari build skema 9. Ini wajar sesudah kenaikan skema, sama dengan X08.
- Peninjau: 0 blocker. 11 perbaikan dikerjakan sebelum merge:
  - kutipan yang menyentuh ayat ditahan;
  - gagasan tanpa jangkar tidak dikirim;
  - asal dan status tinjau per kutipan/pertanyaan;
  - sumber `passage` hanya untuk paragraf utuh;
  - `withheld_quotes`, label MCP "Intisari · AI summary", tes skema lama, definisi `basis`;
  - satu suara AI per Intisari;
  - README core, glosarium, dan docs/08.
- Uji dengar awal lewat konektor ElevenLabs: Jefri dan Gendhis, v4, ±1.200 kredit dari Starter. Pemilik memilih suara di T-31.
- Data T-28 tidak ada di mesin agen (Linux); pilot memakai `--from staging`.

*(X15b, 2026-10-24/25)*
- **Izin biaya (aturan keras 4):** pemilik menjawab kartu pertanyaan di sesi X15b pada 2026-10-24 ±16:44 UTC, sebelum batch berbayar pertama. Pertanyaan: "Pilot Intisari Kitab al-'Ilm memakai API Anthropic berbayar: perkiraan ±US$0,36 dengan pagu keras US$1. Isinya: bab (Haiku), Intisari Kitab (Sonnet + pembanding Haiku), dan 144 definisi glosarium (Sonnet). Sesudahnya hasil dimuat ke korpus staging (tabel Intisari + baris pilot saja; produksi tidak tersentuh). Boleh saya jalankan?" Jawaban pemilik: "Ya, pilot + staging (Recommended)". Pemakaian aktual US$0,53. Selisih dari perkiraan berasal dari pilot ulang v2 (langkah 8) dan pembuatan ulang dua merge + Kitab sesudah perbaikan larangan takhrij; semuanya tetap di bawah pagu.
- **Dibuat:**
  - glosarium berkunci (`prompts/glossary-v2.ts`, 162 entri, 144 istilah) dan `pnpm llm glosarium` (144 definisi lolos, US$0,13);
  - prompt `digest-section@2` (penunjuk kutipan), `digest-merge@1`, skema, dan `judgeDigest`;
  - pola fatwa pindah ke `packages/llm/src/check.ts`;
  - `verseBounds` pindah ke `@surau/core` (dipakai web dan Intisari);
  - `tools/ingest/src/llm/digest-*.ts` (unit blok, batch, attach + invarian build, baca/muat staging, laporan + halaman QA) dan `pnpm llm intisari …`;
  - ingest memuat Intisari + `digest_point_fts` dan abstrak yang lolos `checkSummary`.
- **Pilot** (ADR-098 *Hasil pilot*):
  - v1 lolos semua, tetapi kutipan sering terpotong (manual 9/26), jadi cadangan ADR-097 dipakai: `digest-section@2`, penunjuk awal/akhir + `findQuote`.
  - v2: 21 Intisari lolos; kutipan terpotong 2/23 menurut heuristik, 0/23 menurut pembacaan agent.
  - Dimuat ke `surau-corpus-staging` (skema 9), smoke `readDigest` 21/21.
  - Laporan angka: `data/reports/ihya-9472-intisari.md`. Halaman QA: `data/build/llm/intisari/qa/intisari-100003.html` (tidak di-commit; salinan seluruh folder hasil di checkout utama `/home/rekanesia/surau/data/build/llm/intisari/`).
- **Peninjau, dua putaran.**
  - Putaran 1: 1 blocker (potongan awal riwayat panjang lolos sebagai perkataan tanpa larangan takhrij) dan 8 perbaikan.
  - Putaran 2 (atas commit perbaikan): blocker itu baru tertutup sebagian, karena masih bersyarat jarak 600, tanpa titik, dan paragraf yang sama. Sekarang larangan berlaku lintas paragraf. Juga diperbaiki: penunjuk yang cocok ganda, baris basi di staging, metrik terlalu longgar, alasan `dropped` tanpa string model, dan QA yang memeriksa ulang larangan.
  - Tes yang ditambahkan untuk perbaikan itu: larangan lintas paragraf/titik/jarak, penunjuk unik, urutan rub' sesudah kitab, pagu bersama, `selectOnly` menolak DML, SQL staging basi, metrik terpotong, dan penunjuk v2 lewat rebuild.
  - Tanpa tes otomatis (dicek manual): hitungan QA tanpa pembanding Haiku dan cek ID staging baca = tulis.
- **Dependensi baru:** `wrangler` (catalog) sebagai devDependency `tools/ingest`, untuk `getPlatformProxy` baca staging (pola tools/eval). Sudah ada di root, jadi tanpa paket baru di lockfile.
- **Utang dan pesan untuk X15c:**
  - pilih model Intisari Kitab dari nilai T-31;
  - prompt berikutnya: buang "alasan … bila disebut" dari pembuka, ganti contoh abstrak menjadi "Bagian ini …";
  - celah peninjau yang tercatat di ADR-098 *Konsekuensi*;
  - node yang anaknya gagal permanen masih menunggu (belum ada jalur "menyerah lalu lanjut tanpa anak");
  - ingest `ihya-v9` dari T-28 memuat ulang staging, jadi baris pilot terganti oleh build penuh.
