# X26 · MCP berbahasa Inggris: batch terjemahan Inggris dan peralihan bantuan baca

> **Fase:** Sisipan (tahap pertama baris "Bahasa Inggris" di FASE) · **Status:** belum
> **Prasyarat:** X24 selesai (Intisari v2 di korpus) · Tugas pemilik:
> - izin biaya batch terjemahan Inggris (aturan keras 4);
> - tugas baru saat sesi ini: memilih sumber terjemahan ayat Inggris berlisensi.
> **Perkiraan:** 2 percakapan agent: (1) batch, eval, dan ingest; (2) MCP dan konten.

## Tujuan

Bantuan baca di MCP publik `/mcp` menjadi **bahasa Inggris saja** ([ADR-130](../keputusan/ADR-130.md) butir 3). Cakupannya terjemahan AI per paragraf, ringkasan bagian, judul dan subjudul terjemahan, Intisari, gloss glosarium, dan label buatan kode. `/redaksi` mengikuti bahasa draf. Teks kitab, catatan kaki, takhrij, dan ayat tetap Arab. Format konten turunan juga menerima versi Inggris yang kerangkanya sama dengan induk Indonesianya.

## Baca dulu (hanya ini)

- [ADR-130](../keputusan/ADR-130.md), lalu [ADR-092](../keputusan/ADR-092.md) §5: daftar bagian yang masih terkunci "id". Daftar itu menjadi daftar kerja sesi ini, tetapi hanya untuk bagian yang dipakai MCP.
- [docs/09-konten.md](../../docs/09-konten.md) §8 dan [docs/05](../../docs/05-kebijakan.md) §11.
- [docs/08-biaya.md](../../docs/08-biaya.md): biaya aktual batch terjemahan Indonesia (S13) dan `scripts/hitung_biaya.py`.
- `/docs-terbaru @modelcontextprotocol/server`, `/docs-terbaru anthropic batches` (skill `claude-api`).

## Langkah

1. **Biaya dan izin.**
   - Hitung batch terjemahan Inggris seluruh Ihya dengan `scripts/hitung_biaya.py`. Dasar perkiraan: Sonnet 5.5 + `translate-passage@5` di X21 US$36,95 (±US$35–45 untuk Inggris); Haiku di S13 US$3,35, tetapi mutunya jauh lebih rendah. Sajikan kedua pilihan model.
   - Tulis angkanya di STATUS, lalu minta izin pemilik di chat sebelum mengirim apa pun.
2. **Pipeline Inggris** (`packages/llm`, `tools/ingest`) untuk terjemahan paragraf, ringkasan bagian (313 ringkasan `en` lama dinilai dulu: pakai atau buat ulang), judul daftar isi dan subjudul (`translate-toc-title`, kini berkunci `indonesia`), serta gloss glosarium:
   - prompt `translate-passage` versi Inggris, dengan transliterasi istilah yang seragam dengan glosarium;
   - placeholder ayat tetap utuh;
   - pemeriksa `check.ts` per bahasa (kata Inggris kini dianggap komentar meta);
   - `pnpm llm --lang en`;
   - ingest yang menerima `lang: "en"` (kini `z.literal("id")`).
3. **Pilot dan eval.**
   - Jalankan batch kecil (±200 paragraf, berlapis seperti T-17).
   - Penilai agen menilai Benar/Kurang/Salah dari teks Arab. Ambang sama dengan tahap 3 T-17.
   - Bandingkan dengan terjemahan Indonesia pada sampel yang sama ("Tinjau ulang bila" di ADR-130).
   - Bila lolos, kirim batch penuh, lalu ingest ke staging.
   - Eval MCP berbahasa Inggris: set soal riset Inggris dari soal eval MCP/retrieval yang ada, dengan kueri Latin Inggris untuk `search_text` (hit@10 dibandingkan dengan Cari Indonesia).
4. **MCP** (`apps/mcp`, `packages/db`, `packages/core`):
   - Parameter bahasa repo (`readPage`, `readSection`, judul daftar isi, `searchText`, kutipan, Intisari, glosarium) dari konstanta ke argumen.
   - MCP selalu memakai `en`.
   - `search_text` dengan huruf Latin mencari di terjemahan Inggris. Untuk itu dibutuhkan FTS Latin per bahasa, stemmer, dan stopword Inggris.
   - `get_section_digest` hanya mengembalikan Intisari `en`; bagian tanpa Intisari Inggris → `null`.
   - Field `human_review` tidak dikirim untuk teks `en`, karena belum ada editor Inggris.
   - Label buatan kode versi Inggris: status takhrij (`takhrij-label.ts`, ditinjau seketat label Indonesia karena aturan status hadits), sitasi (`citation.ts`), dan label AI.
   - `/redaksi` mendapat argumen `lang` (bawaan `id`) di tool baca, `check_content_draft`, dan `list_faedah_candidates`. Untuk itu `CONTENT_LANG` di `content-check.ts` menjadi parameter. Versi Inggris membaca induknya lewat `get_section_digest(lang: "id")`.
   - Deskripsi tool menjadi Inggris saja (menyimpang dari ADR-012, dicatat di ADR-130).
   - Instruksi `/mcp` dan `/redaksi` menyebut "English translations/digests" dan tetap ≤ 2.000 karakter.
   - Ayat: sertakan terjemahan Inggris berlisensi bila sumbernya sudah ada. Bila belum, tetap Kemenag, dan tulis terbuka di STATUS.
   - Kunci cache yang menyimpan hasil MCP memuat bahasa.
5. **Konten turunan versi Inggris** (`packages/core`, plugin):
   - `lang` menerima `"en"` (tidak pernah `"ar"`).
   - Lint narasi Inggris: atribusi, fatwa, sapaan, status hadits, parafrase ayat, honorifik seragam, dan tanpa huruf Arab.
   - Cek **kesamaan kerangka** terhadap induk `id` dengan `section_id` dan `versi` yang sama: jumlah dan urutan gagasan, `dasar`, `sikap`, `jenis`, kutipan, `istilah`, butir Faedah, dan hari Jalur.
   - `lang` masuk `contentDraftSha256` **hanya bila bukan `"id"`**, supaya cap unit Indonesia yang sudah ada tetap sah.
   - Berkas `data/konten/<jenis>/<id>.en.json`.
   - Kelayakan Faedah dihitung per bahasa. Versi Inggris boleh berisi sebagian butir induk, tetapi tidak boleh menambah butir.
   - Aturan transliterasi dan honorifik Inggris ditetapkan dan dikunci di lint.
   - Plugin `surau-redaksi`: skill versi Inggris (baca teks Arab + induk, tulis teks Inggris, tiga lapis cek). Naikkan versinya.
6. **Bukti di produksi:**
   - Jalankan `uji-mcp.sh` (mode `mcp` dan `redaksi`): setiap hasil bantuan baca ber-`lang: "en"`.
   - Pindai sampel respons: tidak ada teks Indonesia di bantuan baca.
   - Pastikan `/mcp` tetap 8 tool.

## Selesai bila

- [ ] `pnpm verify` lolos. Ada tes untuk MCP `en` di dua era protokol, lint Inggris, dan kesamaan kerangka (versi Inggris yang menambah atau mengubah gagasan ditolak).
- [ ] Laporan eval terjemahan Inggris tersimpan di `data/reports/`, dengan biaya aktual tercatat di docs/08.
- [ ] MCP produksi: `read_section` dan `read_page` mengembalikan terjemahan `en`, deskripsi tool berbahasa Inggris saja, dan `search_text` berhuruf Latin menemukan paragraf lewat terjemahan Inggris.
- [ ] Satu Intisari Bab versi Inggris (100007 atau 100017) lolos tiga lapis dan tampil di `get_section_digest`.
- [ ] Eval MCP Inggris (termasuk `search_text` Latin Inggris) tercatat, dan label status takhrij Inggris punya tes per kategori.
- [ ] Diperbarui:
  - STATUS, LOG, docs/05 §11 (termasuk aturan 4 dan 7 di instruksi);
  - docs/07 baris "Bahasa dokumentasi publik" (deskripsi MCP tidak lagi dwibahasa);
  - deskripsi `search_text` (kueri Latin dalam bahasa Inggris);
  - README MCP, ARSITEKTUR-TEKNIS, dan file sesi ini.
- [ ] Bila terjemahan ayat Inggris masuk: teks-arab.md aturan 9 dan docs/01 prinsip 5 (Kemenag) disesuaikan.
- [ ] `peninjau` dijalankan.

## Di luar cakupan

- Situs `/en/…` (antarmuka, rute, hreflang) dan Maknaz berbahasa Inggris. Keduanya memakai hasil batch yang sama, tetapi dikerjakan di sesi bahasa Inggris berikutnya.
- Intisari Inggris untuk semua bagian. Dibuat bertahap lewat plugin dengan langganan.
- Situs Arab.
- Konten Arab tulisan AI (tidak pernah dibuat, ADR-130).

## Catatan hasil

*(diisi agent di akhir sesi)*
