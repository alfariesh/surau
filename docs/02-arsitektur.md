# 02 · Arsitektur

## Gambaran berlapis

```
Permukaan   : Web app (UI terstruktur) · MCP publik · Dump data terbuka
Agen        : Riset umum · Ruang al-Ghazali · Fiqh Syafi'i · Verifikator (subagen)
Core Tools  : daftar_isi · baca_bagian · cari · entitas · cek_kutipan · status_hadits
Wiki        : tokoh · karya · istilah · ayat · hadits · qaul · masalah/hukum
              (tiap fakta: sumber + status review)
Korpus      : teks asli, tidak pernah diubah (ID kanonik + permalink per bagian)
───────────────────────────────────────────────────────────────────────────
Kepercayaan : eval per agen · antrean review ustadz · dewan pengawas · log koreksi
```

### Gagasan kunci

- **Agen = cakupan kitab + prompt + tools + set eval.** "Ruang al-Ghazali" bukan sistem terpisah. Ia hanya konfigurasi di atas fondasi yang sama. Ruang tokoh atau ruang bidang lain ditambahkan dengan cara yang sama.
- **Core Tools adalah satu-satunya pintu ke data.** Agen di web dan server MCP memanggil fungsi yang sama, sehingga aturan keamanan cukup ditulis sekali.
- **Retrieval ala PageIndex, dibangun sendiri.** Kitab Shamela sudah punya pohon daftar isi. Agen menelusuri pohon itu (`daftar_isi`), membaca bagian secara utuh (`baca_bagian`), lalu memakai pencarian hibrida (`cari`) untuk topik yang tersebar di banyak bab.
- **Verifikator.** Sebelum jawaban tampil, setiap kutipan dicocokkan ke teks sumber oleh kode, dan setiap hadits dicocokkan ke takhrij-nya.

## Stack pilihan

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Bahasa | TypeScript, satu monorepo | Satu bahasa untuk aplikasi, agen, dan MCP. Ekstraksi wiki boleh memakai Python (lihat 04) dengan database sebagai batasnya. |
| LLM | **Claude Haiku 5.5** (sementara), lewat SDK resmi `@anthropic-ai/sdk` (aplikasi) dan `anthropic` Python (ingest batch) | Kita butuh fitur khusus Claude: Citations, prompt caching, Message Batches, `count_tokens`, dan effort. Semua panggilan dibungkus satu modul tipis supaya model atau penyedia lain bisa ditambahkan nanti. |
| Web + UI | Next.js (streaming langsung dari route handler) | Vercel AI SDK **tidak lagi wajib**. Dengan satu penyedia dan pipeline tetap, lapisan tambahan itu tidak sepadan dengan risiko perubahan API-nya (3 versi mayor dalam 11 bulan). Bisa dipasang lagi bila nanti perlu banyak penyedia. |
| Database | Postgres (Supabase) | Pohon kitab (`parent_id`), full-text konfigurasi `arabic` di kolom ternormalisasi, pgvector untuk embedding. Supabase open source dan bisa di-host sendiri. |
| Eval + tracing | Langfuse (+ skrip eval TS) | SDK Langfuse untuk TS/Python atau OpenTelemetry, dataset, antrean anotasi untuk ustadz, paket gratis untuk awal |
| MCP | `@modelcontextprotocol/sdk` (v1.32) + `mcp-handler` (v2.3) | Server MCP berjalan sebagai route di aplikasi yang sama: publik, hanya-baca, dibatasi kuotanya |
| Ekstraksi wiki | LangExtract (Python, v1.7) | Setiap hasil ekstraksi tertaut ke posisi karakter di sumber, dan hasil karangan otomatis ditolak (lihat 04) |
| Decision model | TypeSafe Jev (**opsional**, diuji di v1b) | Dengan Haiku 5.5, routing oleh Haiku lebih murah. Jev hanya diuji untuk gerbang "tidak ditemukan" yang terkalibrasi dan untuk cek sitasi. Wajib lolos eval Arab/Indonesia (lihat 08). |
| Hosting | Vercel (aplikasi), Supabase (DB) | Jalur paling mulus. Semua bagian bisa dipindah ke hosting sendiri. |

### Model AI: pilihan v1 + pembanding lewat eval

**Pilihan v1 (sementara): Claude Haiku 5.5** untuk jawaban dan semua ingest. Alasan dan aturan pakainya ada di [08 Biaya](08-biaya.md#pilihan-model-v1-claude-haiku-55): batas 100k token per prompt, effort `low`, Citations dengan dokumen *custom content*, dan fallback saat terjadi refusal.

| Peran | Kandidat yang diuji |
|---|---|
| LLM pembaca/penjawab | **Haiku 5.5 (v1)**. Pembanding: Sonnet 5.5 (eskalasi dan fallback refusal), lalu Gemini 3.1 Pro dan GPT-5.5 (eval berkala per kuartal) |
| Embedding | BGE-M3 (baseline), Qwen3-Embedding, Gemini Embedding 2 |
| Reranker (bila perlu) | Qwen3-Reranker-4B, Cohere Rerank 4 |

Di desain ini model **membaca teks**, bukan menjawab dari hafalan. Yang paling penting adalah kesetiaan pada teks, pemahaman bacaan Arab klasik, dan kualitas bahasa Indonesia. Itu hanya bisa diukur dengan eval kita sendiri.

### Tiga mode layanan (tangga biaya)

| Mode | Isi | Butuh LLM per pertanyaan? |
|---|---|---|
| **Cari** | Pencarian kata kunci Arab + ringkasan Indonesia, navigasi pohon, kartu wiki | Tidak (hanya decision model, ±$0,0006) |
| **Jawab** | Pipeline tetap: retrieval → 1 panggilan LLM → verifikasi | Ya, 1 panggilan (±$0,003 model murah / ±$0,03 frontier) |
| **Analisis mendalam** | Agen bebas dengan model kuat, khusus pengguna login, berkuota | Ya, beberapa putaran |

Ditambah **MCP**: pengguna memakai AI miliknya sendiri, sehingga Surau hanya melayani query database. Rincian biaya ada di [08 Biaya](08-biaya.md).

## Opsi yang ditolak

| Opsi | Alasan |
|---|---|
| LangChain / LangGraph | Lapisannya banyak dan tracing-nya condong ke LangSmith. Setelah perombakan v1, AI coding agent sering mencampur kode lama dan baru. |
| Milvus | Berlebihan. Seluruh Shamela pun masih dalam jangkauan Postgres, dan operasinya berat (etcd, object storage, banyak node). |
| HelixDB | Masih muda: bahasa query dirombak dua kali di 2026, ada migrasi penyimpanan satu arah, dan analyzer BM25 tidak mendukung Arab. "Graf" kita cukup disimpan sebagai tabel relasi. |
| Cloudflare AI Search | Teks dipotong jadi chunk + vektor otomatis dengan kontrol minim untuk Arab. Ini justru pendekatan yang kita hindari. |
| Library PageIndex | Nilai utamanya membuat pohon dari PDF, padahal pohon kita sudah ada. Kita pakai idenya saja. |
| OpenKB sebagai fondasi | Wiki disimpan sebagai file, kompilasi ulang menimpa editan manual (koreksi ustadz hilang), dan klaim tidak punya sumber per butir. Cocok untuk eksperimen saja. |
| LlamaIndex TS | Sudah diarsipkan (April 2026). |
| ConDB sebagai dependensi | Masih muda (±65 bintang), Python, hanya mendukung Anthropic/OpenAI, dan benchmark-nya di pohon kode. Kita ambil idenya saja: prompt ramah cache dan strategi *block* untuk pohon besar. |
| Helicone | Sudah masuk mode maintenance setelah diakuisisi. |

## Ukuran data (diukur 15 Okt 2026)

| Data | Ukuran |
|---|---|
| Ihya (teks utama) | ±1,8 juta token (2,1 juta dengan takhrij) |
| Median satu bab Ihya | ±2.800 token; 90% bab < 16 ribu token |
| ±92 kitab dari daftar kurikulum | ±98 juta token, sekitar 200–400 ribu potongan |
| Seluruh Shamela | ±7,5 juta halaman. Masih bisa ditangani Postgres + pgvectorscale bila suatu saat diperlukan. |

## MCP

- **Tools yang dibuka:** `daftar_isi`, `baca_bagian`, `cari`, `entitas`, `cek_kutipan`, `status_hadits`. Semuanya hanya-baca.
- **Ekonomi nirlaba:** lewat MCP, biaya model AI ditanggung oleh AI milik pengguna. Surau hanya melayani query database yang murah. Bagian termahal adalah chat publik di situs Surau sendiri.
- **Keterbatasan:** jawaban akhir ditulis oleh model milik pengguna, sehingga verifikasi kutipan tidak bisa dipaksakan. Mitigasinya:
  - Setiap tool mengembalikan teks verbatim + permalink + objek sitasi.
  - Tool `cek_kutipan` tersedia untuk AI mana pun.
  - Instruksi server menjelaskan aturan kutipan.
  - Keterbatasan ini dijelaskan terbuka di dokumentasi publik.

## Yang harus benar sejak v1

1. **ID kanonik dan permalink untuk setiap bagian.** Pakai URI OpenITI bila ada, misalnya `0505Ghazali.IhyaCulumDin`.
2. **Sumber dan status review di setiap fakta wiki.**
3. **Core Tools sebagai satu-satunya pintu.**
4. **Skema multi-karya dan multi-sumber** (Shamela + OpenITI), meskipun v1 baru berisi Ihya.
5. **Teks mentah dan teks ternormalisasi disimpan berdampingan,** lengkap dengan peta offset antara keduanya.
6. **Kebijakan persona, atribusi, dan lisensi tertulis** (lihat 05).
