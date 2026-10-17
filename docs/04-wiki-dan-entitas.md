# 04 · Wiki & Entitas

> Wiki dibangun di **Fase 6** ([implementasi/FASE.md](../implementasi/FASE.md)). Keputusan teknis mengikuti ADR di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md). Bila dokumen ini berbeda dengan ADR, ADR yang berlaku.

## Tujuan

Wiki menyimpan pengetahuan terstruktur yang diambil dari kitab (tokoh, istilah, hadits, pendapat, masalah fiqih) supaya:

1. UI bisa menampilkan **kartu terstruktur**, misalnya kartu tokoh, kartu istilah, atau kartu hadits beserta statusnya.
2. Agen tidak perlu membaca ulang kitab untuk **data rujukan** seperti tahun wafat, mazhab, atau definisi istilah.
3. Ada **indeks tematik** (*fihris mawdhu'i*): daftar semua tempat sebuah konsep dibahas, lintas bab dan lintas kitab.

## Garis tegas

| Jenis informasi | Boleh dari wiki/DB? |
|---|---|
| Data rujukan: tahun wafat, mazhab, guru–murid, daftar karya, lokasi ayat, status hadits dari takhrij | ✅ Ya, dengan sumber dan status review |
| Definisi istilah | ✅ Ya, sebagai **kutipan definisi dari kitab tertentu**. Definisi bisa berbeda antar penulis. |
| Pendapat dan hukum (substansi agama) | ⚠️ Wiki hanya **menunjuk** lokasinya. Jawaban tetap memakai kutipan verbatim dari teks kitab. |

**Wiki adalah peta menuju kitab, bukan pengganti kitab.** Halaman wiki dibangkitkan dari fakta-fakta yang bersumber, bukan berupa teks bebas tulisan AI.

## Jenis entitas

| # | Entitas | Contoh | Atribut penting | Cara ekstraksi |
|---|---|---|---|---|
| 1 | **Tokoh** (شخص) | الغزالي، أبو هريرة، الحسن البصري | Bagian nama (ism, kunyah, nasab, nisbah, laqab), wafat (H), mazhab, peran (nabi/sahabat/tabi'in/ulama/perawi/penguasa) | Tabel `author` sebagai titik awal (lihat *Bahan awal*); sebutan di teks: LLM + resolusi entitas |
| 2 | **Karya** (كتاب) | "ذكره في الأم", "الإحياء" | Penulis, status atribusi, periode, bahasa asli, relasi syarah/hasyiyah/mukhtasar | Katalog + metadata `work` (Fase 5) + LLM untuk kitab yang dikutip di dalam teks |
| 3 | **Tempat** (مكان) | بغداد، طوس، نيسابور | Jenis (kota/wilayah/masjid), koordinat (opsional) | LLM, prioritas rendah |
| 4 | **Istilah** (مصطلح) | الصبر، التوكل، القصر، النجاسة | Bidang (fiqih/tasawuf/kalam/ushul/hadits), **kutipan definisi per kitab** | LLM (pola "عبارة عن"، "هو"، "حقيقته") |
| 5 | **Ayat** (آية) | Kutipan Al-Qur'an di dalam teks | Surah:ayat, teks Tanzil (verbatim), terjemahan + transliterasi Kemenag (verbatim), jenis cocok (`exact`/`similar`) | **Deterministik, dibangun di Fase 2 (S12):** pencocokan ke teks Tanzil. **Tanpa LLM** (lihat di bawah) |
| 6 | **Hadits** (حديث) | Hadits di dalam teks | Penanda takhrij (١), teks takhrij asli, label status (sahih/dhaif/dhaif jiddan/maudhu'/la ashla lahu), perawi | **Deterministik:** tautan penanda → catatan kaki (`footnote_ref`, Fase 1). Label status dari LLM, lalu direview. |
| 7 | **Qaul / Atsar** (قول) | "قال الحسن ...", "قالت الفلاسفة ..." | Siapa yang berkata, isi, **sikap penulis: menyetujui / membantah / sekadar menukil** | LLM + review wajib |
| 8 | **Masalah & Hukum** (مسألة/حكم) | "صلاة العيدين وهي سنة مؤكدة" | Topik masalah; hukum taklifi (wajib/sunnah/mubah/makruh/haram) atau wad'i (syarat/rukun/sah/batal/sebab/mani'); menurut siapa (penulis/mazhab/tokoh); dalil (tautan ke ayat/hadits); syarat dan pengecualian; ada khilaf atau tidak | LLM + review wajib |
| 9 | **Hikayat** (حكاية) | Kisah salaf di Ihya | Tokoh yang terlibat, pelajaran | Nanti (belum dijadwalkan) |

### Ayat: sudah tersedia sebelum Wiki

Entitas ayat tidak menunggu Fase 6. Ia dibangun di Fase 2 ([S12](../implementasi/sesi/S12-ayat-kemenag.md)) karena batch terjemahan (S13) butuh tahu bentang ayat supaya LLM tidak menerjemahkannya (lihat ADR-020 di [implementasi/KEPUTUSAN.md](../implementasi/KEPUTUSAN.md)).

| Aspek | Keputusan |
|---|---|
| Teks ayat | Tanzil 1.1 (CC BY 3.0, **hanya verbatim**, wajib pemberitahuan dan tautan tanzil.net). `simple-clean` untuk indeks pencocokan, `uthmani` untuk tampilan. |
| Terjemahan | Kemenag (data milik pemilik, asal quran.kemenag.go.id; menggantikan QuranEnc, ADR-040), verbatim, beserta catatan kaki dan transliterasi Latin. Penanda catatan kaki seperti `1)` ditampilkan apa adanya. |
| Pencocokan | Hasil S12 (ADR-040): 97,3% bentang `{…}` tervalidasi di Ihya cocok persis dengan `simple-clean` setelah normalisasi, sisanya beda ejaan (أولوا/أولو) berlabel "mirip". Ditambah 649 kutipan tanpa kurung sesudah frasa pengantar (قال تعالى …). Bentang yang tidak cocok **bukan** ayat dan tidak ditautkan. |
| Penyimpanan | Tabel korpus `quran_source`, `quran_surah`, `quran_ayah`, `quran_translation`, dan `passage_ayah_ref` (paragraf, offset, surah, ayat awal–akhir, `exact`/`similar`, sebagian, letak lain). Lihat [ARSITEKTUR-TEKNIS §3.1](../implementasi/ARSITEKTUR-TEKNIS.md). |
| Aturan | **Ayat tidak pernah diterjemahkan atau ditulis ulang oleh LLM.** Ekstraksi wiki memakai rujukan dari `passage_ayah_ref`, misalnya untuk relasi `hukum ─berdalil→ ayat`. |

Kurung `{…}` di teks Shamela juga dipakai untuk penomoran, jadi validasi ayat selalu lewat pencocokan ke Tanzil. Masih terbuka: apakah PMA 44/2016 (tashih) berlaku untuk aplikasi yang hanya mengutip ayat di dalam kitab (ADR-020).

### Kenapa "sikap penulis" pada Qaul itu krusial

Dalam *Tahafut al-Falasifah*, al-Ghazali memaparkan pendapat para filsuf **untuk dibantah**. RAG yang naif bisa menisbatkan pendapat para filsuf itu kepada al-Ghazali sendiri. Karena itu setiap qaul wajib menyimpan siapa yang berkata dan bagaimana sikap penulis terhadapnya.

### Relasi

```
tokoh  ─guru_dari→      tokoh
tokoh  ─menulis→        karya          (+ status atribusi)
karya  ─syarah_dari→    karya          (juga: hasyiyah, mukhtasar, takhrij)
karya  ─mengutip→       karya
bagian ─menyebut→       entitas        (posisi karakter persis)
qaul   ─dinisbatkan→    tokoh          (+ sikap penulis)
hukum  ─tentang→        masalah
hukum  ─menurut→        tokoh | mazhab
hukum  ─berdalil→       ayat | hadits
istilah─didefinisikan_di→ bagian
```

Semua relasi disimpan sebagai **tabel relasi di D1 (SQLite)**, bukan Postgres (ADR-005). Nama tabel dan kolom di kode berbahasa Inggris (ADR-012) dan ditetapkan saat Fase 6 dirinci. Graph DB baru dipertimbangkan bila penelusuran berlapis-lapis menjadi fitur inti.

**Penempatan:** fakta wiki dan hasil review disimpan **di luar** DB korpus blue-green (`surau-corpus-<versi>`, hanya-baca, dibangun ulang oleh pipeline), yaitu di DB app (`surau-app`) atau DB wiki terpisah ([ARSITEKTUR-TEKNIS §3.2](../implementasi/ARSITEKTUR-TEKNIS.md)). Kandidat berstatus `ai_extracted` boleh dibangun dari korpus. Pilihan finalnya diputuskan saat Fase 6 lewat ADR baru. Apa pun pilihannya, dua syarat ini wajib:
- Koreksi dan keputusan ustadz tidak boleh hilang atau tertimpa saat korpus dibangun ulang ([05 §6](05-kebijakan.md#6-wiki-dan-data-terstruktur)).
- Setiap fakta menunjuk `passage_id` dan offset di teks mentah. Teks mentah tidak pernah diubah dan ID stabil setelah rilis ([ARSITEKTUR-TEKNIS §3.1](../implementasi/ARSITEKTUR-TEKNIS.md)).

## Tingkat risiko dan review

| Tingkat | Entitas | Review |
|---|---|---|
| **A: deterministik** | Pohon judul, metadata karya, penulis (tabel `author`), ayat (S12), tautan hadits ke takhrij (`footnote_ref`) | Validasi otomatis + cek sampel |
| **B: LLM, risiko sedang** | Tokoh, karya yang dikutip, tempat, istilah + definisi | Review sampel (misalnya 10%) + koreksi massal |
| **C: LLM, risiko tinggi** | Qaul + sikap, masalah & hukum, label status hadits | **Review ustadz wajib** sebelum tampil sebagai data terverifikasi |

Status setiap fakta. Nilainya di kode berbahasa Inggris (ADR-012), labelnya di UI berbahasa Indonesia:

| Status di kode | Label UI | Arti |
|---|---|---|
| `ai_extracted` | diekstrak AI | Hasil ekstraksi yang lolos grounding, belum dilihat manusia |
| `reviewed` | direview | Sudah dicek manusia (sampel tingkat B atau koreksi massal), belum oleh ustadz |
| `ustadz_verified` | diverifikasi ustadz | Sudah dicek ustadz. Untuk tingkat C, hanya status ini yang boleh tampil sebagai "terverifikasi". |
| `rejected` | ditolak | Disimpan untuk audit dan tidak ditampilkan |

Alurnya `ai_extracted` → `reviewed` → `ustadz_verified`, atau `rejected` di tahap mana pun. Status ini selalu terlihat di UI. Ekstraksi ulang hanya menambah kandidat baru berstatus `ai_extracted`; ia tidak menimpa atau menghapus hasil review ([05 §6](05-kebijakan.md#6-wiki-dan-data-terstruktur)).

**Tempat review:** halaman `/tinjau` buatan sendiri (ADR-015). UI-nya berbahasa Indonesia dengan teks Arab RTL, dilindungi Cloudflare Access, dan keputusannya disimpan di tabel D1 `review`. Halaman ini dibangun untuk eval Jawab di S18 (Fase 4), lalu di Fase 6 diperluas dengan antrean fakta wiki. Setiap fakta ditampilkan di dalam paragraf sumbernya dengan sorotan sesuai offset, supaya peninjau melihat konteksnya. Ustadz pertama masih dicari pemilik (P-5).

## Alat ekstraksi

### Keputusan: TypeScript-native (default)

Ekstraksi wiki ditulis dalam TypeScript, satu bahasa dengan seluruh repo (ADR-007):

- **Model:** Claude Haiku 5.5 (`claude-haiku-5-5`) dengan *structured outputs* (skema JSON lewat `output_config.format`), dijalankan lewat Message Batches. Diskon batch 50% bertumpuk dengan caching. Batch dipanggil langsung ke Anthropic dari skrip lokal (ADR-013).
- **Grounding dihitung oleh kode, bukan oleh model.** Model wajib mengembalikan teks persis dari sumber untuk setiap ekstraksi. Kode lalu mencarinya dengan `findQuote` dari `packages/text`, memakai normalisasi dan peta offset yang sama dengan indeks FTS dan tool MCP `verify_quote`. Hasilnya adalah offset dan substring mentah yang verbatim. Ekstraksi yang tidak ditemukan **dibuang**, sama seperti `char_interval = None` di LangExtract.
- **Kenapa tidak memakai Citations untuk grounding:** Citations tidak bisa dipakai bersamaan dengan structured outputs (ADR-013).

**Kenapa LangExtract tidak menjadi alat utama:**
- LangExtract **tidak punya provider Anthropic bawaan**. Yang tersedia hanya Gemini, OpenAI, dan Ollama, ditambah plugin. Batch API-nya juga hanya untuk Vertex AI dan OpenAI, sedangkan model kita Claude Haiku 5.5.
- Python menambah toolchain kedua bagi agent. Normalisasi Arab juga harus dijaga identik di dua bahasa (ADR-007). Dengan TS, satu implementasi `normalizeArabic`/`findQuote` dipakai bersama oleh ingest, Worker, MCP, dan wiki.
- Paket npm `langextract` (1.2.0) adalah port komunitas yang tidak diperbarui sejak Agustus 2025.
- Bagian LangExtract yang dulu mau kita pakai, yaitu mesin *alignment*, digantikan `findQuote` (prototipenya sudah teruji dan dipindah ke `packages/text` di S05). Fungsi ini menangani kasus yang gagal di tes LangExtract: kutipan tanpa harakat dicocokkan ke teks sumber yang berharakat, dan substring mentah yang persis dikembalikan (temuan 8 di [riset pencarian Arab](riset/2026-10-15-pencarian-arab/README.md)).

**Opsional:** LangExtract Python boleh dipasang di `tools/wiki-extract` (terisolasi, dengan `uv`) **hanya bila perlu pembanding**, misalnya untuk membandingkan recall. Hasilnya tetap melewati grounding `findQuote` dan disimpan dengan skema yang sama.

### LangExtract sebagai referensi

[google/langextract](https://github.com/google/langextract) v1.7.1 (8 Okt 2026, Apache-2.0, Python ≥3.10). Catatan: ini bukan produk resmi Google. Rancangannya tetap jadi acuan:

| Fitur LangExtract | Padanannya di Surau |
|---|---|
| Setiap ekstraksi tertaut ke posisi karakter (`char_interval`) di sumber | Offset mentah dari `findQuote` |
| Teks yang tidak ditemukan di sumber mendapat `char_interval = None` (hasil karangan ditolak) | Ekstraksi yang tidak ditemukan `findQuote` dibuang dan dihitung di laporan |
| Skema lewat prompt + contoh few-shot | Instruksi + contoh few-shot Arab dari Ihya di prefix yang di-cache |
| Chunking dan beberapa putaran ekstraksi untuk menaikkan recall | Per bagian daftar isi, 2 putaran |
| Visualisasi HTML untuk meninjau hasil di dalam konteks | Sorotan offset di halaman `/tinjau` |

**Hasil tes alignment LangExtract pada teks Ihya** (juz 1 halaman 200, 15 Okt 2026, tanpa LLM; hanya menguji mesin pencocokan):

| Uji | Hasil |
|---|---|
| Nama tokoh `أبو هريرة` | ✅ ditemukan (fuzzy) |
| Nama tokoh `فاطمة` | ✅ ditemukan (exact) |
| Hukum `صلاة العيدين وهي سنة مؤكدة` | ✅ ditemukan (exact) |
| Hadits berharakat, disalin persis | ✅ ditemukan (exact) |
| **Hadits yang sama tanpa harakat** (sumbernya berharakat) | ❌ **tidak ditemukan** |
| Kalimat karangan `قال ابن عباس من صام يوم الخميس…` | ✅ ditolak (benar) |

Hasilnya sama dengan `RegexTokenizer` maupun `UnicodeTokenizer`.

**Pelajaran yang tetap berlaku:** grounding harus dijalankan pada **teks ternormalisasi** (harakat dan tatweel dihapus, alif/ya/ta marbuta diseragamkan), lalu posisinya dipetakan kembali ke teks mentah dengan peta offset. Tanpa langkah ini, banyak ekstraksi yang sebenarnya valid akan terbuang. Itulah cara kerja `normalizeArabic` + `findQuote` (S05).

**Belum diuji:** `findQuote` hanya mencocokkan persis setelah normalisasi dan menghormati batas kata. Kasus yang di LangExtract lolos lewat *fuzzy* (seperti `أبو هريرة` di atas) perlu diukur di pilot. Pencocokan fuzzy baru ditambahkan bila banyak ekstraksi valid terbuang.

### Yang tetap harus dibangun sendiri

- **Resolusi entitas.** Contohnya menyatukan "أبو حامد", "الغزالي", dan "حجة الإسلام" menjadi satu tokoh, lalu menautkannya ke tabel penulis, URI OpenITI, dan Wikidata.
- **Penyimpanan, versi, dan alur review** (D1 + `/tinjau`).
- **Pencocokan ayat ke teks Al-Qur'an standar.** Sudah dibangun di S12 secara deterministik.

## Pipeline

```
1. Normalisasi     normalizeArabic (packages/text) → teks ternormalisasi + peta offset
2. Deterministik   ayat (passage_ayah_ref, S12), tautan hadits↔takhrij (footnote_ref),
                   tokoh dari tabel author, validasi pohon                    (tingkat A)
3. Ekstraksi       Claude Haiku 5.5 lewat Message Batches (diskon 50%),
                   structured outputs (JSON: kelas, teks persis dari sumber, atribut),
                   instruksi + contoh few-shot Arab di prefix yang di-cache,
                   effort "low", 2 putaran; tingkat C bisa dicek ulang oleh Sonnet 5.5
4. Grounding       findQuote di kode: teks persis → offset mentah;
                   tidak ditemukan → dibuang dan dihitung di laporan
5. Resolusi        sebutan → entitas kanonik (aturan + LLM + review)
6. Simpan          D1: fakta + sumber (passage_id, offset, model, versi prompt,
                   id batch, versi korpus) + status = ai_extracted
7. Review          sampel (B), wajib (C), di halaman /tinjau (Cloudflare Access)
8. Tampilkan       kartu wiki = tampilan yang dibangkitkan dari fakta + label status
```

**Aturan panggilan Haiku 5.5** (ADR-013):
- `output_config.effort: "low"` diset eksplisit (defaultnya `medium`). Thinking adaptif tetap aktif.
- Jangan kirim `temperature`, `top_p`, atau `top_k` (400), dan jangan memakai prefill assistant (400).
- Prompt ≤100k token, termasuk token cache. Di atas batas itu harganya naik 5×, jadi bagian kitab yang panjang dipecah dan diukur dulu dengan `count_tokens`.
- Haiku 5.5 tidak punya fallback server untuk `stop_reason: "refusal"`. Item yang ditolak diulang dengan `claude-sonnet-5-5`.
- Message Batches tidak tersedia di Amazon Bedrock, sehingga kredit AWS tidak bisa dipakai untuk ekstraksi batch.

**Biaya:** ekstraksi wiki 2 putaran untuk seluruh Ihya diperkirakan **±$0,33–0,51**, dan ±$18–28 untuk ±92 kitab kurikulum. Angka ini adalah keluaran [scripts/hitung_biaya.py](../scripts/hitung_biaya.py) untuk Haiku 5.5 batch dengan faktor token Arab 1,0–2,0. Jumlah token Arab di tokenizer Claude **belum diukur**; pengukurannya dilakukan di S13 dengan `count_tokens`. Lihat [08 Biaya](08-biaya.md).

**Pilot:** jalankan pipeline ini dulu pada **satu kitab dari Ihya**, yaitu *Kitab al-'Ilm*. Ukur biaya, presisi, dan recall bersama ustadz memakai `tools/eval` ([06 Evaluasi](06-evaluasi.md), bagian eval ekstraksi wiki) sebelum diperluas ke seluruh Ihya, lalu ke kitab lain.

## Bahan awal yang sudah tersedia

- **Tabel penulis Shamela** (`author.sqlite`): 3.187 penulis lengkap dengan tahun wafat dan biografi. Ini menjadi titik awal tabel `author` (kolom `name_ar`, `death_hijri`, `shamela_author_id`, `wikidata_id`). **Catatan lisensi:** syarat Shamela tidak memberi hak pakai ulang (ADR-018), dan data Shamela tidak diredistribusikan sampai ada izin ([05 §7](05-kebijakan.md#7-lisensi)). Biografi Shamela dipakai sebagai bahan kerja internal, tidak disalin ke kartu publik.
- **Katalog Shamela**: kategori, penerbit, dan edisi setiap kitab.
- **Takhrij al-'Iraqi** di catatan kaki Ihya. Takhrij diambil dari catatan kaki Shamela dan dicek silang dengan OpenITI `JK000001`. Takhrij yang tidak cocok, termasuk sekitar 200 halaman yang takhrijnya bercampur ke matan setelah `//`, ditandai `needs_review` (ADR-018). Tautan penanda (١) ke catatan kaki tersimpan di `footnote_ref` sejak Fase 1, dan bisa dibaca lewat tool MCP `get_hadith_takhrij` sejak Fase 3.
- **Ayat + terjemahan Kemenag** dari Fase 2 (S12), lihat di atas.
- **ID eksternal** untuk interoperabilitas: Wikidata (tokoh) dan URI OpenITI (penulis dan karya, misalnya `0505Ghazali.IhyaCulumDin`).

## Posisi di roadmap

Wiki adalah **Fase 6** di [implementasi/FASE.md](../implementasi/FASE.md). Sesinya dirinci saat Fase 4 hampir selesai. Banyak bahannya sudah dibangun di fase-fase sebelumnya:

| Fase | Yang dipakai Wiki |
|---|---|
| 1 · Pembaca Ihya | `packages/text` (S05: normalisasi, peta offset, `findQuote`); `passage` dengan teks mentah dan ID stabil; `toc_node`; `footnote_ref` |
| 2 · Cari | Ayat + Kemenag (S12); jalur Message Batches dan pencatatan biaya (S13); `tools/eval` (S15) |
| 3 · MCP publik | `get_hadith_takhrij` dan `verify_quote` |
| 4 · Jawab | Halaman `/tinjau` dan tabel `review` (S18) |
| 5 · Ruang al-Ghazali | Metadata karya: status atribusi, periode, bahasa asli |
| **6 · Wiki** | Tingkat A (deterministik), pilot tingkat B di *Kitab al-'Ilm*, antrean review, kartu UI, dan indeks tematik. **Syarat rilis:** presisi ekstraksi disepakati bersama ustadz. |
| 7 · Kurikulum & data terbuka | Entitas tingkat C dengan review wajib, ±92 kitab, dan rilis data terbuka |

## Opsi yang ditolak

| Opsi | Alasan |
|---|---|
| LangExtract (Python) sebagai alat utama | Tanpa provider Anthropic bawaan, batch hanya untuk Vertex AI dan OpenAI, serta menambah toolchain Python dan implementasi normalisasi kedua (ADR-007). Tetap boleh sebagai pembanding opsional di `tools/wiki-extract`. |
| Memakai aligner LangExtract saja (rancangan lama) | Tetap butuh Python hanya untuk alignment, padahal `findQuote` melakukan hal yang sama dan juga menangani kutipan tanpa harakat. |
| Paket npm `langextract` | Port komunitas (1.2.0) yang tidak diperbarui sejak Agustus 2025. |
| Citations sebagai alat grounding ekstraksi | Tidak bisa dipakai bersamaan dengan structured outputs (ADR-013). |
| Postgres/Supabase untuk tabel relasi | Diganti D1 + FTS5 (ADR-005). |
| Graph DB | Belum perlu. Tabel relasi cukup sampai penelusuran berlapis menjadi fitur inti. |
| Langfuse sebagai alat review ustadz | UI berbahasa Inggris tanpa RTL dan paket Hobby hanya 2 user. Menjadi cadangan (ADR-015). |
| LLM menerjemahkan atau menulis ulang ayat | Dilarang. Teks ayat dari Tanzil dan terjemahan Kemenag, keduanya verbatim (ADR-020). |
