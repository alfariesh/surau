# X16 · LCP ponsel Preview PR #138

`pnpm ukur:lcp https://pr-138.surau.org baru,both 5 /kitab/ihya/1/200,/dev/intisari` (2026-10-24T16:51Z).

LCP ponsel (Lighthouse 13.5.0, simulasi Lantern), n = 5. Data staging `ihya-v8` (skema 7, belum ada Intisari): j1/200 tanpa kartu atau lencana Intisari. `/dev/intisari` = halaman Intisari Kitab fixture (komponen dan CSS yang sama dengan halaman nyata, dirender dinamis tanpa cache ISR).

Mesin: ASUSTeK Vivobook M7600QE · AMD Ryzen 9 5900HX (16 utas) · 15 GiB · Linux 7.0.0-38 · Chrome 156.0.8078.4.

| Jalur | Mode | Median | Sebaran | Semua (ms) |
|---|---|---|---|---|
| /kitab/ihya/1/200 | baru | 3,49 dtk | 2,64–5,21 | 3489, 5206, 3910, 2638, 3338 |
| /kitab/ihya/1/200 | both | 3,29 dtk | 2,84–5,07 | 3291, 3339, 3100, 2843, 5072 |
| /dev/intisari | baru | 3,37 dtk | 2,71–4,20 | 2707, 4202, 2871, 3368, 3634 |
| /dev/intisari | both | 3,69 dtk | 2,96–4,35 | 2959, 3689, 3791, 4352, 3168 |

Semua median ≤ 4,29 dtk (ADR-079). Ukur ulang halaman Intisari nyata (ISR) sesudah data pilot X15b ada di staging.

Tangkapan layar T-30 tahap 1 (data contoh): `01`–`05` di folder ini, diambil sesudah perbaikan peninjau (kode commit e850ac2, dev server lokal `/dev/intisari`, indikator dev Next disembunyikan; komponen dan CSS sama dengan Preview).
