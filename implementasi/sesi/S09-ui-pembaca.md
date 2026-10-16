# S09 · UI pembaca kitab

> **Fase:** 1 · **Status:** selesai* (2026-10-16 · PR #21 · *persetujuan tampilan pemilik menunggu, T-22)
> **Prasyarat:** S08 selesai · Tugas pemilik: T-21 (selesai 2026-10-16; log Preview lewat ringkasan CI, ADR-031), review tampilan di akhir
> **Perkiraan:** 1–2 percakapan agent

## Tujuan

Pengguna bisa membuka Ihya, menjelajah daftar isi, membaca halaman cetak per halaman dengan teks Arab yang indah, membuka takhrij hadits dari penanda (١), lalu menyalin sitasi dan permalink.

## Baca dulu (hanya ini)

- ADR permalink (S06), ARSITEKTUR-TEKNIS §5 (alur Pembaca), dan README `packages/core`.
- `.claude/rules/teks-arab.md`, bagian *Tampilan*, serta `apps/web/CLAUDE.md`.
- MCP `heroui-pro`: komponen untuk daftar isi bertingkat (`FileTree` Pro, atau Sidebar/Disclosure), `HoverCard`/`Popover` untuk takhrij, `FloatingToc`, `Breadcrumbs`, dan `Pagination`.
- `/docs-terbaru next` (ISR / `revalidate`, `generateMetadata`, `getCloudflareContext` untuk binding D1), `/docs-terbaru @opennextjs/cloudflare` (caching R2).

## Langkah

1. Ikat D1 di `surau-web` (`wrangler.jsonc`), lalu jalankan `wrangler types`:
   - `CORPUS_DB`: lokal memakai lokasi bersama (ARSITEKTUR §7 aturan 1), preview memakai `surau-corpus-staging`. Untuk produksi, binding **wajib** punya `database_id` eksplisit; sampai S10, arahkan ke `surau-corpus-staging` atau sembunyikan rute `/kitab` di produksi lewat flag `vars`. Binding tanpa ID akan memprovisikan DB kosong saat auto-deploy.
   - `APP_DB` (`surau-app`; preview `surau-app-staging`) untuk laporan kesalahan.
2. **Rute** (sesuaikan dengan ADR permalink):
   - `/kitab`: daftar karya (baru Ihya).
   - `/kitab/ihya`: halaman karya berisi metadata edisi, penulis, lisensi/atribusi, dan daftar isi.
   - `/kitab/ihya/[juz]/[halaman]`: halaman cetak.
   - `/kitab/ihya/bab/[id]`: diarahkan ke halaman awal bagian, atau ditampilkan per bagian.
3. **Halaman baca:**
   - `ArabicText` per paragraf dengan jangkar `#pN`.
   - Penanda (١) bisa diklik dan membuka teks takhrij asli; di ponsel memakai Popover, di desktop HoverCard.
   - Breadcrumb rub' › kitab › bab.
   - Navigasi halaman sebelum/sesudah (juga lewat keyboard ←/→ dengan arah yang benar).
   - Lompat ke halaman tertentu.
   - Tombol "Salin sitasi": "al-Ghazali, *Ihya 'Ulum ad-Din*, Dar al-Ma'rifah, j.1 h.200" ditambah permalink.
   - Kontrol ukuran huruf dan pilihan font (bila T-08 memberi dua font).
4. **Daftar isi:** pohon 311 simpul (setelah patch), bisa diciutkan, dengan bagian aktif tersorot.
5. **Kinerja:** ISR on-demand (`revalidate = false`, `dynamicParams = true`) dengan cache R2 dari S03. Ukur TTFB halaman dingin dan hangat di preview.
6. **SEO:** `generateMetadata` (judul bab + halaman), `sitemap.xml` untuk halaman kitab, dan `robots.txt`. Data terstruktur sederhana opsional.
7. **Atribusi lisensi** di halaman karya dan footer halaman baca, sesuai ADR-018 (sumber teks publik).
8. **Laporan kesalahan:** tombol "Laporkan kesalahan teks" yang menulis ke tabel `feedback` (DB app) lewat route handler `/api/feedback`. Tanpa Server Actions (ADR-003). Pengamannya:
   - validasi Zod, dengan batas panjang dan ukuran body;
   - cek Origin;
   - honeypot;
   - Rate Limiting binding dengan kunci HMAC(IP) (bukan IP mentah).

   Retensi `feedback` mengikuti P-7 dan harus diputuskan sebelum rilis Fase 1.
9. Perbarui navigasi "Kitab" di shell (hapus label "segera").
10. **E2E:** buka `/kitab/ihya/1/200`, takhrij muncul saat penanda diklik, permalink `#p` menggulir ke paragraf, dan navigasi halaman berjalan.
11. Kirim screenshot ke pemilik (ponsel dan desktop, dengan takhrij terbuka).

## Selesai bila

- [x] Semua rute berjalan di preview dengan data staging; tidak ada error di Workers Logs (ringkasan CI ADR-031 hanya bukti sebagian: tanpa HTTP 5xx/`console.error`) · Preview PR #21: `/kitab`, `/kitab/ihya`, `/kitab/ihya/1/200` 200; `/bab/100075` 307 ke `/1/200#bab-100075`; `ihya@dar-al-marifah/1/200` 308 ke kanonis; `/1/999` 404; sitemap 1.710 URL; e2e 56/56 terhadap Preview (dua run); ringkasan log 121 dan 135 request, **0 error**; `curl` semua rute tanpa 5xx
- [x] `wrangler.jsonc` produksi punya `database_id` eksplisit untuk semua D1; `pnpm dev` lokal menampilkan j1 h200 dari DB lokal bersama · `CORPUS_DB` ffc5ce9a… dan `APP_DB` 76b6488e… (Preview: ffc5ce9a… + 49fd36a5…); `pnpm dev` → j1 h200 tampil dari `.wrangler/state/v3` (tangkapan layar + e2e lokal 56/56)
- [x] Takhrij tampil benar untuk 5 penanda yang dicek manual · j1 h200 (٢) dan (٤), j2 h50 (١), j3 h120 (١), j4 h300 (١): isi popover = catatan kaki di daftar bawah, nomornya sama, dan isinya membahas hadits di matan sebelum penanda (mis. (٤) hadits Jabir shalat malam Jumat → "باطل لا أصل له")
- [x] "Salin sitasi" menghasilkan format yang benar, dan permalink membuka paragraf yang tepat · e2e (lokal + Preview): papan klip = `al-Ghazali, Ihya' 'Ulum ad-Din, Dar al-Ma'rifah, j.1 h.200. <origin>/kitab/ihya/1/200`; `#p2826` dan `#p2834` menggulir + menyorot paragraf yang benar
- [x] Lighthouse ponsel: aksesibilitas ≥ 90 dan performa dicatat · Lighthouse 13.5.0, Preview j1 h200: ponsel a11y **100**, performa **80** (FCP 3,1 dtk, LCP 4,2 dtk, TBT 20 ms, CLS 0), BP 100; desktop 100/100/100; SEO 66 hanya karena `noindex` bawaan Preview. TTFB Preview dingin 0,71–1,02 dtk, hangat 0,10–0,18 dtk
- [x] E2E lolos; `pnpm verify` lolos · `pnpm test:e2e` 56/56 lokal dan di Preview, lalu 64/64 lokal setelah tes regresi temuan peninjau (Preview: lihat CI PR #21); `pnpm verify` lolos (lokal + CI `verify`)
- [ ] Pemilik menyetujui tampilan · **menunggu T-22** (tautan Preview tetap `pembaca`, tangkapan layar ponsel/desktop dikirim)
- [x] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Pencarian (Fase 2). Terjemahan (S13). Mode baca paralel Arab–Indonesia (setelah S13).

## Catatan hasil

**Dibuat** (keputusan lengkap: ADR-034):
- Rute `apps/web/src/app/(app)/kitab/`: `page.tsx` (daftar karya, `force-dynamic`; "segera hadir" bila pembaca tertutup), `[work]/page.tsx` (karya, edisi, lisensi, daftar isi), `[work]/[juz]/[page]/page.tsx` (halaman cetak), `[work]/bab/[id]/page.tsx` (307 ke awal bagian `#bab-<id>`), `error.tsx`. Segmen `[work]` = `ihya` atau `ihya@<edisi>`; `ihya@<edisi default>` → 308 ke kanonis. Ketiga rute dinamis ISR on-demand (`revalidate = false`, `generateStaticParams = []`).
- Data: `src/lib/reader/data.ts` (pemuat lewat `@surau/core`, error core → 404, `cache`), `work-segment.ts`, `segments.ts` (potong penanda per offset DB), `toc.ts` (pohon ramping, breadcrumb, bagian aktif, judul, jangkar bab), `cite.ts` + `src/content/works.ts` (sitasi salin), `scale.ts`, `src/lib/cloudflare.ts` (`getEnv`, `readerEnabled`).
- Komponen `src/components/reader/`: `footnote-marker` (HoverCard/Popover), `toc-tree` (FileTree), `reader-toolbar` (daftar isi di Drawer, lompat, salin sitasi, ukuran huruf, lapor), `page-nav` (←/→ arah kitab), `passage-actions`, `feedback-dialog`, `reader-context`, `needs-review`.
- `/api/feedback` (`src/lib/feedback-handler.ts` + `feedback-schema.ts`), `sitemap.ts`, `robots.ts`; Toast di `providers.tsx`; menu Kitab aktif.
- `wrangler.jsonc`: `CORPUS_DB`/`APP_DB` ber-ID, `FEEDBACK_LIMITER`, `READER_ENABLED`, `keep_names: false`; `cf-typegen --strict-vars=false`; `env.d.ts` (`IP_HMAC_KEY`). Secret `IP_HMAC_KEY` dipasang (produksi + base config Preview).
- Paket: `@surau/core` `PageView.source_url` (README + tes); `@surau/db` `listPages` (+ tes). Dependensi web baru, semuanya workspace/catalog (tanpa paket pihak ketiga baru): `@surau/core` (satu-satunya pintu baca data kitab), `@surau/db` (`listPages` untuk sitemap, `createFeedback`/`feedbackInput`/`getCorpusMeta` untuk laporan), `zod` (skema body `/api/feedback`, KONVENSI §TypeScript).
- Atribusi `LicenseNotice` (tautan teks lisensi CC, materi sumber OpenITI, pernyataan pengolahan) di halaman karya dan footer halaman baca; data per edisi di `src/content/works.ts`.
- Tes: 23 tes unit web (segments, work-segment, cite, toc, feedback-handler); e2e `reader.spec.ts` (10 skenario × 2 perangkat, termasuk regresi galat JS/`__name`), a11y +3 halaman kitab + aturan `heading-order` (regresi), smoke menu diperbarui. Total e2e 64.
- Peninjau: 0 blocker, 7 "perbaiki" (analisis risiko ISR di ADR, role toolbar vs ←/→, tes regresi dua bug, atribusi CC lengkap, `ArabicInline` di daftar isi, judul takhrij al-'Iraqi per edisi, sinkron dokumen) → semuanya diperbaiki; saran opsional diambil sebagian (tanda `needs_review` di paragraf judul, id penanda dari potongan yang dirender, pemisah menggantung, string tak terpakai, breadcrumb langsung ke halaman), sisanya dicatat di ADR-034 (utang).

**Penyimpangan dari rencana (terbuka):**
- Langkah 3 "pilihan font" tidak dibuat: T-08 hanya memberi satu font Arab (Noto Naskh).
- Langkah 1: produksi **menunjuk korpus staging dan** pembaca ditutup lewat flag (rencana: salah satu). Alasannya ada di ADR-034 butir 3.
- Sitasi memakai `title_id` DB `Ihya' 'Ulum ad-Din` (rencana menulis "Ihya 'Ulum ad-Din").
- Di luar rencana: `keep_names: false` (skrip tema rusak di halaman yang dirender Worker), `source_url` di core, `listPages` di db.

**Utang teknis:** ruang path ISR tidak terbatas (setiap path baru = satu render + satu tulis R2, juga 404; WAF/rate limit `/kitab/*` saat domain siap, ADR-034 butir 2); pohon daftar isi terkirim dua kali di payload RSC (±25 KB mentah); LCP ponsel 4,2 dtk karena CSS global HeroUI render-blocking (±90 KB); risiko OpenNext #1455 (naikkan saat #1456 rilis); penanda berganti elemen setelah hidrasi pada perangkat ber-hover; Preview tetap `pembaca` dibuat manual.

**Untuk sesi berikutnya (S10):** ganti `CORPUS_DB` produksi ke korpus blue-green, lalu nyalakan `READER_ENABLED` di `/rilis 1` (setelah T-10, T-15, T-22) lewat commit + `deploy.yml` (bukan dashboard: cache ISR hanya mulai dari nol di build baru); tulis prosedur tutup darurat. Retensi `feedback` (P-7, T-10 butir 4) wajib diputuskan sebelum rilis. Hapus atau perbarui Preview `pembaca`.
