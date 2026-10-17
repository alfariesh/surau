# 08 · Biaya & Keberlanjutan

> Konteks: Surau dibangun satu pemilik bersama AI agent, nirlaba, dan belum punya pendanaan. Targetnya: **biaya operasional bisa ditutup dari donasi kecil**, dan aplikasi **tetap berfungsi walaupun anggaran AI habis**.

## Ringkasan

| | Biaya per pertanyaan | 10.000 pertanyaan/bulan* |
|---|---|---|
| Agen bebas + model frontier (desain naif; tanpa campuran: setiap pertanyaan memakai agen) | ±$0,10–0,20 | ±$1.000–2.000 |
| **Desain Surau v1: Claude Haiku 5.5 + Citations** | **±$0,0027** | **±$10,7** |
| Desain hemat + model frontier (Sonnet 5.5 / Gemini 3.1 Pro) | ±$0,05–0,06 | ±$210–225 |
| Mode Cari (FTS5 di D1, tanpa LLM) | ±$0, masuk kuota Workers Paid | ±$0 |
| Lewat MCP (AI milik pengguna) | ±$0 untuk Surau | ±$0 |
| Infrastruktur tetap (Cloudflare + domain) | – | ±$6/bulan |

\*Kecuali baris desain naif, dengan campuran lalu lintas: 30% dilayani dari jawaban terverifikasi, 30% mode Cari, 40% mode Jawab. Memakai faktor token Arab **terukur 1,84** (Claude Haiku 5.5, S13; lihat di bawah). Sebelum S13 rentangnya dihitung dengan asumsi 1,0–2,0. Mode Cari dihitung $0 (FTS5 di D1, masuk kuota Workers Paid; `CARI_PAKAI_JEV = False` di kalkulator). Kualitas Haiku 5.5 untuk Arab klasik **belum diuji**; eval yang memutuskan apakah ia cukup.

Penghematan terbesar **bukan dari memilih model termurah**, tetapi dari desain:
1. Sebagian besar pertanyaan tidak perlu LLM.
2. Pekerjaan mahal dibayar sekali di depan, bukan setiap pertanyaan.
3. Kutipan Arab tidak ditulis ulang oleh model.

## Pilihan model v1: Claude Haiku 5.5

Diputuskan 15 Okt 2026, **sementara**: Claude Haiku 5.5 (`claude-haiku-5-5`) dipakai untuk mode Jawab dan untuk semua ingest (lihat ADR-013 di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md)).

**Alasan:**
- **Murah:** $0,10 input / $0,50 output per juta token untuk prompt ≤100k token. Baca cache $0,01 (0,1× input), tulis cache 5 menit $0,125.
- **Ingest lewat Message Batches diskon 50%,** dan diskon ini **bertumpuk dengan caching**: input $0,05, output $0,25, baca cache $0,005.
- **Citations bawaan Claude** (tersedia di semua model aktif). Bagian kitab dikirim sebagai dokumen; Claude mengembalikan kutipan yang diambil langsung dari dokumen itu, lengkap dengan lokasinya.
  - `cited_text` **tidak ditagih sebagai token output**, jadi kutipan Arab yang boros token tidak menambah biaya.
  - Citations bisa dipakai bersama prompt caching dan batch.
  - Citations **tidak bisa** dipakai bersama structured outputs. Karena itu jawaban berbentuk teks + blok sitasi, sedangkan structured outputs dipakai untuk ingest.

**Aturan pakai** (wajib, ADR-013):
- **Batas keras 100k token per prompt, termasuk token baca dan tulis cache.** Di atas itu semua tarif naik 5× (input $0,50, baca cache $0,05, output $2,50). Hitung token dengan endpoint `count_tokens` dan pecah bagian kitab yang terlalu panjang.
  - **Jawab dibatasi ±40k token input** (`JAWAB_MAX_INPUT_TOKENS`), jauh di bawah batas. Skenario C di bawah memakai ±21k.
  - Mode "analisis mendalam" (baru ada setelah login, ADR-016) dibatasi ±90k.
- **Effort `low` diset eksplisit** (`output_config.effort`) untuk jawaban dan ingest. Default Haiku 5.5 adalah `medium`. Thinking adaptif aktif secara default dan ditagih sebagai output; jangan kirim `budget_tokens`. Naikkan effort hanya bila eval menunjukkan perlu. `max_tokens` harus menyisakan ruang untuk thinking.
- **Jangan kirim `temperature`, `top_p`, atau `top_k`** (nilai non-default → error 400), dan **jangan memakai prefill** assistant (400). Format jawaban diatur lewat instruksi sistem.
- **Dokumen Citations memakai format *custom content*:** satu blok = satu paragraf kitab dengan ID-nya. Teks Arab klasik sering minim tanda baca, sehingga pemotongan per kalimat otomatis tidak bisa diandalkan.
  - Indeks blok yang dikutip dipetakan ke ID paragraf di DB.
  - UI menampilkan teks dari DB.
  - String match tetap dijalankan sebagai pengaman kedua.
- **Tokenizer:** Haiku 5.5 menghitung teks sekitar 30% lebih banyak daripada Haiku 4.5. Token **Arab** Ihya di tokenizer Claude Haiku 5.5 **terukur 0,716 token/karakter = 1,84× o200k** (S13, `count_tokens` pada 200 paragraf acak; [data/reports/ihya-9472-token.md](../data/reports/ihya-9472-token.md)). Angka di bawah memakai faktor 1,84.
- **Penolakan (refusal):** Haiku 5.5 **tidak punya fallback di server**, dan parameter `fallbacks` tidak boleh dikirim. Bila `stop_reason` bernilai `"refusal"`, misalnya karena salah deteksi pada bab jihad atau hudud, ulangi di sisi klien dengan `claude-sonnet-5-5` atau tampilkan bagian kitabnya saja (mode Cari). Satu ulangan ke Sonnet 5.5 berbiaya ±$0,036–0,055, sekitar 19× jawaban Haiku, jadi ledger mereservasi dengan harga Sonnet sebelum mengulang.
- **Jalur panggilan:** panggilan online (workspace `surau-prod`) lewat Cloudflare AI Gateway `surau-gw` (tanpa payload di log, custom cost, rate limit global) **setelah** uji passthrough Citations, streaming, dan `cache_control` lolos di S19. Bila gagal, panggil `api.anthropic.com` langsung. Message Batches selalu langsung ke Anthropic dari skrip lokal (workspace `surau-dev`).
- **Risiko satu vendor:** panggilan model dibungkus satu modul tipis. Setiap kuartal, eval dijalankan ulang terhadap Sonnet 5.5 dan satu model non-Claude.

**Biaya (keluaran `scripts/hitung_biaya.py`):**

| | Faktor token Arab terukur 1,84 (S13) | Sebelumnya (asumsi 1,0–2,0) |
|---|---|---|
| Per jawaban (C. Haiku + Citations) | $0,0027 | $0,0019–0,0028 |
| 10 ribu pertanyaan/bulan (campuran) | $10,67 | $7,46–11,28 |
| Ulangan refusal ke Sonnet 5.5 (per kejadian) | $0,0523 | $0,0362–0,0553 |
| **Ingest Ihya lengkap:** ringkasan, terjemahan Indonesia penuh, ekstraksi wiki | **$3,21** (perkiraan kalkulator; aktual S13 untuk terjemahan + ringkasan saja: $4,48, di bawah) | $0,92–1,28 |
| Ingest ±92 kitab kurikulum | $174,54 | $50,23–69,83 |

Artinya: **terjemahan dan ringkasan AI untuk seluruh Ihya cukup dibayar sekali, dengan biaya aktual $4,48** (S13, 17 Okt 2026; rincian di bawah). Perkiraan awal $0,47–0,56 untuk terjemahan terlalu rendah karena belum menghitung prompt sistem yang diulang per paragraf (±4.300 token, glosarium), konteks paragraf sebelumnya, thinking, dan faktor token Arab yang ternyata 1,84. Terjemahan per paragraf dibuat sekali, disimpan, diberi label "terjemahan AI", dan bisa direview. Ayat Al-Qur'an yang dikenali pencocok tidak ikut diterjemahkan LLM: terjemahannya diambil verbatim dari Kemenag (ADR-020; sisa risiko ayat yang luput: ADR-042). Jawaban tidak perlu menerjemahkan ulang, sehingga semakin murah dan konsisten.

**Kredit AWS:** program nirlaba AWS (lihat bawah) bisa dipakai untuk Haiku 5.5 di Amazon Bedrock (`anthropic.claude-haiku-5-5`), tetapi **hanya untuk panggilan online** (Jawab). **Message Batches tidak tersedia di Bedrock**, jadi ingest batch tetap langsung ke Anthropic (ADR-013). Catatan:
- Harga Claude di Bedrock ditetapkan AWS dan bisa berbeda dari tabel di bawah.
- Spend limit workspace Anthropic (lapis 1 pengaman) tidak berlaku di Bedrock; rem setara di AWS perlu dirancang bila jalur ini dipakai.
- Claude Platform on AWS (dioperasikan Anthropic) mendukung Message Batches. Apakah kredit AWS nirlaba berlaku di sana **belum diverifikasi**.

## Prinsip hemat

1. **Tangga biaya.** Selalu coba langkah termurah dulu: jawaban terverifikasi (cache) → wiki/DB → mode Cari → mode Jawab murah → mode Jawab kuat.
2. **Bayar sekali, pakai berkali-kali.** Ringkasan per bagian, glosarium istilah, entitas wiki, dan **terjemahan per paragraf** dibuat sekali secara batch (diskon 50%), disimpan, lalu dipakai oleh semua pengguna.
3. **Kode menyalin, model menunjuk.** Model hanya mengeluarkan ID bagian dan penjelasan berbahasa Indonesia. Teks Arab, yang boros token, disisipkan oleh kode. Ini sekaligus menjamin kutipan verbatim.
4. **Pipeline tetap, bukan agen bebas.** Satu panggilan LLM per jawaban lebih murah dan lebih bisa diprediksi daripada loop agen berputaran-putaran. Agen bebas hanya untuk mode "analisis mendalam" berkuota (setelah login).
5. **Prompt caching.** Instruksi sistem dan daftar isi diletakkan di awal prompt supaya bisa di-cache (baca cache ±10% dari input biasa; tulis cache 5 menit 1,25×). Ini ide inti ConDB ("KV-cache native"). Cache jawaban sendiri disimpan di D1, bukan di caching AI Gateway.
6. **Turun kelas dengan anggun.** Bila anggaran habis, sakelar dimatikan, atau penyedia gagal (429, 400, 5xx), mode Jawab mati otomatis dan Surau tetap berjalan sebagai mesin pencari kitab.
7. **MCP untuk pengguna berat.** Pengguna yang sudah punya AI sendiri memakai korpus Surau lewat MCP, sehingga biaya modelnya tidak ditanggung Surau. MCP dirilis sebelum Jawab (ADR-019).

## Alur satu pertanyaan (desain hemat)

```
Pertanyaan
 │
 ├─0. Pengaman: sakelar Jawab, cookie Turnstile, kuota, reservasi ledger (D1)  $0
 ├─1. Cek jawaban terverifikasi (cache D1)                     $0
 ├─2. Retrieval: FTS5/BM25 di D1 (Arab ternormalisasi
 │     + terjemahan/ringkasan Indonesia)                       $0
 ├─3. Haiku memilih bagian dari daftar isi (di-cache)
 │     + niat pertanyaan (wiki / Cari / Jawab)                ~$0,0003
 │     ├─ tokoh / istilah / status hadits → kartu wiki (DB)  $0
 │     ├─ tidak ada yang relevan → "tidak ditemukan"
 │     └─ "jelaskan / apa kata …?" → lanjut ↓
 ├─4. Jawab: Haiku + Citations (bagian kitab sebagai dokumen;
 │     kutipan Arab tidak ditagih sebagai output)             ~$0,0016
 ├─5. Verifikasi: kutipan dipetakan ke ID paragraf + string match (kode)  $0
 └─6. Komit biaya aktual ke ledger, simpan ke answer_log; jawaban populer
       masuk antrean review ustadz (/tinjau) → jawaban terverifikasi

Opsional (tidak dijadwalkan di Fase 0–4; bisa diusulkan lewat ADR baru bila metrik
penolakan/cek sitasi di eval Jawab kurang): Jev sebagai gerbang "tidak ditemukan" yang
terkalibrasi dan sebagai cek sitasi mendukung/bertentangan (~$0,0003–0,0013 per pertanyaan).
```

## Harga acuan (dicek 15 Okt 2026)

Harga dalam USD per 1 juta token: input / baca cache / output.

| Model | Harga | Catatan |
|---|---|---|
| Claude Haiku 5.5 | 0,10 / 0,01 / 0,50 | Untuk prompt ≤100k token (termasuk cache). Di atasnya 0,50 / 0,05 / 2,50. Tulis cache 5 menit 0,125. |
| GPT-6 Luna | 0,10 / 0,01 / 0,50 | |
| Gemini 3.1 Flash-Lite | 0,25 / 0,025 / 1,50 | |
| Gemini 3.8 Flash | 0,75 / 0,075 / 3,75 | **Naik 2× pada 1 Jan 2027** |
| Claude Sonnet 5.5 | 2 / 0,10 / 10 | Baca cache **0,10** (bukan 0,20), dicek ke halaman resmi. Tulis cache 5 menit 2,50. |
| Gemini 3.1 Pro | 2 / 0,20 / 12 | |
| Claude Opus 5.5 | 4 / 0,20 / 20 | Tulis cache 5 menit 5,00. |
| GPT-5.5 | 5 / 0,50 / 30 | |
| DeepSeek V4 Flash (DeepInfra) | 0,06 / 0,015 / 0,18 | Open-weight |
| Qwen3.7-Flash (≤32k) | 0,03 / – / 0,13 | |
| **TypeSafe Jev** (decision model) | **0,042 input, output gratis** | Konteks 64k/permintaan, 32k/pertanyaan, maks. 255 opsi |

Harga Claude bersumber dari https://platform.claude.com/docs/en/about-claude/pricing; rincian lengkap (tulis cache, batch, tarif >100k) ada di [implementasi/STACK.md](../implementasi/STACK.md#harga-acuan-untuk-kalkulator-dan-ledger).

**Lainnya:**
- **Embedding** (ditunda sampai eval membuktikan perlu, ADR-006):
  - `bge-m3` dan `qwen3-embedding-0.6b` di Workers AI: $0,012 per juta token, 1024 dimensi. Ini pilihan pertama bila embedding diaktifkan.
  - Voyage-4: $0,06/M, dengan 200 juta token gratis.
  - Gemini Embedding 2: $0,20/M ($0,10/M batch).
- **Reranker:**
  - Voyage rerank-3: $0,05/M, dengan 200 juta token gratis.
  - Qwen3-Reranker-8B (DeepInfra): $0,05/M.
  - Cohere Rerank 4: $2 per 1.000 pencarian.
  - `bge-reranker-base` di Workers AI hanya mendukung Cina/Inggris, jadi tidak dipakai (ADR-006).
- **Diskon batch 50%** di Gemini, Anthropic, OpenAI, dan Qwen. Ini untuk semua pekerjaan offline.

Sumber dan rincian ada di [catatan riset](riset/2026-10-15-catatan-riset.md). Angka baca cache Sonnet 5.5 di catatan riset sudah dikoreksi menjadi $0,10. Kalkulator: `python3 scripts/hitung_biaya.py`. Kalkulator ini satu-satunya skrip Python di repo (pengecualian dari ADR-007); boleh diport ke TypeScript nanti.

### Hitungan per pertanyaan (keluaran kalkulator, faktor 1,84)

Faktor 1,84 terukur untuk Claude Haiku 5.5 (S13) dan dipakai untuk semua baris; tokenizer model lain belum diukur.

| Model | A. Agen 3 putaran | B. Pipeline + Jev | C. Model routing sendiri + Citations |
|---|---|---|---|
| Qwen3.7-Flash | $0,0020 | $0,0020 | $0,0011 |
| DeepSeek V4 Flash (DeepInfra) | $0,0030 | $0,0025 | $0,0015 |
| **Claude Haiku 5.5** / GPT-6 Luna | $0,0051 | $0,0034 | **$0,0027** |
| Gemini 3.1 Flash-Lite | $0,0132 | $0,0069 | $0,0070 |
| Gemini 3.8 Flash | $0,0383 | $0,0176 | $0,0200 |
| Gemini 3.8 Flash (mulai Jan 2027) | $0,0767 | $0,0339 | $0,0400 |
| Claude Sonnet 5.5 | $0,1003 | $0,0446 | $0,0523 |
| Gemini 3.1 Pro | $0,1059 | $0,0464 | $0,0561 |
| Claude Opus 5.5 | $0,2005 | $0,0879 | $0,1046 |
| GPT-5.5 | $0,2646 | $0,1141 | $0,1403 |

Asumsi token:
- **A:** 20k token dari cache + 24k token baru + 1,8k output.
- **B:** 2k dari cache + 10k baru + 0,8k output + 30k token Jev.
- **C:** 10,5k dari cache (sistem + daftar isi) + 10,6k baru + 1,4k output termasuk thinking. Kutipan Citations tidak dihitung. Tulis cache tidak dimodelkan.

Untuk model murah seperti Haiku, C adalah pilihan termurah. Untuk model mahal, B (routing oleh Jev) lebih murah.

Jumlah token dasar diukur dengan tokenizer OpenAI (o200k) pada teks Ihya, lalu dikali `FAKTOR_TOKEN_ARAB` = **1,84** yang diukur di S13 dengan `count_tokens` Claude Haiku 5.5 (0,716 vs 0,39 token per karakter). Tokenizer Gemini dan model lain belum diukur.

> Catatan: untuk model yang sangat murah (Qwen, Haiku), routing lewat Jev **tidak lebih murah** daripada membiarkan model menavigasi sendiri. Nilai Jev ada di **probabilitas terkalibrasi** (berani bilang "tidak ditemukan") dan **verifikasi sitasi yang murah**, bukan semata penghematan.

## Biaya tetap bulanan

Semua komponen berjalan di Cloudflare: tiga Worker (`surau-web`, `surau-mcp`, `surau-api`), D1, R2, Turnstile, AI Gateway, dan Rate Limiting (lihat ADR-002, ADR-005, dan ADR-010 di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md)). Pemilik **sudah membayar Workers Paid $5/bulan**, dan paket itu sudah mencakup kuota berikut:

| Termasuk di Workers Paid | Per bulan | Di atas kuota |
|---|---|---|
| Workers | 10 juta request, 30 juta CPU-ms | $0,30/juta request, $0,02/juta CPU-ms |
| D1 | 25 miliar baris dibaca, 50 juta baris ditulis, 5 GB | $0,001/juta dibaca, $1,00/juta ditulis, $0,75/GB-bulan |
| R2 | 10 GB, egress $0 | $0,015/GB-bulan |
| Workers AI | 10 ribu neuron **per hari** | $0,011 per 1.000 neuron |
| Log & trace (mulai 1 Des 2026) | 50 GB ingest, 10 GB-bulan simpan | $0,25/GB ingest, $0,10/GB-bulan |

Sampai 30 Nov 2026, Workers Logs masih dihitung per event: 20 juta event/bulan termasuk, lalu $0,60 per juta.

| Komponen | v1 (Ihya) | Setelah berkembang (±92 kitab) |
|---|---|---|
| Cloudflare Workers Paid (Worker, D1, R2) | $5, sudah dibayar. Ihya: tabel dasar 11 MB + indeks FTS5 ±6,9 MB (skema terpilih: paragraf, norm+stem, *contentless*), jauh di bawah kuota. | ±$5–10. Indeks FTS5 ±0,37–0,68 GB + teks mentah ±0,5–0,95 GB, jadi korpus ±1–1,6 GB per versi dan muat di satu DB (ADR-005). DB korpus lama yang disimpan untuk rollback (*blue-green*) ikut dihitung sebagai storage, jadi hapus versi yang tidak diperlukan lagi. |
| Log & trace (Workers Logs, Traces, log AI Gateway) | $0 bila di bawah kuota (traces sampling 0,1, log AI Gateway tanpa payload) | $0 bila di bawah kuota; dipantau |
| AI Gateway (analytics, rate limit, spend limit) | $0 | $0 |
| Turnstile, Web Analytics, Cloudflare Access untuk `/admin` dan `/tinjau` | $0 | $0 (batas pengguna gratis Access belum diverifikasi; dicek di S18) |
| Vectorize + embedding Workers AI | $0, ditunda (ADR-006) | ±$4 bila diaktifkan (±330 ribu vektor 1024 dimensi, 100 ribu query/bulan) |
| Email magic link (bila login ditambahkan, ADR-016) | – | $0 sampai 3.000 email/bulan (Cloudflare Email Service, masih beta) |
| Eval & anotasi | $0, dibangun sendiri (`tools/eval` + `/tinjau`, ADR-015). Langfuse tidak dipakai. | $0 |
| CI/CD (GitHub Actions) | $0 untuk repo publik. Selama repo privat (P-1), CI memakai kuota menit gratis akun (sekitar 2.000 menit/bulan untuk akun Free; angka pasti dicek di GitHub → Settings → Billing). | idem |
| Domain | ±$1 | ±$1 |
| **Total** | **±$6** | **±$6–15** |

**Workers Builds tidak dipakai** (ADR-017). Build dan deploy berjalan di GitHub Actions, jadi kuota build Workers Paid (6.000 menit/bulan) tidak terpakai dan tidak menambah biaya. Bila kelak dipakai sebagai cadangan, kelebihannya $0,005 per menit.

Belum diverifikasi: apakah Rate Limiting binding dikenai biaya (halaman harganya tidak mencantumkan apa pun), dan bagaimana baris tabel bayangan FTS5 dihitung sebagai "baris dibaca" D1. Catat `meta.rows_read` setiap query dan pasang budget alert.

## Biaya sekali bayar (batch, diskon 50%)

**Terukur di S13 (Ihya, Message Batches Claude Haiku 5.5, 17 Okt 2026):**

| Pekerjaan | Request | Biaya aktual | Estimasi rencana (cache 95% / 50%) |
|---|---|---|---|
| Terjemahan Indonesia per paragraf (16.086 dari 16.111 lolos; 274 dibuat Sonnet 5.5) | 17.130 (termasuk ulangan dan kirim ulang sesudah tiga putaran perbaikan pencocok/validasi; batch ulangan Sonnet/campuran ±$1,40) | **$3,35** | $2,16 / $5,15 (sebelum ulangan) |
| Ringkasan ID + EN per bagian (626/626, dua putaran) | 1.349 (termasuk putaran 2 ulang sesudah ringkasan anak berubah) | **$1,08** | $0,54 / $0,68 |
| Uji kecil lewat API biasa (langkah 5, 2 × 30 request) | 60 | $0,05 | – |
| **Total** | 18.539 | **$4,48** | disetujui pemilik ±$6 (batas berhenti $7,20) |

Cache prompt sistem di batch terbaca **±100%** (bukan 30–98% seperti peringatan docs). Biaya terbesar justru keluaran (thinking + terjemahan, ±0,97 token per karakter Arab) dan ulangan Sonnet untuk paragraf sulit. Rincian per batch: [data/reports/ihya-9472-terjemahan.md](../data/reports/ihya-9472-terjemahan.md).

**Perkiraan kalkulator untuk pekerjaan berikutnya** (Haiku 5.5, faktor 1,84, cache prompt sistem 95%; rasio terjemahan dan ringkasan dari S13):

| Pekerjaan | Ihya (±1,8 juta token o200k) | ±92 kitab kurikulum (±98 juta token) |
|---|---|---|
| Embedding (ditunda, ADR-006; Workers AI $0,012/juta token) | < $0,05; muat dalam kuota gratis harian (±9 juta token/hari) | ±$1 |
| Ringkasan Indonesia + Inggris per bagian | $0,53 (aktual S13: $1,08 dengan putaran 2 ulang) | ±$29 |
| Terjemahan Indonesia per paragraf | $2,19 (aktual S13: $3,35 dengan ulangan) | ±$119 |
| Ekstraksi wiki TS-native, 2 putaran (ADR-007) | $0,48 (asumsi, belum diukur) | ±$26 |
| Satu putaran eval (100 soal × 3 model frontier) | ±$25–30 (perkiraan awal, dihitung ulang di S18) | — |

Untuk ±92 kitab, satu request per paragraf membuat prompt sistem mendominasi; menggabungkan beberapa paragraf per request (ADR-043, "tinjau ulang") bisa memangkas biaya terjemahan beberapa kali lipat.

## Pengaman anggaran

Desain lengkap ada di ADR-014 ([implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md)) dan dibangun di S20 (Fase 4). Prinsipnya: rem keras di penyedia, rem harian di edge, akuntansi real-time di aplikasi, dan sakelar manual.

**Empat lapis rem biaya:**

| Lapis | Di mana | Cara kerja | Bila tercapai |
|---|---|---|---|
| 1. Spend limit workspace | Anthropic Console | Dua workspace, masing-masing dengan spend limit bulanan dan API key sendiri: `surau-dev` untuk batch dan eval lokal (limit ±$40) dan `surau-prod` untuk panggilan online (limit ±$25). **Auto-reload OFF.** | API menolak permintaan (menurut laporan pengguna berupa 400, bukan 429; belum terdokumentasi resmi) → turun ke Cari |
| 2. Spend limit harian | AI Gateway `surau-gw` | Anggaran dolar per hari (contoh: $3, fixed). Sifatnya *best-effort* dan *eventually consistent*, jadi bukan satu-satunya rem. Kirim header `cf-aig-custom-cost` dengan tarif Haiku. | 429 → turun ke Cari |
| 3. Ledger anggaran | D1 `surau-app` | Sebelum memanggil LLM, biaya maksimum direservasi dengan satu `UPDATE … WHERE spent+reserved+est <= cap RETURNING` yang atomik. Setelah respons, biaya aktual dari `usage` dikomit. Cron tiap 10 menit melepas reservasi basi. | Jawab ditolak → hasil Cari |
| 4. Kill switch | D1 `settings.jawab_enabled`, diubah dari `/admin` (Cloudflare Access) | Pemilik mematikan Jawab secara manual. | Jawab mati, situs tetap berjalan sebagai Cari |

- **Plafon:** usulan $20/bulan dan 10 Jawab/hari per pengunjung (P-4, menunggu pemilik). Ledger memakai plafon ini; spend limit workspace dipasang sedikit di atasnya (contoh riset: $25) sebagai rem cadangan.
- Spend cap Anthropic direset tanggal 1 tiap bulan kalender, jadi ledger juga memakai bulan kalender UTC.
- **Setiap kegagalan penyedia** (429, 400, 5xx, "credit balance is too low") turun dengan anggun ke mode Cari, bukan error 500.
- Pasang **budget alert** penggunaan D1, Workers AI, dan Vectorize di dashboard Cloudflare.

**Anti-bot dan kuota:**
- **Turnstile** mode Managed (gratis, challenge tak terbatas), hanya di Jawab. Turnstile menggantikan Vercel BotID dari rancangan lama. Token Turnstile berlaku 300 detik dan sekali pakai, sehingga ditukar menjadi cookie anonim bertanda tangan HMAC selama 24 jam. Penyalahgunaan oleh bot adalah risiko biaya terbesar.
- **Burst:** Rate Limiting binding per anon-id (contoh: 3 Jawab per 60 detik). Binding ini hanya cocok untuk burst (periode 10 atau 60 detik, dihitung per lokasi).
- **Kuota harian:** counter atomik di D1 per anon-id (usulan 10/hari) **dan** per HMAC(IP + salt harian) dengan batas longgar (contoh: 30/hari, karena banyak pengguna seluler di belakang CGNAT). IP mentah tidak disimpan.
- **Jangan aktifkan Bot Fight Mode:** tidak bisa dikecualikan dan akan memblokir klien MCP publik.
- **MCP publik** tidak memanggil LLM. Ia dibatasi rate limit per hash IP dan satu aturan WAF. Jangan pernah menambahkan tool MCP yang memanggil LLM tanpa API key/OAuth.
- **Pengguna login** (kuota lebih besar, mode "analisis mendalam" dengan kuota kecil) baru ada setelah Better Auth dipasang, sesudah Jawab stabil (ADR-016).

**Lainnya:**
- **Jangan pakai free tier Gemini untuk lalu lintas pengguna.** Data free tier dipakai Google untuk perbaikan produk dan bisa dibaca reviewer manusia, sehingga bertentangan dengan [kebijakan privasi](05-kebijakan.md). Free tier boleh dipakai untuk pengembangan dan eval yang datanya tidak sensitif.
- **Harga vendor bisa berubah mendadak** (contoh: Gemini 3.8 Flash naik 2× pada Jan 2027). Karena itu model tidak dikunci, dan biaya dipantau tiap bulan.

## Decision model: TypeSafe Jev

Jev bukan model generatif. Ia menjawab pertanyaan pilihan dengan **probabilitas per opsi** (Choice), memberi skor (Score), dan menjawab ya/tidak (Noul). Harga: $0,042 per 1 juta token input, output gratis. Ada SDK JavaScript (`@typesafe-ai/sdk`).

> **Status setelah memilih Haiku 5.5:** routing oleh Haiku dengan daftar isi yang di-cache (±$0,0003) lebih murah daripada routing oleh Jev (±$0,0013). Karena itu Jev **tidak wajib** dan tidak dipakai di mode Cari. Jev **tidak dijadwalkan di Fase 0–4**. Ia bisa diusulkan lewat ADR baru bila metrik penolakan atau cek sitasi di eval Jawab kurang, untuk dua peran yang tidak bisa dilakukan Haiku secara murah dan terkalibrasi: gerbang "tidak ditemukan" dan cek sitasi.

**Peran yang cocok di Surau:**

| Peran | Primitif | Pengganti dari |
|---|---|---|
| Router niat pertanyaan | Choice | Panggilan LLM |
| Beam search di pohon kitab (fan-out Ihya: median 3, maks. 20) | Choice | Navigasi oleh LLM |
| Gerbang relevansi → "tidak ditemukan" | Noul + ambang | Penilaian LLM |
| Cek sitasi: mendukung / bertentangan / tidak terkait | Choice (ada cookbook resminya) | LLM-as-judge saat runtime |
| Sikap penulis pada qaul (menyetujui/membantah/menukil) | Choice | LLM di pipeline wiki |

**Risiko:**
- **Bahasa:** dokumentasinya menyebut "English is the primary training language"; bahasa lain "not equally well". Mitigasinya, opsi pohon ditulis sebagai **ringkasan bahasa Inggris** per bagian (dibuat sekali). Tetap wajib diuji pada data Surau.
- **Kelemahan yang diakui vendor** (dari halaman "jaggedness"):
  - membaca instruksi secara harfiah;
  - cenderung memilih opsi pertama;
  - lemah di soal hitung-hitungan;
  - akurasi turun bila konteks penuh detail yang tidak relevan.
- **API tertutup dari startup muda:** risiko vendor untuk proyek OSS. Semua peran Jev harus punya fallback, berupa reranker open-weight atau LLM murah.

**Alternatif decision model:**
- **Reranker:** Voyage rerank-3 (200 juta token gratis) atau Qwen3-Reranker (open-weight). Cocok untuk mengurutkan bagian/passage, tetapi tidak memberi "mendukung/bertentangan". `bge-reranker-base` di Workers AI tidak cocok karena hanya Cina/Inggris.
- **LLM murah dengan output terstruktur:** cadangan untuk semua peran di atas.

## Dari repo VectifyAI

- **jev-doc-search** (Apache-2.0, Python): demo Jev + PageIndex.
  - Algoritmanya: beam 3 menuruni pohon → Choice atas halaman di setiap bagian → Noul per kandidat (maks. 16, ambang 0,5).
  - Bisa langsung ditiru di Surau tanpa PageIndex, karena pohonnya sudah ada.
- **ConDB** (Apache-2.0, Python, ±65 bintang): database konteks berbentuk pohon dengan strategi *beam* (pohon kecil) dan *block* (pohon besar, dipecah per blok token, KV-cache dipakai ulang; klaim hemat token hingga 70%).
  - Hanya mendukung Anthropic/OpenAI.
  - Benchmark-nya di pohon file kode, bukan dokumen Arab.
  - **Tidak dipakai sebagai dependensi.** Dua idenya diambil:
    1. Susunan prompt yang ramah cache.
    2. Strategi *block* untuk "pohon perpustakaan" ketika kitab sudah ratusan dan daftar isinya tidak muat lagi dalam satu prompt.

## Pendanaan & program

| Program | Isi | Syarat / status |
|---|---|---|
| **AWS (via TechSoup)** | Hingga $5.000/tahun, **bisa dipakai untuk Claude di Bedrock**, tetapi hanya untuk panggilan online: Message Batches tidak tersedia di Bedrock | Butuh badan hukum nirlaba; mitra TechSoup Indonesia belum dikonfirmasi |
| **Kredit API langganan Claude** | Max 5x $100/bulan, Max 20x $200/bulan, Team hingga $500/bulan; tidak rollover. Saat kredit habis, API berhenti sendiri (rem alami). | Hanya bila pemilik berlangganan; organisasi Console harus ditautkan. Belum dikonfirmasi apakah pemilik berlangganan. |
| **Microsoft for Nonprofits** | $2.000/tahun kredit Azure | Butuh status nirlaba legal; cakupan Indonesia belum dikonfirmasi |
| **Google for Nonprofits** | Workspace, Ad Grants (bukan kredit API Gemini) | Yayasan berbadan hukum Kemenkumham, perkumpulan, atau ormas; verifikasi lewat Goodstack |
| **GitHub Sponsors** | Donasi rutin, tanpa potongan untuk akun personal | Indonesia didukung |
| Langfuse | Kredit $300/bulan (OSS, tahun pertama) atau $199/bulan (nirlaba) | **Hanya relevan bila Langfuse diaktifkan** sebagai cadangan (ADR-015); saat ini tidak dipakai |
| Anthropic / OpenAI nirlaba | Hanya diskon kursi (seat), **tanpa kredit API** | Kurang relevan |

**Langkah praktis:**
1. **Daftarkan yayasan/perkumpulan sejak awal.** Badan hukum membuka hampir semua program kredit dan membuat donasi lebih tepercaya.
2. **Buat halaman transparansi biaya bulanan** (S21). Isinya biaya AI (dari ledger D1 dan analytics AI Gateway), biaya infrastruktur (Workers Paid + domain), dan jumlah pertanyaan yang dilayani. Cocok dengan budaya infak: orang tahu persis untuk apa donasinya dipakai.
3. **Dahulukan MCP dan mode Cari.** Keduanya hampir gratis dijalankan dan sudah sangat bermanfaat, sambil menunggu pendanaan untuk mode Jawab yang lebih luas.

Lisensi konten (CC BY-NC-SA 4.0) melarang iklan, paywall, atau penjualan akses atas konten (ADR-021). Donasi untuk organisasi nirlaba tetap boleh.

## Opsi yang ditolak

Termasuk opsi dari rancangan lama dan opsi yang hanya dijadikan cadangan.

| Opsi | Alasan singkat | Lihat |
|---|---|---|
| Vercel (Hobby/Pro) dan program Vercel OSS | Vendor tambahan; Workers Paid sudah dibayar. Kredit OSS Vercel tidak relevan lagi. | ADR-002 |
| Supabase (Free 500 MB, Pro $25/bulan) | Free dijeda setelah 1 minggu tanpa aktivitas; platform kedua tanpa manfaat untuk korpus hanya-baca | ADR-005 |
| Postgres lewat Hyperdrive | Cadangan saja, bila batas 10 GB per DB atau throughput D1 terlampaui | ADR-005 |
| Vercel BotID | Ikut Vercel; diganti Turnstile | ADR-014 |
| Langfuse sebagai alat eval utama | Hobby 2 pengguna, UI Inggris tanpa RTL; jadi cadangan | ADR-015 |
| AI Gateway Unified Billing | Biaya 5% dan kredit prabayar | ADR-013 |
| Caching AI Gateway untuk jawaban | Hanya exact match dan volatil; cache jawaban dibuat sendiri di D1 | ADR-013 |
| Workers Builds sebagai jalur CI utama | Konfigurasi di dashboard, tanpa cache `node_modules`, log tidak terbaca agent; jadi cadangan | ADR-017 |
| LangExtract (Python) sebagai jalur utama ekstraksi wiki | Tanpa provider Anthropic bawaan; default ekstraksi TS-native dengan grounding offset oleh kode | ADR-007 |

Semua ADR ada di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md).
