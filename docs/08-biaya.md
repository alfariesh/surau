# 08 · Biaya & Keberlanjutan

> Konteks: Surau dikerjakan solo developer, nirlaba, dan belum punya pendanaan. Targetnya: **biaya operasional bisa ditutup dari donasi kecil**, dan aplikasi **tetap berfungsi walaupun anggaran AI habis**.

## Ringkasan

| | Biaya per pertanyaan | 10.000 pertanyaan/bulan* |
|---|---|---|
| Agen bebas + model frontier (desain naif) | $0,07–0,14 | $700–1.400 |
| **Desain Surau v1: Claude Haiku 5.5 + Citations** | **±$0,002–0,003** | **±$9–11** |
| Desain hemat + model frontier (Sonnet 5.5 / Gemini 3.1 Pro) | ±$0,03–0,04 | ±$120–160 |
| Mode Cari (tanpa LLM penjawab) | ±$0,0006 | ±$6 |
| Lewat MCP (AI milik pengguna) | ±$0 untuk Surau | ±$0 |

\*Dengan campuran lalu lintas: 30% dilayani dari jawaban terverifikasi, 30% mode Cari, 40% mode Jawab. Kualitas Haiku 5.5 untuk Arab klasik **belum diuji**; eval yang memutuskan apakah ia cukup.

Penghematan terbesar **bukan dari memilih model termurah**, tetapi dari desain:
1. Sebagian besar pertanyaan tidak perlu LLM.
2. Pekerjaan mahal dibayar sekali di depan, bukan setiap pertanyaan.
3. Kutipan Arab tidak ditulis ulang oleh model.

## Pilihan model v1: Claude Haiku 5.5

Diputuskan 15 Okt 2026, **sementara**: Claude Haiku 5.5 (`claude-haiku-5-5`) dipakai untuk mode Jawab dan untuk semua ingest.

**Alasan:**
- **Murah:** $0,10 input / $0,50 output per juta token untuk prompt ≤100k token. Baca cache 0,1× harga input ($0,01).
- **Ingest lewat Message Batches diskon 50%,** dan diskon ini **bertumpuk dengan caching**: input $0,05, output $0,25, baca cache $0,005.
- **Citations bawaan Claude** (tersedia di semua model aktif). Bagian kitab dikirim sebagai dokumen; Claude mengembalikan kutipan yang diambil langsung dari dokumen itu, lengkap dengan lokasinya.
  - `cited_text` **tidak ditagih sebagai token output**, jadi kutipan Arab yang boros token tidak menambah biaya.
  - Citations bisa dipakai bersama prompt caching dan batch.
  - Citations **tidak bisa** dipakai bersama structured outputs. Karena itu jawaban berbentuk teks + blok sitasi, sedangkan structured outputs dipakai untuk ingest.

**Aturan pakai:**
- **Batas keras 100k token per prompt.** Di atas itu harganya naik 5× ($0,50 / $2,50). Hitung token dengan endpoint `count_tokens`, pecah bagian kitab yang terlalu panjang, dan batasi mode "analisis mendalam" di ±90k.
- **Effort `low`** untuk jawaban dan ingest. Defaultnya `medium`. Thinking tetap aktif secara adaptif dan ditagih sebagai output; naikkan effort hanya bila eval menunjukkan perlu. `max_tokens` harus menyisakan ruang untuk thinking.
- **Dokumen Citations memakai format *custom content*:** satu blok = satu paragraf kitab dengan ID-nya. Teks Arab klasik sering minim tanda baca, sehingga pemotongan per kalimat otomatis tidak bisa diandalkan.
  - Indeks blok yang dikutip dipetakan ke ID paragraf di DB.
  - UI menampilkan teks dari DB.
  - String match tetap dijalankan sebagai pengaman kedua.
- **Tokenizer:** Haiku 5.5 menghitung teks sekitar 30% lebih banyak daripada Haiku 4.5. Jumlah token **Arab** di tokenizer Claude **belum diukur** dan diukur di v1a. Angka di bawah memakai faktor 1,0–2,0 terhadap tokenizer OpenAI.
- **Penolakan (refusal):** Haiku 5.5 tidak punya fallback otomatis di server. Bila `stop_reason` bernilai `"refusal"`, misalnya karena salah deteksi pada bab jihad atau hudud, ulangi dengan Sonnet 5.5 atau tampilkan bagian kitabnya saja (mode Cari).
- **Risiko satu vendor:** panggilan model dibungkus satu modul tipis. Setiap kuartal, eval dijalankan ulang terhadap Sonnet 5.5 dan satu model non-Claude.

**Biaya (keluaran `scripts/hitung_biaya.py`):**

| | Faktor token Arab 1,0 | 1,5 | 2,0 |
|---|---|---|---|
| Per jawaban (C. Haiku + Citations) | $0,0019 | $0,0023 | $0,0028 |
| 10 ribu pertanyaan/bulan (campuran) | $9,35 | ±$11 | ±$13 |
| **Ingest Ihya lengkap:** ringkasan, terjemahan Indonesia penuh, ekstraksi wiki | **$0,92** | $1,10 | $1,28 |
| Ingest ±92 kitab kurikulum | $50 | $60 | $70 |

Artinya: **terjemahan AI untuk seluruh Ihya hanya sekitar setengah dolar.** Terjemahan per paragraf dibuat sekali, disimpan, diberi label "terjemahan AI", dan bisa direview. Jawaban tidak perlu menerjemahkan ulang, sehingga semakin murah dan konsisten.

**Kredit:** program nirlaba AWS (lihat bawah) bisa dipakai untuk Haiku 5.5 di Amazon Bedrock (`anthropic.claude-haiku-5-5`).

## Prinsip hemat

1. **Tangga biaya.** Selalu coba langkah termurah dulu: jawaban terverifikasi (cache) → wiki/DB → mode Cari → mode Jawab murah → mode Jawab kuat.
2. **Bayar sekali, pakai berkali-kali.** Ringkasan per bagian, glosarium istilah, entitas wiki, dan **terjemahan per bagian** dibuat sekali secara batch (diskon 50%), disimpan, lalu dipakai oleh semua pengguna.
3. **Kode menyalin, model menunjuk.** Model hanya mengeluarkan ID bagian dan penjelasan berbahasa Indonesia. Teks Arab, yang boros token, disisipkan oleh kode. Ini sekaligus menjamin kutipan verbatim.
4. **Pipeline tetap, bukan agen bebas.** Satu panggilan LLM per jawaban lebih murah dan lebih bisa diprediksi daripada loop agen berputaran-putaran. Agen bebas hanya untuk mode "analisis mendalam" berkuota.
5. **Prompt caching.** Instruksi sistem dan daftar isi diletakkan di awal prompt supaya bisa di-cache (harga baca cache ±10% dari input biasa). Ini ide inti ConDB ("KV-cache native").
6. **Turun kelas dengan anggun.** Bila anggaran bulanan habis, mode Jawab dimatikan otomatis dan Surau tetap berjalan sebagai mesin pencari kitab.
7. **MCP untuk pengguna berat.** Pengguna yang sudah punya AI sendiri memakai korpus Surau lewat MCP, sehingga biaya modelnya tidak ditanggung Surau.

## Alur satu pertanyaan (desain hemat)

```
Pertanyaan
 │
 ├─1. Cek jawaban terverifikasi (DB)                       $0
 ├─2. Retrieval: BM25 Arab + ringkasan Indonesia (DB)         $0
 ├─3. Haiku memilih bagian dari daftar isi (di-cache)
 │     + niat pertanyaan (wiki / Cari / Jawab)                ~$0,0003
 │     ├─ tokoh / istilah / status hadits → kartu wiki (DB)  $0
 │     ├─ tidak ada yang relevan → "tidak ditemukan"
 │     └─ "jelaskan / apa kata …?" → lanjut ↓
 ├─4. Jawab: Haiku + Citations (bagian kitab sebagai dokumen;
 │     kutipan Arab tidak ditagih sebagai output)             ~$0,0016
 ├─5. Verifikasi: kutipan dipetakan ke ID paragraf + string match (kode)  $0
 └─6. Simpan: jawaban populer masuk antrean review ustadz → jawaban terverifikasi

Opsional (diuji di v1b): Jev sebagai gerbang "tidak ditemukan" yang terkalibrasi
dan sebagai cek sitasi mendukung/bertentangan (~$0,0003–0,0013 per pertanyaan).
```

## Harga acuan (dicek 15 Okt 2026)

Harga dalam USD per 1 juta token: input / baca cache / output.

| Model | Harga | Catatan |
|---|---|---|
| Claude Haiku 5.5 | 0,10 / 0,01 / 0,50 | Untuk prompt ≤100k token. Di atasnya 0,50 / 2,50. |
| GPT-6 Luna | 0,10 / 0,01 / 0,50 | |
| Gemini 3.1 Flash-Lite | 0,25 / 0,025 / 1,50 | |
| Gemini 3.8 Flash | 0,75 / 0,075 / 3,75 | **Naik 2× pada 1 Jan 2027** |
| Claude Sonnet 5.5 | 2 / 0,20 / 10 | |
| Gemini 3.1 Pro | 2 / 0,20 / 12 | |
| Claude Opus 5.5 | 4 / 0,20 / 20 | |
| GPT-5.5 | 5 / 0,50 / 30 | |
| DeepSeek V4 Flash (DeepInfra) | 0,06 / 0,015 / 0,18 | Open-weight |
| Qwen3.7-Flash (≤32k) | 0,03 / – / 0,13 | |
| **TypeSafe Jev** (decision model) | **0,042 input, output gratis** | Konteks 64k/permintaan, 32k/pertanyaan, maks. 255 opsi |

**Lainnya:**
- **Embedding:**
  - BGE-M3 dan Qwen3-Embedding: ±$0,01/M (DeepInfra/Workers AI).
  - Voyage-4: $0,06/M, dengan 200 juta token gratis.
  - Gemini Embedding 2: $0,20/M ($0,10/M batch).
- **Reranker:**
  - Voyage rerank-3: $0,05/M, dengan 200 juta token gratis.
  - Qwen3-Reranker-8B (DeepInfra): $0,05/M.
  - Cohere Rerank 4: $2 per 1.000 pencarian.
- **Diskon batch 50%** di Gemini, Anthropic, OpenAI, dan Qwen. Ini untuk semua pekerjaan offline.

Sumber dan rincian ada di [catatan riset](riset/2026-10-15-catatan-riset.md). Kalkulator: `python3 scripts/hitung_biaya.py`.

### Hitungan per pertanyaan (keluaran kalkulator)

| Model | A. Agen 3 putaran | B. Pipeline + Jev | C. Model routing sendiri + Citations |
|---|---|---|---|
| Qwen3.7-Flash | $0,0016 | $0,0017 | $0,0008 |
| **Claude Haiku 5.5** / GPT-6 Luna | $0,0035 | $0,0027 | **$0,0019** |
| Gemini 3.1 Flash-Lite | $0,0092 | $0,0050 | $0,0050 |
| Gemini 3.8 Flash | $0,0262 | $0,0119 | $0,0140 |
| Claude Sonnet 5.5 | $0,0700 | $0,0297 | $0,0373 |
| Gemini 3.1 Pro | $0,0736 | $0,0313 | $0,0401 |
| Claude Opus 5.5 | $0,1360 | $0,0577 | $0,0725 |

Asumsi token:
- **A:** 20k token dari cache + 24k token baru + 1,8k output.
- **B:** 2k dari cache + 10k baru + 0,8k output + 30k token Jev.
- **C:** 10,5k dari cache (sistem + daftar isi) + 10,6k baru + 1,4k output termasuk thinking. Kutipan Citations tidak dihitung.

Untuk model murah seperti Haiku, C adalah pilihan termurah. Untuk model mahal, B (routing oleh Jev) lebih murah.

Jumlah token diukur dengan tokenizer OpenAI (o200k) pada teks Ihya. **Tokenizer Claude dan Gemini belum diukur.** Kalau mereka menghitung teks Arab 2× lebih banyak, biaya naik sekitar 1,3–1,6×. Ukur dengan endpoint penghitung token tiap penyedia begitu ada API key.

> Catatan: untuk model yang sangat murah (Qwen, Haiku), routing lewat Jev **tidak lebih murah** daripada membiarkan model menavigasi sendiri. Nilai Jev ada di **probabilitas terkalibrasi** (berani bilang "tidak ditemukan") dan **verifikasi sitasi yang murah**, bukan semata penghematan.

## Biaya tetap bulanan

| Komponen | v1 (Ihya) | Setelah berkembang |
|---|---|---|
| Hosting web (Vercel) | $0, Hobby. Donasi tidak dianggap komersial. | $20, Pro |
| Database (Supabase) | $0, Free 500 MB. Ihya muat. Proyek dijeda bila 1 minggu tanpa aktivitas. | $25, Pro 8 GB (untuk ±92 kitab) |
| Eval & tracing (Langfuse) | $0, Hobby | $0–29 (ada program kredit untuk OSS/nirlaba) |
| Domain | ±$1 | ±$1 |
| **Total** | **±$1** | **±$45–75** |

## Biaya sekali bayar (batch, diskon 50%)

| Pekerjaan | Ihya (±1,8 juta token) | ±92 kitab kurikulum (±98 juta token) |
|---|---|---|
| Embedding (BGE-M3) | < $0,05 | ±$1 |
| Ringkasan Indonesia + Inggris per bagian (model murah) | < $1 | ±$5–15 |
| Ekstraksi wiki LangExtract (2 putaran) | ±$0,5–1,5 | ±$25–75 |
| Satu putaran eval (100 soal × 3 model frontier) | ±$25–30 | — |

## Pengaman anggaran

- **Batas belanja keras** di dashboard setiap penyedia, ditambah **sakelar mati di aplikasi**: kalau anggaran bulan ini habis, mode Jawab dinonaktifkan dan aplikasi beralih ke mode Cari.
- **Anti-bot:** Cloudflare Turnstile atau Vercel BotID (gratis). Penyalahgunaan oleh bot adalah risiko biaya terbesar.
- **Kuota:**
  - Pengguna anonim mendapat sejumlah jawaban per hari.
  - Pengguna login mendapat lebih banyak.
  - Mode "analisis mendalam" (agen + model kuat) hanya untuk pengguna login, dengan kuota kecil.
- **Jangan pakai free tier Gemini untuk lalu lintas pengguna.** Data free tier dipakai Google untuk perbaikan produk dan bisa dibaca reviewer manusia, sehingga bertentangan dengan [kebijakan privasi](05-kebijakan.md). Free tier boleh dipakai untuk pengembangan dan eval yang datanya tidak sensitif.
- **Harga vendor bisa berubah mendadak** (contoh: Gemini 3.8 Flash naik 2× pada Jan 2027). Karena itu model tidak dikunci, dan biaya dipantau tiap bulan.

## Decision model: TypeSafe Jev

Jev bukan model generatif. Ia menjawab pertanyaan pilihan dengan **probabilitas per opsi** (Choice), memberi skor (Score), dan menjawab ya/tidak (Noul). Harga: $0,042 per 1 juta token input, output gratis. Ada SDK JavaScript (`@typesafe-ai/sdk`).

> **Status setelah memilih Haiku 5.5:** routing oleh Haiku dengan daftar isi yang di-cache (±$0,0003) lebih murah daripada routing oleh Jev (±$0,0013). Karena itu Jev **tidak wajib di v1**. Jev hanya diuji di v1b untuk dua peran yang tidak bisa dilakukan Haiku secara murah dan terkalibrasi: gerbang "tidak ditemukan" dan cek sitasi.

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
- **Reranker:** Voyage rerank-3 (200 juta token gratis), Qwen3-Reranker (open-weight), bge-reranker (Workers AI). Cocok untuk mengurutkan bagian/passage, tetapi tidak memberi "mendukung/bertentangan".
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
| **Langfuse** | Kredit $300/bln (OSS, tahun pertama) atau $199/bln (nirlaba) | Daftar |
| **AWS (via TechSoup)** | Hingga $5.000/tahun, **bisa dipakai untuk Claude di Bedrock** | Butuh badan hukum nirlaba; mitra TechSoup Indonesia belum dikonfirmasi |
| **Microsoft for Nonprofits** | $2.000/tahun kredit Azure | Butuh status nirlaba legal; cakupan Indonesia belum dikonfirmasi |
| **Google for Nonprofits** | Workspace, Ad Grants (bukan kredit API Gemini) | Yayasan berbadan hukum Kemenkumham, perkumpulan, atau ormas; verifikasi lewat Goodstack |
| **GitHub Sponsors** | Donasi rutin, tanpa potongan untuk akun personal | Indonesia didukung |
| Vercel OSS | $3.600/3 tahun | **Pendaftaran sedang ditutup** |
| Anthropic / OpenAI nirlaba | Hanya diskon kursi (seat), **tanpa kredit API** | Kurang relevan |

**Langkah praktis:**
1. **Daftarkan yayasan/perkumpulan sejak awal.** Badan hukum membuka hampir semua program kredit dan membuat donasi lebih tepercaya.
2. **Buat halaman transparansi biaya bulanan.** Isinya biaya AI, hosting, dan jumlah pertanyaan yang dilayani. Cocok dengan budaya infak: orang tahu persis untuk apa donasinya dipakai.
3. **Dahulukan MCP dan mode Cari.** Keduanya hampir gratis dijalankan dan sudah sangat bermanfaat, sambil menunggu pendanaan untuk mode Jawab yang lebih luas.
