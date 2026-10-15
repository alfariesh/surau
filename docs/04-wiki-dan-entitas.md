# 04 · Wiki & Entitas

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
| 1 | **Tokoh** (شخص) | الغزالي، أبو هريرة، الحسن البصري | Bagian nama (ism, kunyah, nasab, nisbah, laqab), wafat (H), mazhab, peran (nabi/sahabat/tabi'in/ulama/perawi/penguasa) | LLM + resolusi entitas |
| 2 | **Karya** (كتاب) | "ذكره في الأم", "الإحياء" | Penulis, status atribusi, periode, bahasa asli, relasi syarah/hasyiyah/mukhtasar | Katalog + LLM untuk kitab yang dikutip di dalam teks |
| 3 | **Tempat** (مكان) | بغداد، طوس، نيسابور | Jenis (kota/wilayah/masjid), koordinat (opsional) | LLM, prioritas rendah |
| 4 | **Istilah** (مصطلح) | الصبر، التوكل، القصر، النجاسة | Bidang (fiqih/tasawuf/kalam/ushul/hadits), **kutipan definisi per kitab** | LLM (pola "عبارة عن"، "هو"، "حقيقته") |
| 5 | **Ayat** (آية) | Kutipan Al-Qur'an di dalam teks | Surah:ayat, teks kanonik | **Deterministik:** pencocokan fuzzy ke teks Al-Qur'an standar |
| 6 | **Hadits** (حديث) | Hadits di dalam teks | Penanda takhrij (١), teks takhrij asli, label status (sahih/dhaif/dhaif jiddan/maudhu'/la ashla lahu), perawi | **Deterministik:** tautan penanda → catatan kaki. Label status dari LLM, lalu direview. |
| 7 | **Qaul / Atsar** (قول) | "قال الحسن ...", "قالت الفلاسفة ..." | Siapa yang berkata, isi, **sikap penulis: menyetujui / membantah / sekadar menukil** | LLM + review wajib |
| 8 | **Masalah & Hukum** (مسألة/حكم) | "صلاة العيدين وهي سنة مؤكدة" | Topik masalah; hukum taklifi (wajib/sunnah/mubah/makruh/haram) atau wad'i (syarat/rukun/sah/batal/sebab/mani'); menurut siapa (penulis/mazhab/tokoh); dalil (tautan ke ayat/hadits); syarat dan pengecualian; ada khilaf atau tidak | LLM + review wajib |
| 9 | **Hikayat** (حكاية) | Kisah salaf di Ihya | Tokoh yang terlibat, pelajaran | Nanti (v4+) |

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

Semua relasi ini disimpan sebagai tabel relasi di Postgres. Graph DB baru dipertimbangkan bila penelusuran berlapis-lapis menjadi fitur inti.

## Tingkat risiko dan review

| Tingkat | Entitas | Review |
|---|---|---|
| **A: deterministik** | Pohon judul, metadata karya, penulis (tabel Shamela), ayat, tautan hadits ke takhrij | Validasi otomatis + cek sampel |
| **B: LLM, risiko sedang** | Tokoh, karya yang dikutip, tempat, istilah + definisi | Review sampel (misalnya 10%) + koreksi massal |
| **C: LLM, risiko tinggi** | Qaul + sikap, masalah & hukum, label status hadits | **Review ustadz wajib** sebelum tampil sebagai data terverifikasi |

Status setiap fakta: `diekstrak_ai` → `direview` → `diverifikasi_ustadz` (atau `ditolak`). Status ini selalu terlihat di UI.

## Alat ekstraksi: LangExtract

[google/langextract](https://github.com/google/langextract) v1.7.1 (8 Okt 2026, Apache-2.0, Python). Catatan: ini bukan produk resmi Google.

**Kenapa cocok:**
- **Grounding:** setiap ekstraksi tertaut ke posisi karakter (`char_interval`) di teks sumber. Ini persis kebutuhan kita akan sumber per fakta.
- **Hasil karangan otomatis ditolak.** Teks yang tidak ditemukan di sumber mendapat `char_interval = None`.
- **Skema didefinisikan lewat prompt + contoh few-shot,** sehingga contoh bisa ditulis langsung dalam bahasa Arab dari Ihya.
- **Siap untuk dokumen panjang:** ada chunking, proses paralel, beberapa putaran ekstraksi (untuk menaikkan recall), dan batch API (lebih murah).
- **Tidak terikat vendor:** Gemini, OpenAI, Ollama, atau endpoint kompatibel OpenAI.
- **Mudah direview:** ada visualisasi HTML untuk meninjau hasil ekstraksi di dalam konteks teksnya.

**Hasil tes alignment pada teks Ihya** (juz 1 halaman 200, 15 Okt 2026, tanpa LLM; hanya menguji mesin pencocokan):

| Uji | Hasil |
|---|---|
| Nama tokoh `أبو هريرة` | ✅ ditemukan (fuzzy) |
| Nama tokoh `فاطمة` | ✅ ditemukan (exact) |
| Hukum `صلاة العيدين وهي سنة مؤكدة` | ✅ ditemukan (exact) |
| Hadits berharakat, disalin persis | ✅ ditemukan (exact) |
| **Hadits yang sama tanpa harakat** (sumbernya berharakat) | ❌ **tidak ditemukan** |
| Kalimat karangan `قال ابن عباس من صام يوم الخميس…` | ✅ ditolak (benar) |

Hasilnya sama dengan `RegexTokenizer` maupun `UnicodeTokenizer`.

**Kesimpulan:** LangExtract dijalankan pada **teks ternormalisasi** (harakat dan tatweel dihapus, alif/ya/ta marbuta diseragamkan). Posisinya lalu dipetakan kembali ke teks mentah dengan peta offset. Tanpa langkah ini, banyak ekstraksi yang sebenarnya valid akan terbuang.

**Yang tidak dilakukan LangExtract (harus kita bangun sendiri):**
- **Resolusi entitas.** Contohnya menyatukan "أبو حامد", "الغزالي", dan "حجة الإسلام" menjadi satu tokoh, lalu menautkannya ke tabel penulis Shamela, URI OpenITI, dan Wikidata.
- **Penyimpanan, versi, dan alur review.**
- **Pencocokan ayat ke teks Al-Qur'an standar** (deterministik, lebih andal tanpa LLM).

## Pipeline

```
1. Normalisasi     teks mentah → teks ternormalisasi + peta offset
2. Deterministik   ayat, tautan hadits↔takhrij, validasi pohon      (tingkat A)
3. Ekstraksi       Claude Haiku 5.5 lewat Message Batches (diskon 50%),
                   structured outputs (JSON: kelas, teks, atribut),
                   instruksi + contoh few-shot Arab di prefix yang di-cache,
                   effort low, 2 putaran; tingkat C bisa dicek ulang oleh Sonnet 5.5
4. Grounding       aligner LangExtract (offline, tanpa LLM) pada teks ternormalisasi:
                   buang char_interval = None, petakan ke offset mentah
5. Resolusi        sebutan → entitas kanonik (aturan + LLM + review)
6. Simpan          Postgres: fakta + sumber (id bagian, offset, model,
                   versi prompt, id run) + status = diekstrak_ai
7. Review          sampel (B), wajib (C), lewat Langfuse atau halaman review
8. Tampilkan       kartu wiki = tampilan yang dibangkitkan dari fakta
```

**Kenapa tidak memakai LangExtract secara penuh:** batch API di LangExtract hanya untuk Vertex AI dan OpenAI, sedangkan model kita Claude Haiku 5.5. Karena itu panggilan model ditulis sendiri dengan Message Batches. Dari LangExtract kita hanya memakai mesin *alignment*-nya, yang sudah terbukti bekerja tanpa LLM (lihat tes di atas). Biaya ekstraksi wiki untuk seluruh Ihya diperkirakan ±$0,33–0,51 (lihat [08 Biaya](08-biaya.md)).

**Pilot:** jalankan pipeline ini dulu pada **satu kitab dari Ihya** (misalnya *Kitab al-'Ilm*). Ukur biaya, presisi, dan recall bersama ustadz sebelum diperluas ke seluruh Ihya, lalu ke kitab lain.

## Bahan awal yang sudah tersedia

- **Tabel penulis Shamela** (`author.sqlite`): 3.187 penulis lengkap dengan tahun wafat dan biografi. Ini menjadi titik awal untuk entitas tokoh.
- **Katalog Shamela**: kategori, penerbit, dan edisi setiap kitab.
- **Takhrij al-'Iraqi** di catatan kaki Ihya.
- **ID eksternal** untuk interoperabilitas: Wikidata (tokoh) dan URI OpenITI (penulis dan karya).
