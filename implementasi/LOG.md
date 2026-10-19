# Log Sesi

Entri terbaru di paling atas. Satu entri per sesi (atau per hari kerja bila satu sesi butuh lebih dari satu percakapan).

Format entri:

```
## YYYY-MM-DD · SNN · Judul sesi — selesai | sebagian | terblokir
- Dikerjakan: 2–5 poin
- Verifikasi: perintah yang dijalankan → hasil (mis. `pnpm verify` → lolos, 42 tes)
- Biaya API: $x (bila ada panggilan LLM berbayar), atau –
- Keputusan: ADR-NNN (bila ada)
- Catatan untuk sesi berikutnya: …
```

---

## 2026-10-19 · Di luar sesi · Skill aset visual + tiga ilustrasi prinsip di Beranda — selesai

- Dikerjakan: skill `.claude/skills/aset/` (mesin turunan iso-glow MIT, token warna dibaca dari `globals.css`, tombol Indonesia, mode sematan/polos/sampul, demo otomatis, kurangi gerakan; skrip Node `bangun.mjs`/`potret.mjs` dengan WebP/JPG). Colorfigures dicoba dulu lalu diganti setelah pemilik membandingkan keduanya. Figur contoh `kitab-rehal` (hanya di `aset/keluaran/`, untuk cover dan konten) dan tiga figur prinsip yang dipasang di kartu Beranda lewat `ArtEmbed` (iframe sandbox); header `/aset/*` di `public/_headers` (termasuk `no-transform` supaya beacon Web Analytics tidak tersisip, ditemukan di preview), kredit di `/lisensi#ilustrasi`, e2e baru di `smoke.spec.ts`. Peninjau: tanpa blocker; semua temuan perbaiki dan saran diterapkan (ketukan saat demo tidak lagi tertelan, denyut di lapis tetap, hidrasi, penamaan Inggris di web, tema induk menang atas sistem, timer dibersihkan, CSP sandbox, CORS hanya font).
- Verifikasi: `potret.mjs` untuk keempat figur (terang, gelap, kartu 240 px, tombol termasuk di luar urutan) → tanpa galat; halaman tiruan dengan iframe sandbox (desktop terang/gelap, ponsel 390 px) → tergambar, tema lewat postMessage, latar transparan; galat CORS font di server tiruan membuktikan header ACAO dibutuhkan (ada di `_headers`). `vp check` atas berkas yang diubah → lolos. Server dev dan `pnpm verify` penuh tidak bisa dijalankan di kontainer cloud (HeroUI Pro tidak terpasang); CI dan preview PR yang menentukan.
- Biaya API: –
- Keputusan: ADR-054.
- Catatan untuk sesi berikutnya: figur "cara kerja Surau" dan video pendek media sosial (ffmpeg) diusulkan sebagai lanjutan; CSP penuh nanti perlu aturan khusus `/aset/*`.

## 2026-10-19 · S18 · Eval Jawab & halaman tinjau — sebagian

- Dikerjakan: 60 draf (42 publik/18 privat), sumber berbasis ID/offset; runner gratis baseline/score/seed/golden, judge Sonnet 5.5 dengan pagu dan manifest; D1 app snapshot/review; `/tinjau`, API/ekspor privat, Access PIN + JWT tiap rute. Panduan Anas T-24 tersedia.
- Verifikasi: `pnpm verify` lolos **485 Node + 218 Workers**, smoke/build; peringatan lint `search-client.tsx` dan CSS `::highlight` lama tetap. Retrieval 31 soal hit@10 100%, MRR 0,795. Peninjau memperbaiki 3 temuan, tinjauan ulang lolos terbatas. Browser desktop/390 px memakai komponen aktual dan fixture buatan: simpan→muat ulang, RTL/Naskh, tanpa overflow.
- Baseline Cari: 562/562 kutipan valid, lokasi 35/48 (72,9%), penolakan 0/12, takhrij 0/9. Set masih draf. 30 contoh kalibrasi publik sengaja mencakup kesalahan; bukan mutu pipeline S19.
- Biaya API: **US$0,112528** dari izin ≤ US$1; 29/30 judge valid, satu `max_tokens`. **0 penilaian manusia**, belum terkalibrasi. Tidak retry otomatis.
- Keputusan: ADR-052. `jose` 6.2.12 (MIT), tanpa upgrade lainnya. Retensi akses 12 bulan, penghapusan fisik manual sampai S20; pertanyaan umum belum diterima. Holdout tidak dikirim ke judge.
- Catatan: UI PR #30/#45 dari `main` dipertahankan; lanjut di `codex/s18-eval-jawab-final`, WIP lama tetap ada. Pemilik mengizinkan kedua penyimpanan privat; upload R2 selesai dan hash unduhan cocok. Verifikasi akhir sempat tertahan layanan persetujuan otomatis, lalu berhasil setelah pulih: 485 Node + 218 Workers dan build lolos. Publikasi melalui PR/CI; seed D1 sesudah migrasi. Peninjau akhir lolos tanpa blocker; perubahan ukuran judul 40 px dipulihkan setelah itu. S18 belum selesai sampai T-24 (≥50 soal disetujui, ±30 penilaian kalibrasi, ≥10 uji halaman); S19 menunggu.

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
