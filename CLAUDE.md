# Surau: instruksi untuk agent

Surau adalah asisten riset kitab klasik Islam: nirlaba, open source, dan berbahasa Indonesia. Setiap jawaban bisa ditelusuri ke teks kitab (karya, jilid, halaman cetak, kutipan Arab verbatim). Aplikasi ini **dibangun sepenuhnya oleh agent**. Pemiliknya seorang product designer, bukan developer: ia memberi arah, memutuskan, dan mengerjakan tugas manusia (akun, token, ustadz).

## Cara kerja

- Rencana dan progres ada di `implementasi/`. `implementasi/STATUS.md` adalah sumber kebenaran posisi proyek dan ringkasannya disuntikkan otomatis di awal sesi.
- Bila pemilik berkata "kerjakan sesi …", "lanjut", atau "sesi berikutnya", pakai skill `/sesi`. Bila bertanya "sudah sampai mana" atau "posisi proyek", pakai `/posisi` (bukan `/status`, yang merupakan perintah bawaan Claude Code). `/rilis` hanya dipanggil pemilik.
- **Docs terbaru, selalu.** Sebelum memasang, meng-upgrade, atau menulis kode untuk library/layanan, panggil `/docs-terbaru <paket> <pertanyaan>`. Jangan menulis API dari ingatan. Sumber khusus:
  - Next.js: `apps/web/node_modules/next/dist/docs/` (setelah S01)
  - Claude API: muat skill `claude-api`
  - Cloudflare: MCP `cloudflare-docs`, skill `cloudflare` / `wrangler`
  - HeroUI: MCP `heroui-pro` (dipasang pemilik di level user, T-01), skill `heroui-react-pro`
  - Daftar tautan resmi: `implementasi/STACK.md`
- Di akhir setiap sesi, jalankan subagen `peninjau` atas diff sebelum commit terakhir.
- Abaikan skill `vercel:*` dan `supabase:*` di repo ini: stack Surau adalah Cloudflare (Workers, D1, AI Gateway), bukan Vercel atau Supabase.

## Aturan keras

1. **Kutipan Arab tidak pernah ditulis model.** Kode menyalin teks dari DB berdasarkan ID dan offset. Detailnya ada di `.claude/rules/teks-arab.md` (dimuat otomatis saat membuka kode).
2. Gunakan bahasa atribusi, bukan fatwa. Tidak ada roleplay orang pertama sebagai ulama. Ayat Al-Qur'an memakai teks Tanzil dan terjemahan Kemenag verbatim, **tidak pernah** diterjemahkan LLM.
3. Jangan pernah meng-commit `.env*`, `.dev.vars*`, `*.db`, `*.sqlite`, teks kitab mentah (`data/raw/`, `data/build/`), atau skill HeroUI Pro (berlisensi). Jangan membaca `.env`.
4. **Wajib ada izin eksplisit pemilik di chat** sebelum: push, membuat repo/PR, merge, deploy, menulis ke D1/R2 remote, mengirim batch LLM berbayar, atau mengubah dotfile/konfigurasi di luar repo.
5. Centang butir "Selesai bila" hanya dengan bukti perintah. Jangan mengubah kriteria supaya sesi tampak lolos.
6. Setiap keputusan teknis baru dicatat sebagai ADR di `implementasi/KEPUTUSAN.md`. Bila menyimpang dari rencana, tulis secara terbuka.
7. Data Shamela di `/Volumes/Elfariesh/database` hanya **dibaca** (readOnly), tidak pernah ditulis.

## Stack (ringkas; versi dan alasannya ada di `implementasi/STACK.md` dan `KEPUTUSAN.md`)

Monorepo TypeScript (pnpm 12 + Vite+ `vp`, Node 24, TS 7). Web memakai Next.js 16 + HeroUI v3/Pro di Cloudflare Workers lewat OpenNext. Data di Cloudflare D1 (SQLite + FTS5) dengan migrasi SQL dan repository bertipe (tanpa ORM). MCP memakai `@modelcontextprotocol/server` v2. LLM memakai Claude Haiku 5.5 (fallback Sonnet 5.5). Tanpa Go, ESLint, maupun Vercel. Python hanya untuk kalkulator `scripts/hitung_biaya.py`.

## Perintah

Semua dijalankan dari root repo.
- `pnpm install`: memasang dependensi (versi di `catalog` pada `pnpm-workspace.yaml`) dan mengaktifkan hook pre-commit `vp staged`.
- `pnpm dev` menjalankan web di http://localhost:3004 (MCP dev Next di `/_next/mcp`).
- `pnpm check` (format + lint + typecheck, `vp check`) · `pnpm fix` (perbaiki otomatis) · `pnpm test` (`vp test`) · `pnpm build` (build semua app lewat `vp run -r build`).
- `pnpm verify` = check + test + build, wajib lolos sebelum commit akhir sesi. `pnpm test:e2e` masih placeholder sampai S04.
- `pnpm --filter @surau/web <script>` untuk script satu app. Jangan `vp dev`/`vp build` di `apps/web` (itu build Vite, bukan Next).
- Pakai `pnpm wrangler …`, bukan wrangler global (usang). `sqlite3` di PATH **tidak punya FTS5**; pakai `node:sqlite` atau `pnpm wrangler d1 execute --local`.
- Paket npm berumur <24 jam ditolak pnpm (`minimumReleaseAge`); jangan dimatikan, pakai versi sebelumnya.

## Peta repo

- `docs/`: dokumen produk (visi, kebijakan, arsitektur konsep, biaya, riset). Sumber kebenaran *apa* dan *kenapa*.
- `implementasi/`: rencana eksekusi (STATUS, FASE, `sesi/`, STACK, ARSITEKTUR-TEKNIS, KONVENSI, KEPUTUSAN, LOG, TUGAS-PEMILIK).
- `apps/`, `packages/`, `tools/`: kode. Web ada di `apps/web` (punya `CLAUDE.md` + `AGENTS.md` sendiri). Paket dibuat saat sesi yang membutuhkannya.
- `data/`: lisensi, atribusi, sumber, patch, dan laporan. Teks kitab tidak masuk git.
- `.claude/`: skills (`sesi`, `posisi`, `rilis`, `docs-terbaru`), agents (`peninjau`), rules (`teks-arab`), dan hooks.

## Bicara dengan pemilik

- Gunakan bahasa Indonesia yang awam dan ringkas. Sebutkan apa yang sekarang bisa dilihat atau dicoba.
- Bila butuh tindakan pemilik, sebut ID tugasnya (T-NN di `implementasi/TUGAS-PEMILIK.md`) beserta langkah klik demi klik. Perintah untuk pemilik diketik di aplikasi Terminal, bukan di chat. Jangan pernah meminta token atau password ditempel di chat, dan jangan membuka dotfile pemilik (`~/.zshrc`, `~/.claude.json`).
- Setiap selesai sesi, minta persetujuan pemilik untuk menggabungkan (merge) hasilnya ke `main`.
