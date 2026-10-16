# S09 · UI pembaca kitab

> **Fase:** 1 · **Status:** berjalan
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

- [ ] Semua rute berjalan di preview dengan data staging; tidak ada error di Workers Logs (ringkasan CI ADR-031 hanya bukti sebagian: tanpa HTTP 5xx/`console.error`)
- [ ] `wrangler.jsonc` produksi punya `database_id` eksplisit untuk semua D1; `pnpm dev` lokal menampilkan j1 h200 dari DB lokal bersama
- [ ] Takhrij tampil benar untuk 5 penanda yang dicek manual
- [ ] "Salin sitasi" menghasilkan format yang benar, dan permalink membuka paragraf yang tepat
- [ ] Lighthouse ponsel: aksesibilitas ≥ 90 dan performa dicatat
- [ ] E2E lolos; `pnpm verify` lolos
- [ ] Pemilik menyetujui tampilan
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Pencarian (Fase 2). Terjemahan (S13). Mode baca paralel Arab–Indonesia (setelah S13).

## Catatan hasil

*(diisi agent)*
