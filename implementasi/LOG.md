# Log Sesi

Entri terbaru di paling atas. Satu entri per sesi (atau per hari kerja bila satu sesi butuh lebih dari satu percakapan).

**Arsip:** file ini hanya memuat bulan berjalan. Entri bulan sebelumnya dipindah apa adanya ke [log/](log/), satu berkas per bulan (`log/YYYY-MM.md`). Entri Oktober 2026 ada di [log/2026-10.md](log/2026-10.md) (dipindah 2026-11-26). Awal bulan berikutnya, pindahkan entri bulan lalu ke `log/YYYY-MM.md` tanpa mengubah isinya.

Format entri:

```
## YYYY-MM-DD · SNN · Judul sesi — selesai | sebagian | terblokir
- Dikerjakan: 2–5 poin
- Verifikasi: perintah yang dijalankan → hasil (mis. `pnpm verify` → lolos, 42 tes)
- Biaya API: $x (bila ada panggilan LLM berbayar), atau –
- Keputusan: ADR-NNN (bila ada)
- Catatan untuk sesi berikutnya: …
```

## 2026-11-27 · X31 · Situs dibuka lagi dengan Gelombang 1 — selesai (kecuali audio)
- Dikerjakan: tampil tiga kitab (`/lisensi`, landing, teks UI/MCP, hub Intisari Bab, minat berhenti), sakelar `READER_ENABLED`/`KITAB_OPEN` "1", ledger `tayang`, tes penjaga sakelar vs binding; promote `kitab-v10` (dijalankan pemilik, T-38); PR #261 digabung.
- Verifikasi: `corpus:qa kitab-v10` Bidayah 30/30, Tibyan 30/30, Ajurrumiyyah 19/19 · deploy web/MCP/API/media sukses · curl produksi: `/`, `/kitab`, `/cari`, `/lisensi`, halaman pertama tiap kitab, `/kitab/at-tibyan/intisari` = 200; `/kitab/ihya/1/200` = 404 · `uji-mcp.sh https://mcp.surau.org/mcp lengkap` lolos · `/api/search?q=adab membaca al-quran` → 43 halaman, teratas at-Tibyan.
- Biaya API: –
- Keputusan: [ADR-151](keputusan/ADR-151.md)
- Catatan untuk sesi berikutnya: audio (T-29), string Tanya/Maknaz masih menyebut Ihya (wajib sebelum `/rilis 4`), kartu kitab unggulan landing baru Bidayah. Rollback = revert PR #261.

## 2026-11-27 · X31c/X31d · Konten at-Tibyan dan al-Ajurrumiyyah + staging tiga kitab — sebagian (audio, tampil, promote belum)
- Dikerjakan:
  - Terjemahan + ringkasan Sonnet: Tibyan 642/642 + 238/238, Ajurrumiyyah 137/137 + 50/50; gerbang `llmCoverage` 0,99.
  - Validator: penanda tanpa kurung dan paragraf tanpa huruf (ADR-148 tambahan), rasio panjang per kitab (ADR-149 tambahan).
  - 36 Intisari Bab baru (Tibyan 11, Ajurrumiyyah 25), tiga lapis periksa, 0 Salah tersisa.
  - Staging dimuat: `kitab-v10`, 40 Intisari.
- Verifikasi:
  - `pnpm ingest korpus` → semua gerbang lolos (25 + 11 + 4 unit konten lolos cek ulang).
  - `corpus:qa staging --kitab`: Bidayah 30/30, Tibyan 30/30, Ajurrumiyyah 19/19.
  - `pnpm verify` → lolos (1.296 + 504 tes).
- Biaya API: batch Bidayah US$1,06, Tibyan US$1,99, Ajurrumiyyah US$0,34 (±US$3,4 total, termasuk ulangan; judul daftar isi ±US$0,04 per kitab). Izin pemilik di chat 2026-11-27: "lanjut sampai selesai … tanpa batasan dan gak usah konfirmasi saya … kecuali audio".
- Keputusan: ADR-148 dan ADR-149 (tambahan); ADR-147 dan ADR-150 diterapkan.
- Catatan untuk sesi berikutnya: bukti Preview/MCP per kitab, lalu langkah tampil (EDITION_CREDITS, `/api/minat-kitab`, ledger `tayang`), lalu promote produksi atas izin pemilik (situs dibuka lagi). Audio menunggu T-29 dan izin.

## 2026-11-27 · X24 bagian 2 · Tampilan Intisari v2 — selesai (untuk Gelombang 1)
- Dikerjakan: inti di kepala halaman Intisari, jawaban soal berlabel AI, label asal skill plugin, tombol Laporkan per gagasan (`/api/feedback`, tanpa migrasi), fixture `/dev/intisari` v2.
- Verifikasi: `pnpm verify` → lolos (1.221 + 502 tes) · `e2e/intisari.spec.ts` 12/12 (axe dialog) · laporan uji tersimpan di DB app lokal · tangkapan ponsel 375 px
- Biaya API: –
- Keputusan: [ADR-145](keputusan/ADR-145.md) (diperbarui)
- Catatan untuk sesi berikutnya: X31b. Bukti staging X24 (inti, jawaban, unit ditarik) dijalankan saat Intisari Bidayah pertama dimuat.

## 2026-11-27 · X24 bagian 1 · Impor Intisari chat ke korpus — sebagian
- Dikerjakan:
  - Skema korpus 10 (`digest.lead`, `digest_question.answer`).
  - `tools/ingest/src/konten.ts`: unit siap → baris Intisari, penggantian batch + induk basi, log unit ditarik.
  - Gerbang build di CLI (cek ulang di korpus baru).
  - `readDigest`/MCP menambah inti dan jawaban.
- Verifikasi: `pnpm verify` → lolos (1.216 + 502 tes) · `konten.test.ts` 9 tes · build Ihya lokal: unit chat 100007/100017 → 2 unit, 14 gagasan, 4 kutipan, 14 soal (build penuh Ihya gagal karena data batch tidak di Mac, ADR-142) · build Bidayah lolos
- Biaya API: –
- Keputusan: [ADR-145](keputusan/ADR-145.md)
- Catatan untuk sesi berikutnya: bagian 2 = tampilan web (inti, jawaban, label, Laporkan). Bukti staging X24 dipindah ke X31b dengan unit Bidayah.

## 2026-11-27 · X31a · Staging berisi Bidayat al-Hidayah — selesai
- Dikerjakan: PR #248 (langkah 8a) di-merge sesudah CI hijau; `pnpm corpus:load:staging --confirm` atas izin pemilik → `surau-corpus-staging` = `kitab-v10` (Bidayah saja).
- Verifikasi: smoke per kitab lolos · `corpus:qa staging --kitab bidayat-al-hidayah` → 30/30 · `pnpm dev:remote`: `/kitab`, pembaca h25, `daftar-isi.json`, `/cari` = 200; `/api/search?q=الهداية` → 7 hasil Bidayah · tangkapan ponsel 375 px rapi
- Biaya API: –
- Keputusan: – (ADR-144 dari langkah 8a)
- Catatan untuk sesi berikutnya: Preview semua PR kini Bidayah; PR Dependabot lama perlu rebase. Berikutnya X24, lalu X31b.

## 2026-11-27 · X31a langkah 8a · Persiapan staging tanpa Ihya — selesai (X31a tetap sebagian)
- Dikerjakan:
  - Smoke D1 per kitab (`WorkConfig.smoke`), dipakai `corpus:load:*` dan promote; catatan kaki hanya dicek untuk kitab `classical`.
  - e2e Preview tidak bergantung Ihya (`e2e/korpus.ts` melewati tes data Ihya, `bidayah.spec.ts` baru); `uji-mcp.sh` memilih data uji dari `list_works`.
  - Perbaikan: `/cari` 500 di korpus tanpa Ihya (`SEARCH_WORK`), kini memakai karya di korpus.
- Verifikasi: `pnpm verify` → lolos (1.207 + 501 tes) · `pnpm corpus:load:local` → smoke lolos (`kitab-v10`) · `pnpm test:e2e` lokal → 134 lolos, 172 dilewati, 2 gagal tidak terkait (header aset `next dev`) · `uji-mcp.sh` lokal `lengkap` dan `redaksi` → lolos
- Biaya API: –
- Keputusan: [ADR-144](keputusan/ADR-144.md)
- Catatan untuk sesi berikutnya: muat staging atas izin pemilik, lalu `corpus:qa staging --kitab bidayat-al-hidayah`. Di X31b, tulis ulang tes pembaca yang kini dilewati ke Bidayah dan ubah `deploy.yml` di PR promote.

## 2026-11-26 · Sisipan · HeroUI Pro 1.0.1 stabil — selesai
- Dikerjakan:
  - Catalog: `@heroui-pro/react` beta.10 → **1.0.1**, `@heroui/react`/`@heroui/styles` 3.2.6 → **3.2.8**, `tailwind-variants` 3.3.1 → **4.0.2** (peer Pro 1.0.1).
  - `Sheet` (dihapus dari Pro) kini diimpor dari `@heroui/react` di panel Tampilan, lompat halaman, dan daftar isi ponsel; CSS dari `@heroui/styles` (juga dipakai sheet sidebar ponsel Pro).
  - ADR-143, STACK (HeroUI OSS + Pro).
- Verifikasi: `pnpm verify` → lolos (1.194 + 500 tes; `heroui-css.test.ts` menjaga urutan CSS) · semua berkas CSS Pro yang diimpor ada di 1.0.1 · `banding-deklarasi.mjs` main vs branch → 178 nilai / 38 urutan berubah, semuanya refaktor upstream (rincian ADR-143 butir 6) · Preview `pr-245` (staging): ponsel 375 px sheet daftar isi (gulir, baris aktif = produksi), panel Tampilan (gulir), sidebar ponsel; desktop 1280 px panel Tampilan kanan, palet ⌘K; konsol tanpa error · peninjau → 1 wajib (banding ADR-035) + 3 sebaiknya, ditangani
- Biaya API: –
- Keputusan: [ADR-143](keputusan/ADR-143.md)
- Catatan untuk sesi berikutnya: `figlet` (CLI `heroui-pro` beta.14) tidak tertutup oleh upgrade ini.

## 2026-11-26 · X31a · Ihya diturunkan dari surau.org dan MCP — sebagian (menunggu deploy)
- Dikerjakan:
  - Keputusan pemilik "Skrg aja": Ihya turun sekarang, bukan saat promote Gelombang 1 (ADR-142 butir 3 diperbarui).
  - Web: `READER_ENABLED` produksi "0" (pembaca, Cari, sitemap kitab ditutup).
  - MCP: var baru `KITAB_OPEN` "0", sehingga setiap tool menjawab `corpus_closed` tanpa membaca D1.
  - Teks beranda dan halaman `/mcp` tidak lagi menjanjikan Ihya.
  - Smoke deploy memeriksa keadaan tertutup (halaman kitab 404, MCP mode `tutup`).
  - D1 produksi tidak disentuh.
- Verifikasi: `pnpm verify` → lolos (1.202 + 501 tes, build) · tes guard MCP `KITAB_OPEN` · peninjau → 0 wajib; saran ditangani (Beranda tanpa kotak cari, teks /kitab dan /mcp, coba ulang mode `tutup`, indeks ADR) · smoke deploy produksi: lihat catatan sesudah merge
- Biaya API: –
- Keputusan: [ADR-142](keputusan/ADR-142.md) butir 3
- Catatan untuk sesi berikutnya: buka kembali (kedua var "1") di PR promote X31b. Mp3 Ihya di R2 masih bisa dibuka lewat URL langsung; penghapusan butuh izin pemilik.

## 2026-11-26 · X31a · Ihya diarsipkan, korpus Gelombang 1 dibangun di Mac — sebagian
- Dikerjakan:
  - Keputusan pemilik: tiga kitab kecil dulu, dan Ihya diarsipkan serta turun dari situs. Waktunya: saat promote pertama Gelombang 1, atas izin pemilik.
  - Ledger mendapat status `arsip` (Ihya); `CORPUS` bawaan = `[BIDAYAH]`. Promote menolak build yang menghilangkan kitab `tayang`.
  - X31 diperbarui ("Definisi selesai" tanpa Ihya, X31b langkah 7 = daftar halaman yang menyebut Ihya). T-36 dibatalkan, dan ADR-135 butir 5 dicabut.
- Verifikasi: `pnpm ingest korpus` (Mac) → 1 kitab, semua gerbang ✓, 0,8 dtk · `pnpm verify` → lolos · peninjau → 3 wajib (smoke D1 dan CI Preview masih khusus Ihya → langkah 8a sebelum staging; centang build Ihya dibatalkan), sisanya diperbaiki
- Biaya API: –
- Keputusan: [ADR-142](keputusan/ADR-142.md)
- Catatan untuk sesi berikutnya: X31a langkah 8a (smoke D1 per kitab, e2e dan `uji-mcp.sh` tanpa Ihya), lalu muat staging atas izin pemilik dan `corpus:qa staging --kitab bidayat-al-hidayah`. Staging masih berisi build X29 (Ihya).

## 2026-11-26 · Sisipan · Patch keamanan Hono 4.13.22 — selesai
- Dikerjakan:
  - Catalog `hono` 4.13.13 → **4.13.22** (`apps/api`); 5 advisori (4m76, h7mg, 46wx, 4h7h moderate; 3gg2 low) ditambal di 4.13.16.
  - `figlet` 1.11.0 (GHSA-62ch, high) dari CLI `heroui-pro` beta.14 dicatat tanpa override: tidak masuk bundel runtime, CLI terbaru masih membawanya.
  - ADR-141, STACK (Hono, HeroUI Pro), STATUS.
- Verifikasi: `pnpm audit --prod` → hanya `figlet` · lockfile hanya mengubah `hono` · `pnpm verify` → lolos (1.194 + 500 tes) · peninjau → 0 wajib, 2 sebaiknya (komentar catalog, rujukan ADR-003) ditangani
- Biaya API: –
- Keputusan: [ADR-141](keputusan/ADR-141.md)
- Catatan untuk sesi berikutnya: `figlet` menutup sendiri saat CLI `heroui-pro` atau HeroUI Pro (1.0.1 stabil sudah ada) dinaikkan.

## 2026-11-26 · Sisipan · Patch keamanan Next 16.4.6 — selesai
- Dikerjakan:
  - Endpoint advisori npm bulk untuk `next@16.4.2` → 7 advisori moderate (mfr8, vc7v, vvgp, rhh4, 7qx7, f3mh, pc58), semuanya ditambal di 16.4.5.
  - Catalog: `next` 16.4.2 → **16.4.6**, `@opennextjs/cloudflare` 1.20.13 → **1.20.17** (`@opennextjs/aws` 4.1.16). OpenNext 1.20.18 dilewati karena regresi cookie, dan 1.20.19 belum berumur 24 jam. Tanpa lompat ke 16.5 dan tanpa `next upgrade --agent`.
  - ADR-140, STACK (baris Next + OpenNext), STATUS (Perhatian).
- Verifikasi: peninjau → 0 wajib, 2 sebaiknya (STACK riwayat OpenNext, catatan glob ADR-003) ditangani · advisori bulk `next@16.4.6` → `{}` · `pnpm audit --prod` → tanpa `next` (sisa: `hono` 4 moderate + 1 low di `apps/api`, `figlet` high transitif HeroUI Pro) · `pnpm verify` → lolos sekali jalan, tanpa berhenti karena pesan keamanan (1.194 + 500 tes) · `pnpm --filter @surau/web preview` (workerd, OpenNext 1.20.17) → `/` 200, `/api/version` 200, `/tidak-ada` 404; `/kitab/ihya/1/200` dan `/cari` 500 karena D1 lokal worktree kosong (0 tabel), jadi pembaca dan Cari dicek lewat Preview PR (staging).
- Biaya API: –
- Keputusan: [ADR-140](keputusan/ADR-140.md)
- Catatan untuk sesi berikutnya: naikkan OpenNext ke 1.20.19+ sebagai patch biasa bila sudah berumur. Advisori `hono`/`figlet` belum ditangani.

## 2026-11-26 · X31a · Fondasi multi-kitab + korpus Bidayat al-Hidayah — sebagian
- Dikerjakan:
  - Ingest multi-kitab: `pnpm ingest korpus [--kitab]`, satu korpus `kitab-v10`, hasil LLM dan Intisari per kitab, batas bawah Intisari Ihya 19 (ADR-137).
  - Bidayat al-Hidayah (Shamela 12718, OpenITI `Shamela0012718`, diunduh atas izin pemilik): konfigurasi, peta ID, sidik teks, laporan, atribusi, ledger `data/kitab/ledger.yaml`.
  - `corpus:qa --kitab`; instruksi MCP umum; `/kitab` mendaftar semua kitab dan menyaring "Segera hadir".
  - ADR-138 (catatan kaki pentahqiq modern tidak dimuat) dan ADR-139 (halaman cetak ganda Ajurrumiyyah digabung).
- Verifikasi: `pnpm ingest korpus --kitab bidayat-al-hidayah` → semua gerbang ✓ (46 halaman, 391 paragraf, matan 46/46, 24 rujukan ayat) · `vp test tools/ingest/test/multi-kitab.test.ts` → 2/2 (Ihya + Bidayah satu DB, ID Ihya stabil) · `vp test tools/ingest/test/ihya-ingest.test.ts` → 3/3 · pratinjau lokal port 3021: pembaca Bidayah, `/kitab`, `/api/search` ✓ · `pnpm verify` → lolos
- Biaya API: –
- Keputusan: ADR-137, ADR-138, ADR-139
- Catatan untuk sesi berikutnya: build lengkap + staging + QA = T-36 di mesin agent. Alat batch LLM dan audio per kitab dikerjakan di X31b. Tes korpus lokal (`subheadings.test.ts`) memakai `.sqlite` tunggal di `data/build`; build Bidayah saja membuatnya gagal, jadi jangan tinggalkan build parsial di checkout yang menjalankan `pnpm test`.

## 2026-11-26 · X29/X31 · Promote patch ayat ikut Bidayah — selesai
- Dikerjakan: T-35 dicek ulang dari Mac; pemilik memutuskan patch ayat X29 tidak dipromote sendiri, tetapi tayang bersama Bidayah di promote X31b, dengan terjemahan ulang 153 paragraf digabung ke batch terjemahan Bidayah. STATUS, sesi X29, dan X31 diperbarui.
- Verifikasi: `wrangler d1 execute surau-corpus-staging --remote --command "select …"` (hanya SELECT) → rujukan ayat 2.693, terjemahan 15.955, `built_at` 2026-11-26T03:52:39Z, sama dengan laporan PR #236
- Biaya API: –
- Keputusan: – (urutan rilis; mengikuti ADR-135 dan ADR-136)
- Catatan untuk sesi berikutnya: X31a di mesin agent boleh menimpa staging X29; build yang memuat Ihya tetap memakai penukaran folder Intisari ADR-136.

## 2026-11-26 · X29 / T-35 · Build staging patch ayat — selesai (promote menunggu izin)
- Dikerjakan:
  - `git pull`, lalu `pnpm ingest ihya` di mesin agent dengan patch ayat aktif, lalu `pnpm corpus:load:staging --confirm` dan `pnpm corpus:qa staging`.
  - Build pertama keluar dengan Intisari 0: `data/build/llm/intisari` sudah berisi hasil X15c (prompt `@3`/`@2`, cabang belum digabung). Build yang dimuat memakai cadangan pilot X15b (= Intisari produksi) lewat penukaran folder sementara; data X15c dikembalikan utuh.
  - Laporan ingest (`data/reports/ihya-9472-ayat.md`, `-validasi.md`) diperbarui; catatan di file sesi X29.
  - E2e Preview (membaca staging) gagal karena data contoh berubah: `p2824` kehilangan terjemahan (patch), `p15425` kini berterjemahan (X21-sisa). Contoh dipindah ke `p2825` dan `p3942`.
- Verifikasi: semua gerbang ingest ✓ · rujukan ayat 2.693 (= 2.514 + 179) · terjemahan 15.955/16.111 (usang 153) · ringkasan 623/626 · Intisari 19/313, 119 gagasan · audio 4 (A0 sudah mengeluarkan 100007/100017) · smoke staging = hitungan build · QA staging 30/30 halaman cocok byte demi byte · `implementasi/sesi/bukti/X29/cek-patch-build.ts` → 179/179 entri jadi rujukan, 0 terjemahan lama tersisa di 153 paragraf terkena
- Biaya API: –
- Keputusan: [ADR-136](keputusan/ADR-136.md) (Intisari pilot untuk build `main`, promote X29 = build ulang `ihya-v10`, pemicu perbaikan permanen; utang dicatat di file sesi X29)
- Catatan untuk sesi berikutnya: promote hanya atas izin pemilik, sebagai `ihya-v10` dibangun ulang dengan penukaran folder ADR-136 (pembanding: arsip `data/build/arsip/x29-staging-2026-11-26/`). Membangun ulang tanpa penukaran folder menghapus 19 Intisari tayang.

## 2026-11-26 · X31 rencana · Gelombang 1: tiga kitab kecil — selesai
- Dikerjakan:
  - Dicek (hanya baca): Bidayat al-Hidayah (Shamela 12718, 46 halaman), at-Tibyan (1969, 224 halaman), al-Ajurrumiyyah (11371, 31 halaman) punya versi OpenITI ber-ID Shamela sama; gabungan ±4% Ihya; catatan kaki: Bidayah nol, Tibyan 5 halaman, Ajurrumiyyah 4 halaman.
  - Rencana [X31](sesi/X31-gelombang-1-tiga-kitab.md) (X31a–X31d) dengan "Definisi selesai per kitab", ADR-135 (lepas dari Jawab, parkir Ihya kecuali X24 dan T-35), baris FASE, STATUS, dan kartu papan.
  - Entri LOG Oktober dipindah ke `log/2026-10.md`.
- Verifikasi: `node:sqlite` hanya-baca atas tiga `.db` Shamela → jumlah halaman, judul, karakter, dan nomor cetak seperti di file sesi (Ajurrumiyyah: 31 halaman, 19 nomor cetak berbeda) · peninjau: 1 wajib (build X31a hanya di mesin agent) + 18 lainnya, ditangani di file sesi, ADR-135, STATUS, skill `/posisi`, dan catatan tautan arsip · `gh api repos/OpenITI/...` → `Shamela0012718`, `Shamela0001969`, `Shamela0011371` ada · `pnpm check` → lolos
- Biaya API: –
- Keputusan: ADR-135
- Catatan untuk sesi berikutnya: X31a dulu (tanpa LLM). Alat ingest masih satu karya (`IHYA` di `cli.ts`, `0000-reset.sql` mengosongkan seluruh DB); slug ketiga kitab sudah ada di `kitab-mendatang.ts`. Riset korpus 2026-10-27 masih di branch `riset/ringkasan-buku-pecahan-produk`.

