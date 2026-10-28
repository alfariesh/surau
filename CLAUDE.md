# Surau: instruksi untuk agent

Surau adalah asisten riset kitab klasik Islam: nirlaba, open source, dan berbahasa Indonesia. Setiap jawaban bisa ditelusuri ke teks kitab (karya, jilid, halaman cetak, kutipan Arab verbatim). Aplikasi ini **dibangun sepenuhnya oleh agent**. Pemiliknya seorang product designer, bukan developer: ia memberi arah, memutuskan, dan mengerjakan tugas manusia (akun, token, ustadz).

## Cara kerja

- Rencana dan progres ada di `implementasi/`. `implementasi/STATUS.md` adalah sumber kebenaran posisi proyek dan ringkasannya disuntikkan otomatis di awal sesi.
- **Papan status.** Status kerja dilacak di GitHub Project [Surau](https://github.com/users/alfariesh/projects/7) (kolom Backlog, Berjalan, Menunggu pemilik, Selesai). Papan hanya menampilkan status; spesifikasi, keputusan, dan langkah tugas tetap di `implementasi/` dan tidak disalin ke papan. Tiap tugas pemilik yang terbuka punya isu berlabel `tugas-pemilik` berjudul `T-NN · …`. Saat membuat T-NN baru, buat isunya (ditugaskan ke pemilik, Status *Menunggu pemilik* bila bola di pemilik). Saat T-NN terverifikasi selesai, centang di `TUGAS-PEMILIK.md` lalu tutup isunya. PR yang Anda buka dipasang ke papan sebagai *Berjalan*; workflow bawaan memindahkannya ke *Selesai* saat digabung. Tiap sesi S/X juga punya kartu draf berjudul `ID · judul` dengan field *Fase* (0–4, Sisipan, 5–7 Mendatang). Kartu sesi hanya melacak status dan menunjuk ke file sesi dan `STATUS.md`, yang tetap sumber kebenaran. Geser kartunya ke *Berjalan* saat sesi dimulai, lalu ke *Selesai* saat sesi melapor (*Menunggu pemilik* bila sisanya ada di pemilik, *Backlog* bila ditunda). Sesi baru: buat kartu drafnya dengan `gh project item-create 7 --owner alfariesh --title "<ID> · <judul>"`, lalu isi Status dan Fase. Perintah: `gh project item-add 7 --owner alfariesh --url <url>` dan `gh project item-edit` (ID field dan opsi dari `gh project field-list 7 --owner alfariesh --format json`).
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
4. **Utamakan ship.** Agent langsung commit, push, membuat repo/PR, merge (squash, setelah `pnpm verify` dan CI hijau), dan deploy tanpa bertanya; cukup laporkan sesudahnya. Izin eksplisit pemilik di chat **hanya** untuk: mengirim batch/eval LLM berbayar, menghapus atau menimpa data produksi (D1/R2 remote), dan mengubah dotfile/konfigurasi di luar repo. `push --force` ke `main` tetap dilarang.
5. Centang butir "Selesai bila" hanya dengan bukti perintah. Jangan mengubah kriteria supaya sesi tampak lolos.
6. Setiap keputusan teknis baru dicatat sebagai ADR: satu file baru `implementasi/keputusan/ADR-NNN.md` plus satu baris di indeks `implementasi/KEPUTUSAN.md`. Bila menyimpang dari rencana, tulis secara terbuka.
7. Data Shamela di `/Volumes/Elfariesh/database` hanya **dibaca** (readOnly), tidak pernah ditulis.

## Stack (ringkas; versi dan alasannya ada di `implementasi/STACK.md` dan `KEPUTUSAN.md`)

Monorepo TypeScript (pnpm 12 + Vite+ `vp`, Node 24, TS 7). Web memakai Next.js 16 + HeroUI v3/Pro di Cloudflare Workers lewat OpenNext. Data di Cloudflare D1 (SQLite + FTS5) dengan migrasi SQL dan repository bertipe (tanpa ORM). MCP memakai `@modelcontextprotocol/server` v2. LLM memakai Claude Haiku 5.5 (fallback Sonnet 5.5). Tanpa Go, ESLint, maupun Vercel. Python hanya untuk kalkulator `scripts/hitung_biaya.py`.

## Perintah

Semua dijalankan dari root repo.
- `pnpm install`: memasang dependensi (versi di `catalog` pada `pnpm-workspace.yaml`) dan mengaktifkan hook pre-commit `vp staged`.
- `pnpm dev` menjalankan web di http://localhost:3004 (MCP dev Next di `/_next/mcp`).
- `pnpm dev:remote`: sama, tetapi korpus (`CORPUS_DB`) dibaca dari `surau-corpus-staging` di Cloudflare (remote binding; kode web hanya membacanya; butuh `pnpm wrangler login`). Pakai untuk melihat Cari/pembaca dengan data asli tanpa memuat korpus lokal (ADR-089).
- `pnpm check` (format + lint + typecheck, `vp check`) · `pnpm fix` (perbaiki otomatis) · `pnpm test` (`vp test`) · `pnpm build` (build semua app lewat `vp run -r build`).
- `pnpm verify` = check + test + build, wajib lolos sebelum commit akhir sesi. `pnpm test:e2e` masih placeholder sampai S04.
- `pnpm --filter @surau/web <script>` untuk script satu app. Jangan `vp dev`/`vp build` di `apps/web` (itu build Vite, bukan Next).
- Pakai `pnpm wrangler …`, bukan wrangler global (usang). `sqlite3` di PATH **tidak punya FTS5**; pakai `node:sqlite` atau `pnpm wrangler d1 execute --local`.
- Paket npm berumur <24 jam ditolak pnpm (`minimumReleaseAge`); jangan dimatikan, pakai versi sebelumnya.

## Peta repo

- `docs/`: dokumen produk (visi, kebijakan, arsitektur konsep, biaya, riset). Sumber kebenaran *apa* dan *kenapa*.
- `implementasi/`: rencana eksekusi (STATUS, FASE, `sesi/`, STACK, ARSITEKTUR-TEKNIS, KONVENSI, KEPUTUSAN, LOG, TUGAS-PEMILIK).
- `apps/`, `packages/`, `tools/`: kode. Web ada di `apps/web` (punya `CLAUDE.md` + `AGENTS.md` sendiri). Paket dibuat saat sesi yang membutuhkannya.
- `data/`: lisensi, atribusi, sumber, patch, laporan, dan `konten/` (draf konten turunan, X22). Teks kitab tidak masuk git.
- `plugins/surau-redaksi/`: plugin Claude untuk membuat konten turunan (Intisari, Faedah, Jalur) lewat Claude Desktop; standar di `docs/09-konten.md`, pedoman di `docs/redaksi-operasional.md`.
- `aset/`: aset visual interaktif (sumber `figur/`, hasil `keluaran/`), dibuat dengan skill `aset`.
- `.claude/`: skills (`sesi`, `posisi`, `rilis`, `docs-terbaru`, `aset`), agents (`peninjau`), rules (`teks-arab`), dan hooks.

## Bicara dengan pemilik

- Gunakan bahasa Indonesia yang awam dan ringkas. Sebutkan apa yang sekarang bisa dilihat atau dicoba.
- Bila butuh tindakan pemilik, sebut ID tugasnya (T-NN di `implementasi/TUGAS-PEMILIK.md`) beserta langkah klik demi klik. Perintah untuk pemilik diketik di aplikasi Terminal, bukan di chat. Jangan pernah meminta token atau password ditempel di chat, dan jangan membuka dotfile pemilik (`~/.zshrc`, `~/.claude.json`).
- Setiap selesai sesi, gabungkan (merge) hasilnya ke `main` sendiri bila CI hijau, lalu laporkan. Jangan bertanya untuk hal yang sudah diizinkan aturan keras 4.
- **Ide dan saran perbaikan jadi kartu sesi.** Bila muncul saran perbaikan, ide, atau pekerjaan lanjutan yang berdiri sendiri, jangan hanya menyebutnya di teks: usulkan sebagai kartu sesi (`start_session`, `own_initiative`, konteks `fresh`, worktree sendiri) dengan brief lengkap (file, langkah, "selesai bila", batas biaya/izin), paling banyak tiga per giliran. Pekerjaan yang meneruskan temuan sesi ini sendiri tetap ditawarkan di sini (pertanyaan + tombol). Permintaan pemilik 2026-10-24.
