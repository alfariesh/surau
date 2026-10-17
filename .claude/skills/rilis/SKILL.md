---
name: rilis
description: Jalankan daftar periksa rilis untuk satu fase Surau yang semua sesinya sudah selesai, mulai dari pemeriksaan, gerbang eval, preview, deploy produksi (dengan izin pemilik), tag, sampai catatan rilis. Hanya dipanggil manual oleh pemilik dengan /rilis.
argument-hint: "[nomor fase, kosongkan untuk fase sekarang]"
disable-model-invocation: true
---

# /rilis: rilis fase $ARGUMENTS

Rilis adalah satu-satunya saat perubahan sampai ke pengguna publik. Bersikaplah teliti, dan jangan melewati butir apa pun. Bila ada butir yang gagal, **berhenti** dan laporkan.

## 1. Kesiapan

- Baca `implementasi/FASE.md` bagian fase target, khususnya **Syarat rilis**.
- Semua sesi fase itu berstatus `selesai` di `implementasi/STATUS.md` dan tidak ada butir "Selesai bila" yang belum dicentang.
- `main` bersih dan sinkron dengan remote. Semua PR sesi fase ini sudah di-merge.

## 2. Pemeriksaan otomatis (wajib lolos semua)

- `pnpm install --frozen-lockfile`, lalu `pnpm verify` (format, lint, typecheck, tes unit, build).
- Tes e2e smoke bila sudah ada (`pnpm test:e2e`).
- **Gerbang eval** bila fase ini mensyaratkannya. Fase 2 memakai `pnpm run eval:retrieval --gate --label rilis` (keluar 1 bila hit@10 set resmi < 90%). Sebelumnya pastikan D1 lokal memuat korpus yang sama dengan produksi (`corpus_version` di laporan = binding `CORPUS_DB` produksi) dan soal privat ada di `evals/private/` (unduh dari R2, lihat `evals/README.md`); laporan rilis di-commit. Fase 4 memakai `pnpm run eval:jawab`; ini berbayar, jadi minta izin dulu. Ambangnya adalah *Syarat rilis* di FASE.md, yang sama dengan kolom gerbang di [docs/06](../../../docs/06-evaluasi.md); bila berbeda, FASE.md yang berlaku. Hasilnya dicatat di LOG.
- Tinjauan keamanan atas semua perubahan sejak rilis terakhir: jalankan subagen `peninjau` dengan rentang `git diff <tag-rilis-terakhir>..main`. Untuk rilis pertama, pakai commit akar: `git rev-list --max-parents=0 HEAD`. Tambahkan `/security-review` bila tersedia.
- **Gerbang versi:** jalankan skill `docs-terbaru` untuk Next.js, @opennextjs/cloudflare, dan wrangler. Pastikan versi Next yang dipakai didukung resmi oleh rilis OpenNext yang terpasang. Untuk setiap advisory keamanan yang masih terbuka di versi itu, harus ada **mitigasi tertulis di ADR-003** yang terverifikasi di build: fitur terkait mati, misalnya `images.unoptimized`, `cacheComponents: false`, dan tanpa Server Actions atau `'use cache'` (cek dengan grep). Advisory tanpa mitigasi berarti berhenti.
- Pastikan tidak ada data Shamela, `.env`, `.dev.vars`, atau token di repo: `git ls-files | grep -v '\.env\.example$' | grep -E '\.(db|sqlite)$|\.env|\.dev\.vars'` harus kosong.

## 3. Preview

- Deploy ke lingkungan preview: workflow `preview.yml` dari S03; lingkungan dan binding-nya di `implementasi/ARSITEKTUR-TEKNIS.md` §7.
- Smoke test di preview: halaman utama, alur utama fase ini, tampilan teks Arab (RTL, font), tampilan di ponsel, dan halaman 404. Ambil tangkapan layar bila memungkinkan.
- Kirim tautan preview ke pemilik dengan daftar hal yang perlu ia cek sendiri (bahasa awam).

## 4. Produksi (hanya setelah pemilik setuju di chat)

- Tanyakan secara eksplisit: "Rilis Fase N ke produksi sekarang?" Tunggu jawaban "ya" yang jelas.
- Bila ada migrasi DB, terapkan dulu ke produksi. Untuk korpus, pakai pola blue-green (DB baru, binding diganti). DB lama tidak dihapus.
- Deploy produksi, lalu ulangi smoke test di domain produksi.
- Buat tag git `rilis-fN` (misalnya `rilis-f1`) dan push tag setelah izin.

## 5. Catat dan umumkan

- `CHANGELOG.md` di root: tambahkan bagian rilis dalam bahasa awam (apa yang baru bagi pengguna, keterbatasan yang diketahui).
- `implementasi/FASE.md`: tandai fase **dirilis** beserta tanggalnya. Perbarui `STATUS.md` dan `LOG.md`.
- Draf pengumuman singkat (2–4 kalimat) untuk pemilik. Jangan memposting apa pun sendiri.
- Bila ada yang dirollback atau ditunda, tulis apa adanya.
