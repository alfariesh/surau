# Log Sesi

Entri terbaru di paling atas. Satu entri per sesi (atau per hari kerja bila satu sesi butuh lebih dari satu percakapan).

**Arsip:** file ini hanya memuat bulan berjalan. Entri bulan sebelumnya dipindah apa adanya ke [log/](log/), satu berkas per bulan (`log/YYYY-MM.md`). Per 2026-10-28 semua entri masih Oktober 2026, jadi belum ada arsip. Awal bulan berikutnya, pindahkan entri bulan lalu ke `log/YYYY-MM.md` tanpa mengubah isinya.

Format entri:

```
## YYYY-MM-DD · SNN · Judul sesi — selesai | sebagian | terblokir
- Dikerjakan: 2–5 poin
- Verifikasi: perintah yang dijalankan → hasil (mis. `pnpm verify` → lolos, 42 tes)
- Biaya API: $x (bila ada panggilan LLM berbayar), atau –
- Keputusan: ADR-NNN (bila ada)
- Catatan untuk sesi berikutnya: …
```

## 2026-10-28 · A0 · Tarik dua gagasan Intisari Salah dari produksi — selesai
- Dikerjakan: daftar tarik `data/reviews/ihya-9472-intisari-tolak.json` (100007 gagasan 4, 100017 gagasan 2; penjaga versi `created_at`) dibaca `packages/core`: `readDigest` (halaman Intisari, Uji pemahaman, `dengar.json`, MCP `get_section_digest`), kepala Intisari (`listShownDigestHeaders` dkk. + kueri db `getDigestPointSizes`), dan jalur gagasan Cari. Audio node yang terkena tidak dikirim. Audit induk: 100004 tidak memuat klaim gagasan 4 100007, dan 100003 belum ada di `ihya-v9`.
- Verifikasi: tes core/db/web baru (berkas sah, versi lain tidak terkena, readDigest tanpa gagasan/dalil/audio, kepala dikurangi, Cari tanpa gagasan dan tanpa `matched_by` digest, sidik di kunci cache, penjaga impor web); `pnpm verify` → lolos (1139 + 487 tes); peninjau → 1 blocker (cache Cari 7 hari) + 4 penting, semua diperbaiki; PR #211 digabung (`3dc4fdd`), deploy web + MCP sukses; curl produksi `/kitab/ihya/bab/100007/intisari` dan `/100017/intisari` → HTTP 200, frasa "setara dengan ibadah sunah" dan "secara harfiah" 0 (sebelumnya 2), tombol Dengarkan 0 (sebelumnya 1), gagasan lain tetap tampil; `dengar.json` kedua bab → 404 (sebelumnya 200); MCP produksi `get_section_digest` 100017 → gagasan 1, 3–7, pertanyaan 2 hilang, `audio: null`.
- Biaya API: –
- Keputusan: ADR-127
- Catatan untuk sesi berikutnya: mp3 `ihya/id/100007-65113d52a871.mp3` dan `ihya/id/100017-b81d9fe0c222.mp3` masih di R2 (hapus + purge atas izin pemilik). Halaman `/koreksi` publik belum ada, dan guard promote untuk baris ditolak juga belum (sisa usulan A0, `09-pecahan-produk.md`). X24 harus memastikan audio lama kedua bab tidak ikut dimuat bersama Intisari v2.

## 2026-10-28 · X23 · Redaksi Surau: rangka konten, standar, plugin Claude, pedoman — selesai
- Dikerjakan: rangka dan standar konten turunan ([docs/09-konten.md](../docs/09-konten.md)), pedoman redaksi ([docs/redaksi-operasional.md](../docs/redaksi-operasional.md)), docs/05 §11 dan §13, ADR-125. Core: format `surau-konten/1` (`contentDraft`), `lintContent`, `checkContentDraft`, `listFaedahCandidates`, `readinessIssues`; pemeriksa narasi, `quoteInspector`, `digestTierOf`, `QUOTE_BANNED_TAKHRIJ_KINDS` dipindah ke core (ekspor ulang di tempat lama); `findQuoteAll`/`isQuoteSpan` di text. MCP endpoint `/redaksi` (8 + `check_content_draft`, `list_faedah_candidates`), ember batas sendiri, label telemetri `endpoint`; `uji-mcp.sh` mode `redaksi`. CLI `pnpm konten cek|impor|daftar|calon` (korpus remote hanya-SELECT). Plugin `plugins/surau-redaksi` (6 skill, konektor `/redaksi`, marketplace root `surau`), `pnpm plugin:paket`, agen `pemeriksa-konten`. Pilot 3 unit `siap`.
- Verifikasi: `pnpm verify` → lolos · tes core konten 13, MCP 39 (`/mcp` tetap 8 tool, `/redaksi` 10 di dua era), CLI/plugin 16 · `claude plugin validate` plugin dan marketplace → lolos · pilot: cek kode lolos, periksa independen putaran final (diulang sesudah perbaikan, atas temuan peninjau) 100007 B4/K3/S0, 100017 B6/K1/S0, Faedah B5/K0/S0; satu butir Faedah dibuang ([laporan](../data/reports/konten-qa-2026-10-28.md)).
- Biaya API: – (pilot memakai langganan lewat agen Claude Code; MCP tanpa LLM)
- Keputusan: ADR-125 (gerbang terbit cukup cek otomatis tiga lapis, keputusan pemilik; menyimpang dari saran riset)
- Catatan untuk sesi berikutnya: X24 membangun baris DB langsung dari draf (bukan `acceptedDigest`), migrasi korpus 10 (`digest.lead`, `digest_question.answer`), kaskade induk 100004/100003 dan audio 100007/100017 gugur; terjemahan AI p165 perlu koreksi; dua gagasan Salah lama masih tayang di produksi sampai X24 atau sesi penarikan; T-33 baru berguna sesudah `/redaksi` ter-deploy.

## 2026-10-28 · X22b · Lokasi gold Jawab dan pemberitahuan status hadits — selesai
- Dikerjakan: bedah lima soal yang gold-nya tidak ada di dokumen (j004 terpangkas anggaran di peringkat 36/39; j005 dan j024 hanya terjangkau pencarian makna; j019/j021 pertanyaan gabungan); percobaan bobot daftar sempit atas empat arsip rute ditolak; bunyi `HADITH_NOT_CITED` jadi kalimat biasa, pipeline@16.
- Verifikasi: `eval:jawab kandidat` (gratis, `ihya-v9`) → 29/34 tanpa makna, 31/34 dengan peringkat makna v2; run publik berbayar `x22b-publik-makna-haiku-v1` (Haiku + makna) → lokasi 85,3% → 88,2% (30/34), takhrij 6/6, kutipan 100%, menolak 7/8; tes llm 176 lolos; `pnpm verify` → lolos.
- Biaya API: US$0,1109 (izin pemilik di chat, pagu US$0,30)
- Keputusan: ADR-129
- Catatan untuk sesi berikutnya: pencarian makna di Worker adalah satu-satunya tuas lokasi yang terukur (+1 soal, 88,2% < 90%); aktifkan bersama keputusan model/anggaran Jawab (ADR-123). "bahan yang ada" butuh prompt baru.

## 2026-10-28 · X22 · Uji Sonnet 5.5 di tahap jawaban Maknaz — selesai
- Dikerjakan: opsi eval `--model sonnet` (produksi tidak berubah) dan perintah gratis `arsip-sebagian`; satu run publik 42 soal dengan Sonnet 5.5 memakai rute x10; 84 jawaban (Sonnet + x10 dinilai ulang) diacak dan dinilai enam subagen buta model; laporan perbandingan.
- Verifikasi: `eval:jawab answer --model sonnet` → 42/42, kutipan valid 100%, lokasi 85,3%; penilaian buta → kesetiaan 64,3% → 92,9%, atribusi 83,3% → 100%, bahasa 3,55 → 3,76, Benar/Kurang/Salah 31/7/4 → 36/5/1; `pnpm verify` → lihat PR.
- Biaya API: US$2,0761 (pagu US$4, izin pemilik di chat). Penilaian oleh subagen agent tanpa biaya API terpisah.
- Keputusan: ADR-123
- Catatan untuk sesi berikutnya: Sonnet ±17× lebih mahal (±US$0,05 per soal) dan R4 tetap belum terpenuhi (kesetiaan 92,9% < 95%, bahasa 3,76 < 4, lokasi 85,3% < 90%); produksi tetap Haiku sampai pemilik memutuskan anggaran/kuota. Retrieval lokasi dan pemberitahuan "lihat bagian Status hadits" (j024, j025) adalah perbaikan gratis berikutnya.

## 2026-10-28 · Pangkas bagian Sekarang di STATUS.md — selesai
- Dikerjakan: bagian Sekarang (±24 KB) diganti ringkasan 13 baris (±3,9 KB); blok Diperbarui di header diringkas dan rollback ihya-v8 dipertahankan. Teks lama dipindah ke `log/STATUS-arsip-2026-10.md`. Ulasan peninjau memperbaiki 228/234, T-17 terbaru, syarat R4, dan butir tindak lanjut yang sempat terpotong.
- Verifikasi: pembanding kalimat → 398 kalimat lama, 0 hilang; tautan relatif rusak 0; `session-start.sh` → exit 0 dan memuat "Mulai di sini (pemilik)"; tabel Progres dan bagian di bawahnya identik.
- Biaya API: –
- Keputusan: ADR-120
- Catatan untuk sesi berikutnya: `Sudah bisa dicoba` dan `Perhatian` masih panjang dan belum dipangkas; US$35,89 (blok lama) dan US$36,95 (Progres X21) berbeda dan belum disamakan.

## 2026-10-27 · Riset ringkasan buku (Blinkist, Headway, Deepstash, Uptime), audit Intisari, pecahan produk — selesai
- Dikerjakan: folder `docs/riset/2026-10-27-ringkasan-buku-dan-pecahan-produk/` (README + 9 dokumen: empat app, pola lintas app, lanskap kitab Islam dan Indonesia, korpus dan data, audit Intisari, pecahan produk); 8 halaman di file Paper "Surau Research" (layar Mobbin tidak masuk repo, hak cipta pihak ketiga); pemeriksaan fakta atas semua dokumen dan tinjauan `peninjau`.
- Verifikasi: `pnpm verify` → lolos · grep huruf Arab di folder → 0 · 166 tautan relatif → 0 putus · peninjau → tanpa blocker, 12 temuan diperbaiki.
- Biaya API: – (Mobbin dan WebSearch; tanpa LLM berbayar milik Surau)
- Keputusan: tidak ada ADR baru. Rekomendasi (belum diputuskan pemilik): tidak memecah merek, "Academy" jadi "Jalur", Intisari dibenahi pembungkusnya; keputusan pemilik ada di `09-pecahan-produk.md` bagian 7.
- Catatan untuk sesi berikutnya: dua gagasan Salah di bab 100017 dan 100007 masih tayang dengan audio (cek langsung 2026-10-27); menghapus mp3 dari R2 butuh izin pemilik. Produksi `ihya-v9` hanya memuat 19 Bab (100003 dan 100019 404, sedangkan laporan QA memuat 20 Bab): belum dijelaskan di repo.

## 2026-10-27 · Sisa "… …" di baris status hadits (j026) — selesai
- Dikerjakan: perlindungan status kini per pernyataan (`ownEnd`), bukan per baris; kutipan Arab bersitasi sesudah kalimat memindah sitasinya ke kalimat itu, sehingga baris status mendapat label kode; pipeline@15.
- Verifikasi: `pnpm verify` → lolos · reproduksi j026 (status Latin + kutipan takhrij Arab bersitasi) → "Status hadits: <label kode> (hadits di Ihya …)." tanpa "…".
- Biaya API: –
- Keputusan: ADR-116
- Catatan untuk sesi berikutnya: dampak ke skor belum diukur (run berbayar, izin pemilik).

## 2026-10-27 · /kitab: Rilis terbaru + kitab "Segera hadir" dengan suara minat anonim — selesai
- Dikerjakan: 13 kitab kandidat dari laporan pencocokan Shamela pemilik tampil di `/kitab` sebagai kartu "Segera hadir"; popup dua pertanyaan pilihan tetap (tujuan, kemampuan baca Arab) dikirim ke `POST /api/minat-kitab`; tabel `kitab_interest` (migrasi 0007); rekap di `/admin`; `/privasi` dan docs/05 diperbarui. Email tidak dikumpulkan (ADR-115 butir 4).
- Verifikasi: `pnpm verify` → lolos (1.113 + 452 tes, build, sesudah digabung dengan main) · pratinjau `next dev` (korpus staging, D1 app lokal): 13 kartu tampil di desktop dan ponsel, popup terkirim (201), dua suara sama = satu baris agregat `votes 2`, popup kitab yang sudah dipilih menampilkan "sudah memilih" setelah muat ulang, rekap admin dicek lewat halaman sementara (sudah dihapus) · peninjau: tanpa blocker; semua temuan "perbaiki" + saran tabel agregat diterapkan.
- Biaya API: –
- Keputusan: ADR-115
- Catatan untuk sesi berikutnya: kandidat `TITLE_VARIANT` di CSV (mis. Minhaj ath-Thalibin, Bidayat al-Mujtahid, Tarikh al-Khulafa') bisa ditambahkan setelah dicek manual.

## 2026-10-27 · Eval x10: bekas huruf Arab dirapikan — selesai
- Dikerjakan: satu run publik Jawab berbayar (izin pemilik di chat) dengan pipeline@13; 42 jawaban dinilai tiga subagen agent; laporan x09 → x10; regresi angka Arab-India ("nomor (١)") diperbaiki, pipeline@14.
- Verifikasi: `eval:jawab answer` → 42/42, kutipan 100%, lokasi 85,3%, status hadits kode 5/6; penilaian agent → bahasa 3,26, kesetiaan 78,6%, atribusi 95,2%; `pnpm verify` → lolos.
- Biaya API: US$0,1216.
- Keputusan: hasil dicatat di ADR-114.
- Catatan untuk sesi berikutnya: "… …" sisa pernyataan status di j026 (`hadithCheck`); kalimat gema/salinan terjemahan kini cacat bahasa terbesar (perlu prompt + run berbayar).

## 2026-10-27 · Bekas huruf Arab di jawaban Maknaz — selesai
- Dikerjakan: bekas huruf Arab buatan model ditandai per blok (`markArabic`) lalu dirapikan atas teks gabungan (`tidyArabicCuts`): bekas di kurung/akhir kalimat dibuang tanpa jejak, kalimat yang isinya hilang ("bahwa …", titik dua, < 3 kata) dibuang utuh, baris "Status hadits:" dilindungi, blok yang habis tidak ditampilkan; pipeline@13.
- Verifikasi: `pnpm verify` → lolos · uji atas jawaban x08/x09 nyata ("…" dikembalikan ke kata Arab) → 0 "…" tersisa.
- Biaya API: –
- Keputusan: ADR-114
- Catatan untuk sesi berikutnya: dampak ke skor bahasa belum diukur (run berbayar, izin pemilik); larangan transliterasi kalimat Arab di prompt butuh prompt baru + run berbayar.

## 2026-10-27 · Regresi lam_ajid (j029): aturan istilah versi 3 — selesai
- Dikerjakan: `lam_ajid` dipisah menjadi empat jenis "tidak ditemukan": sanad ("tidak ditemukan sanadnya"), lafaz (`lam_ajid_lafaz`), jalur (`lam_ajid_jalur`), dan marfu'; "لم أقف على حاله" → `daif`; `TAKHRIJ_TERMS_VERSION` 3; pipeline@12; laporan label dibuat ulang atas `ihya-v9`.
- Verifikasi: `pnpm verify` → lolos · 46 baris harapan tes lokal dicek atas sqlite `ihya-v9` (2 berubah, diperiksa frasanya) · 166 catatan kaki `lam_ajid` versi 2 → 87 sanad, 57 lafaz, 21 jalur, 1 daif.
- Biaya API: –
- Keputusan: ADR-113
- Catatan untuk sesi berikutnya: elipsis sisa teks Arab (`stripArabic`) masih cacat bahasa terbesar di x09; tanda kelemahan untuk lafaz/jalur perlu ditinjau bersama T-24.

## 2026-10-27 · Eval x09: bunyi label status hadits — selesai
- Dikerjakan: satu run publik Jawab berbayar (izin pemilik di chat) dengan pipeline@11 dan korpus `ihya-v9`; run diulang dan digabung karena korpus staging diganti di tengah run dan koneksi D1 remote putus; 42 jawaban dinilai tiga subagen agent; laporan perbandingan x08 → x09.
- Verifikasi: `eval:jawab score` gabungan → kutipan 100%, lokasi 85,3%, status hadits kode 5/6; penilaian agent → bahasa 3,36, kesetiaan 71,4%, atribusi 97,6%.
- Biaya API: ±US$0,16 (jawaban yang dinilai US$0,1181).
- Keputusan: hasil dicatat di ADR-111.
- Catatan untuk sesi berikutnya: perbaiki arti `lam_ajid` (regresi j029) dan elipsis sisa teks Arab (`stripArabic`).

## 2026-10-27 · Gema takhrij: run eval berbayar — selesai
- Dikerjakan: run publik 42 soal atas izin pemilik (`x09-publik-gema-v1` + lanjutan `x09-publik-gema-v1c`), skor kode atas arsip gabungan.
- Hasil: takhrij 5/6 → 6/6, lokasi 31/34 → 32/34, kutipan valid 100% (dibanding x08). j024 kini benar ("dinilai lemah", sitasi 10000010).
- Kendala: staging dikosongkan oleh pemuatan `ihya-v9` (sesi X21) di tengah run dan tetap kosong ≥ 1 jam (meta hanya `schema_version`); sesi X21 sudah dikabari. Lanjutan dan skor memakai `ihya-v9` lokal; 91 paragraf yang disitasi + kunci identik dengan `ihya-v8` produksi.
- Biaya API: US$0,1224 jawaban (+ panggilan j028/j030 yang gagal, tak tercatat).
- Keputusan: ADR-112 (bagian hasil)
- Catatan untuk sesi berikutnya: penilaian semantik run ini belum dilakukan. Pencatat biaya `answer` membebankan pagu cadangan penuh (±US$0,17) untuk soal yang gagal, sehingga satu galat D1 bisa menghabiskan pagu kecil.

## 2026-10-27 · Gema takhrij (pencarian takhrij kemunculan pertama hadits) — selesai
- Dikerjakan: untuk soal hadits, Jawab mencari takhrij al-'Iraqi di kemunculan pertama hadits yang muncul lagi tanpa penanda catatan kaki atau dengan catatan kaki rujukan "تقدم". Lafaznya dicocokkan kode (`packages/llm/src/jawab/echo.ts`), lalu catatan kaki itu ditaruh di dokumen tepat sesudah paragrafnya. Diagnostik `takhrij_echoes` ditambahkan; pipeline@11.
- Verifikasi: `pnpm verify` → lolos · `eval:jawab kandidat --remote` (hanya SELECT) dengan rute tersimpan x08: 32 → 33/34 (j024 lengkap), x07: 31 → 32/34, status hadits 6/6 di keduanya, tanpa soal yang turun; `--tanpa-rute` tetap 29/34 · sampel acak 360 paragraf: 13 pasangan, semuanya benar.
- Biaya API: –
- Keputusan: ADR-112
- Catatan untuk sesi berikutnya: j024 belum diukur dengan run berbayar (hanya dengan izin pemilik). Pindahkan pencocok ke ingest (tabel tautan) bila pembaca/MCP juga butuh.

## 2026-10-26 · Bunyi label status hadits — selesai
- Dikerjakan: teks label status buatan kode diubah dari "takhrij menyebut: lemah" menjadi "dinilai lemah, menurut takhrij al-'Iraqi"; arti istilah dijadikan predikat; `lam_ajid` ("tidak ditemukan sanad atau lafaznya") dibedakan dari `lam_ajid_marfu`; jenis tambahan peninjau diberi atribusi sendiri; butir daftar tanpa awalan dibuka huruf kapital; pipeline@10.
- Verifikasi: `pnpm verify` → lolos · D1 `surau-app` produksi: `takhrij_review` kosong, jadi tidak ada tinjauan yang batal.
- Biaya API: –
- Keputusan: ADR-111
- Catatan untuk sesi berikutnya: bunyi baru belum dinilai ulang (run eval berbayar hanya dengan izin pemilik).

## 2026-10-27 · X21 · 72 paragraf sisa (prompt v6) — selesai
- Dikerjakan: prompt `translate-passage@6` (= v5 + "Keluaran bersih") dan entri `x21-sisa` (kolom `passages`) untuk 72 paragraf yang ditolak validator tiga kali; Sonnet 5.5, izin pemilik. 37 lolos (24 + 9 + 4), 35 tetap memakai terjemahan lama.
- Verifikasi: `pnpm verify` lolos (PR #176); `pnpm llm plan` tepat 72 request.
- Biaya API: US$1,06 (total terjemahan ulang US$36,95; folder US$41,64).
- Catatan untuk sesi berikutnya: 37 perbaikan ini ada di `data/build/llm` tetapi belum di korpus produksi `ihya-v9`; ikut korpus berikutnya. Sisa 35 (3 tanpa terjemahan) perlu koreksi manusia (T-26) atau pemecahan paragraf.

## 2026-10-27 · X21 · Nilai ulang strata pendek — selesai
- Dikerjakan: 13 sampel pendek T-17 lanjutan dinilai ulang (dua penilai Claude Opus buta) setelah diterjemahkan ulang Sonnet 5.5 + v5. Sebelum 8 Benar / 5 Kurang; sesudah 12 Benar, 1 butir (no. 31) Kurang/Salah.
- Verifikasi: perbandingan sebelum/sesudah (sampel sudah pernah dilihat), tercatat di `data/reports/ihya-9472-t17-tahap3.md`.
- Biaya API: – (penilai subagen)
- Catatan: rilis ini tanpa ustadz sementara (pemilik, 2026-10-27); penilaian tetap oleh agent (ADR-105).

## 2026-10-27 · X21 · Korpus ihya-v9 dipromosikan ke produksi — selesai
- Dikerjakan: `corpus:promote ihya-v9 --confirm` atas izin pemilik (chat 2026-10-27; pemilik juga menyetujui Intisari pilot dan audio ikut tayang): DB `surau-corpus-ihya-v9` dibuat (apac), dimuat, smoke = hitungan build; `corpus:qa ihya-v9` 30/30; binding `CORPUS_DB` web, mcp, api dialihkan lewat PR; `ihya-v8` tetap sebagai target rollback (`corpus:promote surau-corpus-ihya-v8 --switch-only`).
- Verifikasi: smoke D1 produksi baru (passage 20.509, translation 16.106, summary 623, digest 19, audio_track 6); QA produksi 30/30.
- Biaya API: – (promote tidak berbayar)
- Keputusan: ADR-109
- Catatan untuk sesi berikutnya: setelah deploy, cek surau.org (halaman j1/200, hasil Cari, Intisari Kitab Ilmu); bila bermasalah, rollback ke v8.

## 2026-10-27 · X21 · Terjemahan ulang terarah Ihya — sebagian (korpus ihya-v9 dibangun, belum dimuat)
- Dikerjakan: T-28 dipasang dari zip pemilik; 10.435 paragraf menengah+panjang diterjemahkan ulang (Sonnet 5.5 + prompt v5) dalam 5 kiriman + 2 putaran ulangan; 40 ringkasan putaran 1 + 57 putaran 2 dibuat ulang; `pnpm ingest ihya` (korpus `ihya-v9`, gerbang lolos); `pnpm t17 sampel-lanjutan` (sampel lanjutan 40) ditambahkan.
- Verifikasi: `pnpm verify` → lolos · `pnpm ingest ihya` → semua gerbang ✓ (terjemahan 16.106/16.111, ringkasan 623/626, ayat 2.514 rujukan, 0 bermasalah).
- Biaya API: US$30,47 terjemahan ulang + US$0,14 ringkasan (di atas US$4,69 lama; total folder US$35,30) atas izin pemilik, pagu US$40.
- Keputusan: ADR-109
- Strata pendek diterjemahkan ulang (izin pemilik): 16.039/16.106 terjemahan kini Sonnet 5.5 + v5, total terjemahan ulang US$35,89 (folder US$40,58); `ihya-v9` dimuat ke staging (sempat kosong sekitar 90 menit karena unggahan pertama putus, dipulihkan), `corpus:qa` staging 30/30; tes e2e `reader-x11` dialihkan ke paragraf tanpa terjemahan yang masih ada (j3/368 #p15425).
- Pengukuran ulang T-17 (penilai agent, 40 sampel lanjutan): Benar 82,1%, Salah 1,1% tertimbang, "lolos, belum pasti"; strata pendek (Haiku v2, tidak diterjemahkan ulang) 5 dari 13 Kurang.
- Catatan untuk sesi berikutnya: muat `ihya-v9` ke staging + `corpus:qa`; promote atas izin pemilik; ukur ulang T-17 dengan sampel lanjutan (dari korpus `ihya-v9`). 57 paragraf terpilih yang ditolak validator tetap memakai terjemahan lama.

## 2026-10-26 · X21 · Terjemahan ulang terarah Ihya (rancangan + biaya) — sebagian
- Dikerjakan: (1) 21 usulan koreksi agent T-17 dicek ulang terhadap teks Arab (8 Salah terkonfirmasi; usulan tidak dipakai sebagai koreksi manusia); (2) pola kesalahan dipetakan: populasi 98% Haiku + prompt v2, kesalahan utama salah baca struktur kalimat/pelaku/negasi, kelengkapan dan angka; (3) pencocok ayat diperbaiki (ADR-107, +30 kutipan Qur'ani di 28 paragraf, QS 15:98 terdeteksi); (4) prompt `translate-passage@5` (belum aktif) + opsi `prompt`/`effort` di `buildTranslateRequest`; (5) biaya dihitung dan uji kecil dirancang ([sesi](sesi/X21-terjemahan-ulang-terarah.md)).
- Verifikasi: `vp test run packages/llm tools/ingest/src/quran` → 11 berkas, 186 tes lolos; `pnpm verify` lolos · pencocok lokal vs D1 `ihya-v8` → 2.484 rujukan identik, +30 baru.
- Biaya API: US$1,13 (uji kecil 204 request atas izin pemilik, batas US$2,00; `msgbatch_01LVKwMdgp4oAKo6PRX6ARPN`). Hasil: Sonnet 5.5 + v5 88% Benar / 4% Salah di sampel baru sedang+panjang (n = 24) vs produksi 46% / 8%; Haiku + v5 54% / 13%.
- Keputusan: ADR-107, ADR-109
- Catatan untuk sesi berikutnya (diperbarui): pemilik memilih sedang + panjang, pagu US$36; mekanisme terjemahan ulang selesai di kode (ADR-109); batch menunggu T-28 dan `count_tokens`. Semula: menunggu pemilik memilih lingkup + pagu terjemahan ulang (rekomendasi: panjang + sedang, ±US$28, pagu US$36; panjang saja ±US$13). Sebelum batch: catat versi prompt/effort yang dipakai per hasil di `batch.ts`. T-28 (`data/build/llm`, `data/raw/kemenag`) dibutuhkan sebelum korpus berikutnya.

---

## 2026-10-26 · Bahasa Jawab answer@8 — selesai
- Dikerjakan: prompt `answer@8` (tanpa pembuka meta, terjemahan AI tidak disalin, "Tidak ditemukan …" berdiri sendiri, baris "Status hadits:" wajib bersitasi di kalimatnya), pipeline@9 (diagnostik `repeated_sentences`, `translation_copy`, `grading_uncited`), docs/05 §5; run publik `x08-publik-answer8-v1` dinilai ulang tiga subagen; [laporan tiga run](../evals/reports/jawab-x08-answer8-banding.md).
- Hasil: x07 → x08 Benar/Kurang/Salah 17/22/3 → 17/23/2, kesetiaan 83,3% → 85,7%, bahasa 3,45 → 3,55, atribusi 97,6% → 92,9%, lokasi 91,2% tetap. R4 belum terpenuhi.
- Verifikasi: `pnpm verify` → lolos; diagnostik kalimat berulang atas arsip x07 → tepat 5 jawaban yang dicatat penilai; lokasi dihitung ulang dari arsip (x08 kunci versi 2 31/34, sama dengan laporan kode); subagen `peninjau` → tanpa blocker, temuan penting (status hadits pindah ke kalimat bebas) diperbaiki sebelum run.
- Biaya API: **US$0,1167** (izin pemilik di chat, pagu US$0,50; 42 soal publik).
- Keputusan: ADR-110.
- Catatan untuk sesi berikutnya: bunyi label kode "takhrij menyebut: …" di baris status, pencarian takhrij kemunculan pertama (j024), dan penilaian manusia sebelum iterasi prompt berikutnya.

## 2026-10-26 · Mutu Jawab answer@7 dari penilaian agent pengganti ustadz — selesai
- Dikerjakan:
  - Prompt `answer@7`, pipeline@8 (judul kitab di konteks bagian, kalimat status pengganti dirumuskan ulang dan dibuang bila berdiri sendiri di samping baris label, diagnostik `pipeline_terms`/`ayah_gloss_suspect`), penyelidikan parafrase ayat j019 (tidak bisa dicegah kode secara pasti; ADR-106 butir 3).
  - Soal versi 2: 8 publik (`ihya-draf-v2.jsonl`) + 4 holdout (subagen, hanya ID + kategori; R2 `surau-evals/jawab/2026-10-26-draf-v2.jsonl`). docs/05 §5 diselaraskan; usulan "praktik berbahaya" sebagai pertanyaan terbuka.
  - Run publik `x07-publik-answer7-v1` (42 soal) dinilai ulang tiga subagen dari teks Arab staging; [laporan perbandingan](../evals/reports/jawab-x07-answer7-banding.md).
- Hasil: Benar/Kurang/Salah 19/20/3 → 17/22/3, kesetiaan 76,2% → 83,3%, bahasa 3,74 → 3,45, fatwa 1 → 0, status hadits 4/6 → 5/6, lokasi 85,3% → 91,2% (kunci baru; 88,2% kunci lama). R4 belum terpenuhi.
- Verifikasi: `pnpm verify` → lolos (1047 + 440 tes); lokasi dihitung ulang dari arsip (x06 kunci lama 29/34 dan x07 kunci baru 31/34, sama dengan laporan kode); subagen `peninjau` → tanpa blocker, 12 temuan ditindaklanjuti.
- Biaya API: **US$0,1205** (izin pemilik di chat, pagu US$0,50; hanya 42 soal publik, tanpa holdout).
- Keputusan: ADR-106.
- Catatan untuk sesi berikutnya: `answer@8` untuk bahasa (terjemahan kutipan disalin mentah, tambahan sesudah kalimat penolakan, pembuka meta), pencarian kemunculan pertama hadits (j024).

## 2026-10-26 · Label status hadits aturan versi 2 (dari tinjauan agent ADR-105) — selesai
- Dikerjakan:
  - `TAKHRIJ_TERMS_VERSION` 2: pemindaian per segmen untuk catatan kaki tergabung, lafaz yang dikutip sesudah pembuka tidak dipindai untuk kata ambigu, penjaga konteks al-Bukhari/Muslim/la ba'sa/bin, penilaian yang dibantah (`dibantah`), jenis baru `lam_ajid_marfu`, `tsiqat`, `mukhtalaf`, dan bentuk-bentuk yang terlewat versi 1.
  - Label core: hadits pertama untuk paragraf gabungan, "berbeda per jalur" per hadits, teks rujukan bersumber; tinjauan tidak dipakai untuk sitasi di segmen lain.
  - Laporan `data/reports/ihya-9472-takhrij-v2.md` (kecocokan, sisa selisih, rancangan pemisahan ingest + patch salah cetak).
- Verifikasi: kecocokan dengan 234 keputusan tegas agent 192 → 228; tes integrasi D1 lokal (ekspor ihya-v7, enam gold + 40 butir agent) lolos; `pnpm run eval:takhrij` diperbarui; `pnpm verify` lolos.
- Biaya API: – (ekspor D1 hanya-baca)
- Keputusan: ADR-108
- Catatan untuk sesi berikutnya: sesi ingest untuk memisah 35 catatan kaki tergabung, membuat patch matan bocor, dan memperbaiki salah cetak edisi (butuh build + promote korpus atas izin); lalu tinjauan manusia atas label versi 2.

## 2026-10-26 · Eval agent pengganti ustadz (paket R4, label takhrij, T-17 tahap 3) — selesai
- Dikerjakan:
  - Pemilik meminta agent menggantikan ustadz untuk sementara (ADR-105). Enam subagen menilai dari teks Arab `ihya-v7` (ekspor hanya-baca D1): 42 soal publik, 18 holdout (terpisah, laporan hanya kategori), 42 jawaban nyata run x06 (dari `answer_log` produksi), dan 253 label takhrij (dua bagian). T-17 tahap 3 dinilai buta, 60 sampel.
  - Agent induk meninjau prompt `answer@6`/`answer-route@2` dan docs/05, lalu mengecek ulang j038 dan T-17 no. 13/23/40 terhadap teks Arab (terkonfirmasi).
  - Laporan: `evals/reports/jawab-agent-pengganti-2026-10-26.md`, `data/reports/ihya-9472-takhrij-agent-2026-10-26.md`, bagian *Hasil* `data/reports/ihya-9472-t17-tahap3.md`. Holdout dan nilai per jawaban ada di `evals/private/` dan R2 `surau-evals` (kunci baru).
- Hasil: soal 48/60 disetujui, 12 revisi. Jawaban: 19 Benar, 20 Kurang, 3 Salah, kesetiaan 76,2%, bahasa 3,74, status hadits 4/6. Label takhrij: 41/253 menyesatkan, presisi 94,0%. T-17: Benar 71,9%, Salah 13,3%, jadi tidak lolos (terjemahan ulang terarah). R4 belum terpenuhi.
- Verifikasi: `pnpm t17 hasil data/reviews/ihya-9472-t17-tahap3-hasil-agent.txt` → tabel di laporan; skrip lokasi x06 dengan kunci sekarang → 29/34 (sama dengan laporan x06); pemeriksaan tanpa huruf Arab di semua berkas hasil → 0; `pnpm test` → 1042 lolos + 440 lolos; `pnpm build` → 4/4; `vp check` hanya gagal format di folder `.agents/`/`.codex/` yang tidak dilacak (bukan bagian PR); subagen `peninjau` → tanpa blocker, temuan diperbaiki.
- Biaya API: – (hanya baca D1/R2 dan unggah dua berkas privat ke R2)
- Keputusan: ADR-105
- Catatan untuk sesi berikutnya: aturan takhrij versi 2 + pemisahan catatan kaki tergabung; prompt `answer@7` + kalimat status pengganti; revisi soal lalu satu run publik (berbayar, izin); terjemahan ulang terarah strata panjang (berbayar, izin); deteksi ayat tanpa placeholder (T-17 no. 12, j019).

## 2026-10-25 · X15b lanjutan · QA pilot Intisari oleh agent, Sonnet untuk Intisari Kitab, T-28 sebagian — selesai
- Dikerjakan:
  - Pemilik menyerahkan QA pilot untuk sementara kepada agent (sesi induk, 2026-10-25: "Saya serahkan ke agent sementara untuk QA model sonnet"). Halaman QA dipecah menjadi paket per Intisari, lalu dinilai empat subagen QA berkonteks baru (pola T-17 tahap 2), tanpa API berbayar. Laporan dan nilai mentah: `data/reports/ihya-9472-intisari-qa-agent-2026-10-25.{md,json}`.
  - Sonnet 5.5 dicatat sebagai model Intisari Kitab (ADR-098). T-31 tetap terbuka untuk penilaian manusia.
  - T-28: Shamela sudah ada di mesin agent (`SURAU_SHAMELA_ROOT=/home/rekanesia/shamela/database`). Sisa kebutuhan X15c dicatat di T-28. T-32, yang sudah selesai, dihapus dari daftar *Butuh pemilik* di STATUS.
  - Dua gagasan Salah ditandai `rejected` di `surau-corpus-staging` (permintaan sesi induk; UPDATE dua baris yang dijaga judul).
    - `readDigest` sesudahnya: 6/7 gagasan dan 6 pertanyaan per bab.
    - Audio pilot kedua bab ikut ditahan atas permintaan sesi induk (ADR-097 butir 6): dua baris `audio_track` dihapus dari staging dan objek R2 dibiarkan. Cadangan barisnya ada di `data/build/llm/intisari/staging/audio-track-ditahan-2026-10-25.json` (checkout utama). `pnpm audio staging` (periksa) sesudahnya: 6 dimuat, 2 gugur `stale_script`.
    - Membuat ulang audio kedua bab berbayar kecil dan menunggu izin pemilik.
    - Aturan baru di README `tools/ingest`: menolak gagasan di staging wajib diikuti penghapusan audio bab itu.
    - X15c mendapat langkah uji regresi (*sanah*/*sunnah*, sikap penulis) dan butir "Selesai bila".
- Hasil:
  - 133 gagasan yang dimuat: Benar 91 (68,4%), Kurang 40 (30,1%), Salah 2 (1,5%), jadi gerbang ≤ 5% lolos.
  - Intisari Kitab: Sonnet 3/5/0, pembanding Haiku 2/5/0.
  - Tidak ada terjemahan kutipan yang salah, dan nada fatwa 0.
- Verifikasi:
  - Skrip agregasi: 140 gagasan dinilai tepat sekali, tanpa huruf Arab di catatan; gerbang 2/133.
  - Kedua Salah dicek ulang agent ke teks Arab paketnya, dan keduanya memang salah.
  - `sha256sum` tiga berkas Shamela sama dengan `data/SOURCES.md` (hanya dibaca).
  - `pnpm verify` lolos (lihat PR).
- Biaya API: – (penilai adalah subagen sesi, bukan API berbayar)
- Keputusan: ADR-098 (Sonnet untuk Intisari Kitab, hasil QA agent)
- Catatan untuk sesi berikutnya: X15c dimulai dari dua gagasan Salah (lapisan koreksi Intisari), lalu jangkar Kitab/merge (satu jangkar per gagasan sumber) dan prompt berikutnya (pembatas/modal, pertanyaan terjawab, *sanah*).

## 2026-10-24/25 · X15b · Intisari: pipeline + pilot Kitab al-'Ilm (US$0,53, staging) — selesai kecuali nilai T-31
- Dikerjakan:
  - Glosarium berkunci (162 entri, `GLOSSARY_V2` dibangkitkan) + 144 definisi `glossary_term`; validator `judgeDigest` + pola teks terlarang satu sumber (`check.ts`); prompt `digest-section@2` (penunjuk kutipan) + `digest-merge@1`.
  - `pnpm llm intisari plan|submit|status|wait|collect|rejudge|retry|reconcile|report|muat-staging` dengan `--from staging` (SELECT saja); blok ±220 karakter yang tidak memotong ayat; sidik berjenjang; attach + invarian build; halaman QA T-31.
  - Pilot Kitab al-'Ilm: v1 lolos semua tetapi kutipan sering terpotong (manual 9/26), sehingga cadangan ADR-097 dipakai. v2: 21 Intisari lolos (kutipan terpotong 2/23 heuristik, 0/23 dibaca agent), dimuat ke staging skema 9, smoke `readDigest` 21/21.
  - Peninjau dua putaran. Putaran 2 menemukan larangan takhrij masih bersyarat; kini lintas paragraf. Sesudah itu dua merge + Kitab dibuat ulang (kutipan anak berubah).
- Verifikasi:
  - `pnpm exec vp test --project node packages/llm/src` 144 lolos; `tools/ingest` + `tools/eval` 401 lolos; `pnpm check` lolos.
  - `pnpm verify` lolos (913 + 418 tes, build) sebelum putaran 2; diulang sesudahnya (lihat PR alfariesh/surau#141, CI).
  - `pnpm llm intisari plan --from staging --kitab 100003 --stage leaf` → 22 request, US$0,051 (count_tokens).
  - `muat-staging --confirm` → smoke 21/21, kutipan ditahan 0.
- Biaya API: **US$0,53** (batch v1 US$0,167 + v2 + ulangan US$0,230 + glosarium US$0,129). Izin pemilik di chat 2026-10-24 ±16:44 UTC: "Ya, pilot + staging (Recommended)" atas pertanyaan "perkiraan ±US$0,36 dengan pagu keras US$1 … Boleh saya jalankan?"
- Keputusan: ADR-098
- Catatan untuk sesi berikutnya: T-31 (nilai halaman QA, gerbang ≤ 5% "Salah", pilih Sonnet/Haiku untuk Intisari Kitab) menentukan X15c. Staging kini skema 9 dengan Intisari Kitab al-'Ilm, siap untuk Preview X16. Prompt berikutnya: buang "alasan bila disebut", ganti contoh abstrak.

## 2026-10-25 · X18 · Sorotan kalimat mengikuti audio Intisari — sebagian (kode; uji berbayar dan timestamps audio pilot menunggu izin pemilik)
- Dikerjakan:
  - Skrip audio mencatat asal tiap kalimat di teks tampil (`sources`, di luar sha: audio lama tetap cocok); objek timestamps `.align.json` (format 1, immutable) + `alignment` di manifest + `audio_track.alignment_key` + `DigestView.audio.alignment_key`.
  - `tools/audio`: pemetaan token waktu → kalimat; ElevenLabs `/with-timestamps` (`submit --timestamps`) dan forced alignment (`pnpm audio align`, juga untuk audio yang sudah diunggah); `align-test` (uji pembanding ±300 karakter); upload/manifest/verify `.align.json` (verify memeriksa CORS); Worker media (`apps/media`) melayani `.align.json` dengan CORS.
  - Web: `data-say` di teks yang dibacakan, `ListenFollow` (logika dimuat malas): sorotan CSS Custom Highlight API `surau-dengar` tanpa mengubah DOM, gulir mengikuti (jeda 5 dtk bila pembaca menggulir, tanpa animasi bila reduced-motion), ketuk-untuk-lompat; fixture `/dev/intisari` dengan audio sunyi + waktu buatan.
- Verifikasi:
  - `pnpm verify` → lolos (984 Node + 440 workerd, build). sha skrip sama dengan `main` (sha emas di tes).
  - e2e `sorotan.spec.ts` + `dengar.spec.ts` 8/8 (chromium + ponsel, axe) terhadap `next dev`; browser lokal desktop + ponsel gelap dan Preview `pr-143.surau.org/dev/intisari`.
  - LCP ponsel Preview PR #143 (n=5): `/dev/intisari` 3,05 / 2,79 dtk, j1/200 2,97 / 2,87 dtk (≤ 4,29; `sesi/bukti/X18/lcp-pr143.md`).
  - Peninjau: 0 blocker, 5 perbaikan + 7 saran, semuanya dikerjakan.
- Biaya API: – (uji berbayar belum dijalankan: kunci T-29 belum ada)
- Keputusan: ADR-104
- Catatan untuk sesi berikutnya: sesudah T-29 + izin pemilik → `pnpm audio align-test --voice <id> --confirm`, catat hasilnya di ADR-104 butir 5, lalu pilot X17 dengan `--timestamps` atau `pnpm audio align`. Worker media (sesudah merge ter-deploy) melayani `.align.json` dengan CORS; `pnpm audio verify` memeriksanya.

## 2026-10-25 · X17d · Audio pilot tayang di media.surau.org + staging — selesai (pilot; produksi menunggu Intisari final)
- Dikerjakan:
  - Pilot dirender atas izin pemilik: Kitab Ilmu + 7 bab, suara Kang Sugiman, gaya variatif (8 berkas, ±48,7 menit).
  - Domain kustom R2 `media.surau.org` tersambung (T-32), tetapi tertangkap wildcard Preview `*.surau.org` (404 `x-preview-user-error`).
  - Domain kustom R2 dilepas. Diganti Worker `apps/media` (`surau-media`): R2 binding dan Workers Caching yang melayani Range dari cache (ADR-103). Job `deploy media` ditambahkan di CI.
  - 8 objek di R2 (1 sudah ada + 7 baru); manifest `data/audio/ihya-9472-audio.json` 8 track.
  - `pnpm audio staging --confirm`: 8 baris `audio_track` di `surau-corpus-staging`. Logika pencocokan skrip dipindah ke core (`selectAudioTracksIn`), dipakai ingest dan alat audio.
- Verifikasi: HEAD 200 dan Range 206 `HIT`; `pnpm audio verify` 8/8; staging 8 track, 0 gugur; tes handler media 5/5.
- Biaya API: ElevenLabs pilot sesuai tanda terima (total tanda terima sesi X17 18.989 karakter), dalam batas izin 45.000.
- Keputusan: ADR-103
- Catatan untuk sesi berikutnya: audio produksi menunggu Intisari final (X15c/`ihya-v9`). Saat korpus produksi berikutnya dibangun, ingest memuat track yang skripnya cocok secara otomatis.

## 2026-10-25 · X17c · Pilot dengar: suara Kang Sugiman, gaya variatif, lafal Ihya, label lisan dihapus — sebagian (1 bab lokal; pilot penuh menunggu izin)
- Dikerjakan:
  - Contoh lafal + gaya A/B (pemilik memilih gaya, lalu meminta versi lebih variatif).
  - `variatif@1` (PR #145).
  - Lafal "Ihya Ulumuddin" aktif di kamus lafal (PR #146).
  - Bab 100006 dirender tiga kali: khidmat, variatif, dan variatif + lafal baru.
  - Bug nama berkas sampel diperbaiki (PR #144).
  - Label suara AI tidak lagi diucapkan (ADR-102, skrip v3).
- Verifikasi: tes core/tools lolos; berkas dikirim ke pemilik untuk didengar.
- Biaya API: ElevenLabs ±3.920 karakter (±US$0,31) dari paket Starter, atas izin pemilik.
- Keputusan: ADR-101 (variatif@1), ADR-102
- Catatan untuk sesi berikutnya: pilot Kitab Ilmu + 7 bab (±38 ribu karakter) menunggu izin; unggah menunggu T-32.

## 2026-10-25 · X17b · Gaya narator Dengar (tag audio v4) — selesai (kode; pemakaian menunggu uji dengar)
- Dikerjakan: peran kalimat di skrip (narasi/kutipan/syair, ditentukan kode; skrip v2); gaya `polos` (bawaan) dan `khidmat@1` dari daftar tag tetap; gaya dicatat di manifest; `pnpm audio sample --demo-gaya` untuk uji A/B; T-31 diperluas.
- Verifikasi: `pnpm verify` → lolos; tes gaya/perakit/skrip baru lolos.
- Biaya API: –
- Keputusan: ADR-101
- Catatan untuk sesi berikutnya: jalankan demo A/B sesudah T-29 + izin pemilik; pakai `--gaya khidmat` hanya bila pemilik memilih B.

## 2026-10-25 · X17 · Dengar: audio Intisari (skrip, ElevenLabs v4, MP3, R2, pemutar) — sebagian (kode + bucket; pilot berbayar menunggu pemilik)
- Dikerjakan:
  - Normalisasi lisan berversi (`spoken-id`) dan skrip deterministik dari `DigestView`: label suara AI, kutipan lewat terjemahan, ayat hanya disebut, riwayat bertakhrij berat tidak dibacakan (ditahan `readDigest`), tanpa huruf Arab.
  - `tools/audio`: ElevenLabs v4 lewat REST (stitching, ulang hanya 429/503), cache + niat + tanda terima (ADR-061), MP3 CBR bersambung + ID3, leksikon IPA (draf, uji T-31), R2 tanpa timpa + verify, CLI `pnpm audio`.
  - Manifest `data/audio/ihya-9472-audio.json` (kosong) + pemuat `audio_track` di ingest (hanya sha skrip cocok; putaran kedua deterministik). Bucket R2 `surau-media` dibuat.
  - Web: pemutar global di shell (tombol Dengarkan, pemutar mini lazy, Media Session, 0,75–2×, ±15 dtk, bab = gagasan, lanjut posisi `surau:listen:v1`), `dengar.json`, `/privasi`, `/dev/dengar` + audio sunyi untuk e2e.
- Verifikasi:
  - `pnpm verify` → lolos (932 tes Node + 421 workerd, build). Cakupan `packages/text` fungsi 100%, baris 100%, cabang 96,8%.
  - e2e `dengar.spec.ts` 4/4 (chromium + ponsel, axe) terhadap `next dev`. Uji manual di browser desktop + ponsel.
  - `pnpm audio plan` tersambung ke staging (0 Intisari, skema < 9). JS awal +1,9 KB gzip.
  - Sesudah merge X16: `pnpm verify` lolos (956 + 432 tes, build); e2e `intisari.spec.ts` + `dengar.spec.ts` dengan korpus staging 16 lolos / 2 dilewati (staging tanpa Intisari).
  - LCP ponsel Preview PR #139 (n=5): j1/200 3,12 / 3,01 dtk, `/dev/intisari` 2,71 / 2,61 dtk (≤ 4,29; `sesi/bukti/X17/lcp-pr139.md`).
  - Peninjau: 1 blocker (gagasan yang bersandar pada riwayat berat dibacakan tanpa tanda) + 8 perbaikan, semuanya dikerjakan. Sesudahnya `pnpm verify` lolos (961 + 434 tes), e2e pemutar 4/4 dua kali.
- Biaya API: – (tanpa permintaan TTS; tidak ada kredit ElevenLabs terpakai)
- Keputusan: ADR-100 (098 = X15b, 099 = X16)
- Catatan untuk sesi berikutnya:
  - Pilot hanya sesudah T-29 (kunci, sebaiknya + User/Voices Read), T-31 (suara + `pnpm audio sample`), T-32 (domain `media.surau.org`), dan izin pemilik di chat.
  - Tombol ▶ halaman Intisari (X16) sudah tersambung ke pemutar; tampil begitu Intisari punya audio.

## 2026-10-24 · Landing page publik (ADR-096) — selesai

- Dikerjakan: landing page di `/` (hero bergaya Primer dengan sampul Ihya dan kutipan asli, menu bagian bernomor yang menempel, widget "Coba Surau" berisi simulasi Maknaz/Cari/Baca berdata asli, bento, cara kerja, koleksi bertahap, integrasi AI dengan marquee logo + simulasi MCP, gratis + biaya, tanya jawab); Beranda pindah ke `/home`; lima figur aset baru; ikon baru (panah, centang, GitHub, kutip, logo asisten AI). Beberapa putaran revisi dengan pemilik (tata letak Primer, isi bergaya ElevenLabs, widget, ukuran ponsel, tanpa bayangan).
- Verifikasi: `pnpm verify` → lolos (866 + 407 tes, build); `BASE_URL=http://localhost:3004 playwright test smoke a11y beranda-maknaz` di `pnpm dev:remote` → 116 lolos, 2 gagal (tes header `immutable` mesin aset: hanya dipasang `public/_headers` di Workers, tidak oleh `next dev`); axe `/` dan `/home` terang/gelap → bersih; isi panggung simulasi diukur muat di 320/375/1440 px; halaman ponsel tidak melebar (scrollWidth 375). Tinjauan `peninjau` (dua putaran): tanpa blocker, temuan diperbaiki (aria-live simulasi, mulai ulang saat gulir, selektor e2e kutipan hero, baris ADR nyasar, pasangan Arab/terjemahan Cari, klaim MCP, label logo, mode Baca tanpa terjemahan).
- Biaya API: –
- Keputusan: ADR-096
- Catatan untuk sesi berikutnya: sesudah deploy, buka surau.org (landing) dan surau.org/home (Beranda). Testimoni asli, donasi, tombol jeda gerak, dan versi `/en` menunggu keputusan pemilik.

## 2026-10-24 · X16 · UI Intisari: hub, halaman Intisari, pembaca, daftar isi, Cari, MCP — selesai (data nyata menunggu X15b; T-30 disetujui pemilik 2026-10-25)
- Dikerjakan:
  - **core:** dalil Intisari dihitung dari jangkar (`DigestView.evidence`: ayat Tanzil + Kemenag, takhrij + label kode). Jalur Cari `digest` (opt-in; Cari situs, MCP, eval retrieval; bukan Jawab) dengan memo isolate untuk korpus tanpa indeks; `SEARCH_RESULT_VERSION` 3.
  - **web:** hub `/kitab/ihya/intisari` + halaman `/kitab/ihya/bab/<id>/intisari` (ISR, 404 di skema < 9) + fixture `/dev/intisari` (Preview, `DEV_PAGES`). Komponen `components/intisari/*` (label AI, gagasan + Dasar teks, kutipan Arab dari DB, istilah, dalil, Uji pemahaman, penutup, slot ▶ X17).
  - **Pembaca:** kartu Ringkasan AI + "Buka Intisari", menu ⋮, lencana daftar isi, tombol hub di halaman karya, kartu Cari gagasan, tanda "sudah dibaca" (dicatat di `/privasi`).
  - **MCP:** `get_section_digest` (delapan tool).
- Verifikasi:
  - Unit: core/db/mcp lolos (dalil, jalur `dp`, memo, tool); web 52 lolos.
  - e2e `intisari.spec.ts` lokal 12 lolos / 2 dilewati (staging tanpa data), axe terang + gelap + urutan heading.
  - CI PR #138 (commit `6af024a`): `verify`, `eval retrieval`, `preview` (e2e + axe di Preview), dan `preview mcp` (8 tool) hijau; di-merge ke `main` sebagai `4ffb9ab`.
  - LCP ponsel Preview (n=5): j1/200 3,49 / 3,29 dtk, `/dev/intisari` 3,37 / 3,69 dtk (≤ 4,29; `sesi/bukti/X16/lcp-pr138.md`).
  - Staging skema 7: hub dan halaman Intisari 404, tanpa lencana atau tautan.
  - Peninjau: 1 blocker, 3 penting, 10 kecil; semua dikerjakan:
    - blocker: `uji-mcp.sh` masih 7 tool, jadi CI `preview mcp` akan merah;
    - takhrij per kutipan + `weak_report` (riwayat sangat lemah ditahan saat dibaca);
    - `/api/halaman` tanpa kueri Intisari di skema < 9;
    - jalur cadangan Cari diuji di D1 sungguhan (DROP tabel);
    - tautan hub hanya bila ada Intisari Kitab, penjaga huruf Arab di kartu Cari, label netral catatan kaki non-takhrij, syarat e2e lewat lencana `daftar-isi.json`, satu pemuatan ekstra daftar isi per render.
- Biaya API: –
- Keputusan: ADR-099
- Catatan untuk sesi berikutnya: data nyata baru ada sesudah X15b langkah 9 (pilot ke staging). Sesudahnya deploy ulang Preview: e2e "dengan Intisari" membandingkan kutipan dengan `/api/kutipan`. Ulangi juga `eval:retrieval --gate` dan LCP halaman Intisari nyata. X17 mengisi `ListenSlot`. T-30 disetujui pemilik 2026-10-25 (“ya saya setuju”, jawaban di sesi induk) atas tangkapan layar `sesi/bukti/X16/01–05`; lihat lagi tampilannya dengan data nyata sesudah pilot.

## 2026-10-24 · X15a · Intisari: riset Headway/Blinkist/ElevenLabs v4, rencana X15–X17, kontrak data — selesai (kontrak; pipeline, UI, audio menyusul)
- Dikerjakan:
  - Riset tiga agen (Headway, Blinkist, aplikasi belajar lain; ElevenLabs v4 + alternatif TTS; peta ringkasan di kode), lalu rencana yang disetujui pemilik. Jawaban pemilik: audio Intisari Kitab + Bab, nama "Intisari", fitur belajar dicatat untuk nanti, ElevenLabs Starter.
  - Uji dengar awal lewat konektor ElevenLabs: v4, Jefri + Gendhis, ±1.200 kredit.
  - Migrasi korpus `0009_digest.sql` (skema 9: `digest*`, `glossary_term`, `audio_track`, `digest_point_fts`) + Zod; `getDigest`/`listDigestHeaders`/`getDigestHeaders`; `readDigest` → `DigestView` (kutipan disalin dari `text_raw` dengan cek sidik; yang ditolak tidak dikirim).
  - Ingest mengenal tabel baru (kosong). Dokumen: ADR-097, docs/05 §12, teks-arab aturan 11, ARSITEKTUR, sesi X15–X17, T-28–T-31, FASE (fitur belajar dicatat di Fase 7).
- Verifikasi:
  - `pnpm verify` lolos (857 + 405 tes, build 3/3) sebelum perbaikan peninjau.
  - Sesudah perbaikan: `pnpm check` lolos · `vp test --project db` 159 · `--project core` 168 · `--project node tools/ingest` 193 lolos.
  - Peninjau: 0 blocker, 11 perbaikan dikerjakan.
- Biaya API: – (LLM $0; ElevenLabs ±1.200 kredit dari paket Starter pemilik untuk uji dengar)
- Keputusan: ADR-097 (nomor 096 dipakai cabang landing page)
- Catatan untuk sesi berikutnya: X15b, X16, dan X17 bisa paralel. Berkas yang beririsan dikerjakan bergantian: `globals.css`, `/privasi` (X16 + X17), dan KEPUTUSAN/STATUS/LOG. `dengar.json` milik X17 di folder rute X16. Data T-28 tidak ada di mesin agen, jadi pilot memakai `--from staging`. `corpus:qa` atas staging skema 8 gagal sampai staging dimuat ulang dari build skema 9.

## 2026-10-24 · Di luar sesi · Tes rapuh `translation-review` (batas 5 dtk) — selesai
- Dikerjakan: tes "simpanan ke-201 seorang editor dalam sehari → limit" (200 simpanan lewat jalur produksi) diberi batas waktu sendiri 15 dtk (±3× waktu terukur, saran peninjau); sebelumnya kadang melewati batas bawaan 5 dtk (5,05 dtk) saat mesin agen sibuk dan menggagalkan `pnpm verify` (temuan X14). Data tidak diisi langsung lewat SQL supaya tes tidak menyalin aturan rantai revisi.
- Verifikasi: tes itu 5× berturut-turut lolos (12/12); `pnpm verify` → lolos (857 + 387 tes, build); peninjau: lolos, 2 saran dikerjakan.
- Biaya API: –
- Keputusan: –
- Catatan untuk sesi berikutnya: –

## 2026-10-24 · X14 · Lanjutan mode baca: petunjuk sekali tampil, Ringkasan AI ikut kata cari, ukur LCP di repo — selesai (PR #130)
- Dikerjakan: petunjuk "Pilih cara membaca" (pilihan pemilik) di halaman baca bagi pengunjung yang belum memilih mode, lewat skrip awal + pemeriksaan ulang saat navigasi lunak, tanpa geser tata letak; Ringkasan AI satu DOM, disorot kata cari, dibuka bila kecocokan terpotong, dibuka sementara di mode Arab (batas ADR-091 §4 dihapus); `scripts/ukur-lcp.mjs` + `pnpm ukur:lcp` (Lighthouse di cache pengguna, bukan dependensi repo).
- Verifikasi: `pnpm check` + build lolos, tes unit 851 lolos (1 tes lama `translation-review` lewat batas 5 dtk tipis di mesin ber-load 28; lolos di CI) · e2e `reader-x14` 16/16 lokal + CI Preview; axe petunjuk + ringkasan dibuka · peninjau: 0 blocker, 5 perbaikan + 3 saran dikerjakan · LCP Preview j1/200 baru 3,96 / Keduanya 3,31 / Terjemahan 3,16 / Arab 3,97 dtk vs produksi 4,19 / 4,42 / 3,48 / 2,88 (n=5, sebaran ±1 dtk).
- Biaya API: –
- Keputusan: ADR-095 (dinomori ulang dua kali: ADR-093 dan ADR-094 dipakai X13 Mutu Jawab).
- Catatan untuk sesi berikutnya: ukur di Mac pemilik dengan `pnpm ukur:lcp`; petunjuk serupa di Cari/Maknaz belum ada.

## 2026-10-24 · X13 lanjutan · Daftar makna takhrij untuk soal hadits — selesai (kode; eval berbayar menunggu izin)
- Dikerjakan: `semanticLists` + daftar `(makna takhrij)` (catatan kaki saja, k 10, hanya bila routing menandai soal hadits); `semanticSearch` mengembalikan `{passages, footnotes}`; peringkat v2 dengan `footnote_ids`; `kandidat --makna-takhrij-k`; bedah j018 (jawaban menyitasi h55–57 yang menjawab kedua sisi; gold h13 → T-24).
- Verifikasi: `kandidat --input x13-…-diagnostik-publik.jsonl --remote` 31 → 32/34 (status hadits 6/6); tanpa rute tetap 30; `pnpm verify` → lolos.
- Biaya API: US$0,1116 (eval `x13-publik-takhrij-v1` atas rute tersimpan, izin pemilik, pagu US$0,30): lokasi 88,2% (30/34), takhrij 6/6, kutipan 100%, penolakan 7/8 (j033).
- Keputusan: ADR-094.
- Catatan untuk sesi berikutnya: sisa 4 kegagalan lokasi (j018, j019, j021, j023) menunggu T-24; j033 gagal penolakan untuk kedua kalinya (kalimat baku di paragraf kedua) → kandidat ADR pascaproses penolakan; holdout dan Vectorize produksi masih ditunda.

## 2026-10-24 · X13 · Mutu Jawab: pencarian makna, cakupan takhrij gold, persiapan holdout/kalibrasi — sebagian (langkah gratis; berbayar menunggu izin)
- Dikerjakan: bedah j024 (istilah berbeda + catatan kaki tanpa terjemahan); cakupan gratis soal status hadits menuntut catatan kaki gold; `kandidat --tanpa-rute` + `--semantik`; kait pencarian makna di pipeline (`semanticList`, `JawabDeps.semanticSearch`, mati di Worker); `answer --semantik` (arsip `+makna-berkas`); embedding lokal `bge-m3` q8 atas 20.509 paragraf staging (66 menit CPU, di luar repo) + peringkat 42 soal publik.
- Verifikasi: `kandidat --tanpa-rute --remote` 26/34 → dengan makna k 20 bobot 2 **30/34** (sapuan 12 varian); `pnpm verify` → lolos.
- Biaya API: US$0,1171 (eval publik `x13-publik-makna-v1`, izin pemilik di chat, pagu US$0,30): lokasi 85,3% (29/34, sama dengan X05), kutipan 100%, penolakan 8/8; holdout tidak dibaca.
- Keputusan: ADR-093 (produksi pencarian makna ditunda).
- Catatan untuk sesi berikutnya: holdout (±US$0,05) dan Vectorize produksi ditunda sampai ada perubahan yang menaikkan angka publik; T-24 (gold j019/j021/j023) jalan utama; kalibrasi judge gratis sesudah T-24 langkah 3; j1 h55 gold bersama j018/j019/j021 perlu ditinjau Anas; j024 kalah anggaran saat daftar makna berbobot 2.

## 2026-10-24 · X11 · Mode baca Arab · Keduanya · Terjemahan + fondasi bahasa — selesai (PR #126 + #127)
- Dikerjakan: satu preferensi `surau:read-mode` (skrip awal, pindahan sakelar lama); mode Arab menyembunyikan terjemahan + semua bantuan AI (`data-tr-aid`); mode Terjemahan: terjemahan teks utama, teks Arab tiap paragraf di balik tombol "Teks Arab" (⋮ di baris alat, judul tidak dilipat, `#pN`/kata cari/tautan balik membuka Arab); Berdampingan tanpa separuh kosong + syair `container: verse`; jaga posisi baca untuk semua perubahan preferensi; Segment Mode baca di panel Tampilan (pratinjau, `StableText`) dan menu ⋮ (pembaca, daftar isi, Cari, Maknaz); kartu Cari dan kutipan Maknaz ikut mode tanpa menyembunyikan bukti; penanda catatan kaki di terjemahan membuka takhrij di tempat; `lang` dari data + `UI_LANG`; ADR-091 (mode baca) dan ADR-092 (arsitektur bahasa: situs Inggris di `/en`, daftar bagian yang masih terkunci "id").
- Verifikasi: `pnpm verify` → lolos (847 + 387 tes, build) · e2e lokal `pnpm dev:remote` (`--workers=2`): `reader-x11` + `a11y` + `reader` 137 lolos, pembaca lama 78 lolos, `reader-x11` diulang 2× stabil · CI PR #126 hijau (e2e Preview 209 lolos, 1 rapuh → diperbaiki) · axe Arab/Keduanya × 3 tata letak dengan panel + Terjemahan terlipat/terbuka: 0 pelanggaran · Lighthouse 13.5 ponsel n=5 (mesin agen): Preview #127 j1/200 Keduanya 3,74 / Terjemahan 3,70 dtk; produksi sesudah bagian A 4,41–4,86 dtk (sebaran ±1 dtk) · `peninjau` dua kali: 1 blocker + 10 perbaikan, dikerjakan.
- Biaya API: –
- Keputusan: ADR-091, ADR-092 (ADR-075 sebagian digantikan).
- Catatan untuk sesi berikutnya: ukur ulang LCP produksi di Mac pemilik (cara X09/X10); ringkasan AI belum disorot kata cari; keterangan "belum diterjemahkan" per paragraf (pertimbangkan catatan halaman saat kitab kedua masuk); fase bahasa Inggris mengikuti ADR-092 §5.

## 2026-10-24 · Di luar sesi · Beranda fokus cari, Cari memakai kotak Beranda, navbar ringkas — selesai (kode; PR menyusul)
- Dikerjakan: navbar ringkas + menu ⋮ tema + mockup buku hardcover (affaa07, sesi lain, ADR-084/085); Beranda: rak kitab, "Apa yang ingin Anda kaji?", satu kotak Cari/Maknaz (widget, pemilih bagian kitab Autocomplete, segmen berikon duotone), titipan pertanyaan ke Maknaz di memori tab + transisi kotak → gelembung (ADR-086); /cari memakai kotak yang sama, pemilih bagian bertingkat menggantikan dinding chip, jembatan "Tanyakan … ke Maknaz" (ADR-087); menu Cari dihapus dari sidebar (ADR-088); `pnpm dev:remote` membaca korpus staging (ADR-089); /tanya: pembuka umum, satu catatan tetap yang berpindah, kotak berbentuk widget (ADR-090); kartu Lanjutkan membaca baru.
- Verifikasi: `pnpm verify` → lolos · e2e lokal dengan `pnpm dev:remote` (korpus staging): smoke, tanya, beranda-maknaz, search (11/11 termasuk axe hasil asli) lolos; gagal hanya header `immutable` aset (khusus Workers, berlaku di Preview) · peninjau tiga kali (per tahap + seluruh cabang): blocker label S21 di /tanya diperbaiki (ADR-090), sisanya dikerjakan.
- Biaya API: – (e2e Maknaz memalsukan /api/jawab).
- Keputusan: ADR-084–090.
- Catatan untuk sesi berikutnya: pemilih bagian masih pilihan tunggal (API Cari satu `bagian`); Maknaz belum bisa dibatasi per kitab (label sumber di /tanya ditulis di i18n); ukur LCP/JS Beranda sebelum `/rilis 4`; tes lokal Ihya kini dilewati bila D1 lokal bukan korpus OpenITI.

## 2026-10-22 · X10 · Rapikan sisa kecil pembaca — selesai (PR #122)
- Dikerjakan: preferensi pembaca lewat skrip mentah (tidak menunggu JS Next); daftar isi menyorot subjudul kurasi aktif dan membuka cabangnya saat gulir bersambung (cabang yang ditutup pembaca dihormati); kaki per halaman cetak (`PageFoot`: ayat, catatan AI, catatan tinjau) untuk halaman pertama dan sambungan; catatan AI menurut konten AI yang belum ditinjau manusia (`PageModel.ai`); rincian label "dikoreksi …" menempel di lencana (CSS anchor positioning) + nama aksesibel = teks lencana (WCAG 2.5.3).
- Verifikasi: `pnpm verify` → lolos (822 + 387 tes, build) · e2e pembaca lokal 139 lolos, 11 dilewati (termasuk `reader-x10` baru, uji mutasi skrip) · axe 0 pelanggaran dengan popover terbuka (data uji lokal) · banding HTML `<main>` j1/200: hanya catatan AI pindah tempat · CI PR #122 hijau, e2e Preview 178 lolos / 0 gagal · Lighthouse produksi n=5 sebelum → sesudah deploy: j1/200 4,24 → 3,95 dtk, j3/202 3,94 → 4,02 dtk · `peninjau` → 0 blocker, 4 perbaikan (dikerjakan).
- Biaya API: –
- Keputusan: ADR-083.
- Catatan untuk sesi berikutnya: usulan tombol daftar isi di kepala ringkas ponsel; label chevron React Aria masih berbahasa Inggris.

## 2026-10-22 · X08 · Koreksi terjemahan oleh editor/ustadz — selesai (kode; PR #120 + #121)
- Dikerjakan:
  - Tahap 1 (ADR-081): pemeriksa teks bersama `validateTranslationText`; `translation_revision` di DB app (migrasi 0006, hanya bertambah + pemicu); editor terdaftar `TRANSLATION_EDITORS` + peran ruang tinjau; `/tinjau/terjemahan` (antrean, Sudah benar / Perbaiki + pratinjau / Batalkan, riwayat); `/admin` koreksi terbaru + batalkan (massal); `/privasi`, panduan, T-26.
  - Tahap 2 (ADR-082): ekspor revisi (berkas lokal + R2 privat `surau-revisi`, metadata tanpa teks), ingest validasi ulang + `translation_review` (korpus skema 8), label "Terjemahan AI · dikoreksi/diperiksa …" bersama (pembaca dengan popover, `/cari`, kutipan Maknaz), `[…]` redup hanya perbaikan, `human_review` di MCP, batch AI melewati paragraf berevisi.
- Verifikasi: `pnpm verify` → lolos (tiap PR) · D1 staging: revisi uji tersimpan + konflik ditolak + dibuang · produksi: migrasi 0006 + pemicu ada di `surau-app` · e2e lokal: korpus uji 3 revisi → pembaca, `/api/search`, `/cari`, MCP `read_page` sama; `eval:retrieval --gate` 31 soal hit@10 100%, MRR 0,795 (= `ihya-v6`/`ihya-v8`) · HTML pembaca `<main>` identik dengan `main` untuk korpus tanpa tinjauan · `peninjau` tahap 1: 0 blocker, 7 penting + 6 kecil dikerjakan; tahap 2: lihat file sesi.
- Biaya API: –
- Keputusan: ADR-081, ADR-082.
- Catatan untuk sesi berikutnya: T-26 (kode akun Anas → daftarkan lewat PR), lalu korpus berikutnya `ihya-v9` (skema 8: `db:migrate:staging` sebelum `corpus:load:staging`); koreksi ringkasan AI + judul daftar isi; dokumen Jawab belum menyebut "dikoreksi".

## 2026-10-22 · Font UI Google Sans menggantikan HarmonyOS Sans — selesai (PR #119)
- Dikerjakan: `next/font/google` `Google_Sans` (OFL; normal di-preload, italic tidak), cadangan bermetrik sendiri ("Google Sans Fallback", Arial + size-adjust), berkas HarmonyOS dikeluarkan dari repo, `/lisensi#font` diperbarui, alat aset (potret WOFF2 Google Sans + OFL, mesin + figur dibangun ulang). Deploy X09 sempat gagal (registry npm 502), job dijalankan ulang → X09 tayang.
- Verifikasi: `pnpm verify` → lolos (779 + 352 tes) · e2e lokal a11y/smoke/pembaca 116 lolos (gagal hanya a11y `/tanya`, masalah lama) · Lighthouse Preview PR #119 vs produksi (X09) n=5: j1/200 3,86 vs 4,25 dtk, j3/202 4,10 vs 4,09 dtk; terkirim 870 → 750 KB · potret aset dicoba (Google Sans tampil) · `peninjau` → 0 blocker, 3 perbaikan dokumen (dikerjakan).
- Biaya API: –
- Keputusan: ADR-080 (ADR-056 diganti; ADR-079 butir 1 diubah).
- Catatan untuk sesi berikutnya: `opengraph-image.jpg`/`twitter-image.jpg` masih dirender dengan HarmonyOS; buat ulang bila perlu.

## 2026-10-22 · X09 · Kinerja pembaca ponsel (LCP) — sebagian (PR #118)
- Dikerjakan:
  - Audit: Lighthouse 13.5 ponsel n=5 produksi (j1/200 5,89 dtk, j3/202 5,34 dtk), eksperimen terkendali lewat proksi HTTP/2 + brotli di depan build workerd, `next analyze` per paket: penyebab = byte yang selesai sebelum cat pertama (Lantern ±4,3 ms/KB).
  - Font HarmonyOS tanpa preload; tekstur kertas ditunda di kunjungan pertama (`<script>` mentah, tanpa JS tetap tampil); pohon daftar isi ringkas + route ISR `/kitab/[work]/daftar-isi.json`; `next/dynamic` untuk panel Tampilan, Lompat, dialog laporan, palet cari; kamus i18n per bagian + tes penjaga.
  - Ditolak dengan bukti: `experimental.inlineCss` (bundle Worker 2,3 → 7,2 MB gzip, HTML 1,67 MB), preload Naskh khusus pembaca (URL berbeda → unduhan ganda).
- Verifikasi: `pnpm verify` → lolos (unit web + paket, build) · e2e lokal build workerd (pembaca, X04, X04b, X09, axe) lolos kecuali a11y `/tanya` (juga gagal di produksi, lolos di Preview) · Lighthouse Preview vs produksi berselang-seling n=5: j1/200 **4,15** vs 5,36, j3/202 **4,40** vs 5,89 (putaran 1: 4,57 vs 5,88, 5,01 vs 5,77) · HTML j1/200 gzip 59,9 → 32,5 KB, title/OG/JSON-LD/kepala halaman identik · `peninjau` → 0 blocker, 6 perbaikan (semua dikerjakan), 6 saran (2 dikerjakan).
- Biaya API: –
- Keputusan: ADR-079 (+ pembaruan ADR-058).
- Catatan untuk sesi berikutnya: target 4,29 dtk belum tercapai di j3/202; sisa muatan = JS kerangka situs ±377 KB br (Sidebar/Navbar Pro membawa `motion`) + font UI TTF (lisensi melarang WOFF2/subset): keputusan pemilik. `READER_SCALE_SCRIPT` juga perlu `<script>` mentah (preferensi pembaca bisa berkedip).

## 2026-10-22 · X04 bagian B · Daftar isi pembaca dengan subjudul + judul daftar isi Indonesia, korpus `ihya-v8` — selesai (PR #116 + PR promote `ihya-v8`)
- Dikerjakan:
  - **W7** daftar isi pembaca = pohon `toc_node` + 209 subjudul kurasi sebagai anak node (`loadReaderToc`, `lib/reader/reader-toc.ts`, `@surau/core` `subheadingPartText`): kitab tanpa anak 19 → 6; breadcrumb/`<title>`/OG/bagian aktif tetap pohon `toc_node`; MCP + Jawab tidak disentuh.
  - **Judul node salah tempat:** kurasi `node_tail` (butir daftar p16599/p18644 → teks biasa, judul di akhir p16600/p18645 → h2 + jangkar), dan judul node = paragraf pertama node di halaman awalnya yang sama dengan judul (8 node berjangkar di kolofon/pengantar kini tampil sebagai judul; jangkar + ringkasan ikut pindah). `toc_node`/`passage.toc_node_id` tidak diubah.
  - **W8** migrasi korpus 0007 (skema 7: `toc_title_translation`, `subheading_translation`), `listTitleTranslations` (null di skema < 7), prompt `translate-toc-title@2` + validasi (`packages/llm`), `pnpm llm judul` (kelompok ≤ 90 judul, pagu terburuk per request, Messages API biasa, keluaran terstruktur), pemuatan + invarian cakupan di ingest; web: judul Indonesia di atas Arab di pohon + satu catatan "Terjemahan AI" (model, prompt, tanggal), kepala halaman dengan lencana.
  - Korpus **`ihya-v8`** dibangun (= v7 + judul 313/209 + 5 terjemahan `@4` yang sudah ada di `data/build/llm`) dan dimuat ke staging + D1 lokal worktree.
- Verifikasi: `pnpm verify` → lolos (772 + 351 tes, build) · `pnpm ingest ihya` → semua invarian ✓, judul 522/522 · `corpus:qa staging` (v8) → **30/30** · `eval:retrieval --gate` v8 hit@1 64,5% / hit@5 96,8% / hit@10 **100%** / MRR 0,795 = v7 (salinan build v7, angka identik) · `getToc` v8 = 313 node · e2e lokal pembaca + axe 117 lolos (`reader-x04b` baru) · CI PR #116 hijau · HTML Preview j1/200: `<title>`/OG/breadcrumb Arab, judul Indonesia berlabel · `peninjau` → 0 blocker, 1 perbaikan (judul subjudul terikat `source_sha256` judul Arab) + 8 saran, semuanya dikerjakan; migrasi 0007 (belum pernah di produksi) diubah, staging dipulihkan + dimuat ulang, `corpus:qa staging` ulang 30/30, `pnpm test` 775 + 352 lolos.
- Biaya API: **US$0,4117** (Sonnet 5.5, 10 request: uji v1 US$0,0443 dibuang karena prompt diganti v2, v2 7 kelompok + ulang 2 judul terpanjang) dari pagu US$1 (jawaban desain X04 no. 5). Perkiraan rencana ±US$0,26 belum menghitung glosarium di prompt.
- Promote (2026-10-22, izin pemilik di chat "Ya saya promote ihya v8"): build bersih dari `main` (sha256 `fe617897…`), `corpus:promote ihya-v8 --confirm` → muatan pertama putus InternalError Cloudflare (binding belum diubah), diulang `--reload` ke DB baru → smoke = build; `corpus:qa ihya-v8` → 30/30; binding web/MCP/API + `SEARCH_CACHE_CORPUS` → `surau-corpus-ihya-v8`, `ihya-v7` jadi target rollback (`data/SOURCES.md`).
- Catatan ukuran: HTML j1/200 +50% gzip (41 → 61 KB) karena pohon daftar isi lebih besar: usul pemuatan malas di sesi kinerja.
- Keputusan: ADR-077, ADR-078.
- Catatan untuk sesi berikutnya: hasil judul di `data/build/llm/toc-title{,-runs}.jsonl` (checkout utama, jangan dihapus); usul sesi kinerja LCP (pemuatan malas pohon daftar isi).

## 2026-10-21 · X04 · Mutu baca pembaca Ihya bagian A + T-17 tahap 3 — sebagian (PR #115)
- Dikerjakan:
  - Pemilik menjawab 8 pertanyaan desain ("ikut usulan agent semua"); jawaban + keputusan agent untuk pertanyaan tanpa usulan tertulis dicatat di file sesi.
  - **W4** kurasi subjudul tanpa teks Arab (`pnpm subjudul`, `data/patches/ihya-9472-subjudul.{yaml,json}`): 186/191 *bayan*, 22 lanjutan judul, 16 subjudul di awal + 6 di akhir paragraf, dipakai web hanya bila sidik sha256 cocok; syair per syatr 437/450. Model halaman siap render (`buildPageModel`) + `PageText` bersama.
  - **W1–W3** terjemahan 16/17 px, CPL ≤ 75, jarak 28 px, ukuran terjemahan di panel; satu catatan AI (bisa ditutup) + lencana per terjemahan; salinan berlabel (AI + permalink, Kemenag); kutipan “…”, ringkasan berparagraf, perataan Otomatis; tata letak di bawah/dilipat/berdampingan.
  - **W5–W6** bagikan tautan paragraf, Lanjutkan membaca (localStorage; beranda, /kitab, halaman karya; /privasi), gulir bersambung lewat `GET /api/halaman` (rate limit baru, Cache API, tanpa daftar isi lengkap).
  - **T-17 tahap 3**: pra-registrasi → alat `pnpm t17` → 60 ID sampel (tiga commit berurutan), halaman nilai buta lokal (isian per nama penilai); `pnpm t17 hasil` dengan kappa untuk dua penilai; klarifikasi bertanggal sebelum hasil (tambahan 40 = 13/14/13).
- Verifikasi: `pnpm verify` → lolos (747 + 345 tes, build; diulang sesudah perbaikan peninjau) · e2e lokal penuh 144 lolos, 2 gagal = uji header `/aset` khusus Workers (sudah diketahui); `reader-x04` 12 skenario + axe halaman sambungan/dilipat/berdampingan lolos · CI `3adf7ba` hijau, e2e Preview 152 lolos + 1 flaky (klik tombol ayat sebelum hidrasi; tes kini mengulang klik) · CI PR #115 hijau, e2e Preview 145 lolos · Preview j1/200: 17 px, CPL 69–73, jarak 28 px, `hyphens: auto`, `text-wrap: pretty`, 1 catatan + 7 lencana, `#p13553` heading, syair j4/107 per syatr · `/api/halaman` Preview 200 (203 baris dibaca) · Lighthouse 13.5.0 ponsel n=5 berselang-seling: Preview median LCP 6,11 dtk vs produksi 5,66 dtk · `peninjau` → 1 blocker (sitasi paragraf halaman sambungan menyebut halaman pertama) + 9 perbaikan + 10 saran, semuanya dikerjakan (rincian di file sesi); e2e baru untuk sitasi halaman sambungan dan Back sesudah gulir bersambung (uji mutasi: tanpa perbaikan, e2e Back gagal) · tinjauan ulang commit perbaikan → 0 blocker, 2 perbaikan halaman nilai T-17 (isian penilai terakhir tampil saat dibuka; isian versi pertama tidak terbaca), keduanya + 9 saran dikerjakan.
- Belum lolos (kriteria tidak diubah): hari pekan 14/15 (p2811 bukan subjudul), syair 437/450, `rows_read` halaman sambungan 17,6% > 15%, LCP ponsel > 3,9 dtk + 10% (produksi sendiri kini 5,66 dtk).
- Biaya API: – (tanpa LLM)
- Keputusan: ADR-074, ADR-075, ADR-076.
- Catatan untuk sesi berikutnya: T-17 tahap 3 menunggu penilai manusia (`data/build/llm/qa/t17-tahap3.html`, hasil → `pnpm t17 hasil`); bagian B memakai daftar kurasi + pagu US$1 yang sudah disetujui; usul sesi kinerja LCP ponsel.

## 2026-10-21 · X08 · Rencana koreksi terjemahan oleh editor/ustadz — sebagian (rencana, menunggu pemilik)
- Dikerjakan: rencana `implementasi/sesi/X08-koreksi-terjemahan.md`, ditulis di sesi X04 atas permintaan pemilik:
  - format teks polos + `[…]`;
  - alur usulan → persetujuan ustadz di `/tinjau/terjemahan`, dengan penyetuju berupa kunci akun terdaftar (pola X07/ADR-070);
  - tayang lewat korpus berikutnya (teks revisi di DB app + R2 privat, git hanya metadata);
  - validasi ulang saat ingest, status terikat hash, label per status;
  - editor textarea tanpa Tiptap di tahap pertama.
  Nomor X05–X07 sudah dipakai sesi lain, jadi rencana ini X08.
- Temuan: terjemahan dipakai pembaca, kartu `/cari` + `translation_fts`, MCP, kartu kutipan Tanya, dan dokumen Jawab, jadi koreksi harus lewat korpus agar semuanya sama; batch `retry` belum melindungi paragraf yang dikoreksi manusia.
- Verifikasi: pembacaan kode (`review-auth.ts`, `takhrij-review.ts`, `reviews.ts`, `search-index.ts`, `page.ts`, `documents.ts`); panjang terjemahan dari `ihya-v7` (maks 7.966 karakter, rasio maks 19×); `peninjau` → 0 blocker, 10 perbaikan sudah dimasukkan.
- Biaya API: –
- Jawaban pemilik (2026-10-21): "Editor itu ustaz", "Nama ustaz ditampilkan", "gak terlalu sering", "gak perlu approval buat saat ini", no. 6 ikut saran agent (paragraf dulu). Rencana disesuaikan: satu peran editor terdaftar, revisi langsung aktif + batalkan + daftar koreksi di `/admin`, label "dikoreksi {nama}" (gelar Ust. hanya untuk akun ustadz), tayang ±sebulan sekali atau ≥ 50 koreksi.
- Tinjauan ulang rencana (atas permintaan pemilik), 10 perbaikan:
  - dua tahap: simpan koreksi dulu, lalu tayangkan;
  - status usang dihitung, tidak ditulis balik ke DB produksi;
  - batalkan memulihkan teks + label;
  - batas harian, dan batalkan massal per editor;
  - sha256 ekspor di `meta` korpus;
  - penanda `(١)` lolos cek huruf Arab;
  - jalur kirim kode pendaftaran;
  - field MCP hanya tambahan, nama di MCP sesuai persetujuan;
  - lingkup kartu Tanya diselaraskan;
  - catatan rollback dan label Jawab.
- Keputusan: – (ADR menyusul saat X08 dikerjakan)

## 2026-10-21 · UI · Halaman Tanya sebagai percakapan — selesai (PR #112)

- Dikerjakan:
  - `/tanya` menjadi layar chat (ADR-073; orb "siap" Hilal dan "selesai" Segel): gelembung pertanyaan + balasan Surau per giliran, komposer `PromptInput` menempel di bawah, chip contoh pertanyaan (`Button` bulat; `PromptSuggestion` tidak dipakai), aksi salin/laporkan `ChatMessageActions`, dan riwayat giliran di memori tab. Setiap pertanyaan tetap dijawab terpisah, dan UI mengatakannya.
  - Jawaban: kartu "Jawaban" diganti badan pesan, jangkar unik per giliran, dan judul disesuaikan (h2 tersembunyi, h3).
- Verifikasi:
  - Tes unit Tanya (jangkar per giliran, teks salin) dan tes CSS HeroUI lolos.
  - Pratinjau browser lokal dengan `/api/jawab` + `/api/kutipan` tiruan (kutipan dari DB lokal; halaman dan fixture sementara dihapus, tidak di-commit): dua giliran berurutan, gulir ke awal jawaban tanpa menggulir halaman, fokus ke komposer setelah memilih contoh, formulir laporan, keadaan tutup (komposer nonaktif + arahan Cari), mode gelap, dan ponsel 375 px tanpa gulir samping.
  - Peninjau: 0 blocker, 5 penting (ref TextArea menimpa ref HeroUI, fokus hilang saat kotak dikunci, tombol kirim aktif saat Jawab mati, teks salin tanpa label AI, klaim e2e belum dibuktikan) ditutup; temuan kecil sebagian ditutup.
  - e2e `tanya.spec.ts` terhadap dev server cabang ini (`BASE_URL=http://localhost:3017`): tes halaman Tanya lolos (desktop + ponsel). Dua tes lain di berkas yang sama (privasi/transparansi, API kutipan) gagal karena D1 lokal worktree kosong (`/transparansi` dan `/api/kutipan` 500), dan berkas keduanya tidak diubah cabang ini; akan diuji CI Preview.
  - Orb `rest` (Hilal) dan `done` (Segel) dicek di galeri sementara (160/64/20 px) dan di keadaan kosong.
  - Keadaan kosong rata tengah + chip contoh + "?" (HoverCard muncul saat hover) dan transisi hilal → orb balasan pertama dicek di browser (animasi diperlambat untuk dilihat di tengah gerak; animasi `::view-transition-group(tanya-orb)` tercatat jalan), ponsel 375 px tanpa gulir samping.
  - Peninjau kedua: 0 blocker, 2 penting (race view transition × `ask`: giliran bisa macet atau terkirim dua kali; LOG tidak cocok dengan kode) + 6 kecil (orb `enterFrom` beralih sambil terbang, rata tengah vertikal, pengingat "dijawab terpisah" hilang setelah giliran pertama, area ketuk "?", string tak terpakai, ADR soal Turnstile) ditutup.
  - e2e `tanya.spec.ts` (tes halaman Tanya) dan `a11y.spec.ts` untuk `/tanya` (tema terang + gelap, urutan judul) lolos, desktop + ponsel.
- Biaya API: –
- Keputusan: ADR-073

## 2026-10-21 · UI · Orb tahap di halaman Tanya — selesai

- Dikerjakan:
  - Spinner di baris tahap Tanya diganti `TanyaOrb`: satu orb titik yang berganti bentuk per tahap Jawab (Sathr, Himpun, Khatam, Anyam, Untai), warna dari tema (tinta, aksen Zaitun, emas ornamen), ditambah penanda "Tahap n dari 4". Teks tahap memakai `TextShimmer` HeroUI Pro, dengan teks dasar dinaikkan dari 45% ke 70% supaya kontrasnya lolos AA (6,11:1 terang, 8,34:1 gelap diukur; sepia ±5,3:1 dihitung).
  - Geometri murni di `orb-frames.ts` + tes; komponen kanvas sendiri (thinking-orbs tidak mendukung lebih dari satu warna per orb maupun tema sepia).
- Verifikasi:
  - Peninjau: 0 blocker, 1 penting (tahap SSE tak dikenal bisa membuat orb/halaman galat) + 4 kecil (kedip saat tahap berganti di tengah peralihan, Untai mulai dengan butir emas, setelan gerak dikurangi tidak diikuti langsung, sepia belum dicek visual); semua ditutup.
  - `orb-frames.test.ts` (7 tes) dan tes SSE (tahap tak dikenal diabaikan) lolos.
  - Pratinjau di browser lokal lewat halaman sementara dengan `/api/jawab` tiruan (SSE lima tahap; tidak di-commit): bentuk berganti sesuai tahap, animasi berjalan saat terlihat dan berhenti saat di luar layar, tema terang dan gelap, ponsel 375 px tanpa gulir samping. Tema sepia tidak dicek visual (warnanya dari variabel `:root.sepia` yang sama). Ditemukan + diperbaiki: tahap yang berganti saat orb di luar layar sempat menampilkan bentuk lama.
  - `pnpm verify` lolos.
- Biaya API: –
- Keputusan: ADR-072
- Catatan untuk sesi berikutnya: PR Maknaz (#109, ADR-071) mengganti teks halaman yang sama; orb tidak bergantung pada nama.

## 2026-10-21 · X07 · Sisipan: antrean tinjauan label status hadits di `/tinjau` — selesai

- Dikerjakan:
  - DB app `takhrij_review` (migrasi 0005): keputusan setuju/koreksi (kode jenis istilah)/ragu per (catatan kaki, versi aturan, penilai), terikat sidik label kode yang dilihat penilai; repo + hitungan kutipan takhrij dari `answer_log`/`answer_cache`.
  - Core: `takhrijStatus` (diekstrak dari `takhrijLabel`, keluaran identik), `effectiveTakhrijReview` (hanya ustadz peninjau yang ditunjuk, ragu/beda pendapat = tidak berlaku), `reviewedTakhrijLabel`, `takhrijReviewInput`.
  - Jawab `pipeline@7`: tinjauan dari DB app dipakai untuk klaim dan baris "Status hadits:" (`ustadz_reviewed`/`ustadz_corrected` + `added_terms`); cache basi bila tinjauan berubah; tanda kelemahan `/api/kutipan` ikut label tertinjau; UI Tanya menampilkan chip "ditinjau ustadz"/"dikoreksi ustadz".
  - Halaman `/tinjau/takhrij` + `/api/review/takhrij`: antrean prioritas (kutipan Jawab → berbeda per jalur → urutan kitab), teks takhrij dari DB dengan istilah disorot, label yang dipakai Jawab, formulir setuju/koreksi (kotak centang + pratinjau label)/ragu; navigasi antar halaman tinjau.
- Verifikasi:
  - Tes baru: D1 workerd (repo, CHECK), core, pipeline, Worker `surau-api` (label tertinjau dipakai; cache dipakai/dijalankan ulang; Agent QA tidak dipakai), web (antrean, route, kutipan, tampilan).
  - Refaktor `takhrijLabel` vs versi X06 atas korpus `ihya-v7`: 13.194 kombinasi (catatan kaki × rentang), 0 beda.
  - Pratinjau komponen antrean di browser lokal (catatan kaki Ihya nyata, halaman sementara tidak di-commit): desktop, ponsel 375 px tanpa gulir samping, mode gelap; ditemukan + diperbaiki: butir yang sama tidak dimuat ulang sesudah simpan, kontrol formulir tak terlihat di panel (varian `secondary`).
  - `pnpm verify` lolos.
- Biaya API: –
- Keputusan: ADR-070
- PR #108 ter-merge, deploy produksi sukses (migrasi 0005 di `surau-app` dan staging; `/tinjau/takhrij` produksi dialihkan ke login Access). Peninjau (sesudah merge): 0 blocker, 5 penting, 5 kecil → PR lanjutan: kunci akun ustadz terdaftar (`TAKHRIJ_USTADZ_KEYS`) + nama sebagai gerbang, jenis tambahan disebut "menurut peninjau", istilah yang ditolak tidak muncul lagi di sitasi sebagian, sidik label ikut arti + teks, holdout tidak ikut prioritas, huruf Arab di nama/catatan ditolak, galat dicatat, paginasi, karakter U+202E literal di tes diganti escape. Label otomatis tetap identik atas 13.194 kombinasi.
- Catatan untuk sesi berikutnya: login nyata dan tinjauan Anas tetap T-24 (butir 5 baru); daftarkan kunci akunnya sesudah keputusan pertama. Prioritas "paling sering dikutip" di produksi butuh data (`answer_cache` setelah Jawab menyala, atau arsip eval dimuat ke `answer_log` atas aba-aba pemilik). Label di MCP `get_hadith_takhrij` belum.

## 2026-10-21 · X06 · Sisipan: status hadits dari label istilah takhrij — selesai

- Dikerjakan:
  - `takhrijTerms` (packages/text): pengenal frasa baku takhrij al-'Iraqi per kata atas `normalizeArabic`, dengan rentang mentah; bagian lafaz sebelum penanda takhrij pertama tidak dipindai. `takhrijLabel` (core): arti baku, teks status kode ≤120 karakter, `mixed`, `weak`.
  - Pipeline `pipeline@6`: klaim status dari struktur catatan kaki per takhrij yang disitasi (`rule_extracted`, `terms`); baris "Status hadits:" bersitasi diganti label + lokasi hadits; pemberitahuan netral menunjuk bagian "Status hadits". Tanda kelemahan UI dari label yang sama; `takhrijHasWeakTerms` dihapus. UI Tanya menampilkan istilah + frasa Arab dari DB, menerima bentuk lama dari API sebelum X06.
  - Eval: metrik Takhrij berbasis label (klaim di luar gold dilaporkan), batas klaim arsip 5 → 20, `pnpm run eval:takhrij` (laporan korpus), `eval:jawab hadits --run` (ulang gratis atas arsip).
  - Peninjau dua putaran: 1 blocker + 8 penting + 11 kecil, lalu 5 kecil; semua ditutup sebelum eval berbayar.
- Verifikasi:
  - Korpus `ihya-v7`: 95,5% catatan kaki dikenali sebagai takhrij (76,8% memuat istilah, 8,1% hanya sumber, 10,6% hanya rujukan), 4,5% bukan takhrij; tanpa batch AI. Sampel acak agent: 70 → 2 istilah keliru (diperbaiki), 50 → 0 keliru; 6/6 takhrij gold publik sesuai kategori gold.
  - Ulang gratis (`eval:jawab hadits`): X05 0/6 → 5/6, X03 5/6, S21 v5 4/6; 0 tidak stabil.
  - Eval publik berbayar sekali `x06-publik-takhrij-v1` (rute X05): kutipan valid 100% (166/166), lokasi 85,3%, penolakan tepat 100% (8/8), tidak salah menolak 100%, Takhrij 83,3% (5/6), tanpa pola fatwa 100%, US$0,0026/jawaban tanpa routing.
  - `pnpm verify` lolos (662 + 327 tes, build 3/3); dua run sebelumnya gagal hanya karena tes Ihya lokal `ihya-text` melewati batas 5 dtk (area tidak diubah, lolos sendiri).
- Biaya API: US$0,1092 (satu eval publik; izin pemilik di chat "ya jalankan").
- Keputusan: ADR-069.
- Catatan untuk sesi berikutnya: antrean tinjauan label di `/tinjau` (Anas menyetujui/mengoreksi per catatan kaki, terikat `rules_version`) dan label di MCP `get_hadith_takhrij`; model terus menaruh penilaian di kalimat bebas bersitasi takhrij (tidak dicek terhadap label). Disk pemilik sempat penuh (±145 MB tersisa) di tengah sesi. Tes `tools/ingest/test/ihya-text.test.ts` kadang melewati 5 dtk saat suite penuh di mesin sibuk.

## 2026-10-21 · X05 · Sisipan: lokasi benar di tahap jawaban Jawab — selesai (satu butir tidak dicentang)

- Dikerjakan:
  - Bedah gratis arsip X03 untuk j014, j020, j023 (dokumen direkonstruksi dari rute tersimpan). Paragraf gold ada di dokumen tetapi tercecer di peringkat RRF, sering tanpa terjemahan AI; jawaban menyitasi kesimpulan atau halaman tetangga di bagian yang sama.
  - Dokumen dikelompokkan per bagian, urut kitab (`orderBySection`, `AnswerPassage.ord`, `pipeline@5`); prompt `answer@6`; `eval:jawab answer --rute` (rute routing tersimpan, tanpa panggilan routing; `normalizeRoute`, `savedRoutesFor`, arsip `+rute-tersimpan`).
  - Peninjau dua putaran: 4 temuan penting (urutan dari ID melanggar ADR-029, kalimat prompt, penanda arsip `--rute`, gerbang proses) dan temuan kecil ditutup sebelum eval.
  - Nomor sesi semula X04; diganti X05 karena X04 (mutu baca, #104) ter-merge di tengah sesi.
- Verifikasi:
  - Dokumen dari rute X03 identik dengan arsip X03: 42/42 (jumlah dokumen, token, daftar, kandidat).
  - Eval publik `x05-publik-jawaban-v1` (42 soal, tanpa holdout, `--rute` X03): kutipan valid 100% (176/176), lokasi 85,3% (29/34; X03 82,4%), tidak salah menolak 100% (34/34), tanpa pola fatwa 100%, penolakan tepat 7/8 (j033 turun ke Cari), jawaban US$0,00257/soal tanpa routing (perkiraan penuh ±US$0,0028). j014, j020 kini benar; j024 1 → 0 artefak halaman (takhrij gold tidak ada di dokumen pada kedua run).
  - Ulangan 8 soal jebakan `x05-publik-tolak-v1` atas izin pemilik: penolakan tepat 8/8.
  - `pnpm verify` lolos.
- Biaya API: US$0,1239 (US$0,1078 + US$0,0162; izin pemilik di chat "Ya, saya izinkan" dan "Cek kecil dulu").
- Keputusan: ADR-068.
- Catatan untuk sesi berikutnya: R4 lokasi ≥ 90% belum (85,3%, in-sample, holdout belum). Sisa: j018/j019/j021 (leksikal), j023 (gold h290 vs h292 di bagian yang sama, tinjau T-24), j024 (takhrij gold tidak terambil). Simpan teks mentah fallback soal publik bila penolakan baku gagal lagi.

## 2026-10-21 · X04 · Audit + rencana mutu baca pembaca Ihya — sebagian (rencana, menunggu pemilik)
- Dikerjakan: audit pembaca produksi (j1/200, j3/202; desktop + ponsel, 7 tangkapan layar di `implementasi/sesi/bukti/X04/`), struktur korpus `ihya-v7` (read-only), dan sumber Shamela/OpenITI (read-only); rencana `implementasi/sesi/X04-mutu-baca.md` (bagian A tampilan $0, bagian B subjudul + judul daftar isi Indonesia, rancangan T-17 tahap 3, 8 pertanyaan desain); bagian X04 di `scripts/hitung_biaya.py`
- Temuan utama: 191 dari 271 subjudul *bayan* tampil sebagai paragraf biasa (80 sudah judul node); 19/40 kitab tanpa subbab (terpanjang 70 halaman); subjudul menempel di awal paragraf tanpa penanda di sumber; terjemahan 14 px, CPL 94–113, 24 baris vs 15 baris Arab di ponsel; label "Terjemahan AI" ±16 ribu kali; takhrij ±5,7 layar dari penanda di ponsel; 207/313 judul daftar isi sudah punya terjemahan paragraf judul
- Verifikasi: ukuran `getComputedStyle` di https://surau.org/kitab/ihya/1/200; hitungan `node:sqlite`; `python3 scripts/hitung_biaya.py` → judul daftar isi Sonnet 5.5 US$0,07–0,26, terjemahan ulang penuh Sonnet batch US$40,49
- Biaya API: –
- Keputusan: – (ADR menyusul saat X04 dikerjakan); nomor X03 sudah terpakai (ADR-067), jadi sesi ini X04

## 2026-10-21 · X03 · Sisipan: cakupan lokasi gold di kandidat Jawab — selesai

- Dikerjakan:
  - `eval:jawab kandidat` (gratis): ulang langkah 2 pipeline (`jawabCandidates`, diekstrak dari `runJawab`) atas rute routing tersimpan, metrik "semua lokasi gold ada di dokumen"; bedah soal gagal → halaman gold sering ditemukan pencarian pertanyaan (peringkat 2–8) tetapi tenggelam di RRF oleh banyak daftar bagian.
  - ±40 varian diukur gratis (bobot per jenis daftar, round robin, kedalaman/kueri per bagian, ringkasan bagian, kata pembingkai). Dipakai: pertanyaan global ×3, bagian 3 halaman, ≤ 3 bagian dari ringkasan AI (`searchSummarySections`/`searchSummaryNodes`, routing kedua tanpa LLM), pemotongan pertanyaan panjang per aksara (`queryWordOverflow`; dulu `InvalidQuery` diam-diam), `JAWAB_PIPELINE_VERSION` 4, arsip eval mencatat `+pipeline@4`.
  - Peninjau dua putaran: 3 temuan penting (tes orkestrasi → `routePlans`/`summaryPlans` murni, ADR, label sesi) + temuan kecil ditutup sebelum eval berbayar.
- Verifikasi:
  - Uji gratis 6 set rute × 34 soal publik: lengkap 27 27 28 28 27 25 → 31 31 31 30 30 30 (rata-rata 27,0 → 30,5); 4 set rute lama yang tidak dipakai merancang: 26,25 → 30,0. Token dokumen tetap ±19,9 ribu.
  - Eval publik berbayar sekali `x03-publik-lokasi-v1` (42 soal, tanpa holdout): kutipan valid 100% (156/156), lokasi 82,4% (28/34; sebelumnya 73,5–76,5%), penolakan tepat 100%, tidak salah menolak 100% (34/34), tanpa pola fatwa 100%, US$0,0027/jawaban; gold di dokumen 31/34 pada rute run ini.
  - `pnpm verify` lolos (643 + 318 tes, build 3/3).
- Biaya API: US$0,1134 (satu eval publik; izin pemilik di chat "ya saya izinkan").
- Keputusan: ADR-067.
- Catatan untuk sesi berikutnya: R4 lokasi ≥ 90% belum. Sisa: 3 soal topik tersebar tak terjangkau BM25 (pencarian makna lewat ADR baru, atau gold ditinjau T-24) dan 3 soal yang gold-nya ada di dokumen tetapi jawaban menyitasi sebagian (prompt perbandingan + eval ulang). Kenaikan in-sample; bukti R4 butuh holdout.

## 2026-10-21 · S21 · UI Tanya, transparansi biaya & rilis Fase 4 — sebagian

- Dikerjakan:
  - `/tanya`: status → Turnstile sesuai permintaan → SSE → jawaban per blok (bersitasi `[n]` vs penghubung redup), kartu kutipan Arab dari DB (`/api/kutipan`), teks takhrij asli + tanda "takhrij memuat istilah kelemahan" (dari teks DB), laporan jawaban, semua penolakan → Cari; aksesibilitas.
  - Status hadits versi 3 sesudah empat putaran peninjau: hanya tampil bila kalimat itu sendiri menyitasi takhrij; klaim per kelompok; pengganti netral "tidak ditampilkan"/"belum diketahui"; tidak stabil → jawaban tidak ditampilkan.
  - `/transparansi`, `/privasi` jujur soal laporan jawaban, pagar `/api/kutipan`, arsip eval menyimpan blok + sitasi; perbaikan S20: cookie anon base64 kanonis.
- Verifikasi:
  - Eval final `s21-publik-hadits-v5` (42 soal publik): kutipan valid 100% (159/159), lokasi 73,5% (antar-run 73,5–76,5%), penolakan 100%, tidak salah menolak 94,1%, tanpa pola fatwa 100%; audit: 3 ringkasan status tampil (bersitasi takhrij sendiri), 2 ditahan, 0 klaim penilaian bersitasi matan; tanda kelemahan DB pada takhrij gold yang disitasi, soal sahih tidak; US$0,0026/jawaban.
  - Uji ujung ke ujung di Preview `pr-100.surau.org/tanya` dengan Jawab staging dinyalakan sebentar; produksi pasca-merge S20: `/privasi` 200, `/admin` 302 Access, `/api/jawab` 404.
  - `pnpm verify` lolos (641 + 313 tes, build 3/3); Playwright lokal a11y + Tanya 12/12.
- Biaya API: ±US$0,37 (eval v1 0,1167 + v3 0,1096 + v4 terhenti 0,0299 + v5 0,1091 + uji staging ±0,003), batas agent US$0,50.
- Keputusan: ADR-066.
- Catatan untuk sesi berikutnya: R4 belum terpenuhi (status hadits belum terbukti — deteksi pola teks bebas punya batas, lokasi < 90%, judge, ustadz, tampilan) → `/rilis 4` belum disarankan; usul: status hadits dari label takhrij yang ditinjau + pencarian makna. Pemilik: T-25, T-24, secret produksi T-14.

## 2026-10-21 · S20 · Pengaman biaya & penyalahgunaan — selesai

- Dikerjakan:
  - Guard biaya di Worker `surau-api`: cookie anon HMAC 24 jam / Turnstile (siteverify), burst `JAWAB_BURST`, kuota harian anon + jaringan IP dalam satu statement, cache HMAC, reservasi anggaran atomik (biaya terburuk Haiku; Sonnet direservasi terpisah), komit biaya nyata, `GET /jawab/status`, cron `*/10` (reservasi basi, peringatan 80%, hapus fisik P-7 harian).
  - Migrasi app 0004 (`quota_daily`, `llm_budget`, `llm_ledger`, pengaturan P-4) + repo bertipe; satu secret `SURAU_API_SECRET` berturunan HKDF (dipasang agent di produksi + staging).
  - Web: penerus `/api/jawab` (skema bersama, header internal, Set-Cookie anon), `/admin` + `/api/admin` (Access `Surau Admin` + JWT AUD admin), `/privasi`, `redactPii` untuk laporan.
  - Privasi: ditemukan log otomatis per permintaan Workers merekam IP mentah (`wrangler tail --ip self`) → `invocation_logs: false` di web/MCP/API, dijaga tes.
- Verifikasi:
  - `pnpm verify` lolos; sesudah perbaikan peninjau dua putaran `pnpm test` 596 Node + 312 Workers, `pnpm check` bersih; CI PR #99 hijau.
  - Tes guard workerd (Turnstile, cookie, burst, kuota anon/IP, reservasi paralel tidak melewati plafon, anggaran habis → 503 `budget` + status tidak tersedia + `/health` 200, Sonnet, galat penyedia, klien putus, cron, log tanpa data pribadi).
  - Produksi: `/admin` dan `/api/admin` → 302 login Access (`kid` = AUD Surau Admin); `POST /api/jawab` → 404.
  - Tampilan `/privasi` (desktop + ponsel) dan `/admin` tanpa login dicek di pratinjau Workers lokal; panel admin berlogin dites render server.
  - Peninjau: dua putaran tanpa blocker; semua temuan penting + saran diperbaiki (biaya semu saat klien putus, IP di log otomatis, galat tanpa status, body putus di tengah stream, dokumen).
- Biaya API: – (Anthropic tiruan).
- Keputusan: ADR-065.
- Catatan untuk sesi berikutnya: S21 (celah status hadits dulu, lalu UI Tanya + uji staging guard). Pemilik: secret produksi `CF_AIG_TOKEN` + `TURNSTILE_SECRET_KEY` (T-14) sebelum `/rilis 4`. Butir "tanpa IP di log" dicentang setelah log lama habis (±2026-10-28).

## 2026-10-20 · S19 · Pipeline Jawab — selesai

- Dikerjakan:
  - Pipeline Jawab `packages/llm/src/jawab`: routing Haiku atas daftar isi ter-cache, kandidat `searchText` RRF, jawaban Citations *custom content* per paragraf, kutipan dipetakan ke ID + offset lalu diverifikasi ke DB, huruf Arab model dibuang, status hadits hanya dari takhrij tersitasi, refusal → Sonnet → Cari, galat → Cari.
  - Worker `surau-api` + `surau-api-staging` (Hono SSE, tanpa alamat publik); `/api/jawab` web (mati di produksi); `answer_cache`; klien AI Gateway BYOK + `jawab:gateway-check`; `eval:jawab answer`.
  - Prompt `answer@1→5` dan `answer-route@1→2` diiterasi hanya dengan soal publik; holdout sekali (v4).
- Verifikasi:
  - Uji passthrough gateway 12/12 sama dengan langsung; biaya tercatat di Analytics (pemilik).
  - E2E Preview `pr-98.surau.org/api/jawab`: SSE bertahap, sitasi terverifikasi, cache, `not_found`, status hadits; sakelar staging dimatikan lagi.
  - Eval final-3 (ihya-v7, 42 publik): kutipan valid 100% (159/159), lokasi 76,5%, penolakan 100% (8/8), tidak salah menolak 100%, tanpa pola fatwa 100%, US$0,00259/jawaban. Holdout v4: kutipan 100% (74/74), lokasi 57,1%. Judge (belum terkalibrasi): v4 kesetiaan 52,4%/atribusi 69,0%, v5 39,0%/63,4%.
  - `pnpm verify` lolos; sesudah perbaikan akhir `pnpm test` 579 Node + 256 Workers, `pnpm check` bersih. Peninjau tiga putaran; blocker diperbaiki dan dites.
  - Produksi: `jawab_enabled` = 0, `POST surau.org/api/jawab` = 404.
- Biaya API: ±**US$1,51** dari izin ≤ US$3. Rinciannya: gateway-check 0,0055; uji kecil 0,0142; publik v1–v4 0,5037; holdout 0,0483; judge v4 0,2267 + v5 0,2323; v5 0,1101; final-2 0,1082; final-3 0,1090; E2E ±0,012. Sekitar 0,147 terbuang di run terputus/dihentikan (remote 0,0665, final 0,0807).
- Keputusan: ADR-064.
- Catatan untuk sesi berikutnya: S20 (guard biaya, HMAC kunci cache, PII, penghapusan fisik). Pemilik memasang secret `surau-api` produksi (T-14). Hambatan kualitas: pencarian (lokasi) dan kesetiaan judge; metrik status hadits perlu label.

## 2026-10-19 · Di luar sesi · Skill aset visual + tiga ilustrasi prinsip di Beranda — selesai

- Dikerjakan: skill `.claude/skills/aset/` (mesin turunan iso-glow MIT, token warna dibaca dari `globals.css`, tombol Indonesia, mode sematan/polos/sampul, demo otomatis, kurangi gerakan; skrip Node `bangun.mjs`/`potret.mjs` dengan WebP/JPG). Colorfigures dicoba dulu lalu diganti setelah pemilik membandingkan keduanya. Figur contoh `kitab-rehal` (hanya di `aset/keluaran/`, untuk cover dan konten) dan tiga figur prinsip yang dipasang di kartu Beranda lewat `ArtEmbed` (iframe sandbox); header `/aset/*` di `public/_headers` (termasuk `no-transform` supaya beacon Web Analytics tidak tersisip, ditemukan di preview), kredit di `/lisensi#ilustrasi`, e2e baru di `smoke.spec.ts`. Peninjau: tanpa blocker; semua temuan perbaiki dan saran diterapkan (ketukan saat demo tidak lagi tertelan, denyut di lapis tetap, hidrasi, penamaan Inggris di web, tema induk menang atas sistem, timer dibersihkan, CSP sandbox, CORS hanya font).
- Verifikasi: `potret.mjs` untuk keempat figur (terang, gelap, kartu 240 px, tombol termasuk di luar urutan) → tanpa galat; halaman tiruan dengan iframe sandbox (desktop terang/gelap, ponsel 390 px) → tergambar, tema lewat postMessage, latar transparan; galat CORS font di server tiruan membuktikan header ACAO dibutuhkan (ada di `_headers`). `vp check` atas berkas yang diubah → lolos. Server dev dan `pnpm verify` penuh tidak bisa dijalankan di kontainer cloud (HeroUI Pro tidak terpasang); CI dan preview PR yang menentukan.
- Revisi pemilik (situs akan tiga bahasa; tombol terasa kurang pas): figur situs kini tanpa kata/angka/tombol (lencana centang/silang, pita penanda, papan nama, coretan), cerita diputar sekali saat terlihat dan diputar ulang saat kartu di-hover/diketuk; iframe dekoratif (`aria-hidden`, `tabindex=-1`). Uji di halaman tiruan: urutan status keliru → sama persis saat terlihat, ulang saat hover dan klik kartu; 0 tombol, 0 teks di gambar.
- Revisi pemilik kedua dan ketiga: lencana menempel di bidang (`api.lencanaBidang`); penghubung dibandingkan dalam tiga opsi (A jejak di alas, B diangkat, C tanpa penghubung), pemilik memilih A: jejak di permukaan alas (`api.jalur` + `api.simpul`), bukan kabel melayang.
- Cek akhir pemilik: mode berulang (`ulang`, contoh empty state `kosong-pencarian`), mesin bersama ber-hash di `/aset-mesin/` (HTML figur situs ±6 KiB), `ArtEmbed repeat`.
- Sebelum merge: digabung dengan `main` (ADR-054/055/056 milik main; ADR aset dinomori ulang menjadi ADR-057). Font Plus Jakarta Sans dikeluarkan dari aset (figur situs tanpa kata, cukup font sistem; potret memakai HarmonyOS Sans dari `src/fonts` hanya di browser pemotret, berkas tidak disalin). Temuan peninjau akhir diterapkan: ketukan lewat `click` (menggulir di ponsel tidak memicu), putaran dihitung di satu tempat (tidak ada putaran ganda), `?ulang` tidak valid diabaikan, empty state 2 putaran (gerak ≤5 dtk, WCAG 2.2.2), teks `alt`, klaim "tiga bahasa" jadi rencana, e2e menunggu "tidak cocok" lalu "sama persis" dan memeriksa mesin bersama. Uji Playwright lokal: urutan status benar, pointerdown saja tidak memutar, putaran kosong-pencarian 2/`ulang=abc` 2/`ulang=1` 1/`ulang=3` 3; `vp check` lolos; `vp test --project node` 474 lolos (gagal hanya `heroui-css.test`, paket Pro tidak ada di kontainer).
- Perbaikan untuk `main` yang ikut di PR ini: bump Dependabot #51 menaikkan `@axe-core/playwright` 4.13 → 4.14 (preview PR itu dilewati), dan di 4.14 aturan `label-content-name-mismatch` (WCAG 2.5.3) tidak lagi eksperimental. Akibatnya e2e a11y gagal di semua halaman, produksi juga (dicek dengan axe 4.14 ke surau.org). Elemen yang `aria-label`-nya tidak memuat teks terlihat: tombol Cari (kini bernama dari teksnya, `sr-only` di ponsel, ⌃K `aria-hidden`), sampul kitab di cincin/rak Beranda dan di `/kitab/[work]` (teks `sr-only` "Buka kitab …" + sampul `aria-hidden`), dan empat `CellSelect` panel Tampilan (`aria-label` = label + nilai, dengan spasi di antara label dan nilai di DOM, karena React Aria menyusun nama sebagai "nilai + aria-label"; percobaan pertama menghapus `aria-label` justru membuat nama hanya berisi nilai, ditemukan di preview). Simulasi DOM di preview + axe 4.14 (desktop dan Pixel 7, 11 halaman + panel Tampilan sepia) → 0 pelanggaran.
- Biaya API: –
- Keputusan: ADR-057.
- Catatan untuk sesi berikutnya: figur "cara kerja Surau" dan video pendek media sosial (ffmpeg) diusulkan sebagai lanjutan; CSP penuh nanti perlu aturan khusus `/aset/*`.

## 2026-10-19 · S18 · Eval Jawab & halaman tinjau — sebagian

- Dikerjakan: 60 draf (42 publik/18 privat), sumber berbasis ID/offset; runner gratis baseline/score/seed/golden, judge Sonnet 5.5 dengan pagu dan manifest; D1 app snapshot/review; `/tinjau`, API/ekspor privat, Access PIN + JWT tiap rute. Panduan Anas T-24 tersedia.
- Verifikasi: `pnpm verify` lolos **485 Node + 218 Workers**, smoke/build; peringatan lint `search-client.tsx` dan CSS `::highlight` lama tetap. Retrieval 31 soal hit@10 100%, MRR 0,795. Peninjau memperbaiki 3 temuan, tinjauan ulang lolos terbatas. Browser desktop/390 px memakai komponen aktual dan fixture buatan: simpan→muat ulang, RTL/Naskh, tanpa overflow.
- Baseline Cari: 562/562 kutipan valid, lokasi 35/48 (72,9%), penolakan 0/12, takhrij 0/9. Set masih draf. 30 contoh kalibrasi publik sengaja mencakup kesalahan; bukan mutu pipeline S19.
- Biaya API: **US$0,112528** dari izin ≤ US$1; 29/30 judge valid, satu `max_tokens`. **0 penilaian manusia**, belum terkalibrasi. Tidak retry otomatis.
- Keputusan: ADR-052. `jose` 6.2.12 (MIT), tanpa upgrade lainnya. Retensi akses 12 bulan, penghapusan fisik manual sampai S20; pertanyaan umum belum diterima. Holdout tidak dikirim ke judge.
- Catatan: UI PR #30/#45 dari `main` dipertahankan; lanjut di `codex/s18-eval-jawab-final`, WIP lama tetap ada. Pemilik mengizinkan kedua penyimpanan privat; upload R2 selesai dan hash unduhan cocok. Verifikasi akhir sempat tertahan layanan persetujuan otomatis, lalu berhasil setelah pulih: 485 Node + 218 Workers dan build lolos. PR #48 squash merge `1f476b3`; CI/Preview hijau (99 e2e lolos/1 dilewati), Deploy web/MCP 39206240675 hijau. D1 sesudah seed: 60 soal/18 privat/30 contoh, 0 review saat seed; expiry pertama 2027-10-18. Peninjau akhir lolos tanpa blocker; perubahan ukuran judul 40 px dipulihkan setelah itu. Login produksi dan simpan→muat ulang satu ulasan Agent QA berhasil; bukan penilaian manusia. S18 belum selesai sampai T-24 (≥50 soal disetujui, ±30 penilaian kalibrasi, ≥10 uji halaman); Pemilik kemudian meminta agent mengevaluasi sementara agar dev tidak terhambat (ADR-054): 60 ulasan tersimpan, 18 benar/31 kurang/11 salah; T-24 ditunda dan S19 boleh lanjut. Tiga kriteria manusia tetap belum dicentang.

## 2026-10-17 · Rilis Fase 3 · MCP publik — dirilis (`rilis-f3`)

- Dikerjakan: pemeriksaan kesiapan S16–S17 (semua butir selesai, PR #42/#43 merge), branch `codex/rilis-f3`, dan catatan rilis di CHANGELOG; FASE/STATUS diperbarui untuk rilis melalui PR #44. `main` awal `4f88541` bersih dan sinkron dengan `origin/main`.
- Verifikasi:
  - `pnpm install --frozen-lockfile` → lolos; percobaan sandbox dihentikan karena DNS registry dibatasi, dijalankan ulang dengan akses yang sesuai dan memakai store lokal.
  - `pnpm verify` → lolos: **466 Node + 210 Workers**, smoke teks, build web dan MCP (1.356,01 KiB / gzip 246,11 KiB). Satu peringatan lint lama `search-client.tsx` dan peringatan CSS `::highlight` tetap.
  - Peninjau keamanan `git diff rilis-f2..main` (75 berkas, sampai `4f88541`) → **lolos, tanpa blocker/perbaiki/saran**; kutipan, lisensi, privasi, rate limit, SQL, workflow dan promote korpus ditinjau. `git diff --check` bersih, cek file data/rahasia terlacak kosong.
  - Mitigasi ADR-003 pada build: `cacheComponents: false`, `images.unoptimized: true`, manifest Server Actions `node`/`edge` kosong. Gerbang versi `docs-terbaru` → lolos: Next 16.4.1 didukung resmi OpenNext 1.20.12; dua high transitif (`glob`/`figlet`) masih ada di audit tetapi pemicunya tidak dipakai, mitigasi dan bukti di ADR-003. Patch Next 16.4.2/Wrangler 4.151.1 opsional.
  - Preview PR #44 commit `28f4c03`: [CI verify 39045772656](https://github.com/alfariesh/surau/actions/runs/39045772656) dan [Preview 39045772682](https://github.com/alfariesh/surau/actions/runs/39045772682) hijau. `pnpm test:e2e` **99 lolos/1 dilewati** (desktop/ponsel, dua tema, RTL/font Arab, pembaca, panduan, 404). Inspector lengkap MCP lolos kedua era, ketujuh tool, pencarian Arab/Indonesia, kasus error dan Origin asing 403. Panduan juga diperiksa di browser.
  - Analytics Preview: **505 request/0 invocation error**, 29 clientDisconnected; slug `__unknown__` bisa tercampur Preview lain dan bukan hitungan HTTP 5xx/console.error (ADR-031).
  - Deploy lewat `deploy.yml` (web lalu MCP); smoke produksi diulang sebelum tag. Bukti akhir run deploy, versi Worker, dan hasil smoke produksi disimpan pada anotasi tag `rilis-f3`.
- Biaya API: – (tanpa panggilan LLM berbayar).
- Keputusan: **ADR-051**; pemilik menjawab **"ya"** atas pertanyaan "Rilis Fase 3 ke produksi sekarang?" (2026-10-17), termasuk merge/deploy, smoke produksi, serta pembuatan dan push tag. Tidak ada perubahan korpus atau migrasi baru.
- Catatan untuk sesi berikutnya: **S18 · Eval Jawab & halaman tinjau ustadz** (T-13, T-14, P-7). Pemantauan MCP 17–24 Oktober tetap berjalan; belum dinyatakan stabil satu minggu.
- **Draf pengumuman (untuk pemilik, belum diposting):**
  > Kini Surau bisa dihubungkan ke asisten AI Anda untuk mencari dan membaca Ihya karya al-Ghazali, dengan teks Arab asli serta tautan ke halaman cetaknya. Koneksi MCP tersedia tanpa login melalui panduan https://surau.org/mcp. AI tetap bisa keliru; periksa kutipan dan sumbernya, serta pertahankan atribusi dan lisensi saat memakai ulang hasil.

## 2026-10-17 · S17 · Dokumentasi dan uji klien MCP — selesai
- Dikerjakan:
  - Panduan `/mcp` berbahasa Indonesia (Claude.ai/Desktop/Code, ChatGPT, klien lain), tiga contoh, alur cari → baca → verifikasi → sitasi, keterbatasan AI pengguna, takhrij/lisensi, bantuan; navigasi/sitemap/README dan smoke deploy diperbarui. Preview: https://pr-43.surau.org/mcp (PR #43); setelah merge/deploy, tautan tinjauan berpindah ke https://surau.org/mcp.
  - Uji nyata: Claude Code 2.1.299 + Haiku memanggil `search_text` lalu `read_page` edisi 1 j.1 h.48, hasil diperiksa langsung (sitasi, permalink, lisensi/atribusi); Claude.ai T-18 dikonfirmasi pemilik; Cloudflare AI Playground demo GLM-4.7-Flash juga kedua tool Completed. Desktop/ChatGPT hanya docs terbaru, tidak diklaim uji akun. Keterbatasan keluaran klien dicatat di [laporan](../docs/mcp-operasional.md).
  - Event `mcp_tool` per callback (nama/outcome/durasi, tanpa input/output/IP), error limiter tertangkap aman. Snapshot D1 bersama web/MCP 365.605 baris baca dan 1.134 kueri baca/24 jam; tarif Paid dikoreksi 25 miliar termasuk. Batas S16 tetap.
  - Pemantauan satu minggu 17–24 Oktober dimulai, automation harian 09.00 WIB tujuh kali (`pantau-mcp-surau-selama-satu-minggu`), tetap diam bila tidak ada perubahan bermakna; belum bukti stabil seminggu. Registry/directory/skill opsional ditunda.
- Verifikasi:
  - `pnpm verify` → lolos **466 Node + 210 Workers**, build `/mcp` statis dan MCP 1.356 KiB / 246 KiB gzip. Satu lint warning lama `search-client.tsx` tetap. Tes integrasi kedua era menjaga lisensi/atribusi semua tool dan sitasi hasil berteks.
  - `bash .github/scripts/uji-mcp.sh https://mcp.surau.org/mcp` → lengkap kedua era lolos, termasuk ketujuh tool, pencarian Arab/Indonesia, error dan Origin 403.
  - CI commit `5d0c6e6`: verify + preview + preview mcp hijau, **e2e Workers Preview 99 lolos/1 dilewati** (desktop/ponsel, dua tema, panduan dan navigasi pembaca), log **501 request/0 error** (23 clientDisconnected); run `39043047128`/`39043047143`; slug log `__unknown__` dapat mencampur trafik Preview lain (ADR-031).
  - Lokal sempat timeout dan ENOSPC; ±2 GB cache Next/hasil tes dibersihkan, tanpa korpus/data batch. Verify serial lolos; e2e Next dev lokal 97 lolos/1 skip/2 gagal navigasi reader ke 1/201 (RSC 200, React script tag, sebab belum ditetapkan); kasus yang sama lolos di Workers Preview. Tidak menyembunyikan kegagalan lokal.
  - Peninjau kode + dokumen: tanpa temuan; cek berkas rahasia/data ter-track kosong. Panduan dibuka di browser Preview; uji font/RTL/a11y ponsel ada di e2e Preview.
- Biaya API: **US$0,00344562**, diizinkan pemilik ≤ US$0,10; tidak ada panggilan model di server MCP.
- Keputusan: ADR-050.
- Catatan untuk sesi berikutnya: pemilik mengonfirmasi **“Panduan jelas; contoh lanjutan juga berhasil”** di chat S17 (2026-10-17), sehingga butir panduan diuji pemilik dan semua gerbang R3 terpenuhi. Sesudah S17 lengkap dan merge, pemilik `/rilis 3`, lalu S18 (T-13 ustadz, T-14 Access, P-7). Tag fase belum dibuat.

## 2026-10-17 · S16 · Worker MCP publik — selesai
- Dikerjakan:
  - Worker `surau-mcp` (`apps/mcp`) di `https://mcp.surau.org/mcp`: MCP SDK v2 2.3.1, stateless dual-era (2025-11-25 + 2026-07-28), tanpa login dan LLM; 7 tool (`list_works`, `get_table_of_contents`, `read_page`, `read_section`, `search_text` dipadatkan, `verify_quote`, `get_hadith_takhrij`), instruksi server, permalink absolut + blok lisensi (edisi + Tanzil/Kemenag).
  - Core: `verifyQuote`, `getHadithTakhrij`, `ipKey`/`ipNetwork` pindah dari web; kalibrasi `readSection` dengan `count_tokens` (1,4 karakter/token, potongan 3.500–5.000 token `passages`).
  - Pengaman: Origin allowlist, body 64 KiB, batas `HMAC(IP):tool` + batas global baca/cari, gagal tertutup tanpa secret; secret `IP_HMAC_KEY` dipasang (produksi + base config Preview, nilai acak tidak dicetak). T-19 (WAF) dipandu di TUGAS-PEMILIK.
  - CI/deploy: project Vitest `mcp`, `uji-mcp.sh` (Inspector 2.11.0 dua era), job `preview mcp` + `deploy mcp`; `corpus:promote` mengganti `CORPUS_DB` web + MCP; `pnpm llm mcp-tokens`; alamat web → `https://surau.org`.
- Verifikasi:
  - `pnpm verify` → lolos (466 + 208 tes, termasuk 20 tes `mcp` di kedua era; build web + `wrangler deploy --dry-run` MCP).
  - `uji-mcp.sh` → lolos di lokal (D1 Ihya), Preview PR #42 (job `preview mcp`, korpus staging), dan produksi `https://mcp.surau.org/mcp` (versi `0290a179`): tools/list + tools/call ketujuh tool + error + Origin asing 403, era modern dan legacy. `workers.dev` MCP → 404. Binding versi produksi `CORPUS_DB` = `537103c6…` (`ihya-v6`, dicek `wrangler versions view`).
  - Token (`pnpm llm mcp-tokens`, count_tokens gratis): `read_section` 7.690 → **5.037** median (maks. 9.192 → 6.193); `read_page` median 11.095; `search_text` limit 5 median 7.317, maks. 10.907.
  - Peninjau: 0 blocker, 7 perbaiki (semua ditangani), saran sebagian diambil (rinci di Catatan hasil S16).
- Biaya API: – (count_tokens gratis)
- Keputusan: ADR-049
- Pemilik: "Deploy dari branch" (2026-10-17) untuk deploy pertama Worker MCP sebelum merge (Preview MCP butuh Worker yang sudah pernah di-deploy).
- T-19 (2026-10-17): aturan WAF `MCP per IP` (path `/mcp`, 200/10 dtk per IP → Block 10 dtk, Active) dibuat agent lewat Chrome atas permintaan pemilik; `uji-mcp.sh https://mcp.surau.org/mcp daftar` lolos sesudahnya, situs 200.
- Catatan untuk sesi berikutnya: S17 = dokumentasi publik + T-18 (uji dari claude.ai: ukur batas per IP Anthropic dan ukuran `read_page` di konteks klien).

## 2026-10-17 · Rilis Fase 2 · Cari — dirilis (`rilis-f2`)

- Dikerjakan:
  - Kesiapan: S11–S15 + X02 selesai; butir S12 T-16 dan S12 verify dicentang dengan bukti; butir S13 QA (T-17 tahap 2, 70% < 80%) tetap tidak dicentang, penyimpangan diterima pemilik di chat (ADR-048). PR #30 (pohon daftar isi, UI) masih terbuka dan bukan bagian Fase 2.
  - Perbaikan dari tinjauan keamanan: `SEARCH_GLOBAL_LIMITER` 300 → 1.200/menit (produksi 1004, Preview 2004), per klien tetap 60 (PR #39).
  - Catatan rilis di `CHANGELOG.md`; FASE, STATUS, TUGAS-PEMILIK diperbarui.
- Verifikasi:
  - `pnpm install --frozen-lockfile` + `pnpm verify` → lolos (464 + 177 tes, build) · `pnpm test:e2e` → 93 lolos, 1 dilewati · cek rahasia `git ls-files … | grep` → kosong · larangan ADR-003 (grep `use server`/`use cache` kosong, `cacheComponents: false`, `images.unoptimized: true`, `server-reference-manifest` kosong) → terpenuhi.
  - Gerbang eval: `pnpm run eval:retrieval --gate --label rilis` atas D1 lokal `ihya-v6` (= `CORPUS_DB` produksi `surau-corpus-ihya-v6`), 31 soal resmi (22 publik + 9 privat dari R2 `retrieval/2026-10-17-resmi-2.jsonl`) → hit@1 64,5% · hit@5 96,8% · **hit@10 100%** · MRR 0,795 → LOLOS ([laporan](../evals/reports/retrieval-2026-10-17-ihya-v6-rilis.md)).
  - Tinjauan keamanan `rilis-f1..main` (peninjau): 0 blocker, 2 "perbaiki" (batas global pencarian → diperbaiki; tautan artifact T-12 → berbagi ditutup pemilik), beberapa saran (catatan di ADR-048/STATUS).
  - Gerbang versi (docs-terbaru): Next 16.4.1 dalam peer OpenNext 1.20.12 (`>=16.4.1`); tidak ada advisory terbuka untuk Next 16.4.1, React 19.3.1, OpenNext 1.20.12, wrangler 4.151.0. Patch opsional: next 16.4.2, wrangler 4.151.1 (non-keamanan).
  - Preview PR #39 (https://pr-39.surau.org): CI verify + preview + eval lolos (446 request, 0 error); uji manual ponsel 375 px: `/cari?q=adab murid kepada guru` (5 halaman, sorotan, label Terjemahan AI), j1 h210 (RTL, Naskh, terjemahan AI), j4 h335 (QS 54:55 + terjemahan Kemenag), 404; konsol 0 error.
  - Produksi setelah merge (squash `2645ebd`, versi Worker `4c62363e`): `deploy.yml` run 39031636567 → success; binding `SEARCH_GLOBAL_LIMITER` 1200/60s, `SEARCH_LIMITER` 60/60s, `CORPUS_DB 537103c6-…` (`ihya-v6`). Smoke curl: `/`, `/cari`, `/cari?q=sabar`, `/api/search` Arab + `niat`, `/kitab`, j1 h200, j1 h210, j4 h335, `/tentang`, `/lisensi` = 200; `/kitab/ihya/5/1`, `/tidak-ada` = 404. Tag `rilis-f2` di-push.
  - Produksi sebelum merge (curl): `/`, `/cari`, `/api/search` Arab + Indonesia, j1 h210, j4 h335, `/tentang`, `/lisensi` = 200; `/kitab/ihya/5/1`, `/tidak-ada` = 404.
- Biaya API: –
- Keputusan: ADR-048
- Catatan untuk sesi berikutnya: S16 (Worker MCP) menunggu T-07 domain. Pantau 429 dan baca D1 `/api/search`. T-17 tahap 3 opsional. Soal holdout baru di S18.
- **Draf pengumuman (untuk pemilik, tidak diposting agent):**
  > Alhamdulillah, kini Anda bisa mencari di mana al-Ghazali membahas sesuatu di *Ihya' 'Ulum ad-Din*, cukup dengan kata Indonesia seperti "sabar" atau "adab murid kepada guru", atau dengan kata Arab. Setiap hasil menunjuk ke halaman cetak dan paragrafnya, dengan teks Arab asli, terjemahan dan ringkasan berlabel AI sebagai alat bantu, serta ayat Al-Qur'an yang memakai terjemahan Kemenag apa adanya. Terjemahan AI masih bisa keliru, jadi rujuk teks Arabnya dan laporkan bila menemukan kesalahan. Gratis, tanpa iklan, dan terbuka: https://surau-web.alfarieshsalman.workers.dev/cari

## 2026-10-17 · X02 · Perbaikan mutu terjemahan AI dan ayat sebelum rilis Fase 2 — selesai
- Dikerjakan:
  - **Hasil T-16 dan T-17 tahap 2** (penilaian agent lain yang diteruskan pemilik sebagai lapisan koreksi, "bukan kebenaran mutlak"; diperiksa ulang di korpus): T-16 20/20 cocok; T-17 tahap 2 14 Benar / 4 Kurang / 2 Salah (70%, target 80%). Laporan `data/reports/ihya-9472-review-prarilis-f2-2026-10-17.md`.
  - **Lapisan koreksi tinjauan** (`data/reviews/ihya-9472-terjemahan.json`) berisi 27 paragraf: 6 dari sampel, ditambah 21 dari pencarian pola di seluruh terjemahan (ungkapan tebusan sebagai sumpah di 17 paragraf, satuan *mann*, judul bab nikah). Hasil prompt v2 untuk paragraf itu ditolak, lalu diterjemahkan ulang Sonnet 5.5 dengan **prompt `translate-passage@3`** (aturan satuan, ungkapan, pakaian, raghiba fi/'an, kitab amal kanan/kiri, kalimat lanjutan).
  - **Pencocok ayat lintas paragraf:** QS 54:55 di p18256–p18257 kini tertaut, terjemahannya memakai placeholder Kemenag. Ringkasan bab 100273 dan dua induknya dibuat ulang. Kaki halaman pembaca membatasi klaim ke "kutipan ayat yang dikenali".
  - **Korpus `ihya-v6`** dibangun, dimuat ke lokal dan staging, lalu dibuat sebagai DB produksi `surau-corpus-ihya-v6` atas izin pemilik. Binding produksi berpindah lewat PR #37 (deploy `0a78a24`, dicek dengan `curl`: j1 h210 "mann", j2 h243 "lengan bajumu", j4 h335 QS 54:55). `ihya-v5` menjadi rollback.
  - **Halaman tinjauan T-12:** teks 9 soal privat dihapus dari halaman (sempat bisa dibuka lewat tautan); insidennya dicatat di ADR-047.
- Verifikasi:
  - **Batch:** `pnpm llm rejudge` menolak 26 hasil koreksi (p18257 sudah usang karena ayat berubah). `retry` + `submit` r1/r2 menghasilkan 34 request, semuanya lolos pada percobaan pertama.
  - **Ingest:** `pnpm ingest ihya` → validasi ✓, rujukan ayat 2.482 → 2.484, 1.311 terjemahan berayat tanpa masalah, terjemahan 16.086, ringkasan 626.
  - **Korpus produksi:** `corpus:promote ihya-v6 --confirm` → smoke = build. `corpus:qa ihya-v6` → 30/30 byte demi byte.
  - **Eval:** `eval:retrieval --gate` atas ihya-v6 → hit@10 100% (kode keluar 0).
  - **Penilaian ulang 20 sampel T-17 yang sama** (agent X02): 20/20 Benar. Angka ini bias, karena perbaikannya menyasar sampel itu; skor sebelumnya (70%) tetap berlaku sebagai ukuran mutu korpus v2.
  - `pnpm verify` → lolos (464 + 177 tes).
  - **Peninjau:** 0 blocker, 7 perbaiki (ulangan tanpa batas bila versi prompt saat ini ditolak, ingest belum memeriksa koreksi, aturan *raghiba* v3 → prompt v4, label laporan per versi prompt, prinsip ayat di situs masih mutlak, klaim "di produksi" sebelum merge, T-16/T-17 tercatat "diterima pemilik"), semuanya ditangani; saran diambil sebagian (partial ikut letak, `pages` wajib, pasangan satu bagian daftar isi, daftar semua pasangan lintas paragraf di laporan ayat, alasan koreksi tanpa huruf Arab, peringatan ID koreksi tak dikenal). Build ulang dengan `SOURCE_DATE_EPOCH` yang sama → sha256 identik dengan DB produksi.
- Biaya API: **$0,25** (26 ulangan Sonnet $0,23, ringkasan $0,01, 2 terjemahan Haiku < $0,01). Izin pemilik ≤ $1. Total batch Ihya kini $4,68 (dari `usage`).
- Keputusan: ADR-047.
- Pemilik: "Ok go ahead" (2026-10-17) untuk biaya ≤ $1 dan promote korpus baru.
- Berikutnya: pemilik `/rilis 2`. Opsional T-17 tahap 3 (20 sampel acak baru, penilaian tanpa bias). Lalu S16 (butuh T-07 domain).

## 2026-10-17 · S15 · Eval retrieval — selesai
- Dikerjakan:
  - `tools/eval` + `pnpm run eval:retrieval`: soal JSONL, `searchText` atas D1 lokal (salinan state) atau staging (`--remote`), hit@1/5/10 + MRR, laporan `evals/reports/` tanpa teks soal privat, `--gate` untuk `/rilis`.
  - 31 soal (22 publik + 9 privat di R2 `surau-evals`), ditulis sebelum pencarian dijalankan dan lokasinya dicek dengan membaca bab; ke-31 disetujui pemilik (T-12) lewat halaman tinjauan + chat.
  - Perbaikan murah: kata pembingkai pertanyaan (cara, bagaimana, di mana, menurut, "al-Ghazali", …) dibuang dari kueri Indonesia (hanya sisi kueri; indeks tetap).
  - CI `eval.yml` non-blocking (staging remote + soal privat dari R2); gerbang di `/rilis`; syarat R2 dirinci di FASE.md (Fase 2 **siap rilis**).
- Verifikasi:
  - **Angka eval** (D1 lokal `ihya-v5` = staging = produksi):
    - baseline 30 soal: hit@1 56,7% · hit@5 90,0% · hit@10 96,7% · MRR 0,732;
    - **resmi 31 soal disetujui:** hit@1 64,5% · hit@5 96,8% · **hit@10 100%** · MRR 0,795 (publik 22 dan privat 9 sama-sama 100%; kueri Arab 6/6 di peringkat 1);
    - `pnpm run eval:retrieval --gate` → kode keluar 0 (lolos).
  - **Staging:** `--remote` lokal 12 dtk, angka sama; CI PR #36 39 dtk.
  - **Tes dan peninjau:** `pnpm verify` → lolos (456 + 177 tes).
    - Peninjau putaran 1: 1 blocker (soal privat p03 terpakai merancang perbaikan → dipindah ke publik r03, diganti p31) + 5 perbaiki + saran, semua ditangani.
    - Putaran 2: 1 blocker (catatan sesi menyebut topik soal privat p12 → dipindah ke publik r12) + 2 perbaiki (teks gerbang di `/rilis`, urutan syarat R2) + saran (CI memanggil runner langsung, gerbang wajib ≥ 1 soal privat, `-dirty` ikut berkas baru, ejaan Ghozali/Ghazzali, lokasi salinan soal privat dicatat), semua ditangani.
- Biaya API: – (tanpa LLM)
- Keputusan: ADR-045 (eval retrieval, holdout, kata pembingkai), ADR-046 (embedding tetap ditunda; S15b tidak dijadwalkan)
- Pemilik: T-12 "Ya setujui semua" (2026-10-17).
- Berikutnya: pemilik T-16 + T-17 tahap 2 → `/rilis 2` → S16 (butuh T-07 domain).

## 2026-10-17 · S14 · Cari bahasa Indonesia + UI Cari — selesai
- Dikerjakan:
  - Indeks Indonesia `translation_fts` + `summary_fts` (migrasi 0006, skema 6, korpus `ihya-v5`): stem ringan Tala + stopword kecil + ejaan baku, diuji dulu pada kosakata terjemahan Ihya (sabar 173 → 404 paragraf, taubat 11 → 248).
  - `searchText`: deteksi aksara kueri; kueri Indonesia/campuran digabung RRF (Arab + terjemahan + ringkasan) dalam satu bolak-balik D1; `matched_by`, terjemahan/ringkasan berlabel AI, filter bagian.
  - Halaman `/cari` (filter rub'/kitab, kartu dengan teks Arab asli tersorot), palet ⌘K, menu Cari aktif; pembaca menampilkan terjemahan AI per paragraf (ayat = Kemenag berlabel), ringkasan AI di awal bab, dan sorotan kata dari hasil Cari.
  - Cache hasil `/api/search` (Cache API, kunci = versi korpus + rencana kueri, produksi saja); `corpus:promote --switch-only` boleh ke skema lebih lama (rollback `ihya-v1`).
  - `ihya-v5` dimuat ke D1 lokal dan `surau-corpus-staging`, lalu atas izin pemilik dipromosikan ke produksi (`surau-corpus-ihya-v5`, QA 30/30, PR #34); `ihya-v1` jadi target rollback.
- Verifikasi: `pnpm verify` → lolos (432 + 177 tes) · e2e lokal 87 lolos + `search.spec.ts` 6/6, Preview PR #33 hijau · latensi staging (Preview, 240 kueri, cache mati) handler p95 154 ms, SQL D1 p95 19,9 ms · Lighthouse 13.5.0 Preview `/cari?q=sabar` a11y 100 (ponsel + desktop), performa 87/100; pembaca j4 h61 a11y 100 · 5 teratas sabar/niat/adab murid kepada guru relevan (dicatat di file sesi) · peninjau: 0 blocker, 7 perbaikan diterapkan (pemetaan ringkasan tanpa urutan ID, versi kunci cache, `/cari` di korpus lama, a11y status, dll.) · e2e lokal sesudahnya 93 lolos.
- Biaya API: –
- Keputusan: ADR-044
- Pemilik: izin promote `ihya-v5` (dipasang, PR #34) dan T-23 "Cari ok sudah ok" (2026-10-17).
- Berikutnya: S15 (eval retrieval; T-12 disetujui di tengah sesi).

## 2026-10-17 · S13 · Batch terjemahan & ringkasan (Haiku 5.5) — selesai* (QA T-17 tahap 2 menunggu pemilik)

- Dikerjakan:
  - Paket `@surau/llm` (`@anthropic-ai/sdk` 0.135.0): prompt berversi `translate-passage@2` + `summarize-section@2` (glosarium ±110 istilah di prefix yang di-cache, ±4.300 token), `custom_id`, validasi keluaran, harga. CLI lokal `pnpm llm` (tokens, sample, plan + count_tokens semua request, submit bertahap dengan `--budget`, wait, collect, rejudge, retry, report) di `tools/ingest/src/llm`.
  - **Token Arab Claude terukur:** 0,716 token/karakter = **1,84× o200k** → kalkulator (`FAKTOR_TOKEN_ARAB`, model prompt sistem per request) dan `docs/08` diperbarui; per jawaban Haiku + Citations $0,0019 → $0,0027.
  - **Batch:** uji kecil v1/v2 (20 paragraf + 5 bagian) → prompt v2; tahap 1 (668 ringkasan + 4.000 paragraf) → sisa 12.437 → ulangan Haiku 383 → percobaan terakhir Sonnet 5.5 181 → ringkasan putaran 2 (178). Hasil: **16.086/16.111 terjemahan (99,84%)**, **626/626 ringkasan** ID+EN. Cache prompt sistem ±100%, 0 refusal.
  - **Pencocok ayat (ADR-042):** temuan uji kecil — ayat tanpa kurung/pengantar akan diterjemahkan LLM. Mode baru `cue_short` + `unmarked` (lafaz satu-satunya di mushaf, tanpa konteks hadits/zikir/basmalah, paragraf badan): rujukan 1.650 → 2.482 (sampel T-16 tetap).
  - Korpus **`ihya-v4`** (skema 5): `translation` + `summary` dimuat dari hasil yang lolos, dicek ulang hash sumber + validasi; invarian "ayat diisi Kemenag". Dimuat ke D1 lokal (belum staging/produksi).
  - Peninjau 1: 1 blocker (rujukan ayat salah tunjuk untuk lafaz berulang, zikir, basmalah, hadits) + 7 perbaikan (kirim ulang berbasis hash, retry ganda, paragraf terblokir, huruf Arab apa pun, penanda karangan, model mengisi ulang ayat, laporan basi) + saran; semua diperbaiki sebelum batch tahap 2 (hasil berbayar dinilai ulang gratis lewat `rejudge`). Peninjau 2: 2 blocker (komentar/koreksi-diri model berbahasa Indonesia ±1,4% lolos; kutipan pendek terpotong sehingga sisa ayat diterjemahkan model) → validasi v3, kutipan pendek diperpanjang melewati beda ejaan, ringkasan putaran 2 bergantung teks anak, `retry --budget`; dinilai ulang, yang terdampak dikirim ulang. Peninjau 3: sisa ±17 komentar model ("Terjemahan:", "mari terjemahkan") + perpanjangan kutipan pendek mentok 4 kata → validasi v4, perpanjangan sampai kurung berikutnya, sampel QA dibekukan; dinilai ulang, dikirim ulang.
- Verifikasi:
  - `pnpm llm tokens` → faktor 1,84 (200 paragraf, seed 9472); `pnpm llm plan` → semua 17.866 request dihitung `count_tokens`, terbesar 83.231 token (< 100k).
  - `pnpm ingest ihya` → semua invarian ✓, termasuk **1.309 terjemahan berisi ayat, 0 bermasalah** (setiap rujukan = segmen Kemenag utuh), cakupan terjemahan 99,84% dan ringkasan 100%; `pnpm corpus:load:local` → `translation` 16.086, `summary` 626.
  - `pnpm verify` → lolos (348 tes Node, 155 tes D1/core, build web).
  - Browser lokal (`ihya-v4`): j3 h199 rujukan baru QS 3:120 sesudah `{وقال}` (popup "terjemahan ayat lengkap (Kemenag)"), 0 galat konsol/server.
- Biaya API: **$4,48** (35 batch, $4,43 dari `usage`: terjemahan $3,35 termasuk batch ulangan Sonnet/campuran ±$1,40, ringkasan $1,08; uji kecil API biasa $0,05). Disetujui pemilik ±$6, batas berhenti $7,20. Estimasi rencana putaran 1 (cache 95%/50%) $1,94/$4,24 untuk sisa sesudah tahap 1.
- Keputusan: ADR-042 (pencocok ayat S13), ADR-043 (desain batch). ADR-041 disisakan untuk PR #30.
- Catatan untuk sesi berikutnya: S14 menampilkan terjemahan (`translationSegments`, label "terjemahan AI" vs Kemenag) dan ringkasan, memuat `ihya-v4` ke staging lalu promote. `data/build/llm/` hanya di Mac pemilik: jangan dihapus, cadangkan. 25 paragraf tanpa terjemahan (6 kemungkinan ayat belum ditandai); ayat yang luput dari pencocok bisa diterjemahkan model (sisa risiko ADR-042) → bahan perbaikan pencocok.

## 2026-10-17 · S12 · Ayat Al-Qur'an (Tanzil) & terjemahan Kemenag — selesai* (T-16 menunggu pemilik)

- Dikerjakan:
  - Sumber: Tanzil 1.1 XML (uthmani + simple-clean; basmalah dari atribut `bismillah`) + **data Kemenag milik pemilik** (`surau-quran-kemenag`: terjemahan + 678 catatan kaki, transliterasi, metadata surah, juz) menggantikan QuranEnc atas arahan pemilik; semua sha256 dipin. Migrasi korpus 0005 (skema 5), korpus **`ihya-v3`** dimuat ke D1 lokal dan `surau-corpus-staging`; produksi tetap `ihya-v1`.
  - Pencocok deterministik (`tools/ingest/src/quran`): `{…}` (aturan 1/2/3+ kata, mirip ≥ 0,93) + kutipan tanpa kurung sesudah "قال تعالى" (jangkar 3 kata, ≥ 4 kata). Ihya: **1.650 rujukan** di 1.037 paragraf; laporan `data/reports/ihya-9472-ayat.md` dengan 20 sampel T-16.
  - `@surau/core`: `Passage.ayah_refs`, `PageView.quran`, `getAyahRefs`, penanda ayat S13 (`maskAyat`, `checkPlaceholders`, `translationSegments`: label Kemenag terpisah dari "terjemahan AI"). Web: kutipan berwarna halus + label "QS s:a" (HoverCard/Popover) berisi teks Tanzil, transliterasi, terjemahan Kemenag + catatan kaki, atribusi, tautan tanzil.net; footer + `/lisensi` + `data/ATTRIBUTION.md` (blok hak cipta Tanzil).
  - Peninjau: 0 blocker, 4 "perbaiki" diperbaiki (label/`alt_count` kutipan tanpa kurung mengikuti letak terpilih, halaman > 300 ayat tidak gagal, nama aksesibel + `lang` label, laporan tidak menyebut 2 ayat tak tertaut sebagai "bukan ayat") + 11 saran diambil (rincian di file sesi).
- Verifikasi:
  - `pnpm ingest ihya` → semua invarian ✓, termasuk `{…}` tervalidasi 977/1.004 persis (**97,3%**, mirip 25, tidak cocok 2) dan kutipan exact ada di ayat rujukannya 1.587/1.587; penomoran QUL vs Tanzil 6/6.236 beda ejaan, nomor sama.
  - Tes lokal Ihya: setiap kutipan exact = isi ayat rujukannya (ayat utuh sama persis).
  - `pnpm verify` → lolos (tes Node + Workers, build); `pnpm test:e2e` lokal → 76/76 (termasuk e2e label ayat + axe j1 h119 terang/gelap, desktop/ponsel).
  - Browser lokal + Preview PR #31 (staging `ihya-v3`): j1 h103 (QS 41:11 utuh), j1 h119 (QS 27:90 sebagian → "Terjemahan ayat lengkap (Kemenag)"), j1 h175 (ayat di catatan kaki); label tidak ikut teks tersalin; 0 galat konsol.
- Biaya API: –
- Keputusan: ADR-040 (data Kemenag pemilik menggantikan QuranEnc, Tanzil XML, skema 5, aturan pencocok, penanda S13, UI)
- Catatan untuk sesi berikutnya: S13 memakai `maskAyat(text_raw, ayah_refs, footnote_refs)` + `checkPlaceholders` sebelum menyimpan `translation.text`, dan `translationSegments` saat tampil. Promote korpus ke produksi di S14 harus ≥ `ihya-v3`. T-16 menunggu pemilik; hasilnya dicatat di file sesi S12.

## 2026-10-17 · S11 · Indeks FTS Arab & `searchText` — selesai

- Dikerjakan:
  - Korpus `ihya-v2` (migrasi korpus 0004 `term_stat`, skema 4): ingest mengisi `passage_fts` (stem saja, 20.509 baris, ±5,4 MB) + `optimize` + `term_stat` (39 stem >10%, dari `fts5vocab`); reset `delete-all`; smoke FTS. Dimuat ke D1 lokal dan `surau-corpus-staging` (±65 dtk). Produksi tetap `ihya-v1`.
  - `@surau/text` (`planFtsQuery`, `findPlanSpans`, `snippetSpan`), `@surau/db` (`searchCorpus`: satu batch, pengaman kata umum di ekspresi MATCH), `@surau/core` (`searchText`, kontrak `searchView`), `apps/web` (`GET /api/search`, batas per klien + global, `Server-Timing`).
  - Desain diubah dua kali karena ukuran staging: dua bolak-balik → satu batch (Worker SIN ↔ D1 NRT ±90 ms per bolak-balik), lalu pengaman lewat indeks `term_stat` (+±1.400 baris dibaca).
  - Peninjau (dua putaran): 0 blocker; diperbaiki: celah pengaman lewat `expand`/varian klitik (الل → الله, سلم → وسلم), `edition_id` > 899.999 → 500, deskripsi kontrak mode tanpa peringkat, urutan batas laju (per klien dulu, juga `/api/feedback`), judul/isi ADR; saran diambil: batas global, detail `Server-Timing` hanya Preview, smoke toleran skema lama, regex penghapus build berjangkar, asersi `ranked` di tes regresi.
- Verifikasi:
  - `pnpm verify` → lolos (format, lint, tipe; 261 tes Node dengan cakupan fungsi 100% + 128 tes Workers; build Next, `/api/search` dinamis).
  - Regresi recall (`packages/core/test/local/ihya-search.test.ts`, D1 lokal): 18/18 kueri recall 1,000, gold = angka riset per kueri, 6 halaman di luar gold (batas 10).
  - Lokal + staging (`wrangler d1 execute`): skema 4, `norm_version` 1, `ihya-v2`, `passage_fts` 20.509 = `passage`, `term_stat` 39.
  - **Latensi staging** (Preview PR #29 → `surau-corpus-staging`, 18 kueri × 10, jeda 1,1 dtk, header `Server-Timing`; metode di file sesi): SQL D1 p50 5,4 / p95 9,9 ms; handler Worker p50 107 / **p95 137 ms**; klien Indonesia p50 208 / p95 257 ms; 0 galat. Kata umum: handler p95 107 ms.
  - **rows_read** per kueri: الصبر (4 bentuk) 2.990 · التوكل 1.490 · النية/بالنية 2.154 · صلاة العيدين 91 · أبو هريرة 7.665 · الإخلاص 1.722 · طلب العلم 570 · إنما الأعمال بالنيات 215 · الغيبة 1.640 · حب الدنيا رأس كل خطيئة 174 · الرياء 3.123 · ذكر الموت 672 · التوبة 1.788 · مسئول 289 · الله 147 · قال رسول الله 211. ±9× paragraf cocok (riset memperkirakan ±3×; tabel sementara + indeks otomatis ikut dihitung). `expand` akar 3 huruf: علم 17.090, نفس 19.275, قلب 14.884.
  - Preview: `/kitab/ihya`, j1 h200, j4 h72 = 200 dengan korpus staging `ihya-v2`.
- Biaya API: –
- Keputusan: ADR-039 (ambang `term_stat` 10% bukan ±5%, `body`/`foot` kosong, pengaman di MATCH, satu bolak-balik, `ihya-v2`, `/api/search`; koreksi urutan batas ADR-037)
- Catatan untuk sesi berikutnya: S12 membangun di atas `ihya-v2` (skema 4). Promosi `ihya-v2` ke produksi di S14 bersama UI (dengan izin); setelahnya `--switch-only ihya-v1` ditolak (skema 3) kecuali `promote.ts` dilonggarkan. Produksi `/api/search` = 503 sampai itu. Cache kueri populer dan keputusan `expand` di UI: S14.

## 2026-10-16 · Tindak lanjut rilis F1 · Log STALE/antrean dummy + breadcrumb ponsel — selesai

- Dikerjakan:
  - Akar masalah log produksi "Failed to revalidate stale page … Dummy queue is not implemented": adapter cache OpenNext tidak mengembalikan `cacheControl`, Next 16.4.1 lalu memakai batas 1 dtk untuk path ISR on-demand di isolate dingin (opennextjs-aws#1250, perbaikan hulu belum dirilis). Antrean revalidasi no-op di `open-next.config.ts` + tes penjaga ISR (ADR-038).
  - Breadcrumb: judul bab Arab panjang kini membungkus di ponsel (`min-w-0 shrink`).
  - `preview` Workers lokal memakai D1 lokal bersama (`--persist-to ../../.wrangler/state`); konfigurasi peluncuran `web-workers-tanpa-build`.
- Verifikasi:
  - Lokal (Workers, `web-workers-tanpa-build` setelah server dimulai ulang): kunjungan ulang `STALE` direproduksi; log tanpa "revalidate", respons 5–7 ms dari cache.
  - Ponsel 375 px j2 h204: tautan breadcrumb 16–344 px, `scrollWidth` 375.
  - Tes web 38 (termasuk 3 tes penjaga ISR baru); hasil `pnpm verify`, e2e, Preview, dan log produksi: lihat PR.
- Biaya API: –
- Keputusan: ADR-038

## 2026-10-16 · Rilis Fase 1 · Pembaca Ihya — dirilis (`rilis-f1`)

- Dikerjakan:
  - Kesiapan: syarat R1 terpenuhi (FASE.md). S07 butir 5 (peta ID di `data/`) tidak dicentang → penyimpangan diterima pemilik di chat (ADR-037 butir 1).
  - Perbaikan dari tinjauan keamanan sebelum membuka pembaca (PR #26): path acak tidak lagi membaca seluruh daftar isi (juz > jilid = 404 lebih dulu, halaman dulu baru daftar isi, cek node satu baris), `/api/feedback` dapat batas global 30/60 dtk + kunci per jaringan IP (IPv6 per /64).
  - `READER_ENABLED = "1"` lewat PR #26 (squash `0fd7f81`) setelah pemilik menjawab "ya"; tag `rilis-f1` di-push.
- Verifikasi:
  - `pnpm install --frozen-lockfile` + `pnpm verify` → lolos (227 + 105 tes; setelah perbaikan 229 + 105); `pnpm test:e2e` → 70/70 (dua kali); cek rahasia `git ls-files … | grep` → kosong; larangan ADR-003 (grep `use server`/`use cache`, `cacheComponents: false`, `images.unoptimized: true`, tanpa middleware) → terpenuhi.
  - Tinjauan keamanan `rilis-f0..main` (peninjau): 0 blocker, 2 "perbaiki" (keduanya diperbaiki di PR #26).
  - Gerbang versi (docs-terbaru): Next 16.4.1 didukung resmi OpenNext 1.20.12; advisory 673q/2464/p3m5 ditambal di 16.4.1, xqc2/h3gv kemungkinan besar ditambal di React bawaan dan pemicunya mati; tidak ada advisory tanpa mitigasi. #1455 (heap ISR) diterima ulang.
  - Preview PR #26: CI verify + e2e lolos (212 request, 0 error); uji manual ponsel: beranda, daftar kitab, j1 h200 (RTL, Naskh, takhrij muncul), j4 h546, `/lisensi`, 404 untuk `/kitab/ihya/5/1` dan `/bab/999999999`, laporan dari origin asing 403.
  - Produksi (versi Worker `eaaf0c91`): `deploy.yml` lolos (migrasi `surau-app`, smoke `/ /tentang /lisensi /kitab /kitab/ihya/1/200`); binding `READER_ENABLED 1`, `CORPUS_DB 41e3033e-…` (ihya-v1), dua rate limiter. Smoke manual: 11 halaman 200, 3 alamat salah 404, sitemap 1.711 URL, header keamanan ada, tautan Shamela per halaman ada. `wrangler tail` 75 dtk: 16 permintaan `ok`, 0 exception; satu log galat "Failed to revalidate stale page … Dummy queue is not implemented" pada kunjungan ulang (halaman tetap tersaji dari cache; tindak lanjut di STATUS).
- Biaya API: –
- Keputusan: ADR-037
- Catatan untuk sesi berikutnya: S11 (FTS) memuat ulang staging; korpus produksi berikutnya = `ihya-v2` lewat `corpus:promote`. Tindak lanjut kecil: antrean no-op/cache control untuk menghapus log `STALE`, jarak tepi breadcrumb di ponsel, pantau 1102 dan spam laporan.
- **Draf pengumuman (untuk pemilik, tidak diposting agent):**
  > Alhamdulillah, *Ihya' 'Ulum ad-Din* karya al-Ghazali kini bisa dibaca lengkap di Surau: 4 jilid, 1.706 halaman, sesuai cetakan Dar al-Ma'rifah, dengan takhrij hadits al-'Iraqi yang muncul cukup dengan mengetuk nomor catatan kaki. Setiap halaman dan paragraf punya alamat tetap, sehingga kutipan mudah dirujuk dan diperiksa ulang. Teksnya dicocokkan dengan sumber huruf demi huruf, gratis, tanpa iklan, dan terbuka: https://surau-web.alfarieshsalman.workers.dev/kitab/ihya

## 2026-10-16 · S10 · Korpus produksi & QA — selesai

- Dikerjakan:
  - `pnpm run corpus:promote` (blue-green, ADR-036): rencana / `--confirm` (buat apac, migrasi lewat config sementara, muat, smoke = hitungan build) / `--switch-only` (rollback). Dijalankan untuk `ihya-v1`: `surau-corpus-ihya-v1` (`41e3033e-…`, APAC, 13,2 MB) dalam ±67 dtk; `CORPUS_DB` produksi menunjuk DB ini (+ `preview_database_id` staging untuk dev lokal). Riwayat versi di `data/SOURCES.md`; staging tidak pernah dijadikan produksi (rollback `ihya-v1` = tutup darurat).
  - `pnpm run corpus:qa`: 30 halaman acak (seed 9472) di D1 dibandingkan byte demi byte dengan sumber Shamela yang diparse ulang; laporan tanpa teks kitab. Daftar QA manusia 10 halaman (T-15) dengan tautan Surau, Shamela, dan pindaian archive.org yang dikalibrasi per jilid (selisih 9/2/3/3).
  - Halaman `/lisensi` (Apache-2.0 / CC BY-NC-SA 4.0, syarat pakai ulang, atribusi Ihya, koreksi + takedown lewat formulir dan GitHub Issues, retensi laporan) dan tautannya dari menu samping, Tentang, dan setiap halaman baca. Tautan "lihat di Shamela" per halaman sudah ada sejak S09.
  - `deploy.yml` memigrasi D1 `surau-app` saja; tes menjaga korpus tidak pernah dimigrasi dari deploy. T-10 dijawab pemilik di chat (ADR-018/021 diterima).
  - Prosedur promote, rollback, dan tutup darurat di `tools/ingest/README.md`; CHANGELOG draf Fase 1; FASE.md: Fase 1 siap rilis.
- Verifikasi:
  - `pnpm run corpus:promote ihya-v1 --confirm` → smoke: author 1, work 1, edition 1, page 1706, toc_node 313, passage 20509, footnote_ref 4117, passage_needs_review 705, meta 5 = build `2d2d87d7…`; `--switch-only` diuji dua arah; setelah perbaikan peninjau, `--reload --confirm` atas `ihya-v1` ditolak dan `--switch-only ihya-v1` lolos cek skema.
  - `pnpm run corpus:qa ihya-v1` → **30/30** cocok byte demi byte + baris korpus (meta, edisi, 25 judul daftar isi) cocok; `corpus:qa staging` → sama. Argumen salah (`--n 0`, `--n abc`, `--human 40`, `--n 5000`) → keluar 2 tanpa menulis laporan.
  - Peninjau: 0 blocker, 5 "perbaiki" (staging bisa jadi target rollback lalu dimuat ulang; pengaman `--reload` hanya membaca working tree; penjaga deploy.yml bisa lolos; argumen QA tanpa validasi; `meta` sumber tidak dibandingkan) → semuanya diperbaiki; saran diambil sebagian (peran Shamela di `/lisensi`, cek skema saat rollback, QA edisi + judul daftar isi, UUID staging dari config, smoke deploy `/lisensi`, draf CHANGELOG/FASE tidak mengklaim yang belum terbukti).
  - `pnpm verify` → lolos (node 217 tes, db + core 105); `pnpm test:e2e` lokal → 70/70 (termasuk `/lisensi` smoke + axe terang/gelap). Browser: `/lisensi` desktop + ponsel gelap rapi; `pnpm dev` j1 h200 tetap membaca D1 lokal; 0 galat konsol.
  - Setelah merge PR #23 (squash 8ef5297): `deploy.yml` lolos (migrasi D1 `surau-app`, deploy, smoke `/` `/tentang` `/lisensi`); `wrangler versions view` versi produksi f9046c12 → `CORPUS_DB 41e3033e-…` (ihya-v1), `READER_ENABLED 0`; `/kitab/ihya/1/200` produksi 404 sesuai rancangan. Preview `pembaca` diperbarui dari build yang sama (`/lisensi` ada).
  - **`rows_read` per kunjungan** (Preview `pembaca`, DB staging = build yang sama; pembaca produksi masih tertutup), `wrangler d1 insights` sebelum/sesudah: 50 halaman baru → semua 200 `MISS`, 0,87 dtk rata-rata, **800 kueri / 76.502 baris = ±16 kueri dan ±1.530 baris per render** (`getToc` ±939 baris per panggilan = 93%); 50 kunjungan ulang → 0,22 dtk, **0 kueri** (kontrol: satu render baru muncul +19 kueri ±2 menit kemudian). Biaya: ±2,6 juta baris untuk merender seluruh Ihya sekali per deploy, di dalam 25 miliar/bulan Workers Paid → **±$0**.
  - Persetujuan pemilik (chat, 2026-10-16, "1,2,3 sudah oke"): T-15 10/10 halaman oke, T-22 tampilan pembaca OK (S09 kini selesai penuh), teks `/lisensi` disetujui. Fase 1 siap `/rilis 1`.
- Biaya API: –
- Keputusan: ADR-036 (ADR-018 dan ADR-021 kini diterima)
- Catatan untuk sesi berikutnya:
  - `/rilis 1` setelah T-15, T-22, dan persetujuan teks `/lisensi`; perbarui Preview `pembaca` dari `main` bila perlu sebelum pemilik meninjau.
  - Utang: `getToc` dibaca penuh per render (±939 baris, bisa dihemat); header `STALE` pada kunjungan ulang (cek Workers Logs produksi setelah rilis); pembersih retensi `feedback` belum ada; target rollback `ihya-v1` (staging) berubah setiap `corpus:load:staging` (S11 FTS akan memuatnya ulang).

## 2026-10-16 · Tindak lanjut S09 · Beban halaman baca (CSS HeroUI selektif, daftar isi) — selesai

- Dikerjakan:
  - `globals.css`: impor CSS HeroUI per komponen (29 OSS + 8 Pro, `layer(components)`) menggantikan `@heroui/styles/css` + `@heroui-pro/react/css` utuh; `tw-animate-css` 1.4.0 jadi dependensi langsung.
  - Utang "pohon daftar isi terkirim dua kali" diperiksa di payload RSC Preview: React sudah menulisnya sekali (pemakaian kedua = rujukan ±80 byte), jadi tanpa perubahan kode; ADR-034 dikoreksi.
  - Aturan baru di `apps/web/CLAUDE.md` dan `KONVENSI.md`: komponen HeroUI baru wajib menambah berkas CSS-nya. Penjaganya tes `apps/web/src/app/heroui-css.test.ts`; alat banding ada di `apps/web/scripts/heroui-css/`.
  - `@heroui/react`, `@heroui/styles`, dan `tw-animate-css` dikeluarkan dari Dependabot; naik versinya lewat sesi (ADR-035).
- Verifikasi:
  - CSS global 815.852 → 262.005 B mentah, 82.895 → 30.034 B gzip.
  - Banding deklarasi CSS (postcss): 0 nilai berubah untuk selektor yang dipakai. Banding gaya terhitung Chromium, 42 keadaan × 19.170 elemen (+ `::before`/`::after`): 0 beda properti tampilan. Tangkapan layar penuh Preview `main` vs PR: 12/12 PNG identik.
  - HTML j1 h200 tidak berubah (203.670 B, ±28,7 KB gzip).
  - Lighthouse 13.5.0 ponsel (Preview, diselang-seling, n=9 vs n=6): median performa 81 → 85, LCP 4,2 → 3,9 dtk, FCP 2,4 → 2,2 dtk; a11y/BP 100.
  - Tes penjaga: 4 lolos; uji kontrol 5 kerusakan buatan semuanya tertangkap.
  - `pnpm verify` → lolos; `pnpm test:e2e` → 64/64.
- Biaya API: –
- Keputusan: ADR-035
- Catatan untuk sesi berikutnya: naik versi HeroUI = jalankan langkah "Tinjau ulang" ADR-035 (tes penjaga + dua banding).

## 2026-10-16 · S09 · UI pembaca kitab — selesai* (persetujuan tampilan pemilik menunggu, T-22)

- Dikerjakan:
  - Rute `/kitab`, `/kitab/ihya`, `/kitab/ihya/[juz]/[halaman]`, `/kitab/ihya/bab/[id]` (307 ke awal bagian), alias `ihya@<edisi default>` (308), ISR on-demand tanpa render saat build.
  - Halaman baca: teks per paragraf (`#pN`), penanda (١) membuka takhrij asli (HoverCard desktop, Popover ponsel), daftar catatan kaki + tanda `needs_review`, breadcrumb, navigasi ←/→ arah kitab Arab, lompat halaman, salin sitasi halaman/paragraf, ukuran huruf, daftar isi `FileTree` dengan bagian aktif, atribusi + tautan Shamela.
  - `/api/feedback` (Origin, ≤ 8 KB, Zod, honeypot, Rate Limiting HMAC(IP), tanpa IP di DB), `sitemap.xml` dinamis, `robots.txt`, menu Kitab aktif.
  - Binding `CORPUS_DB`/`APP_DB` dengan `database_id` eksplisit; pembaca ditutup di produksi (`READER_ENABLED=0`) sampai S10/T-10; secret `IP_HMAC_KEY` dipasang (produksi + base config Preview).
  - Paket: `@surau/core` `PageView.source_url`; `@surau/db` `listPages`. Perbaikan di luar rencana: `keep_names: false` (skrip tema rusak di halaman runtime).
- Verifikasi:
  - `pnpm verify` → lolos (tes web baru: 23; core 49; db 56; build: rute kitab ● ISR, sitemap ƒ).
  - `pnpm test:e2e` lokal → 56/56 (chromium desktop + ponsel, termasuk axe 3 halaman kitab × terang/gelap); CI Preview PR #21 → 56/56 dua kali; ringkasan log Preview: 121 dan 135 request, 0 error. Setelah tes regresi temuan peninjau: 64/64 lokal dan di Preview (171 request, 0 error).
  - Peninjau: 0 blocker, 7 "perbaiki" (semua diperbaiki: koreksi risiko ISR di ADR-034, role toolbar, tes regresi `__name` + `heading-order`, atribusi CC lengkap dengan tautan lisensi/OpenITI/pernyataan pengolahan, `ArabicInline` di daftar isi, judul takhrij al-'Iraqi per edisi, sinkron dokumen), saran opsional sebagian diambil.
  - Preview: semua rute 200/307/308/404 sesuai harapan, sitemap 1.710 URL; TTFB dingin 0,71–1,02 dtk, hangat 0,10–0,18 dtk; HTML j1 h200 ±28 KB gzip.
  - Lighthouse 13.5.0 (Preview, j1 h200): ponsel a11y 100, performa 80 (LCP 4,2 dtk), BP 100; desktop 100/100/100; SEO 66 hanya karena `noindex` Preview.
  - 5 penanda takhrij dicek (j1 h200 ٢ dan ٤, j2 h50 ١, j3 h120 ١, j4 h300 ١): isi popover = catatan kaki di daftar bawah, nomornya sama, dan isinya membahas hadits di matan sebelum penanda.
  - Laporan nyata di Preview → 201 dan tersimpan di `surau-app-staging` tanpa IP (baris uji dihapus); Origin asing 403; lokal: batas 5/menit → 429.
- Biaya API: –
- Keputusan: ADR-034
- Catatan untuk sesi berikutnya:
  - S10: ganti `CORPUS_DB` produksi ke korpus blue-green, lalu nyalakan `READER_ENABLED` saat `/rilis 1` (setelah T-10, T-15, T-22).
  - Preview tetap `pembaca` (dibuat manual dari `main`) untuk T-22; hapus atau perbarui di S10.
  - Utang: ruang path ISR tidak terbatas (render + tulis R2 per path baru, juga 404, juga di produksi; WAF saat domain siap); pohon daftar isi terkirim dua kali di payload RSC; CSS global HeroUI render-blocking (LCP ponsel); OpenNext #1455 (naikkan versi saat #1456 rilis).

## 2026-10-16 · S08 · Core tools baca — selesai (butir 4 lewat tafsiran ADR-033)

- Dikerjakan:
  - Paket `@surau/core`: `listWorks`, `getWork`, `getToc`, `readPage`, `readSection`, `buildCitation`, dengan skema Zod kontrak (calon kontrak MCP), error bertipe `NotFound`/`InvalidCitation`, dan permalink ADR-029.
  - `readSection` memuat bagian beserta sub-bagiannya, dipaginasi per blok (paragraf badan + catatan kakinya) di rentang 4–6 ribu token perkiraan (1 token ≈ 2 karakter JSON).
  - Tujuh query baca baru di `@surau/db`, termasuk repository `passage_needs_review` (ADR-032).
  - README paket dengan contoh JSON dari Ihya (teks kitab diganti "…").
  - Di luar cakupan: path persist dev web diganti ke `.wrangler/state/v3` (ADR-033 butir 8).
- Verifikasi:
  - `pnpm exec vp test --project core` → 48 tes lolos (workerd, fixture buatan); `--project db` → 55 tes.
  - Tes integrasi Ihya lokal (`packages/core/test/local/ihya.test.ts`, project node) → 4 tes lolos.
  - **j1 h200 dicek manual dengan sumber** (Shamela 9472, readOnly): 7/7 paragraf badan dan 7/7 catatan kaki keluaran `readPage` ada di halaman Shamela (part 1, page 200); 7 penanda di matan = 7 tautan; jumlah huruf matan sama (1.660, tanpa spasi); catatan (٤), takhrij hadits Jabir tentang shalat malam Jumat, memuat "باطل لا أصل له" di sumber dan di keluaran; `needs_review` halaman ini kosong.
  - Bagian terpanjang (node 100180, Rub' al-Munjiyat: 4.608 paragraf, 1.683.966 karakter): 278 potongan, setiap paragraf tepat sekali dan utuh, penanda selalu satu potongan dengan catatan kakinya; token/potongan p5 4.143, median 5.278, maks 5.997.
  - `grep -rn --exclude='*.test.ts' -E "from ['\"](next/|cloudflare:|node:)" packages/core/src` → kosong.
  - `pnpm verify` → lolos (180 tes node termasuk 4 integrasi Ihya + 103 tes workerd, build web sukses). `pnpm dev` dicek masih jalan dengan path persist baru.
  - Peninjau: 0 blocker, 4 temuan "perbaiki" (deskripsi kontrak, ARSITEKTUR §7/path `v3`, jalur batas baris tanpa tes, tanda tafsiran butir 4) + 2 minor, semuanya diperbaiki; saran opsional diambil sebagian, sisanya dicatat sebagai utang (ADR-033 butir 5, 7, 9).
- Biaya API: –
- Keputusan: ADR-033
- Catatan untuk sesi berikutnya:
  - S09 memakai `readPage`/`getToc`/`readSection` langsung; validasi kepemilikan edisi untuk `/kitab/ihya/bab/<id>` dikerjakan di rute (data edisi ada di `citation.source`). `pnpm dev` sudah membaca D1 lokal yang sama dengan `corpus:load:local`.
  - Heuristik token belum dikalibrasi dengan `count_tokens` (S16).
  - `@cloudflare/vitest-plugin` 1.4.3 menyebut perbaikan coverage V8; layak dicoba lewat Dependabot supaya cakupan `packages/db`/`packages/core` bisa diukur.

---

## 2026-10-16 · S07 · Importer Ihya — selesai (butir 5 dengan catatan)

- Dikerjakan:
  - `tools/ingest`: Shamela 9472 → SQL D1 + `.sqlite`, daftar isi + patch YAML, QA OpenITI, 11 invarian, peta ID `data/ids/`, dan laporan.
  - `splitInlineTakhrij` di `@surau/text`: takhrij `//` dua arah, penanda pembuka tetap di matan.
  - Migrasi korpus 0002 + 0003 `passage_needs_review` (lima alasan).
  - `data/LICENSE`/`ATTRIBUTION`/`SOURCES`.
  - Ihya dimuat ke D1 lokal dan `surau-corpus-staging` (izin pemilik, `--confirm`).
- Verifikasi:
  - Determinisme: dua build dari `data/build` kosong di HEAD `7a333f1` → sha256 `9af0db3a…` identik (3,0/2,9 dtk).
  - 11 invarian ✓: 1.706 halaman, 4×10 kitab, 0 judul yatim, 4.117 penanda tertaut + 87 di dalam takhrij = 4.204, 0 penanda yatim, integritas lintas tabel.
  - `verify-openiti`: 1.705/1.706 ≥0,95; 190/4.398 takhrij `takhrij_unmatched`.
  - Lokal + staging: passage 20.509, footnote_ref 4.117, passage_needs_review 705 (609 paragraf); j1 h200 7 badan/7 catatan/7 penanda; staging `schema_version` 3.
  - `pnpm verify` lolos (176 tes node + 47 tes db; fungsi `packages/text` 100%).
  - Peninjau: 0 blocker, 6 temuan "perbaiki", semuanya diperbaiki (satu saran opsional ditolak dengan alasan, ADR-032).
- Biaya API: –
- Keputusan: ADR-032
- Catatan untuk sesi berikutnya:
  - S08 bisa langsung memakai D1 lokal; core tools sebaiknya ikut mengembalikan `passage_needs_review` per paragraf.
  - Batas akhir takhrij "sesudah `//`" belum pasti (23 potongan panjang, lihat laporan).
  - Butir 5 S07 tidak dicentang karena `data/ids/` (ADR-029).
  - Proses lain sempat memindah checkout ke `main` di tengah sesi. Sudah dipulihkan; sesi paralel sebaiknya memakai worktree.

---

## 2026-10-16 · Sisipan · Log Worker Preview di CI — selesai

- Dikerjakan: langkah *Ringkasan log Preview* di `preview.yml` + `.github/scripts/ringkas-log-preview.sh` (GraphQL `workersInvocationsAdaptive`, `isPreview: 1`), hasilnya di log CI, Summary, dan komentar preview PR (PR #16). Tugas pemilik T-21 (izin Account Analytics Read) ditulis dan diselesaikan pemilik. Perbaikan lanjutan: `previewSlug` ternyata `__unknown__`, jadi dipakai cadangan bertanda.
- Verifikasi: skrip diuji dengan server GraphQL tiruan (7 skenario: izin, skema, non-JSON, kosong, ok, gagal, `__unknown__`; tiruan tidak di-commit); run Preview PR #16 → query diterima tanpa error izin, 9 putaran, 0 baris `pr-16` (slug `__unknown__`); `pnpm check` lolos; peninjau → 5 perbaikan diterapkan sebelum commit.
- Biaya API: –
- Keputusan: ADR-031 (ADR-030 poin 7 diberi rujukan)
- Catatan untuk sesi berikutnya: tabel CI hanya bukti sebagian untuk "tidak ada error di Workers Logs" (tanpa HTTP 5xx/`console.error`); angka (dan status gagal) bisa tercampur trafik Preview lain selama slug `__unknown__`. Jalur cadangan dibuktikan di run PR perbaikan ini.

---

## 2026-10-16 · X01 · Upgrade Next 16.4 + React 19.3 — selesai (log Preview tidak terbaca agent)

- Dikerjakan: catalog dinaikkan ke `next` 16.4.1, `react`/`react-dom` 19.3.1, `@types/react(-dom)` 19.3.0, `@opennextjs/cloudflare` 1.20.12. 16.4.2 tidak dipasang (belum 24 jam, bukan rilis keamanan). Larangan ADR-003 tetap (`cacheComponents` menunggu PR OpenNext #1318). Ditambah konfigurasi preview workerd di `.claude/launch.json`. Dokumen web, Dependabot, STACK, dan ADR diperbarui.
- Verifikasi: `pnpm verify` → exit 0; preview workerd → 5 rute sesuai (200/404), tanpa error; e2e 26/26 di workerd lokal, `next dev`, dan Preview PR #13 (CI); peninjau → tanpa blocker, klaim advisory React dilunakkan.
- Biaya API: –
- Keputusan: ADR-030 (ADR-003 dan ADR-023 diberi catatan)
- Catatan untuk sesi berikutnya: `wrangler tail` tidak mendukung Worker Previews; log Preview hanya lewat dashboard sampai ada Tail Worker/token observability. Tambalan React RSC di Next 16.4.1 baru indikasi, jadi larangan typed array tetap.

---

## 2026-10-15 · S06 · Skema data & D1 — selesai

- Dikerjakan: `packages/db` (`@surau/db`, tanpa ORM). Isinya:
  - migrasi korpus (10 tabel `STRICT` + `passage_fts` FTS5 contentless) dan migrasi app (`settings`, `feedback` tanpa PII);
  - skema Zod baris, formula ID, dan repository bertipe (halaman per sitasi, halaman bertetangga, daftar isi, paragraf, catatan kaki, meta, settings, feedback);
  - tes di workerd dengan `@cloudflare/vitest-plugin` 1.4.2;
  - 3 DB D1 (apac) dibuat dan dimigrasi atas izin pemilik;
  - skrip `db:migrate:local` dan `db:migrate:remote`.
- X01 dicoba lebih dulu (18:52 WIB). Semua paket targetnya masih berumur di bawah 24 jam, jadi X01 ditunda ke 16 Okt 14:53 WIB atas persetujuan pemilik.
- Verifikasi:
  - `pnpm run db:migrate:local` dari nol: 17 + 5 perintah ✅, `passage_fts` terbentuk.
  - `db:migrate:remote`: 17/5/5 ✅. Di `surau-corpus-staging`, FTS5 insert/MATCH/delete (contentless_delete) lolos dan semua tabel `strict=1`.
  - `vp test --project db`: 46 lolos, dan uji sabotase skema terbukti tertangkap tes.
  - Peninjau: 0 blocker; 3 perbaikan dan beberapa saran diterapkan (jangkar `#p<seq>`, peta ID di-commit, KONVENSI).
  - `pnpm verify`: lolos (126 tes node + 46 tes db + build).
- Biaya API: –
- Keputusan: ADR-029
- Catatan untuk sesi berikutnya:
  - X01 dulu mulai 16 Okt 14:53 WIB. S07 bisa dikerjakan sebelum atau sesudahnya.
  - S07 membuat peta ID yang di-commit (`data/ids/`), memakai fungsi ID `@surau/db`, mengisi `meta` (norm_version dll.), dan memuat lokal ke binding `CORPUS` dengan `--persist-to .wrangler/state`.
  - Cakupan `packages/db` belum terukur (utang ADR-029).

## 2026-10-15 · S05 · Paket teks Arab — selesai

- Dikerjakan: `packages/text` (`@surau/text`): normalisasi + peta offset, stem proklitik konservatif, `findQuote`, `buildFtsMatch`, pembersih HTML Shamela + pemetaan catatan kaki, README; tambahan wajib (NFKC per karakter, tanda Qur'ani pemisah, tolak kecocokan di tengah ekspansi) dan ligatur Unicode 14. `tools/ingest` lebih awal (smoke Node, benchmark, tes integrasi Ihya). `GET /api/version` di web. S06/S07 diberi catatan kecil; urutan S06–S10 tetap.
- Verifikasi: `pnpm verify` → lolos · `pnpm test` → 126 tes (golden 50, property 3×2.000, Ihya 5), cakupan fungsi `packages/text/src` 100% (47/47) · smoke Node 24.22 → lolos · e2e `/api/version` → lolos (chromium + ponsel) · `pnpm bench:text` → ±0,50 dtk/5 juta karakter (sintetis), ±0,55 dtk/5 juta (Ihya 5,48 juta karakter) · Ihya hanya-baca: 4.204/4.204 penanda (١) terhubung, 0 catatan yatim, 0 tag tak dikenal, round-trip kutipan 0 gagal · peninjau: 0 blocker, temuan diterapkan.
- Biaya API: –
- Keputusan: ADR-028
- Catatan untuk sesi berikutnya: S06 mengisi `meta.norm_version` dari `NORM_VERSION`. S07 menulis pemisah takhrij `//` di `packages/text`, melaporkan `unknownTags`, dan memeriksa 2 judul tanpa span (311 baris `title` vs 309 span). Agent: tulis escape `\uXXXX` lewat skrip bash, bukan alat Write/Edit.

## 2026-10-15 · Rilis Fase 0 · Fondasi — selesai (`rilis-f0`)

- Dikerjakan: kesiapan (S01–S04 selesai, semua butir dicentang setelah vite-plus 1.2.0 dipasang pukul 17:20 WIB); peninjau keamanan dari commit akar (0 blocker) → PR #9: header keamanan (`nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`) + tes e2e, `verify` CI tidak lagi di-skip untuk PR fork, versi wrangler di job hapus preview dijaga; gerbang versi; preview → izin pemilik ("Ya, rilis sekarang") → merge → deploy produksi → tag `rilis-f0`; CHANGELOG.md.
- Verifikasi: `pnpm install --frozen-lockfile` + `pnpm verify` → lolos · `pnpm test:e2e` → 24 lolos (lokal, preview PR #9, dan **produksi**) · pindai `git ls-files` untuk `.env`/`.dev.vars`/`.db` → kosong; peninjau: riwayat git bersih dari secret · gerbang versi: advisory terbuka Next 16.3.8 (673q, 2464, p3m5) dan React (xqc2, h3gv) termitigasi dan diverifikasi di build (`server-reference-manifest` kosong, tanpa middleware, `images.unoptimized: true`, `cacheComponents: false`) · Deploy run [38722166900](https://github.com/alfariesh/surau/actions/runs/38722166900) → success, smoke `/` dan `/tentang` 200 percobaan pertama.
- Biaya API: –
- Keputusan: – (gerbang X01 kini terbuka: OpenNext 1.20.12 mendukung Next 16.4)
- Belum ditindaklanjuti (butuh pemilik, dilaporkan di chat): izin agent di `.claude/settings.json` (beberapa aksi berbayar/produksi kini `allow`, `git add -f`, `gh api *`, celah `npx wrangler`), celah hook hanya-baca, cakupan token Cloudflare di CI, serta deny `Read(**/.dev.vars*)`. Saran lain dari peninjau: CSP penuh sebelum Fase 4, cache browser Playwright di CI.
- Catatan untuk sesi berikutnya: S05 (paket teks Arab), atau X01 lebih dulu mulai 16 Okt 14:51 WIB.

## 2026-10-15 · S04 · Identitas & fondasi UI — selesai (PR #7)

- Dikerjakan: template chat dihapus (rute, data mock, 42 dependensi); `SurauShell`, Beranda, Tentang, 404 berbahasa Indonesia (`i18n/id.ts`); `ArabicText`/`ArabicInline` + tes; palet Zaitun (pilihan pemilik dari dua opsi di `/_desain`), Plus Jakarta Sans + Noto Naskh Arabic, mode gelap; demo basmalah Tanzil v1.1 bertaut; Playwright smoke + axe, dijalankan di preview PR.
- Verifikasi: `pnpm verify` → lolos (4 tes unit) · `pnpm test:e2e` → 22 lolos (next dev, workerd lokal, dan preview PR #7 run 38706564892) · Lighthouse a11y 100 (Beranda/Tentang, ponsel/desktop) · axe 0 pelanggaran (3 halaman × terang/gelap) · `wrangler deploy --dry-run` → 5.815 KiB / gzip 1.221 KiB (S03: 15.993 / 3.021) · peninjau: 0 blocker, 6 perbaikan diterapkan.
- Biaya API: –
- Keputusan: ADR-027
- Setelah merge: Deploy run [38707337236](https://github.com/alfariesh/surau/actions/runs/38707337236) **gagal di smoke** (`/` → 307 dari versi template) padahal deploy-nya sukses: beberapa detik pertama sebagian permintaan masih dilayani versi Worker lama (kunci cache regional OpenNext memuat build ID, jadi bukan cache). Dicek ulang: produksi `/` 200, judul Surau. Smoke `deploy.yml` kini mengulang sampai 200 (±60 dtk), lewat PR terpisah.
- Catatan untuk sesi berikutnya: pemilik bisa `/rilis 0`. Tindak lanjut kecil vite-plus 1.2.0 / React 19.2.9 masih terbuka. Utang kecil (tema "ikuti sistem", cache browser Playwright di CI, `SITE_URL` saat domain siap) ada di Catatan hasil S04.

## 2026-10-15 · Pemeliharaan · Tinjau PR Dependabot #3 — selesai

- Dikerjakan: PR #3 (49 pembaruan) dibuat dari `main` lama (sebelum OpenNext), jadi lockfile-nya tidak dipakai. Dari isinya, 45 pembaruan aman diterapkan ulang ke catalog di branch baru: Tailwind 4.3.3, react-aria 3.53.1 / react-aria-components 1.22.1 / react-stately 3.51.0, tiptap 3.31.4, motion, recharts, shiki, streamdown, dll. **Ditolak:** `react`/`react-dom`/`@types/react*` 19.3.0 (React 19.3 berpasangan dengan Next 16.4, lewat X01; ADR-003). `dependabot.yml` sekarang mengabaikan minor React sampai X01.
- Verifikasi: umur semua versi >24 jam (`npm view … time`) · peer HeroUI 3.2.6 cocok (`react-aria ^3.52.1`, `react-aria-components ^1.21.1`, `tailwindcss >=4`) · `pnpm peers check` → hanya peringatan lama `vite` · `pnpm verify` → lolos · preview workerd lokal → 4 halaman 200, konsol tanpa error, tampilan `/library` dan `/pro-ai-showcase` normal.
- Biaya API: –
- Keputusan: – (mengikuti ADR-003, ADR-024)
- Catatan untuk sesi berikutnya: vite-plus 1.2.0 (boleh mulai 15 Okt 16:21 WIB) dan react/react-dom 19.2.9 (mulai 15 Okt 23:54 WIB) masih tertunda karena belum 24 jam.

## 2026-10-15 · S03 · Deploy ke Cloudflare — selesai (PR #4)

- Dikerjakan: OpenNext 1.20.11 + wrangler di `apps/web`, `wrangler.jsonc` (R2 cache, `previews` terpisah, observability tanpa query string), bucket R2 produksi + preview, deploy produksi pertama dari lokal, `deploy.yml` + `preview.yml` + action `siapkan`; PR #4.
- Verifikasi: `pnpm verify` → lolos · preview workerd lokal → 4 halaman 200, tanpa error · `wrangler deploy --dry-run` → 15.993 KiB / gzip 3.021 KiB · produksi https://surau-web.alfarieshsalman.workers.dev → 200 · `wrangler tail` 3 halaman → 0 error · `wrangler preview --name uji-s03 --json` → bucket preview, 3 halaman 200, lalu dihapus.
- Biaya API: –
- Keputusan: ADR-026
- Lanjutan setelah T-06: preview PR #4 gagal sekali (stdout wrangler di CI tidak murni JSON), diperbaiki → run [38700735787](https://github.com/alfariesh/surau/actions/runs/38700735787) hijau, komentar URL muncul. Merge → Deploy [38701138352](https://github.com/alfariesh/surau/actions/runs/38701138352) success (versi `ce2a24bf`), log tanpa error dan tanpa query string, preview `pr-4` terhapus otomatis.
- Catatan untuk sesi berikutnya: agent tidak bisa mengisi secret GitHub (ditolak pengaman mode otomatis). Smoke Playwright di `preview.yml` ditambahkan di S04. S06 menyamakan lokasi state lokal `preview` (ADR-026).

## 2026-10-15 · S02 (lanjutan) · Repo dibuat publik — selesai

- Dikerjakan: atas permintaan pemilik, `alfariesh/surau` diubah menjadi publik (risiko lisensi HeroUI Pro dijelaskan dan diterima); persetujuan workflow untuk semua kontributor luar; proteksi `main` (wajib `verify`, berlaku untuk admin, tanpa force-push).
- Verifikasi: pindai riwayat git (file sensitif + pola token) → bersih · `gh repo view` → PUBLIC · `fork-pr-contributor-approval` → `all_external_contributors` · `gh api …/branches/main/protection` → lihat Catatan hasil S02.
- Biaya API: –
- Keputusan: ADR-025 (mengganti ADR-024 butir 7)
- Catatan untuk sesi berikutnya: semua perubahan ke `main` lewat PR yang hijau, termasuk catatan status. Jangan setujui run CI dari PR fork yang mengubah `.github/`.

## 2026-10-15 · S02 · GitHub & CI — selesai (digabung, PR #1)

- Dikerjakan: repo lama `alfariesh/surau` di-rename ke `surau-lama` (izin pemilik), repo privat baru `alfariesh/surau` dibuat dan `main` di-push; workflow `ci.yml` (`pnpm verify`, cache `node_modules`, token hanya di langkah install); `dependabot.yml`; template PR; `LICENSE` Apache-2.0; MCP `next-devtools` diuji.
- Verifikasi: `gh secret list` (Actions + Dependabot) → `HEROUI_AUTH_TOKEN` ada · PR https://github.com/alfariesh/surau/pull/1 → run [38693275094](https://github.com/alfariesh/surau/actions/runs/38693275094), [38693870081](https://github.com/alfariesh/surau/actions/runs/38693870081), [38694117242](https://github.com/alfariesh/surau/actions/runs/38694117242) semuanya success · run ketiga "Cache hit", install 2,5 dtk tanpa postinstall Pro · SHA action cocok dengan tag (`gh api git/ref/tags`) · proteksi branch → HTTP 403 (akun Free) · `nextjs_index` → 9 tool, `get_compilation_issues` → 0 masalah.
- Biaya API: –
- Keputusan: ADR-024
- Catatan untuk sesi berikutnya: tindak lanjut S01 (vite-plus 1.2.0, React 19.2.9) belum cukup umur saat S02; kerjakan di awal S03. Workflow S03 ikuti pola `ci.yml` (pin SHA, token per langkah, restore/save cache dengan kunci sama).

## 2026-10-15 · S01 · Monorepo & toolchain — selesai (1 butir tertunda)

- Dikerjakan: template dipindah ke `apps/web` (`@surau/web`); monorepo pnpm 12 dengan catalog strict, `allowBuilds`, dan `minimumReleaseAge` eksplisit; Vite+ sebagai toolchain tunggal (fmt, lint 8 plugin + type-check, test, staged + pre-commit); ESLint dibuang; Next 16.3.8 + TS 7.0.2; `apps/web/AGENTS.md` + `CLAUDE.md`; hook format PostToolUse; MCP `next-devtools` di `.mcp.json`.
- Verifikasi: `pnpm install --frozen-lockfile` dari kosong → sukses · `pnpm verify` → lolos (0 error, 0 tes, build 11 halaman) · browser `localhost:3004` → tanpa error console, desktop + ponsel · `curl /_next/mcp tools/list` → daftar tool · hook format dan `vp staged` → bekerja · `vp check` menangkap error tipe sengaja di apps/web.
- Biaya API: –
- Keputusan: ADR-023 (hasil spike, versi tertunda, `minimumReleaseAge` eksplisit, tolak build zowe, `turbopack.root`, advisory Next 16.3.8 + React RSC dan mitigasinya)
- Catatan untuk sesi berikutnya: butir "vite-plus lokal 1.2.0" belum dicentang karena 1.2.0 belum berumur 24 jam; naikkan vite-plus dan React di awal S02 (langkah 0). Uji MCP `next-devtools` di S02 setelah pemilik menyetujuinya.

## 2026-10-15 · S01 · Monorepo & toolchain — terblokir

- Dikerjakan: orientasi dan cek prasyarat. T-00 dan T-01 terverifikasi selesai (login HeroUI Pro, MCP `heroui-pro` menjawab).
- Verifikasi: `node -v` → v22.23.2 (gagal; harus v24) · `zsh -lic 'node -v'` → v24.22.0 · `pnpm -v` → 12.11.2 · `heroui-pro status` → login.
- Biaya API: –
- Keputusan: –
- Catatan untuk sesi berikutnya: aplikasi Claude perlu dibuka ulang (Cmd+Q) supaya PATH baru dari T-02 terbawa. Setelah itu mulai S01 dari langkah 1; belum ada kode yang diubah.

## 2026-10-15 · S00 · Review dokumen + setup proyek untuk agent — selesai

- Dikerjakan: review dan validasi semua dokumen `docs/` terhadap docs terbaru (riset paralel 9 area), memilih stack (lihat `KEPUTUSAN.md`), menyusun folder `implementasi/` (fase, sesi, status, konvensi), dan menyiapkan Claude Code (`CLAUDE.md`, skills, subagen, hooks, `.mcp.json`).
- Verifikasi: harga Claude dicek ke platform.claude.com/docs pricing (15 Okt 2026). Koreksi: cache read Sonnet 5.5 = $0,10/MTok (bukan $0,20). Message Batches tidak tersedia di Amazon Bedrock. Hasil verifikasi 6 lensa atas dokumen (112 temuan) sudah diterapkan.
- Biaya API: –
- Keputusan: ADR-001 s.d. ADR-022
- Catatan untuk sesi berikutnya: mulai dari S01. Butuh tugas pemilik T-00, T-01, dan T-02 (lihat TUGAS-PEMILIK.md).
