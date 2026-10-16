# X01 · Sesi sisipan: upgrade Next.js 16.4 + React 19.3

> **Fase:** sisipan (bisa dikerjakan kapan saja setelah S03) · **Status:** selesai* (2026-10-16, PR #13; lihat Catatan hasil)
> **Prasyarat:** S03 selesai **dan** gerbang di bawah terpenuhi · Tugas pemilik: –
> **Perkiraan:** 1 percakapan agent (pendek)

## Kenapa sesi ini ada

Per 15 Okt 2026, Surau memakai Next **16.3.8** (ADR-003), karena `@opennextjs/cloudflare` 1.20.11 rusak di Next 16.4 (issue #1448: semua halaman error `loadManifest(preview-props.json)`). Patch-nya sudah di-merge di `opennextjs-aws` (PR #1285), tapi belum dirilis. Next 16.4.1 menambal 3 advisory (RCE `use cache`, RCE image optimizer, DoS Server Actions) yang hanya kita mitigasi dengan mematikan fiturnya. Begitu OpenNext merilis dukungan, kita naik.

## Gerbang (cek dengan `/docs-terbaru`)

- Release notes `@opennextjs/cloudflare` menyebut dukungan Next 16.4, dan issue #1448 sudah ditutup.
- Versi Next 16.4.x terbaru berumur ≥24 jam (`minimumReleaseAge` pnpm).
- Tidak ada advisory baru yang terbuka untuk versi target.

Skill `/sesi` mengecek gerbang ini paling lambat setiap 7 hari (langkah 0.4), mencatat tanggal ceknya di STATUS.md, dan menandai sesi ini **siap** bila gerbangnya terpenuhi. `/posisi` hanya melaporkannya.

## Langkah

1. Branch `sesi/x01-next-16-4`. Naikkan `next`, `react`, `react-dom`, dan `@opennextjs/cloudflare` lewat catalog. Baca catatan rilis Next 16.4 di `apps/web/node_modules/next/dist/docs/` dan https://nextjs.org/blog/next-16-4. Pertimbangkan `next upgrade --agent`, tapi baca dulu setiap perubahannya.
2. Pertahankan larangan ADR-003. Hanya **evaluasi** apakah `cacheComponents` bisa diaktifkan, dan itu pun hanya bila PR OpenNext #1318 sudah dirilis. Bila diaktifkan, tulis ADR baru.
3. `pnpm verify` lalu `pnpm --filter @surau/web preview` (workerd). Smoke test semua rute yang ada beserta e2e.
4. Deploy ke preview PR, cek Workers Logs, lalu merge dengan izin.
5. Perbarui ADR-003 (status, versi), STACK.md, dan STATUS.md.

## Selesai bila

- [x] Next 16.4.x dan React 19.3.x terpasang; `pnpm verify`, preview workerd, dan e2e lolos · `next` 16.4.1, `react`/`react-dom` 19.3.1, `@opennextjs/cloudflare` 1.20.12 (dicek di `node_modules`); `pnpm verify` exit 0; `pnpm --filter @surau/web preview` → `/` `/tentang` `/api/version` `/icon.svg` 200, `/tidak-ada` 404, tanpa error log; `BASE_URL=http://localhost:3005 playwright test` 26/26; `pnpm test:e2e` (next dev) 26/26; CI PR #13 `verify` + `preview` hijau, e2e Preview 26/26
- [ ] Tidak ada error di Workers Logs setelah deploy preview · **tidak bisa dibuktikan agent:** `wrangler tail` belum mendukung Worker Previews (tail `surau-web` sambil membuka 4 rute Preview → 0 event), dan API observability ditolak pengaman. Bukti pengganti dicatat di Catatan hasil (log produksi setelah merge).
- [x] ADR-003, STACK, STATUS, LOG, dan file ini diperbarui · ADR-003 (catatan pembaruan), ADR-023 (status mitigasi), ADR-030 baru, STACK (Next/React/OpenNext/font), STATUS, LOG, file ini

## Catatan hasil

**Dibuat (2026-10-16, PR #13):**
- Catalog: `next` 16.4.1, `react`/`react-dom` 19.3.1, `@types/react`/`-dom` 19.3.0, `@opennextjs/cloudflare` 1.20.12 (membawa `@opennextjs/aws` 4.1.11). Tidak ada perubahan kode aplikasi; `next upgrade --agent` tidak dipakai (hanya kenaikan versi).
- `cacheComponents` **tidak** diaktifkan: PR OpenNext #1318 masih terbuka (langkah 2). Larangan ADR-003 tetap.
- `.claude/launch.json`: konfigurasi `web-workers` (preview workerd :3005). `apps/web/AGENTS.md`: format blok agent Next 16.4.
- ADR-030 mencatat semuanya, termasuk bukti smoke workerd.

**Penyimpangan dari rencana (ditulis terbuka):**
- Gerbang "versi Next 16.4.x **terbaru** berumur ≥24 jam" dibaca sebagai "versi 16.4.x **yang dipasang** berumur ≥24 jam". Versi terbaru, 16.4.2, baru ±11 jam saat sesi (terbit 15 Okt 20:57 UTC) dan isinya hanya backport Turbopack/docs, bukan keamanan. Jadi dipasang 16.4.1 (rilis keamanan, 14 Okt) tanpa melonggarkan `minimumReleaseAge`. 16.4.2 boleh masuk lewat Dependabot.
- Langkah 4 "cek Workers Logs" untuk **Preview** tidak bisa dikerjakan agent (lihat butir "Selesai bila" kedua, ADR-030 poin 7). Butir itu sengaja **tidak dicentang**. Penggantinya: `wrangler tail surau-web` di produksi setelah merge; hasilnya ditambahkan ke file ini lewat PR catatan kecil.
- **Bukti pengganti (log produksi, 2026-10-16 setelah merge `8668436`, deploy run 38872163326 sukses):** `wrangler tail surau-web --format json` sambil membuka `/`, `/tentang`, `/api/version`, `/tidak-ada`, `/icon.svg` di produksi → 6 event, semuanya outcome `ok` (status 200/404 sesuai), 0 exception, 0 log error. Butir log **Preview** tetap tidak dicentang karena yang dicek adalah produksi.
- Langkah 4 "merge dengan izin" mengikuti aturan keras 4 CLAUDE.md (agent merge sendiri bila CI hijau).

**Advisory:** 3 advisory Next (673q, 2464, p3m5) ditambal. Untuk React RSC (xqc2, h3gv), salinan React bawaan Next masih berlabel `19.3.0-canary-278794d7-20261002`, tetapi kodenya memuat perubahan transport protocol dari React 19.3.1. Ini indikasi, bukan bukti penuh, sehingga larangan typed array tetap wajib.

**Utang teknis / pesan untuk sesi berikutnya:**
- Bila log Preview perlu dibaca otomatis (mis. S09 "tidak ada error di Workers Logs" di preview), siapkan dulu salah satu: `previews.tail_consumers` ke Tail Worker, atau token API sempit untuk observability (tugas pemilik). Tanpa itu, cek log Preview hanya bisa lewat dashboard (pemilik).
- Evaluasi `cacheComponents` saat OpenNext merilis #1318 (ADR baru).

