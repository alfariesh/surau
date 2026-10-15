# S04 · Identitas & fondasi UI

> **Fase:** 0 · **Status:** belum
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

- [ ] Tidak ada sisa branding atau string berbahasa Inggris dari template: `apps/web/src/i18n/strings.ts` template dan rute `[chatId]`, `new`, `library`, `explore` sudah dihapus, dan `grep -rn "HeroUI Pro - Chat\|\"Regenerate\"\|\"Copy\"" apps/web/src` (case-sensitive) kosong
- [ ] `ArabicText` merender `lang="ar" dir="rtl"` dengan font Arab yang dipilih (tes + screenshot)
- [ ] Beranda, Tentang, dan 404 berbahasa Indonesia, tampil baik di ponsel dan desktop, terang dan gelap
- [ ] Lighthouse aksesibilitas ≥ 90 (angka dicatat)
- [ ] `pnpm verify` dan `pnpm test:e2e` lolos; preview PR menampilkan hasil yang sama
- [ ] Dependensi yang tidak dipakai sudah dihapus dan ukuran bundle tercatat
- [ ] Pemilik menyetujui tampilan (dikutip di Catatan hasil)
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Data kitab (Fase 1). Halaman kebijakan privasi lengkap (menjelang Fase 4). Login.

## Catatan hasil

*(diisi agent)*
