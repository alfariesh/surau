# Gerbang tahap 1 ADR-119 (2026-10-28): hasil mentah

Worker uji `surau-web-vinext` (workers.dev, binding staging, Workers Response Store self-contained)
dibandingkan dengan produksi Next (surau.org), produksi Next lewat Version URL workers.dev
(`next-wdev`), dan dua proksi di depan produksi: `next-tunda` (skrip async Next ditunda sampai CSS
selesai) dan `next-kontrol` (proksi tanpa perubahan). Tafsiran dan keputusannya ada di ADR-120 di `main`.

- `lcp-a/`, `lcp-f/`: keluaran `pnpm ukur:lcp <base> baru 1 --json`, 5 putaran berselang-seling
  (`lcp-seling.sh`). Mesin Mac16,10 Apple M4, Chrome 156, Lighthouse 13.5.0.
- `hidrasi-hasil.txt`: `ukur-hidrasi-seling.mjs` (Playwright, CPU 4x, RTT 150 ms, 1,6 Mbps, n=5).
- `fungsi-hasil.txt`: `gerbang-fungsi.mjs` (header keamanan, API, Access, rate limit).
- `e2e-vinext*-ringkas.txt`: suite e2e terhadap Worker uji dengan helper `e2e/hidrasi.ts`
  (putaran 1 gagal karena helper menunggu hidrasi di tes yang sengaja memblokir JS; diperbaiki).
- `proksi-tunda/`: kode proksi gerbang f. `intip-r2.js`: Worker diagnostik sementara (sudah dihapus)
  yang menghitung objek R2 Response Store.
