# S02 · GitHub & CI

> **Fase:** 0 · **Status:** selesai (menunggu merge PR #1)
> **Prasyarat:** S01 selesai dan sudah digabung ke `main` lokal · Tugas pemilik: **T-03** (publik/privat; bila tidak dijawab dipakai privat). **T-04** dikerjakan di langkah 3, setelah repo dibuat.
> **Perkiraan:** 1 percakapan agent (pendek)

## Tujuan

Kode tersimpan di GitHub. Setiap PR otomatis diperiksa CI (`pnpm verify`), dan `main` terlindungi sehingga hanya bisa diubah lewat PR yang hijau.

## Baca dulu (hanya ini)

- KEPUTUSAN: ADR-004 (lisensi HeroUI Pro → repo privat dulu, P-1) dan ADR-017 (CI/CD).
- KONVENSI: bagian *Git* dan *Rahasia*.
- `/docs-terbaru` untuk: `voidzero-dev/setup-vp` (pin versi persis), `actions/checkout`, `actions/cache`, dan panduan CI HeroUI Pro (cache `node_modules` karena kuota unduhan harian).

## Langkah

0. **Tindak lanjut S01 (ADR-023):** bila sudah berumur ≥24 jam, naikkan catalog `vite-plus` → 1.2.0 dan `react`/`react-dom` → 19.2.9, lalu `pnpm install` + `pnpm verify`. Centang butir S01 "vite-plus lokal 1.2.0" dengan bukti dan perbarui STACK.md. Kerjakan ini di branch S02 (commit terpisah `chore(deps): …`).
1. **Cek MCP Next.js** (ditambahkan di S01): saat `pnpm dev` berjalan, panggil `nextjs_index` lalu `nextjs_call` (misalnya `get_errors`). Catat hasilnya di Catatan hasil S01/S02. Pastikan juga keputusan **P-1** sudah ada (T-03). Default: **privat**.
2. Minta izin pemilik, lalu buat repo: `gh repo create <owner>/surau --private --source . --remote origin`. Push `main`, yang sudah memuat S00 dan S01. Setelah itu buat branch `sesi/s02-ci` dari `main`.
3. Minta pemilik menjalankan T-04 (secret untuk Actions **dan** Dependabot). Verifikasi dengan `gh secret list` dan `gh secret list --app dependabot`.
4. Buat `.github/workflows/ci.yml` yang berjalan pada `pull_request` dan `push` ke `main`:
   - `env: HEROUI_AUTH_TOKEN: ${{ secrets.HEROUI_AUTH_TOKEN }}` di level **job**, supaya postinstall Pro selalu melihat token.
   - Urutan: checkout → **guard** (gagal dengan pesan jelas bila `HEROUI_AUTH_TOKEN` kosong, karena postinstall Pro bisa "sukses" padahal tidak mengunduh apa pun) → `setup-vp` (versi persis, `node-version-file: .node-version`, **`run-install: false`**) → pulihkan cache `node_modules` (root dan `apps/*`, kunci hash `pnpm-lock.yaml`) → `pnpm install --frozen-lockfile` → `pnpm verify`.
   - Alternatif: pakai cache bawaan `setup-vp` dan buang cache terpisah. Pilih salah satu, dan jangan biarkan install berjalan dua kali.
   - Job hanya berjalan untuk PR dari repo yang sama. **Jangan** memakai `pull_request_target` dengan checkout kode fork.
5. Buat `.github/dependabot.yml`: npm (mingguan, dikelompokkan, abaikan mayor), dan github-actions (bulanan).
6. Buat `.github/pull_request_template.md` dengan checklist singkat: sesi, "Selesai bila" tercentang, `pnpm verify`, tanpa data/secret, dan screenshot UI bila ada.
7. Buat `LICENSE` Apache-2.0 untuk kode, dan pastikan README root menyebut lisensi data terpisah (lihat docs).
8. Catat bahwa repo privat memakai kuota menit GitHub Actions akun (cek di GitHub › Settings › Billing). Cache dan job yang ramping menjaga pemakaian tetap kecil.
9. Minta izin, lalu pasang proteksi branch `main` lewat `gh api`: wajib status check CI dan tanpa force-push. Untuk repo privat di akun gratis, proteksi branch bisa saja tidak tersedia. Bila begitu, catat dan lanjutkan.
10. Uji alur: buka PR dari `sesi/s02-ci`, lalu pastikan CI berjalan dan hijau. Merge dengan **squash** setelah pemilik setuju. Pasang proteksi branch (langkah 9) **setelah** PR ini hijau.

## Selesai bila

- [x] Repo ada di GitHub dengan visibilitas sesuai P-1, dan `git remote -v` menunjuk ke sana · *`gh repo view` → `alfariesh/surau` PRIVATE, default `main`; `git remote -v` → `origin https://github.com/alfariesh/surau.git`*
- [x] `gh secret list` dan `gh secret list --app dependabot` memuat `HEROUI_AUTH_TOKEN` · *keduanya ada (06:34 UTC)*
- [x] Workflow CI hijau di sebuah PR (tautan run dicatat di LOG) · *PR #1: run 38693275094, 38693870081, 38694117242 → success*
- [x] Run kedua memakai cache `node_modules` (lebih cepat, terlihat di log) · *run 38694117242: "Cache hit for: nm-Linux-X64-d0f851…", install 2,5 dtk (sebelumnya ±15 dtk) tanpa postinstall Pro; langkah simpan di-skip. Run kedua (38693870081) miss karena kunci cache diubah oleh perbaikan peninjau, jadi yang membuktikan adalah run ketiga dengan kunci yang sama*
- [x] Dependabot dan template PR ada · *`.github/dependabot.yml`, `.github/pull_request_template.md` (dipakai saat PR #1 dibuat)*
- [x] Proteksi `main` aktif, atau keterbatasannya dicatat · *`gh api …/branches/main/protection` dan `…/rulesets` → HTTP 403 "Upgrade to GitHub Pro or make this repository public"; dicatat di ADR-024 butir 7*
- [x] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Deploy dan preview Cloudflare (S03). Tes e2e (S04).

## Catatan hasil

**2026-10-15 · selesai (merge PR #1 menunggu izin pemilik)**

*Yang dibuat*
- Repo privat `alfariesh/surau` (P-1 privat, dijawab pemilik di chat). Nama itu sudah dipakai repo lama (Feb 2026, proyek berbeda); atas izin pemilik repo lama di-rename menjadi `alfariesh/surau-lama`, isinya utuh.
- `.github/workflows/ci.yml`: satu job `verify` (guard token → `setup-vp` v1.21.2 tanpa cache/install → restore `node_modules` → `pnpm install --frozen-lockfile` → save bila miss → `pnpm verify`). Action dipin SHA (dicocokkan dengan tag). Hanya PR dari repo ini; tanpa `pull_request_target`; `permissions: contents: read`; `persist-credentials: false`.
- `.github/dependabot.yml` (npm mingguan + github-actions bulanan), `.github/pull_request_template.md`, `LICENSE` Apache-2.0 (teks dari API lisensi GitHub). README: judul "Lisensi" tidak lagi "(rencana)" untuk kode.
- ADR-024.

*Bukti tambahan*
- Langkah 1: `pnpm dev` + MCP `next-devtools` → `nextjs_index` menemukan server port 3004 dengan 9 tool; `nextjs_call get_errors` → "No browser sessions connected" (wajar tanpa browser); `get_compilation_issues` → `{"issues":[]}`.
- Postinstall Pro di CI: "Installed HeroUI React Pro ✓" dengan `HEROUI_AUTH_TOKEN`, walau build `@zowe/secrets-for-zowe-sdk` ditolak. Poin 3 ADR-023 terbukti aman di CI.
- `setup-vp` mencetak "✓ Dependencies installed." untuk pemasangan `vp` sendiri ("Local vite-plus: Not found" saat itu); dependensi proyek hanya di-install sekali di langkah `pnpm install`.
- Durasi job: ±60 dtk (miss) → ±50 dtk (hit).

*Penyimpangan dari rencana (ADR-024)*
- Token di level **langkah** (guard + install), bukan level job: postinstall tetap melihatnya, `pnpm verify` tidak.
- Cache memakai `actions/cache/restore` + `save` terpisah (simpan sebelum verify), atas temuan peninjau.
- Proteksi branch tidak tersedia (akun Free + privat). Langkah 9 dan bagian "pasang proteksi setelah PR hijau" di langkah 10 tidak bisa dikerjakan.

*Belum/ditunda*
- **Langkah 0** (vite-plus 1.2.0, React 19.2.9) belum bisa: saat sesi berjalan (±13:15–14:00 WIB) keduanya belum berumur 24 jam (boleh mulai 16:21 dan 23:54 WIB). Butir S01 tetap belum dicentang; dikerjakan di awal S03 (commit `chore(deps)` terpisah).
- Kuota menit Actions repo privat (langkah 8): satu run ±1 menit tagihan; kuota akun Free ±2.000 menit/bulan (cek di GitHub › Settings › Billing and licensing). Pemakaian S02: 3 run.

*Untuk sesi berikutnya*
- Dependabot pertama akan berjalan Senin. Bila PR npm-nya merusak lockfile/catalog (pnpm 12 belum resmi didukung), tutup dan naikkan manual (ADR-024 butir 6).
- S03 menambah `preview.yml`/`deploy.yml`: ikuti pola yang sama (SHA pin, token hanya di langkah yang butuh, restore/save `node_modules` dengan kunci yang sama supaya cache dipakai bersama).
