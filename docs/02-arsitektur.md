# 02 · Arsitektur

Dokumen ini menjelaskan **konsep** arsitektur Surau: lapisan, gagasan kunci, dan pilihan besar beserta alasannya. Detail implementasi (peta sistem, struktur monorepo, skema tabel, alur, binding) ada di [implementasi/ARSITEKTUR-TEKNIS.md](../implementasi/ARSITEKTUR-TEKNIS.md). Setiap pilihan teknis dicatat sebagai ADR di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md); tautan "ADR-xxx" di bawah mengarah ke file itu. Versi paket dan harga yang terverifikasi (dicek 15 Okt 2026) ada di [implementasi/STACK.md](../implementasi/STACK.md).

## Gambaran berlapis

```
Permukaan   : Web app (UI terstruktur) · MCP publik · API Jawab · Dump data terbuka
Agen        : Riset umum · Ruang al-Ghazali · Fiqh Syafi'i · Verifikator (kode)
Core Tools  : list_works · get_table_of_contents · read_page · read_section
              search_text · verify_quote · get_hadith_takhrij · get_section_digest
Wiki        : tokoh · karya · istilah · ayat · hadits · qaul · masalah/hukum
              (tiap fakta: sumber + status review)
Korpus      : teks asli, tidak pernah diubah (ID kanonik + permalink halaman cetak)
              + indeks pencarian turunan yang bisa dibangun ulang
───────────────────────────────────────────────────────────────────────────
Kepercayaan : eval per agen · antrean review ustadz · dewan pengawas · log koreksi
```

### Gagasan kunci

- **Agen = cakupan kitab + prompt + tools + set eval.** "Ruang al-Ghazali" bukan sistem terpisah. Ia hanya konfigurasi di atas fondasi yang sama. Ruang tokoh atau ruang bidang lain ditambahkan dengan cara yang sama.
- **Core Tools adalah satu-satunya pintu ke data.** Web, MCP, dan API Jawab memanggil fungsi yang sama di `packages/core`, sehingga aturan keamanan dan format sitasi cukup ditulis sekali. Setiap hasil membawa teks mentah dari DB, sitasi (karya, edisi, juz, halaman cetak, permalink), serta lisensi dan atribusi.
- **Retrieval ala PageIndex, dibangun sendiri.** Kitab Shamela sudah punya pohon daftar isi. Agen menelusuri pohon itu (`get_table_of_contents`), membaca bagian atau halaman secara utuh (`read_section`, `read_page`), lalu memakai pencarian teks (`search_text`) untuk topik yang tersebar di banyak bab. Pencarian dimulai dengan BM25 atas teks Arab ternormalisasi dan atas terjemahan/ringkasan Indonesia. Vektor baru ditambahkan (gabungan hibrida RRF) bila eval membuktikan perlu ([ADR-006](../implementasi/KEPUTUSAN.md)).
- **Verifikator: kode menyalin, model menunjuk.** Model hanya menunjuk paragraf sumber (lewat Citations) dan menulis penjelasan berbahasa Indonesia. Sebelum jawaban tampil, kode mencocokkan setiap kutipan ke teks sumber (`verify_quote` mengembalikan substring mentah yang persis sama, lengkap dengan harakatnya), dan setiap hadits dicocokkan ke takhrij-nya. Teks Arab yang tampil selalu diambil dari DB, tidak pernah ditulis ulang model.
- **Ayat Al-Qur'an tidak pernah diterjemahkan LLM.** Ayat di dalam kitab dikenali secara deterministik, lalu ditampilkan dengan teks Tanzil dan terjemahan Kemenag apa adanya ([ADR-020](../implementasi/KEPUTUSAN.md)).

## Tiga Worker, satu inti

Semua komponen berjalan di Cloudflare: satu tagihan, satu dashboard, satu CLI ([ADR-002](../implementasi/KEPUTUSAN.md)). Aplikasi dipecah menjadi tiga Worker yang berbagi `packages/core` ([ADR-010](../implementasi/KEPUTUSAN.md)):

| Worker | Isi | Alamat | Mulai |
|---|---|---|---|
| `surau-web` | UI: pembaca, Cari, Tanya. Next.js 16 lewat OpenNext. Membaca D1 langsung lewat `packages/core`. Endpoint milik web sendiri (misalnya `/api/search`, `/api/feedback`) tetap di Next. | `<domain>/*` | Fase 0 |
| `surau-mcp` | MCP publik: hanya-baca, tanpa LLM | `mcp.<domain>/mcp` | Fase 3 |
| `surau-api` | Jawab (streaming), kuota, ledger biaya, cron. Satu-satunya Worker yang memanggil LLM. | Tanpa route publik; dipanggil `surau-web` lewat service binding dari route handler Next (`/api/jawab`, `/api/admin`) | Fase 4 |

Alasannya: MCP dan LLM tidak ikut terikat ke adapter dan *cold start* Next, rate limit dan kegagalan tiap Worker terpisah, dan setiap fase bisa dirilis sendiri.

Data tersimpan di dua jenis DB D1 ([ADR-005](../implementasi/KEPUTUSAN.md)):
- **Korpus berversi** (`surau-corpus-<versi>`): hanya-baca, dibangun ulang oleh pipeline, lalu diganti secara *blue-green* (DB baru → ganti binding → deploy; DB lama disimpan untuk rollback).
- **Aplikasi** (`surau-app`): pengaturan, umpan balik, kuota, ledger biaya, cache jawaban, serta log eval dan review.

R2 menyimpan cache halaman Next dan, nanti, dump data terbuka. Korpus dibangun di mesin lokal oleh pipeline TypeScript (`tools/ingest`) dari Shamela lokal. Matannya diverifikasi identik dengan OpenITI sebagai gerbang QA ([ADR-018](../implementasi/KEPUTUSAN.md), diusulkan; lihat [03 Sumber Data](03-sumber-data.md)).

Urutan pembangunan: Fondasi → Pembaca Ihya (tanpa LLM) → Cari → MCP publik → Jawab → Ruang al-Ghazali → Wiki → Kurikulum & data terbuka. MCP dirilis **sebelum** Jawab ([ADR-019](../implementasi/KEPUTUSAN.md)). Rinciannya ada di [implementasi/FASE.md](../implementasi/FASE.md).

## Stack pilihan

| Lapisan | Pilihan | Alasan | ADR |
|---|---|---|---|
| Bahasa | TypeScript di semua tempat: web, Worker, dan pipeline ingest (Node 24 + `node:sqlite` bawaan) | Satu modul normalisasi Arab dipakai bersama oleh pipeline dan Worker. Tidak ada dua implementasi yang harus dijaga identik. | [007](../implementasi/KEPUTUSAN.md) |
| Monorepo & toolchain | pnpm 12 workspaces + Vite+ (`vp check`, `vp test`, `vp run`), TypeScript 7, Node 24 | Satu toolchain, satu config, dan satu gerbang (`pnpm verify`) yang mudah dijalankan agent | [008](../implementasi/KEPUTUSAN.md) |
| Hosting | Cloudflare Workers (paket Workers Paid sudah dibayar), tiga Worker | Satu platform untuk web, MCP, API, data, anti-bot, dan proxy LLM. Logika domain berupa TS murni, dan korpus adalah file SQLite biasa, sehingga tetap portabel. | [002](../implementasi/KEPUTUSAN.md), [010](../implementasi/KEPUTUSAN.md) |
| Web | Next.js 16 App Router lewat OpenNext (`@opennextjs/cloudflare`), dengan konfigurasi konservatif. Jawaban di-stream langsung dari Worker API (Hono), tanpa Vercel AI SDK. | Template HeroUI Pro berbasis Next, dan tooling agent untuk Next paling matang. Next 16.4 dipakai hanya bila OpenNext resmi mendukungnya; bila belum, 16.3.8 + mitigasi. | [003](../implementasi/KEPUTUSAN.md) |
| UI | HeroUI v3 OSS + HeroUI Pro (versi dipin persis). UI berbahasa Indonesia (LTR); teks Arab di blok `lang="ar" dir="rtl"` dan tidak pernah dirender lewat Markdown. | Komponen siap pakai. Lisensi Pro melarang redistribusi, jadi repo privat dulu (P-1). | [004](../implementasi/KEPUTUSAN.md) |
| Database | Cloudflare D1 (SQLite): DB korpus berversi + DB aplikasi. R2 untuk cache dan dump. | Korpus hanya-baca dan berukuran sedang, jauh di bawah batas 10 GB per DB. Tanpa vendor kedua. | [005](../implementasi/KEPUTUSAN.md) |
| Pencarian | FTS5 (`unicode61 remove_diacritics 0`) atas teks yang **dinormalisasi di kode**, ditambah kolom stem proklitik dan ekspansi query | Tokenizer bawaan memecah kata berharakat. Lihat [Pencarian teks Arab](#pencarian-teks-arab). | [005](../implementasi/KEPUTUSAN.md) |
| Akses data | Tanpa ORM di Fase 0–4: migrasi SQL (`wrangler d1 migrations`) + fungsi repository bertipe dengan skema Zod | Query terpenting (FTS5) memang SQL mentah, tabel aplikasi sedikit, dan Drizzle 1.0 masih RC | [009](../implementasi/KEPUTUSAN.md) |
| Vektor | Ditunda. Bila eval membutuhkannya: Vectorize + embedding Workers AI | BM25 diuji dulu dengan set eval retrieval (Fase 2) | [006](../implementasi/KEPUTUSAN.md) |
| LLM | **Claude Haiku 5.5** (`claude-haiku-5-5`) lewat `@anthropic-ai/sdk`, dibungkus satu modul tipis. Panggilan online lewat AI Gateway; batch langsung ke Anthropic. | Butuh fitur khusus Claude: Citations, prompt caching, Message Batches, `count_tokens`, dan effort. Aturan pakainya di bawah. | [013](../implementasi/KEPUTUSAN.md) |
| MCP | `@modelcontextprotocol/server` v2 (spesifikasi 2026-07-28), stateless dual-era, di Worker sendiri | SDK resmi dengan semver stabil. Melayani klien lama dan baru tanpa paket tambahan. | [011](../implementasi/KEPUTUSAN.md) |
| Ekstraksi wiki (Fase 6) | TS-native: Claude structured outputs + posisi karakter (grounding) dihitung kode. LangExtract (Python) hanya opsional, terisolasi. | LangExtract tidak punya provider Anthropic bawaan dan menambah bahasa kedua. Lihat [04](04-wiki-dan-entitas.md). | [007](../implementasi/KEPUTUSAN.md) |
| Eval & anotasi | Dibangun sendiri: `tools/eval` (dataset JSONL, cek deterministik di CI), halaman `/tinjau` (dilindungi Cloudflare Access), tabel D1 `answer_log` dan `review` | Biaya $0, UI berbahasa Indonesia dengan teks Arab RTL, dan data tetap milik Surau. Lihat [06](06-evaluasi.md). | [015](../implementasi/KEPUTUSAN.md) |
| Observabilitas | Workers Logs, Traces, dan Issues; analytics AI Gateway (tanpa payload); Cloudflare Web Analytics | Semua bawaan Cloudflare, tanpa vendor tambahan, dan ramah privasi | [015](../implementasi/KEPUTUSAN.md) |
| Anti-bot & rem biaya | Turnstile (mode Managed, hanya di Jawab), Rate Limiting binding untuk burst, kuota harian dan ledger anggaran di D1, spend limit workspace Anthropic + AI Gateway, sakelar mati | Bot adalah risiko biaya terbesar. Rem dipasang berlapis, dan setiap kegagalan turun ke mode Cari. | [014](../implementasi/KEPUTUSAN.md) |
| Login | Belum ada sampai setelah Jawab; kemudian Better Auth + D1. `/admin` dilindungi Cloudflare Access. | Kuota anonim cukup untuk awal | [016](../implementasi/KEPUTUSAN.md) |
| CI/CD | GitHub Actions + `wrangler`; Worker Previews per PR yang terhubung ke D1 staging | Semua konfigurasi ada di repo, dan log bisa dibaca agent | [017](../implementasi/KEPUTUSAN.md) |

### Pencarian teks Arab

Ringkasan [eksperimen FTS5 pada Ihya](riset/2026-10-15-pencarian-arab/README.md):
- **Teks mentah tidak diindeks.** Tokenizer `unicode61` menganggap harakat sebagai pemisah, sehingga kata berharakat terpecah per huruf. Opsi `remove_diacritics` hanya berlaku untuk huruf Latin.
- **Normalisasi dilakukan di kode,** dengan modul yang sama di pipeline dan di Worker. Versinya disimpan (`NORM_VERSION`); setiap perubahan aturan berarti indeks dibangun ulang.
- **Klitik adalah masalah utama** (والصبر, بالنية, أبو/أبي هريرة). Solusinya kolom stem proklitik konservatif ditambah ekspansi proklitik dan kunyah di sisi query. Pada 18 query uji, recall makro 1,000 dengan 6 hit melenceng. Gold set-nya masih berbasis regex, jadi tetap perlu set relevansi yang dinilai manusia (Fase 2).
- **Sorotan dan kutipan dipetakan ke teks mentah** lewat peta offset. Inilah dasar `verify_quote`.
- **Kata yang sangat umum (الله) mahal** pada skala besar, sehingga perlu pengaman dan cache hasil populer.
- **Pertanyaan berbahasa Indonesia tidak mengenai indeks Arab.** Karena itu terjemahan dan ringkasan Indonesia juga diindeks, lalu hasilnya digabung dengan RRF.

### Model AI: pilihan v1 + pembanding lewat eval

**Pilihan (sementara): Claude Haiku 5.5** untuk Jawab dan semua ingest (terjemahan, ringkasan, ekstraksi). Rincian biaya ada di [08 Biaya](08-biaya.md). Aturan wajib ([ADR-013](../implementasi/KEPUTUSAN.md)):
- **Effort `low` diset eksplisit.** Default-nya `medium`.
- **Thinking adaptif** aktif secara default. Jangan kirim `budget_tokens`.
- **Jangan kirim `temperature`, `top_p`, atau `top_k`,** dan jangan memakai prefill assistant. Keduanya menghasilkan error 400.
- **Prompt maksimal 100k token, termasuk token cache.** Di atasnya harga naik 5×, jadi prompt Jawab dibatasi ±40k.
- **Refusal:** Haiku 5.5 tidak punya fallback di server. Bila `stop_reason` bernilai `"refusal"`, klien mengulang dengan `claude-sonnet-5-5`, atau turun ke mode Cari.
- **Citations tidak bisa dipakai bersama structured outputs.** Jawaban berbentuk teks + blok sitasi; structured outputs dipakai untuk ingest.
- **Jalur panggilan:** online lewat Cloudflare AI Gateway (mode BYOK, payload tidak dicatat) **setelah** uji passthrough Citations, streaming, dan `cache_control` lolos. Bila uji gagal, panggil Anthropic langsung. Message Batches dipanggil langsung dari skrip lokal. Message Batches **tidak tersedia di Amazon Bedrock**, sehingga kredit AWS hanya berguna untuk panggilan online.
- **Cache jawaban dibuat sendiri di D1** (pertanyaan ternormalisasi + versi korpus), sehingga yang di-cache adalah jawaban yang sudah diverifikasi kode.

Harga acuan dalam USD per juta token (platform.claude.com, dicek 15 Okt 2026; salinan resminya di [STACK.md](../implementasi/STACK.md)):

| Model | Input | Tulis cache 5m | Baca cache | Output |
|---|---|---|---|---|
| Claude Haiku 5.5 (prompt ≤100k) | 0,10 | 0,125 | 0,01 | 0,50 |
| Claude Haiku 5.5 (prompt >100k) | 0,50 | 0,625 | 0,05 | 2,50 |
| Claude Sonnet 5.5 | 2,00 | 2,50 | 0,10 | 10,00 |
| Claude Opus 5.5 | 4,00 | 5,00 | 0,20 | 20,00 |

Diskon batch 50% bertumpuk dengan caching.

| Peran | Pilihan dan kandidat yang diuji |
|---|---|
| LLM pembaca/penjawab | **Haiku 5.5 (v1).** Pembanding: Sonnet 5.5 (eskalasi dan ulangan saat refusal), lalu Gemini 3.1 Pro dan GPT-5.5 (eval berkala per kuartal) |
| Embedding | **Ditunda** ([ADR-006](../implementasi/KEPUTUSAN.md)). Bila recall@10 BM25 kurang: `@cf/qwen/qwen3-embedding-0.6b` vs `@cf/baai/bge-m3` di Workers AI (keduanya 1024 dimensi, ±$0,012 per juta token). Vektor disimpan di Vectorize dan juga di R2 supaya portabel. |
| Reranker | Tidak dipakai di awal. Urutan akhir cukup lewat RRF di kode, atau dipilih Claude di dalam panggilan Jawab. Reranker eksternal (Qwen3-Reranker, Cohere Rerank 4) hanya diuji bila eval menunjukkan perlu. |
| Decision model | TypeSafe Jev tidak ada di rencana Fase 0–4, karena mode Cari tidak memanggil model per pertanyaan. Bisa diuji nanti sebagai gerbang "tidak ditemukan" dan cek sitasi (lihat [08](08-biaya.md)). |

Di desain ini model **membaca teks**, bukan menjawab dari hafalan. Yang paling penting adalah kesetiaan pada teks, pemahaman bacaan Arab klasik, dan kualitas bahasa Indonesia. Itu hanya bisa diukur dengan eval kita sendiri.

### Tiga mode layanan (tangga biaya)

| Mode | Isi | Butuh LLM per pertanyaan? | Fase |
|---|---|---|---|
| **Cari** | Pencarian Arab dan Indonesia, navigasi pohon daftar isi, ayat dengan terjemahan Kemenag, kartu wiki (nanti) | Tidak. LLM hanya dipakai sekali di depan, lewat batch terjemahan dan ringkasan. | 2 |
| **Jawab** | Pipeline tetap: pengaman (sakelar, Turnstile, kuota, reservasi anggaran) → retrieval → 1 panggilan Haiku dengan Citations → verifikasi oleh kode | Ya, 1 panggilan (±$0,002–0,003 dengan Haiku 5.5; ±$0,03–0,04 dengan model frontier) | 4 |
| **Analisis mendalam** | Agen bebas dengan model lebih kuat, khusus pengguna login, berkuota | Ya, beberapa putaran | Setelah ada login ([ADR-016](../implementasi/KEPUTUSAN.md)) |

Urutan tangga biaya: jawaban terverifikasi (cache) → wiki/DB → Cari → Jawab dengan Haiku → eskalasi ke Sonnet. Bila anggaran habis atau penyedia gagal, Jawab mati dan situs tetap berjalan sebagai Cari.

Ditambah **MCP**: pengguna memakai AI miliknya sendiri, sehingga Surau hanya melayani query database. Rincian biaya ada di [08 Biaya](08-biaya.md).

## Ukuran data

| Data | Ukuran |
|---|---|
| Ihya di Shamela (ID 9472) | 1.706 halaman cetak (4 jilid), 311 judul, 20.738 paragraf (16.080 badan teks, 4.658 catatan kaki), ±5,5 juta karakter |
| Ihya dalam token | ±1,8 juta token (2,1 juta dengan takhrij), diukur dengan tokenizer OpenAI. Jumlah token di tokenizer Claude belum diukur (Fase 2, S13). |
| Median satu bab Ihya | ±2.800 token; 90% bab < 16 ribu token |
| Ihya di SQLite | Data ±11 MB; indeks FTS norm+stem per paragraf ±6,9 MB |
| ±92 kitab dari daftar kurikulum | ±98 juta token, sekitar 200–400 ribu potongan. Perkiraan ±1–1,6 GB di D1, jauh di bawah batas 10 GB per DB. |
| Seluruh Shamela | ±7,5 juta halaman. Tidak direncanakan: Surau mengejar kedalaman per kitab, bukan lebar cakupan ([ADR-022](../implementasi/KEPUTUSAN.md)). Bila suatu saat perlu, korpus dipecah ke beberapa DB D1, atau memakai cadangan Postgres lewat Hyperdrive ([ADR-005](../implementasi/KEPUTUSAN.md)). |

## MCP

- **Bentuk:** Worker `surau-mcp` di `mcp.<domain>/mcp`, dirilis di Fase 3, **sebelum** Jawab ([ADR-019](../implementasi/KEPUTUSAN.md)). Server memakai SDK resmi v2 dan bersifat stateless dual-era: klien spesifikasi 2026-07-28 dan klien lama (2025-11-25) dilayani di endpoint yang sama. Tanpa auth, hanya-baca, dan tidak pernah memanggil LLM ([ADR-011](../implementasi/KEPUTUSAN.md)).
- **Tools yang dibuka:** `list_works`, `get_table_of_contents`, `read_page`, `read_section`, `search_text`, `verify_quote`, `get_hadith_takhrij`, dan `get_section_digest` (Intisari, sejak X16). Semuanya hanya-baca dan diberi anotasi `readOnlyHint`. Nama tool berbahasa Inggris (ASCII, mudah dipakai AI mana pun) dengan deskripsi dwibahasa ([ADR-012](../implementasi/KEPUTUSAN.md)). Nama ini menggantikan nama lama (`daftar_isi`, `baca_bagian`, `cari`, `cek_kutipan`, `status_hadits`). Tool entitas wiki menyusul di Fase 6.
- **Pembeda:** Shamela sudah punya MCP publik untuk pencarian Arab lintas kitab. MCP Surau menonjolkan bahasa Indonesia, takhrij yang tertaut, ayat dengan terjemahan Kemenag, verifikasi kutipan, dan permalink halaman cetak yang stabil ([ADR-022](../implementasi/KEPUTUSAN.md)).
- **Ekonomi nirlaba:** lewat MCP, biaya model AI ditanggung oleh AI milik pengguna. Surau hanya melayani query database yang murah. Bagian termahal adalah mode Jawab di situs Surau sendiri.
- **Keterbatasan:** jawaban akhir ditulis oleh model milik pengguna, sehingga verifikasi kutipan tidak bisa dipaksakan. Mitigasinya:
  - Setiap tool mengembalikan teks verbatim + permalink + objek sitasi + lisensi dan atribusi ([ADR-021](../implementasi/KEPUTUSAN.md)).
  - Tool `verify_quote` tersedia untuk AI mana pun.
  - Instruksi server menjelaskan aturan kutipan, termasuk bahwa isi kitab adalah data, bukan instruksi.
  - Keterbatasan ini dijelaskan terbuka di dokumentasi publik.
- **Batas operasional:**
  - Output dipaginasi (±4–6 ribu token per respons), karena Claude Code memberi peringatan bila output tool melebihi 10 ribu token.
  - Rate limit memakai kunci `HMAC(IP):tool` (bukan IP mentah) dan dibuat longgar, karena semua pengguna Claude.ai datang dari IP Anthropic ([ADR-011](../implementasi/KEPUTUSAN.md), [ADR-014](../implementasi/KEPUTUSAN.md)).
  - MCP tidak bisa memakai Turnstile, jadi tidak ada tool yang memanggil LLM. Bot Fight Mode tidak diaktifkan karena memblokir klien MCP ([ADR-014](../implementasi/KEPUTUSAN.md)).

## Yang harus benar sejak v1

"v1" di sini berarti rilis publik pertama (Fase 1). Butir yang baru dipakai di fase berikutnya tetap disiapkan skemanya sejak awal.

1. **ID kanonik dan permalink untuk setiap bagian dan halaman cetak.** Pakai URI OpenITI bila ada, misalnya `0505Ghazali.IhyaCulumDin`. Unit sitasi adalah halaman cetak (juz + halaman). Permalink yang sudah dirilis tidak boleh berubah tanpa pengalihan.
2. **Sumber dan status review di setiap fakta wiki.**
3. **Core Tools sebagai satu-satunya pintu.**
4. **Skema multi-karya, multi-edisi, dan multi-sumber** (Shamela + OpenITI), meskipun Fase 1 baru berisi Ihya.
5. **Teks mentah (`text_raw`) disimpan apa adanya dan tidak pernah diubah.** Teks ternormalisasi dan peta offset tidak disimpan di tabel; keduanya dihitung ulang secara deterministik dari `text_raw` + `NORM_VERSION` (cepat, ±7 juta karakter/detik). Bentuk normal dan stem hanya tersimpan di indeks FTS5, yang merupakan turunan dan bisa dibangun ulang ([ADR-009](../implementasi/KEPUTUSAN.md), [ARSITEKTUR-TEKNIS §3.1](../implementasi/ARSITEKTUR-TEKNIS.md)).
6. **Kebijakan persona, atribusi, dan lisensi tertulis** (lihat [05](05-kebijakan.md)). Kode berlisensi Apache-2.0. Konten turunan (teks, terjemahan dan ringkasan AI, indeks, dump) berlisensi CC BY-NC-SA 4.0, tanpa iklan, paywall, atau penjualan akses konten ([ADR-021](../implementasi/KEPUTUSAN.md), diusulkan).
7. **Label AI dan batas terjemahan.** Terjemahan dan ringkasan AI selalu berlabel. Ayat tidak pernah diterjemahkan LLM.

## Opsi yang ditolak

"Cadangan" berarti tidak dipakai sekarang, tetapi menjadi jalan keluar bila pilihan utama bermasalah.

| Opsi | Status | Alasan | ADR |
|---|---|---|---|
| Vercel (hosting) | ditolak | Menambah vendor, paket Hobby hanya untuk non-komersial, dan Cloudflare Workers Paid sudah dibayar. Anti-bot memakai Turnstile, bukan Vercel BotID. | [002](../implementasi/KEPUTUSAN.md) |
| Supabase (Postgres, Auth) | ditolak | Paket Free dijeda bila tidak aktif, Pro $25/bln, dan menjadi vendor kedua tanpa manfaat untuk korpus hanya-baca | [005](../implementasi/KEPUTUSAN.md), [016](../implementasi/KEPUTUSAN.md) |
| Postgres lewat Hyperdrive | cadangan | Hanya bila batas 10 GB per DB atau throughput single-thread D1 terlampaui. Uji FTS juga menunjukkan konfigurasi `arabic` Postgres kalah (recall 0,72, stem tidak konsisten). | [005](../implementasi/KEPUTUSAN.md) |
| Durable Objects SQLite | ditolak | Tidak ada tooling migrasi | [005](../implementasi/KEPUTUSAN.md) |
| FTS atas teks mentah, trigram sebagai indeks utama, stemmer agresif ala Larkey | ditolak | Teks mentah: harakat memecah kata. Trigram: 3,7× lebih besar dan banyak hit melenceng. Larkey merusak kata dasar (فضيله → ضيله). Lihat [riset FTS](riset/2026-10-15-pencarian-arab/README.md). | [005](../implementasi/KEPUTUSAN.md) |
| Drizzle (1.0 RC atau 0.45), Kysely | ditolak | 1.0 RC mandek dan agent rawan mencampur API v0 dan v1; 0.45 akan usang; Kysely lapisan tambahan tanpa kebutuhan nyata. Ditinjau ulang bila Drizzle 1.0 GA dan tabel aplikasi bertambah banyak. | [009](../implementasi/KEPUTUSAN.md) |
| Go | ditolak | Workers tidak menjalankan Go secara native (hanya lewat Containers/WASM), dan menambah bahasa kedua bagi agent tanpa manfaat | [007](../implementasi/KEPUTUSAN.md) |
| Python untuk ingest | ditolak | Dua implementasi normalisasi (Python dan TS) harus dijaga identik, padahal `node:sqlite` di Node 24 sudah cukup. LangExtract (Python) tetap opsional di Fase 6, terisolasi. | [007](../implementasi/KEPUTUSAN.md) |
| ESLint + Prettier | ditolak | typescript-eslint mensyaratkan TypeScript <6.1 (bentrok dengan TS 7), lambat, dan butuh banyak config | [008](../implementasi/KEPUTUSAN.md) |
| Turborepo | ditolak | `vp run` sudah cukup | [008](../implementasi/KEPUTUSAN.md) |
| Biome | cadangan | Dipakai bila Vite+ bermasalah serius | [008](../implementasi/KEPUTUSAN.md) |
| vinext | cadangan (tidak dimigrasi) | Gerbang Preview 2026-10-28: LCP ponsel halaman kitab lebih cepat, tetapi tombol aktif lebih lambat, dan LCP yang sama tampaknya bisa didapat di Next dengan menunda skrip sampai CSS selesai. | [121](../implementasi/keputusan/ADR-121.md) |
| React Router v8, TanStack Start, Astro | ditolak | Butuh port template HeroUI Pro, dan agent kurang fasih | [003](../implementasi/KEPUTUSAN.md) |
| Vercel AI SDK | tidak dipakai | Dengan satu penyedia dan pipeline tetap, lapisan tambahan ini tidak sepadan dengan risiko perubahan API-nya (3 versi mayor dalam 11 bulan). Bisa dipasang lagi bila nanti perlu banyak penyedia. | – |
| MCP sebagai route Next (`mcp-handler`) | ditolak | MCP jadi terikat ke adapter dan cold start Next, dan `mcp-handler` tidak menambah nilai di luar Next | [010](../implementasi/KEPUTUSAN.md), [011](../implementasi/KEPUTUSAN.md) |
| SDK MCP v1 (`@modelcontextprotocol/sdk`) | ditolak | Sudah dalam mode pemeliharaan | [011](../implementasi/KEPUTUSAN.md) |
| `McpAgent` (Cloudflare) | ditolak | Deprecated sejak agents 0.20 | [011](../implementasi/KEPUTUSAN.md) |
| `agents/mcp/server` (Cloudflare) | cadangan | Paket 0.x yang rilis mingguan dan mengunci versi peer. Dipakai bila nanti butuh OAuth. | [011](../implementasi/KEPUTUSAN.md) |
| Langfuse sebagai alat utama eval | cadangan | Paket Hobby hanya 2 user, UI berbahasa Inggris tanpa RTL, dan SDK belum resmi untuk Workers. Dipakai bila butuh eksperimen atau manajemen prompt. | [015](../implementasi/KEPUTUSAN.md) |
| Braintrust, Opik, Arize; AI Gateway Evaluations | ditolak | Vendor tambahan tanpa RTL; AI Gateway Evaluations sudah deprecated | [015](../implementasi/KEPUTUSAN.md) |
| Cloudflare AI Search | ditolak | Teks dipotong jadi chunk + vektor otomatis; chunking dan sitasi tidak bisa dikendalikan sampai tingkat halaman cetak. Ini justru pendekatan yang kita hindari. | [006](../implementasi/KEPUTUSAN.md) |
| Reranker Workers AI `bge-reranker-base` | ditolak | Hanya mendukung bahasa Cina dan Inggris | [006](../implementasi/KEPUTUSAN.md) |
| AI Gateway: Unified Billing, pass-through `x-api-key`, caching | ditolak | Unified Billing kena biaya 5% dan butuh kredit prabayar. Pada pass-through, spend limit gateway tidak berlaku. Caching hanya exact-match dan volatil, jadi cache jawaban dibuat sendiri di D1. | [013](../implementasi/KEPUTUSAN.md) |
| Bot Fight Mode | ditolak | Tidak bisa dikecualikan dan memblokir klien MCP | [014](../implementasi/KEPUTUSAN.md) |
| LangChain / LangGraph | ditolak | Lapisannya banyak dan tracing-nya condong ke LangSmith. Setelah perombakan v1, AI coding agent sering mencampur kode lama dan baru. | – |
| Milvus | ditolak | Berlebihan: korpus kurikulum muat di satu DB D1, dan vektor pun ditunda. Operasinya berat (etcd, object storage, banyak node). | – |
| HelixDB | ditolak | Masih muda: bahasa query dirombak dua kali di 2026, ada migrasi penyimpanan satu arah, dan analyzer BM25 tidak mendukung Arab. "Graf" kita cukup disimpan sebagai tabel relasi. | – |
| Library PageIndex | ditolak | Nilai utamanya membuat pohon dari PDF, padahal pohon kita sudah ada. Kita pakai idenya saja. | – |
| OpenKB sebagai fondasi | ditolak | Wiki disimpan sebagai file, kompilasi ulang menimpa editan manual (koreksi ustadz hilang), dan klaim tidak punya sumber per butir. Cocok untuk eksperimen saja. | – |
| LlamaIndex TS | ditolak | Sudah diarsipkan (April 2026) | – |
| ConDB sebagai dependensi | ditolak | Masih muda (±65 bintang), Python, hanya mendukung Anthropic/OpenAI, dan benchmark-nya di pohon kode. Kita ambil idenya saja: prompt ramah cache dan strategi *block* untuk pohon besar. | – |
| Helicone | ditolak | Sudah masuk mode maintenance setelah diakuisisi | – |
