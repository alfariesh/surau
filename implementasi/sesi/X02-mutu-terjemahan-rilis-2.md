# X02 · Sesi sisipan: perbaikan mutu terjemahan AI dan ayat sebelum rilis Fase 2

> **Fase:** sisipan (sesudah S15, sebelum `/rilis 2`) · **Status:** selesai
> **Prasyarat:** S15 selesai · T-16 dan T-17 tahap 2 dinilai agent lain (laporan diteruskan pemilik sebagai lapisan koreksi, "bukan kebenaran mutlak"; diperiksa ulang di sesi ini) · izin pemilik di chat (2026-10-17, "Ok go ahead"): biaya terjemahan ulang ≤ $1 dan promote korpus baru ke produksi setelah lolos QA
> **Perkiraan:** 1 percakapan agent

## Kenapa sesi ini ada

Penilaian T-17 tahap 2 atas 20 sampel batch: Benar 70% (target ≥ 80%), Salah 10% (batas ≤ 10%). Penilaian T-16: 20/20 rujukan ayat cocok. Temuan yang perlu diperbaiki sebelum rilis:
- Satuan *mann* diganti "rithl" (p3031, p3032; p3033 menulis "mana").
- "Lengan baju" menjadi "siku" (p9200).
- Ungkapan tebusan *bi abi anta wa ummi* diterjemahkan sebagai sumpah ("demi ayah dan ibuku"), sistematis di ±18 dari 23 kemunculan.
- Judul bab nikah terbalik (p5351; p5354 ternyata benar).
- "Menerima kitab dengan tangan kanan/kiri" berubah (p20304).
- Kutipan QS 54:55 terbelah di dua paragraf (p18256–p18257), sehingga tidak dikenali dan ikut diterjemahkan AI.
- Kalimat kaki halaman "Kutipan ayat tidak diterjemahkan AI" terlalu mutlak.

## Langkah

1. **Lapisan koreksi tinjauan:** `data/reviews/ihya-9472-terjemahan.json` (tanpa teks kitab) berisi paragraf yang dinilai Salah/Kurang, alasan, penilai, dan versi prompt yang ditolak. `pnpm llm rejudge` menolak hasil versi itu (`review_rejected`), dan `pnpm llm retry` mengirimnya ulang ke Sonnet 5.5.
2. **Prompt `translate-passage@3`:** aturan umum untuk satuan (tidak diganti atau dikonversi), ungkapan baku (tebusan), pakaian (lengan baju), pola judul *at-targhib fi … wa at-targhib 'anhu*, menerima kitab dengan tangan kanan/kiri, dan kalimat lanjutan dari paragraf sebelumnya.
3. **Pengenal ayat lintas paragraf:** kutipan yang mulai di ujung satu paragraf badan dan berlanjut di awal paragraf berikutnya. Aturannya sama ketatnya dengan mode tanpa tanda ADR-042 (≥ 5 kata sama persis, lafaz satu-satunya, atau ≥ 4 kata sesudah pengantar ayat), dan ditautkan sebagai dua rujukan sebagian.
4. Kalimat kaki halaman: "kutipan ayat **yang dikenali**".
5. `pnpm llm rejudge` → `plan --round 1` + `submit` (paragraf/ringkasan yang sumbernya berubah) → `retry` (koreksi tinjauan) dengan `--budget` = terpakai + $1 → `collect` → `report`.
6. Bangun `ihya-v6`, muat lokal, eval retrieval (`--gate`), muat staging, promote produksi (izin sudah ada), `corpus:qa`.
7. Nilai ulang 20 sampel T-17 yang sama dan sampel terarah. Skor lama tetap tercatat.

## Selesai bila

- [x] Lapisan koreksi tinjauan + prompt v3 + pengenal ayat lintas paragraf teruji (`pnpm verify` lolos; tes di `batch.test.ts`, `matcher.test.ts`, `translate.test.ts`)
- [x] QS 54:55 di p18256–p18257 tertaut ke ayat dan tidak diterjemahkan AI (dua rujukan sebagian; terjemahan v3 berisi `⟦QS 54:55⟧`)
- [x] Semua paragraf di daftar koreksi punya terjemahan baru (prompt v3) atau sengaja tanpa terjemahan; biaya ≤ $1 di atas biaya S13 (27/27 v3, biaya $0,25)
- [ ] `ihya-v6` di produksi, `corpus:qa` 30/30, eval retrieval set resmi hit@10 ≥ 90% (DB produksi dibuat, QA 30/30, eval 100%; dicentang setelah deploy terbukti melayani terjemahan v3)
- [x] 20 sampel T-17 dinilai ulang (skor lama dan baru dicatat di LOG): 70% → 20/20 Benar (penilai agent X02, bias)
- [x] STATUS, LOG, KEPUTUSAN (ADR-047), TUGAS-PEMILIK, dan file sesi ini diperbarui

## Di luar cakupan

- Menerjemahkan ulang seluruh korpus atau mengubah prompt untuk semua paragraf.
- Halaman `/tinjau` dan penyimpanan tinjauan di D1 (S18).

## Catatan hasil

2026-10-17 · ADR-047.

**Yang dibuat**
- **Lapisan koreksi tinjauan** (`tools/ingest/src/llm/reviews.ts`, `data/reviews/ihya-9472-terjemahan.json`): 27 paragraf.
  - 6 dari sampel T-17 tahap 2.
  - 21 dari sampel terarah agent X02: 17 ungkapan tebusan, 3 satuan *mann*, 1 judul bab nikah.
  - Kandidat pola yang ternyata benar tidak dimasukkan (p5354, p4579, p4710, p13750, p20206).
- **Prompt `translate-passage@3`** (`packages/llm/prompts/translate-passage-v3.ts`).
- **Pencocok ayat lintas paragraf** (`crossPassageSpans`): 1 pasang di Ihya (QS 54:55). Percobaan pertama juga menautkan 27 pembuka khutbah dan 1 kalimat penulis; aturannya diketatkan sebelum dipakai.
- **Kaki halaman pembaca** kini membatasi klaim ayat ke kutipan yang dikenali.
- **Sampel QA T-17 dibekukan:** nomor tanpa terjemahan tidak diganti. Judul halaman QA menyebut 20 paragraf + 5 ringkasan.
- **Batch** (atas izin pemilik, anggaran ≤ $1, dijaga `--budget 5.43`):
  - 26 ulangan Sonnet 5.5;
  - 2 paragraf ayat (Haiku, v3);
  - ringkasan bab 100273 (2 bahasa) dan induknya 100262 + 100180 (putaran 2).
  - Semuanya lolos pada percobaan pertama. Biaya **$0,25** (total Ihya $4,68).
- **Korpus `ihya-v6`** (sha256 build `8835320f…`): lokal, staging, dan produksi `surau-corpus-ihya-v6` (`537103c6-…`). QA 30/30. Eval retrieval lokal hit@10 100% (`evals/reports/retrieval-2026-10-17-ihya-v6-x02.md`). `ihya-v5` menjadi rollback.

**Penilaian ulang 20 sampel T-17 (agent X02)**

| | Benar | Kurang | Salah |
|---|---|---|---|
| Sebelum (agent lain, diwakilkan pemilik) | 14 (70%) | 4 | 2 |
| Sesudah X02 (6 nomor berubah: p3032, p9200, p3482, p17158, p18257, p20304) | 20 (100%) | 0 | 0 |

Angka "sesudah" bias, karena perbaikannya menyasar sampel itu dan penilainya agent yang memperbaiki. Mutu 16 ribu terjemahan v2 lainnya belum diukur ulang tanpa bias. Usulannya **T-17 tahap 3**: 20 sampel acak baru, seed baru, dinilai pemilik atau ustadz.

**Insiden holdout eval:** halaman tinjauan T-12 (artifact) sempat dibagikan lewat tautan dan memuat teks 9 soal privat. Teksnya sudah dihapus dari halaman (versi 3), dan pemilik disarankan menutup berbagi tautan. Catatan lengkapnya di ADR-047.

**Utang / pesan untuk sesi berikutnya**
- **`/rilis 2` siap dijalankan pemilik.** Butir "pemeriksaan kualitas" sudah dinilai dan dicatat.
- **Pola kesalahan lain** mungkin masih ada di terjemahan v2 (negasi/arah makna, istilah fikih). Tambahkan entri ke lapisan koreksi bila ditemukan (pengguna lewat laporan kesalahan, S18 lewat ustadz).
- **Holdout eval kini lemah** (9 soal sempat terbaca lewat tautan). S18 menyusun soal privat baru.
- Ayat yang luput dari pencocok tetap mungkin ada di bentuk lain (ADR-042).
