# Catatan Riset · 15 Oktober 2026

Ringkasan riset yang mendasari pilihan stack. Sebagian besar dikumpulkan lewat riset web otomatis. Yang ditandai **[diverifikasi]** sudah dicek langsung (registry npm/PyPI, Zenodo, atau tes lokal). Angka benchmark lainnya berasal dari makalah atau klaim vendor dan belum dicek ulang satu per satu.

## Database & pencarian

- **PostgreSQL** punya konfigurasi full-text `arabic` (Snowball Arabic) sejak PG 12. Stemmer-nya berbasis aturan dan tidak menormalisasi ta marbuta, jadi teks tetap dinormalisasi sendiri. https://www.postgresql.org/docs/release/12.0/
- **Ekstensi Postgres:**
  - pgvector 0.8.7 dan pgvectorscale 0.9.1 (sudah diuji hingga 50 juta vektor). https://github.com/timescale/pgvectorscale
  - ParadeDB pg_search (BM25, AGPL).
- **Neon:** pg_search dihapus (Sep 2026) dan diganti Lakebase Search; Neon kini bagian dari Databricks. https://neon.com/docs/extensions/pg_search
- **Supabase:** tersedia pgvector dan pgroonga; pg_search hanya lewat integrasi partner.
- **HelixDB:** v3.5.1 (Okt 2026), tim 6 orang (YC S25).
  - Bahasa query sudah dirombak dua kali, dan ada migrasi penyimpanan satu arah.
  - Analyzer BM25 hanya `standard`, `standard_stem_en`, dan `whitespace_lowercase`; tidak ada Arab.
  - Sumber: https://github.com/HelixDB/helix-db/releases · https://docs.helix-db.com/database/helix-cloud/operate/limits
- **Milvus:** 3.0 GA (Jul 2026) dengan analyzer `arabic` bawaan. Operasinya berat (etcd, object storage, WAL, banyak node). https://milvus.io/docs/arabic-analyzer.md
- **SQLite:**
  - Tokenizer FTS5 `unicode61` memperlakukan harakat sebagai pemisah kata. https://www.sqlite.org/fts5.html
  - sqlite-vec masih pra-1.0.
- **Normalisasi wajib di semua opsi:** hapus harakat dan tatweel, seragamkan alif/hamzah, alif maqsura → ya, ta marbuta → ha. Simpan teks mentah dan teks ternormalisasi berdampingan.

## Framework

- **Vercel AI SDK 7**: `ai@7.0.0` rilis 2026-06-25, membutuhkan Node 22+ dan ESM.
  - Telemetry lewat `@ai-sdk/otel`. Tidak ada modul eval bawaan.
  - Risiko: berganti versi mayor 3 kali dalam 11 bulan.
  - https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0
- **LangChain/LangGraph 1.x:**
  - Stabil sejak Okt 2025, tetapi v1 sendiri perombakan besar.
  - Tracing condong ke LangSmith.
  - https://blog.langchain.com/langchain-langgraph-1dot0
- **LlamaIndex TS:** diarsipkan 2026-04-30. https://github.com/run-llama/LlamaIndexTS
- **Mastra 1.x:** dibangun di atas AI SDK, punya eval bawaan, tapi rilisnya sangat sering.
- **PydanticAI v2:** opsi Python terbaik, punya adapter ke `useChat`.
- **Vercel eve:** masih beta dan membutuhkan Node 24+.
- **PageIndex** (MIT, ±39k bintang): `pip install pageindex` 0.4.0. Tools-nya: `browse_documents`, `get_document`, `get_document_structure`, `get_page_content`. Nilai utamanya membuat pohon dari PDF. https://github.com/VectifyAI/PageIndex
- **MCP** **[diverifikasi, npm]**: `@modelcontextprotocol/sdk` 1.32.1 (2026-10-05), `mcp-handler` 2.3.0 (2026-10-07). `@vercel/mcp-adapter` sudah lama tidak diperbarui (0.3.2, Feb 2026).

## OpenKB & LangExtract

- **OpenKB** (VectifyAI, Apache-2.0, ±4,8k bintang, belum ada rilis bertag): mengompilasi dokumen menjadi wiki Markdown (halaman ringkasan, konsep, dan entitas).
  - Penyimpanan berbasis file; database masih di roadmap.
  - Pohon untuk dokumen panjang hanya untuk PDF.
  - Kompilasi ulang menimpa editan manual.
  - Di dalamnya memakai OpenAI Agents SDK + LiteLLM.
  - https://github.com/VectifyAI/OpenKB
- **LangExtract** **[diverifikasi, PyPI + tes lokal]**: v1.7.1 (2026-10-08), Apache-2.0, Python ≥ 3.10.
  - Ada `UnicodeTokenizer` (mendukung aksara Arab) dan alignment fuzzy berbasis LCS (ambang 0,75).
  - Tes pada Ihya juz 1 halaman 200: kutipan exact dan nama tokoh berhasil ditemukan, kalimat karangan ditolak, tetapi **kutipan tanpa harakat dari sumber berharakat gagal ditemukan**. Karena itu ekstraksi harus dijalankan pada teks ternormalisasi.
  - https://github.com/google/langextract

## Model

- **Belum ada benchmark retrieval** untuk pertanyaan bahasa Indonesia → kitab Arab klasik.
- **Studi kecil yang relevan:**
  - ICML 2026 (fiqih, *Fath al-Mu'in*): menerjemahkan query dengan LLM yang diberi konteks bidang mengalahkan mesin terjemah, dan BM25 + dense dengan RRF memberi hasil terbaik. https://icml.cc/virtual/2026/80180
  - Tesis UIN Suka (2026): fine-tune BGE-M3 pada kitab kuning menaikkan Recall@1 menjadi 0,81. https://digilib.uin-suka.ac.id/id/eprint/78779
  - Studi RAG Arab (2025): BGE-M3 terbaik secara rata-rata dan pada set tafsir. https://arxiv.org/abs/2506.06339
- **Embedding (MMTEB, angka vendor/leaderboard):** Qwen3-Embedding-8B 70,88; Gemini Embedding 2 ±69,9 (klaim vendor); BGE-M3 54,60. https://arxiv.org/abs/2506.05176
- **LLM pada benchmark Islam:**
  - IslamicMMLU (2026): Gemini 3 teratas; Claude Opus 4.5 terbaik untuk identifikasi sumber hadits. https://arxiv.org/abs/2603.23750
  - IslamicTurathBench (2026): Gemini 3 Pro teratas, tasawuf adalah bidang terlemah, dan Claude tidak diuji. https://arxiv.org/abs/2608.04703
  - AraGen v3 (mengukur kejujuran): GPT-5 dan Claude Opus unggul.
  - Belum ada benchmark yang menguji Claude 5.x maupun GPT-5.5.
- **Model Arab-sentris** (Fanar, ALLaM, Jais) di bawah model frontier di semua benchmark Islam. Fanar-Sadiq bisa dipakai sebagai alat bantu verifikasi ayat.
- **Token Arab:** dengan tokenizer o200k (OpenAI), Ihya ±0,39 token per karakter **[diverifikasi, tes lokal]**. Tokenizer lain belum diukur. Tes dengan endpoint penghitung token tiap penyedia.

## Eval & observability

- **Langfuse:** diakuisisi ClickHouse (Jan 2026), tetap MIT.
  - Ada antrean anotasi dan integrasi AI SDK.
  - Hobby gratis; Core $29/bulan.
  - https://langfuse.com/pricing
- **promptfoo:** diakuisisi OpenAI (Mar 2026), tetap MIT. Cocok sebagai gerbang CI.
- **Braintrust:** paling rapi untuk review, tapi Pro $249/bulan.
- **Opik (Comet):** Apache-2.0, bisa di-host sendiri, ada antrean anotasi. Alternatif yang kredibel.
- **Helicone:** diakuisisi Mintlify (Mar 2026) dan masuk mode maintenance.

## Proyek sejenis & pelajaran

- **Ansari:** agen dengan alat Al-Qur'an, hadits, ensiklopedia fiqih, dan tafsir; status hadits disimpan sebagai metadata.
  - 11,8% umpan balik bernada negatif.
  - Premis keliru sempat diikuti 9,8% (benchmark eksternal).
  - https://arxiv.org/html/2608.20390v1 · https://github.com/ansari-project/ansari-backend
- **Fanar-Sadiq (QCRI):** ayat diambil dan divalidasi secara verbatim; zakat dan waris dihitung oleh kalkulator deterministik. https://arxiv.org/abs/2603.08501
- **Usul.ai:** mengindeks Shamela dan OpenITI (±15 ribu teks), lengkap dengan sitasi dan peringatan bahwa layanannya bukan fatwa.
- **OpenITI** **[diverifikasi, Zenodo]**: rilis 2025.1.9 berisi 13.320 teks Arab, berlisensi **CC BY-NC-SA 4.0**. https://zenodo.org/records/17767721
- **MUI (Agustus 2025):** AI tidak bisa dijadikan rujukan hukum agama. https://www.detik.com/hikmah/khazanah/d-8070039/ketua-mui-ai-tak-bisa-dijadikan-rujukan-hukum-agama

**Pelajaran:**
1. Grounding saja tidak cukup; kemampuan menolak harus diukur.
2. AI tidak boleh menulis kutipan sendiri.
3. Potong teks mengikuti struktur kitab.
4. Status hadits diambil dari sumbernya.
5. Ukur dampak perpindahan bahasa (Indonesia → Arab).
6. Ustadz mereview prompt dan kebijakan, bukan hanya jawaban.
7. Periksa bias mazhab.
8. Simpan sebagian soal eval secara privat.

## Tambahan: decision model, ConDB, dan harga

- **TypeSafe Jev** **[diverifikasi, docs]**:
  - Jev 1.13 (`jev-latest`) dan Jev 1.14 (preview, 14 Okt 2026).
  - Harga $42 per miliar ($0,042 per juta) token input; output gratis.
  - Konteks 64k per permintaan / 32k per pertanyaan; mode konteks panjang 262k dengan header khusus.
  - "English is the primary training language".
  - Primitif: Choice, Score, Noul, Box.
  - Ada cookbook cek sitasi (string match → Choice mendukung/bertentangan/tidak terkait → ambang keyakinan → review manusia) dan halaman "jaggedness": membaca harfiah, bias opsi pertama, lemah hitungan, terganggu detail tak relevan.
  - Sumber: https://docs.typesafe.ai/models.md · https://docs.typesafe.ai/model-jaggedness/jev-1.13.md · https://docs.typesafe.ai/cookbooks/citation_check.md
- **jev-doc-search** **[diverifikasi, repo]**: Apache-2.0, dibuat 30 Sep 2026. Isinya beam 3 di pohon PageIndex → Choice atas halaman → Noul per kandidat (maks. 16, ambang 0,5). https://github.com/VectifyAI/jev-doc-search
- **ConDB** **[diverifikasi, repo]**: Apache-2.0, ±65 bintang.
  - Database konteks berbentuk pohon (SQLite) dengan strategi beam (<50 simpul) dan block (KV-cache, klaim hemat token hingga 70%).
  - Hanya mendukung Anthropic/OpenAI. Benchmark-nya SWEBench-FileTree.
  - https://github.com/VectifyAI/ConDB
- **Ukuran daftar isi Ihya** **[diverifikasi, tes lokal]**: 311 simpul ≈ 6.450 token (judul saja, o200k). Fan-out median 3, maksimum 20.
- **Harga model:**
  - Sumber: halaman harga resmi Gemini (ai.google.dev, diperbarui 14 Okt 2026), Anthropic (platform.claude.com), OpenAI (developers.openai.com), DeepSeek, Alibaba Model Studio, DeepInfra, dan Cloudflare Workers AI. Dikumpulkan oleh agen riset 15 Okt 2026.
  - Harga Claude dicocokkan dengan referensi claude-api (cache 6 Okt 2026).
  - Ada satu selisih: harga baca cache Sonnet 5.5 tertulis $0,10 di laporan agen dan $0,20 di referensi. **Koreksi 15 Okt 2026 (review CTO):** halaman harga resmi menulis **$0,10** (0,05× input). Lihat [riset stack implementasi](2026-10-15-riset-stack-implementasi.md).
- **Hosting:**
  - Vercel Hobby non-komersial, tetapi "Asking for Donations does not fall under commercial usage" (fair-use guidelines).
  - Supabase Free 500 MB, dijeda setelah 1 minggu tanpa aktivitas.
  - Langfuse Hobby 50k unit/bulan.
- **Belum terverifikasi:**
  - Batas permintaan harian free tier Gemini.
  - Free tier Jev.
  - Kelayakan Indonesia untuk program Microsoft dan AWS/TechSoup.
  - Jumlah token Arab di tokenizer Claude dan Gemini.

## Keputusan model v1: Claude Haiku 5.5

Diputuskan pengguna pada 15 Okt 2026, bersifat sementara.

- **Haiku 5.5** **[diverifikasi, referensi claude-api]**
  - Harga:
    - $0,10 / $0,50 per juta token untuk prompt ≤100k; $0,50 / $2,50 di atasnya.
    - Baca cache 0,1× input; tulis cache 5 menit 1,25×, 1 jam 2×.
    - Batch diskon 50% untuk **semua** token, termasuk baca dan tulis cache (bertumpuk).
  - Kapasitas: konteks 1M, output maks. 128K.
  - Thinking:
    - Thinking adaptif aktif secara default; effort default `medium`.
    - `disabled` hanya diterima di effort `high` ke bawah. Panduan resminya: pakai effort sebagai tuas, bukan `disabled`.
    - Thinking dihitung dalam `max_tokens` dan ditagih sebagai output.
    - Respons bisa diawali blok `thinking`, jadi blok dibaca berdasarkan `type`, bukan posisi.
  - Tokenizer baru: teks yang sama dihitung sekitar 30% lebih banyak daripada Haiku 4.5.
  - Refusal: classifier keamanan bisa menghasilkan `stop_reason: "refusal"`, dan **tidak ada fallback di server** untuk Haiku 5.5.
  - Prefix minimum untuk cache: 512 token (dokumen menyarankan dicek ulang).
- **Citations** **[diverifikasi, docs platform.claude.com]**
  - Tersedia di semua model aktif.
  - `cited_text` tidak dihitung sebagai token output, dan juga tidak dihitung sebagai input saat dikirim balik.
  - Bisa dipakai bersama prompt caching, `count_tokens`, dan Message Batches.
  - **Tidak bisa** dipakai bersama structured outputs (`output_config.format` → error 400).
  - Dokumen *custom content*: blok dipakai apa adanya tanpa pemotongan tambahan; sitasi berupa rentang indeks blok.
  - Teks biasa dipotong otomatis per kalimat, sehingga kurang cocok untuk teks Arab klasik yang minim tanda baca.
  - https://platform.claude.com/docs/en/build-with-claude/citations
