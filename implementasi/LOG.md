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

## 2026-10-16 · Tindak lanjut S09 · Beban halaman baca (CSS HeroUI selektif, daftar isi) — selesai

- Dikerjakan:
  - `globals.css`: impor CSS HeroUI per komponen (29 OSS + 8 Pro, `layer(components)`) menggantikan `@heroui/styles/css` + `@heroui-pro/react/css` utuh; `tw-animate-css` 1.4.0 jadi dependensi langsung.
  - Utang "pohon daftar isi terkirim dua kali" diperiksa di payload RSC Preview: React sudah menulisnya sekali (pemakaian kedua = rujukan ±80 byte), jadi tanpa perubahan kode; ADR-034 dikoreksi.
  - Aturan baru di `apps/web/CLAUDE.md`: komponen HeroUI baru wajib menambah berkas CSS-nya.
- Verifikasi:
  - CSS global 815.852 → 262.005 B mentah, 82.895 → 30.034 B gzip.
  - Banding deklarasi CSS (postcss): 0 nilai berubah untuk selektor yang dipakai. Banding gaya terhitung Chromium, 42 keadaan × 19.170 elemen (+ `::before`/`::after`): 0 beda properti tampilan.
  - `pnpm verify` → lolos (201 tes); `pnpm test:e2e` → 64/64.
- Biaya API: –
- Keputusan: ADR-035
- Catatan untuk sesi berikutnya: saat naik versi `@heroui/styles`/`@heroui-pro/react` atau memakai komponen HeroUI baru, cek berkas CSS yang dibutuhkan (ADR-035, Tinjau ulang).

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
