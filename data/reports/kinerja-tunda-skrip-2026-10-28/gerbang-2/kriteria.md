# Kriteria GERBANG 2 penundaan skrip Next (PR #206) — ditetapkan 2026-10-28T05:39:41Z, SEBELUM pengukuran gerbang 2

Atas keputusan pemilik di chat 2026-10-28 ("adakan gerbang baru … n=15 berselang-seling, ambang LCP sama 0,75; hidrasi +1,0 dtk … merge hanya bila lolos").
Gerbang 1 (ADR-124) tidak lolos di kriteria 1 (LCP j3/202 0,95). Ini gerbang kedua sesudah gagal: peluang lolos karena kebetulan lebih besar daripada satu gerbang; diakui di sini. Tidak ada gerbang ketiga.

Basis: Preview https://pr-206.surau.org (commit 6d78e9d = PR #206 digabung dengan main a4f7031+) vs produksi https://surau.org, satu jendela waktu, mesin Mac16,10 Apple M4, Chrome for Testing 156, Lighthouse 13.5.0.

1. LCP: `pnpm ukur:lcp <base> baru 1 --json` per panggilan, 15 putaran berselang-seling (urutan basis bergantian tiap putaran), jalur /kitab/ihya/1/200 dan /kitab/ihya/3/202. Lolos bila median Preview ≤ 0,75 × median produksi di KEDUA halaman. Putaran yang gagal dijalankan (galat Lighthouse) diulang sekali dan dicatat; tidak ada putaran yang dibuang.
2. Hidrasi tombol Tampilan: Playwright, CPU 4x, RTT 150 ms, 1,6 Mbps turun / 750 kbps naik, cache dimatikan, 10 putaran berselang-seling. Lolos bila median Preview ≤ median produksi + 1,0 dtk di kedua halaman. (Ambang +1,0 dtk menyimpang dari +0,5 di ADR-119/121; diputuskan pemilik.)
3. CLS (putaran yang sama, jendela sampai 5 dtk sesudah hidrasi): median Preview ≤ 0,1 dan ≤ median produksi + 0,05 di kedua halaman.
4. CI: semua cek PR #206 hijau pada commit yang digabung. Job `preview mcp` boleh dijalankan ulang bila gagal karena timeout Inspector (PR tidak menyentuh apps/mcp); setiap pengulangan dicatat.
5. Fungsi: `banding-html.mjs` = SAMA di 6 halaman untuk kode yang digabung; tanpa JS halaman kitab tampil; e2e `tunda-skrip.spec.ts` lolos di CI.

Semua lolos → PR #206 digabung (squash) dan ter-deploy. Satu gagal → tidak digabung, PR ditutup, penundaan skrip ditolak.
