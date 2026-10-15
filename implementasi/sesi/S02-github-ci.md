# S02 · GitHub & CI

> **Fase:** 0 · **Status:** belum
> **Prasyarat:** S01 selesai dan sudah digabung ke `main` lokal · Tugas pemilik: **T-03** (publik/privat; bila tidak dijawab dipakai privat). **T-04** dikerjakan di langkah 3, setelah repo dibuat.
> **Perkiraan:** 1 percakapan agent (pendek)

## Tujuan

Kode tersimpan di GitHub. Setiap PR otomatis diperiksa CI (`pnpm verify`), dan `main` terlindungi sehingga hanya bisa diubah lewat PR yang hijau.

## Baca dulu (hanya ini)

- KEPUTUSAN: ADR-004 (lisensi HeroUI Pro → repo privat dulu, P-1) dan ADR-017 (CI/CD).
- KONVENSI: bagian *Git* dan *Rahasia*.
- `/docs-terbaru` untuk: `voidzero-dev/setup-vp` (pin versi persis), `actions/checkout`, `actions/cache`, dan panduan CI HeroUI Pro (cache `node_modules` karena kuota unduhan harian).

## Langkah

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

- [ ] Repo ada di GitHub dengan visibilitas sesuai P-1, dan `git remote -v` menunjuk ke sana
- [ ] `gh secret list` dan `gh secret list --app dependabot` memuat `HEROUI_AUTH_TOKEN`
- [ ] Workflow CI hijau di sebuah PR (tautan run dicatat di LOG)
- [ ] Run kedua memakai cache `node_modules` (lebih cepat, terlihat di log)
- [ ] Dependabot dan template PR ada
- [ ] Proteksi `main` aktif, atau keterbatasannya dicatat
- [ ] STATUS, LOG, dan file sesi ini diperbarui

## Di luar cakupan

- Deploy dan preview Cloudflare (S03). Tes e2e (S04).

## Catatan hasil

*(diisi agent)*
