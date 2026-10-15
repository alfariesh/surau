# S04 · Identitas & fondasi UI

> **Fase:** 0 · **Status:** selesai (2026-10-15, PR #7)
> **Prasyarat:** S03 selesai · Tugas pemilik: **T-08** (arah desain). Bila belum ada, agent mengusulkan 2 opsi lalu bertanya.
> **Perkiraan:** 1–2 percakapan agent

## Tujuan

Template chat berubah menjadi **Surau**: shell berbahasa Indonesia, tema dan tipografi Surau, komponen teks Arab yang benar, serta halaman Beranda dan Tentang yang menjelaskan Surau dan prinsipnya. Setelah sesi ini, Fase 0 siap dirilis (`/rilis 0`).

## Baca dulu (hanya ini)

- [docs/01-visi-dan-prinsip.md](../../docs/01-visi-dan-prinsip.md) (isi halaman Tentang) dan [docs/05](../../docs/05-kebijakan.md) §2–3 (bukan fatwa, tanpa wajah ulama).
- `.claude/rules/teks-arab.md`, bagian *Tampilan*.
- KONVENSI: bagian *UI* dan *Bahasa*.
- Skill global `heroui-react-pro` dan `heroui-pro-design-taste`. MCP `heroui-pro`: `list_components`, lalu `get_component_docs` untuk setiap komponen yang dipakai.
- `/docs-terbaru` untuk `next-themes`, `next/font` (font Arab), dan Playwright.

## Langkah

1. **Arah desain.** Pakai keputusan T-08 (font Arab, warna aksen, nuansa). Bila pemilik membuat Design System di HeroUI Pro, impor lewat MCP (`get_design_system_*`). Bila belum ada arahan, buat 2 opsi tema sederhana di halaman sementara `/_desain`, kirim screenshot, lalu tanya pemilik.
2. **i18n.** Pindahkan semua string ke `apps/web/src/i18n/id.ts` (bahasa Indonesia). Set `<html lang="id" dir="ltr">`, metadata Surau (title, description, Open Graph), dan favicon dengan simbol kitab, **tanpa wajah**.
3. **Provider.** Buat komponen client `Providers`: `next-themes` (`attribute="class"`, `defaultTheme="system"`) dan `I18nProvider locale="id-ID"`. Jangan membaca `headers()` di root layout.
4. **Font.** Pakai `next/font/google`: font UI Latin, ditambah Noto Naskh Arabic (variable) dan/atau Amiri sesuai T-08 (`subsets: ['arabic']`; font alternatif `preload: false`). Ekspos sebagai variabel CSS `--font-arabic`.
5. **Komponen teks Arab** di `src/components/arabic/`:
   - `ArabicText` (blok): `lang="ar" dir="rtl"`, font Arab, line-height ±2, ukuran ±1,25× teks UI, `text-align: start`, tanpa `letter-spacing` atau justify.
   - `ArabicInline` (`<bdi lang="ar">`).
   - Input pencarian nanti memakai `dir="auto"`.
   - Tambahkan tes render sederhana.
6. **Shell Surau.** Ubah `ChatShell` menjadi `SurauShell` dengan navigasi Beranda, Kitab, Cari, Tanya, dan Tentang. Tiga item tengah diberi label "segera". Rute template (`[chatId]`, `new`, `library`, `explore`) beserta data mock **dihapus**; kode chat template tetap bisa diambil dari riwayat git untuk Fase 4.
7. **Halaman:**
   - `/` Beranda: apa itu Surau, tiga prinsip utama, dan "sedang dibangun" beserta peta fase versi awam.
   - `/tentang`: visi, prinsip (docs/01), bukan fatwa, open source, dan lisensi.
   - `/404` berbahasa Indonesia.
   - Satu contoh `ArabicText` boleh memakai basmalah sebagai demo tipografi.
8. **Bersihkan dependensi** template yang tidak dipakai lagi (misalnya `@tiptap/*`, `recharts`, `embla-carousel*`, `@number-flow/react`, `shiki`, `marked`). Bila ada yang akan dipakai di Fase 4, catat. Ukur ulang bundle Worker.
9. **Kualitas:** dark mode, tampilan ponsel (375 px) dan desktop, fokus keyboard, kontras warna, dan Lighthouse aksesibilitas ≥ 90.
10. **Smoke e2e** dengan Playwright (chromium): Beranda tampil, navigasi ke Tentang, dan blok Arab punya `dir="rtl"` dan `lang="ar"`. Tambahkan skrip `test:e2e` dan, bila memungkinkan, jalankan di `preview.yml` terhadap URL preview.
11. Opsional bila pemilik memberi token: Cloudflare Web Analytics lewat snippet manual di layout.
12. Kirim screenshot (desktop dan ponsel, terang dan gelap) ke pemilik untuk persetujuan, lalu verifikasi, catat, dan sarankan `/rilis 0`.

## Selesai bila

- [x] Tidak ada sisa branding atau string berbahasa Inggris dari template: `apps/web/src/i18n/strings.ts` template dan rute `[chatId]`, `new`, `library`, `explore` sudah dihapus, dan `grep -rn "HeroUI Pro - Chat\|\"Regenerate\"\|\"Copy\"" apps/web/src` (case-sensitive) kosong · grep → exit 1 (kosong); `ls apps/web/src/i18n` → hanya `id.ts`; `ls src/app/(app)` → `layout.tsx page.tsx tentang`
- [x] `ArabicText` merender `lang="ar" dir="rtl"` dengan font Arab yang dipilih (tes + screenshot) · `pnpm test` → 4 tes lolos (`arabic.test.tsx`) · e2e: atribut, `document.fonts` Noto Naskh Arabic `loaded`, teks sama persis dengan sumber · screenshot dikirim ke pemilik
- [x] Beranda, Tentang, dan 404 berbahasa Indonesia, tampil baik di ponsel dan desktop, terang dan gelap · screenshot Playwright 375 px dan 1280 px, terang/gelap · axe WCAG 2.1 AA di 3 halaman × 2 tema → 0 pelanggaran
- [x] Lighthouse aksesibilitas ≥ 90 (angka dicatat) · Lighthouse 13.5.0 pada `next start`: Beranda ponsel a11y **100** (perf 85, BP 100, SEO 100), desktop **100** (semua 100); Tentang ponsel **100** (perf 93), desktop **100**. 404 tidak bisa dinilai Lighthouse (status 404) → axe 0 pelanggaran
- [x] `pnpm verify` dan `pnpm test:e2e` lolos; preview PR menampilkan hasil yang sama · `pnpm verify` → lolos · `pnpm test:e2e` lokal (next dev) → 22 lolos · terhadap workerd lokal (`opennextjs-cloudflare preview`) → 22 lolos · CI preview PR #7 run [38706564892](https://github.com/alfariesh/surau/actions/runs/38706564892) → `22 passed` terhadap https://pr-7-surau-web.alfarieshsalman.workers.dev
- [x] Dependensi yang tidak dipakai sudah dihapus dan ukuran bundle tercatat · 42 dependensi langsung dibuang (lihat ADR-027 §6) · `wrangler deploy --dry-run` → **5.814,61 KiB / gzip 1.221,12 KiB** (S03: 15.993 / 3.021 KiB)
- [x] Pemilik menyetujui tampilan (dikutip di Catatan hasil)
- [x] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Data kitab (Fase 1). Halaman kebijakan privasi lengkap (menjelang Fase 4). Login.

## Catatan hasil

**Persetujuan pemilik (2026-10-15):**
- Arah desain (T-08): "Lupakan Paper, pakai Opsi A Zaitun saja." (setelah melihat dua opsi di `/_desain`).
- Tampilan akhir (5 screenshot desktop/ponsel, terang/gelap): "Setuju, lanjut".

**Yang dibuat:**
- `SurauShell` (sidebar + navbar HeroUI Pro `AppLayout`): Beranda, Kitab/Cari/Tanya (nonaktif, label "segera"), Tentang; tombol tema; logo kitab terbuka (tanpa wajah) + `icon.svg`.
- Halaman `/` (prinsip, peta fase), `/tentang` (visi, pengguna, yang bukan Surau, prinsip, keterbukaan, lisensi), 404. Semua string di `src/i18n/id.ts`.
- `ArabicText` / `ArabicInline` + tes; tipografi Arab di `globals.css` (`--font-arabic`, `--arabic-leading`). Demo basmalah dari Tanzil v1.1, dicocokkan dengan unduhan resmi, atribusi bertaut.
- Palet Zaitun, Plus Jakarta Sans + Noto Naskh Arabic, `next-themes`, `I18nProvider id-ID`, `RouterProvider`. Metadata Surau (title template, description, Open Graph, `lang="id" dir="ltr"`).
- Playwright e2e (`apps/web/e2e`: smoke + axe, chromium desktop & Pixel 7), `pnpm test:e2e`; dijalankan di `preview.yml` terhadap URL preview. Smoke `curl` di `deploy.yml`/`preview.yml` → `/`, `/tentang`.
- Keputusan: ADR-027.

**Dependensi:** baru `next-themes` 0.4.6 (tema), `@playwright/test` 1.64.0 (e2e, dev), `@axe-core/playwright` 4.13.0 (a11y, dev, MPL-2.0). Dibuang: `@tiptap/*` (29 paket), `embla-carousel`, `embla-carousel-react`, `marked`, `react-markdown`, `remark-breaks`, `remark-gfm`, `streamdown`, `shiki`, `recharts`, `@number-flow/react`, `@internationalized/number`, `@react-stately/utils`. **Kemungkinan dipakai lagi di Fase 4 (Tanya):** `@tiptap/*` (composer), `streamdown`/`react-markdown`/`remark-*` (merender jawaban; kutipan Arab tetap lewat `ArabicText`, bukan Markdown), `shiki` bila ada blok kode. Kode chat template ada di riwayat git sebelum commit `03c4315`.

**Menyimpang dari rencana (terbuka):**
- Langkah 1: Paper MCP (contoh warna "Ibid" yang disebut pemilik) gagal tersambung; pemilik lalu memilih Opsi A.
- Langkah 9: Lighthouse tidak bisa menilai halaman 404 dan mode gelap, jadi ditambah cek axe di e2e.
- Langkah 11 (Web Analytics) dilewati: tidak ada token dari pemilik (opsional).
- Halaman `/_desain` dibuat lalu dihapus di sesi yang sama.

**Utang teknis / pesan untuk sesi berikutnya:**
- Tombol tema hanya terang/gelap; kembali ke "ikuti sistem" belum bisa (ADR-027, ditolak sementara).
- Browser Playwright di `preview.yml` belum di-cache (±30 dtk per run).
- `SITE_URL` di `layout.tsx` dan URL di `deploy.yml` perlu diganti saat domain siap (P-2).
- Lisensi konten di halaman Tentang ditulis "direncanakan" sampai ADR-021/P-6 disetujui; ubah kalimatnya setelah itu.
- Fase aktif di peta Beranda diatur lewat `current: true` di `id.home.roadmap`; pindahkan saat Fase 1 dirilis.
- Deploy pertama setelah merge gagal di smoke karena masa transisi versi Worker (lihat LOG); `deploy.yml` kini mengulang smoke sampai 200.
- S09 (UI pembaca) memakai `ArabicText`; untuk teks panjang uji ulang `--arabic-leading` dan ukuran di ponsel.
