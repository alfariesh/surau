# X06 · Sesi sisipan: status hadits dari label istilah takhrij

> **Fase:** sisipan Fase 4 (sesudah X05, sebelum `/rilis 4`) · **Status:** selesai
> **Prasyarat:** S21, X03, X05 selesai · izin pemilik di chat untuk satu eval publik berbayar (±US$0,11): "ya jalankan" (2026-10-21)
> **Perkiraan:** 1 percakapan agent

## Kenapa sesi ini ada

Syarat R4 "status hadits benar 100%" belum terbukti: sejak S21 status hadits ditulis model sebagai kalimat bebas, dan metrik eval mencocokkan string gold persis (selalu 0). Review ustadz (Anas, T-24) belum bisa diminta dalam waktu dekat, jadi status dibuat dari label per catatan kaki takhrij yang deterministik, bisa diaudit, dan mudah ditinjau nanti.

## Baca dulu (hanya ini)

- `.claude/rules/teks-arab.md` no. 1 dan 6, ADR-066 butir 1, ADR-052, ADR-068.
- `evals/README.md` (aturan holdout).

## Langkah

1. Kosakata label kecil yang tetap + pengenal frasa Arab baku al-'Iraqi (deterministik, dengan rentang mentah).
2. Ukur gratis: berapa dari 4.398 catatan kaki yang terlabel; periksa sampel acak.
3. Sisanya: batch AI dengan izin biaya bila perlu (ternyata tidak perlu, lihat ADR-069 butir 8).
4. Pipeline Jawab memakai label untuk status hadits; metrik eval status hadits berbasis label; `peninjau`; SATU eval publik berbayar setelah izin pemilik.
5. Antrean tinjauan label di `/tinjau`: tindak lanjut (di luar sesi ini).

## Selesai bila

- [x] Persentase terlabel deterministik vs AI tercatat di ADR baru (ADR-069): 95,5% dikenali sebagai takhrij oleh aturan kode, 0% AI (batch AI tidak diperlukan; sisanya bukan takhrij)
- [x] Label status di jawaban selalu dari tabel label + frasa Arab dari DB, untuk klaim `hadith[]` (bagian "Status hadits") dan baris "Status hadits:" bersitasi (tes `jawab-unit`, `answer-view`, API). **Catatan terbuka:** teks jawaban masih memuat kalimat penilaian bebas tulisan model yang bersitasi takhrij, di 5/5 soal status hadits yang lolos pada eval (baris statusnya diganti pemberitahuan netral); itu tidak dicek terhadap label (ADR-069 Konsekuensi, tindak lanjut).
- [x] Kutipan valid tetap 100% (`x06-publik-takhrij-v1`: 166/166)
- [x] Metrik status hadits eval publik tercatat sebelum/sesudah: 0/6 (X05, string bebas) → 5/6 (X06, label; definisi baru dicatat di ADR-069)
- [x] Biaya per jawaban tetap ±US$0,002–0,003 (US$0,0026 tanpa routing)
- [x] `pnpm verify` lolos (format, lint, typecheck, tes, build)
- [x] STATUS, LOG, dan file sesi ini sudah diperbarui
- [ ] PR di-merge (squash) setelah CI hijau — menunggu (file ini ikut PR itu; dicentang sesudah merge)

## Di luar cakupan

- Antrean tinjauan label di `/tinjau` dan label di tool MCP `get_hadith_takhrij` (tindak lanjut).
- Prompt jawaban (tidak diubah), pencarian/lokasi, kalibrasi judge, holdout.

## Catatan hasil

- **Pengenal istilah** `takhrijTerms` (packages/text) + **label** `takhrijLabel` (core): frasa baku al-'Iraqi per kata atas `normalizeArabic`, rentang mentah, bagian lafaz tidak dipindai. Korpus `ihya-v7`: 95,5% catatan kaki dikenali sebagai takhrij (76,8% memuat istilah, 8,1% hanya sumber, 10,6% hanya rujukan), 4,5% bukan takhrij; `pnpm run eval:takhrij` → `data/reports/ihya-9472-takhrij-label.md`.
- **Ketepatan** (agent, bias): sampel 70 → 2 istilah keliru dari lafaz (diperbaiki); sampel 50 → 0 keliru, 3 terlewat (ditambahkan); 6/6 takhrij gold publik sesuai kategori gold; tes regresi DB lokal untuk keenamnya.
- **Pipeline (`pipeline@6`):** klaim status dari struktur catatan kaki per takhrij yang disitasi (`rule_extracted`, `terms`, `mixed`); baris "Status hadits:" bersitasi diganti label + lokasi hadits; pemberitahuan netral menunjuk bagian "Status hadits". Tanda kelemahan UI dari label yang sama (`takhrijHasWeakTerms` dihapus).
- **Eval:** metrik Takhrij berbasis label (klaim di luar gold dilaporkan, bukan gagal); `eval:jawab hadits --run` mengulang status hadits gratis atas arsip. Eval berbayar sekali: Takhrij 0/6 → 5/6, kutipan 100%, lokasi 85,3%, penolakan 100%, US$0,0026/jawaban.
- **Peninjau** dua putaran: 1 blocker (tes API) + 8 penting + 11 kecil, semua ditutup sebelum eval; 5 kecil putaran 2 ditutup.
- **Untuk sesi berikutnya:** antrean tinjauan label di `/tinjau` (Anas menyetujui/mengoreksi label per catatan kaki, terikat `rules_version`); label di tool MCP `get_hadith_takhrij`; kalimat penilaian bebas model yang bersitasi takhrij belum dicek terhadap label (model terus menaruh penilaian di sana; pertimbangkan prompt yang menyerahkan status ke label). Tes Ihya lokal `tools/ingest/test/ihya-text.test.ts` kadang melewati batas 5 dtk saat suite penuh di mesin sibuk (lolos sendiri).
- Biaya API sesi: US$0,1092. Holdout tidak dipakai.
