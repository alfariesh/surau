# LCP ponsel PR #143 (X18, 2026-10-25)

Perintah: `pnpm ukur:lcp https://pr-143.surau.org baru,both 5 /kitab/ihya/1/200,/dev/intisari` (Preview PR #143 sesudah merge `main` + X17b; CI men-deploy ulang Preview untuk commit perbaikan peninjau selama pengukuran, isi web keduanya sama kecuali cek sha + forced-colors). `/dev/intisari` = fixture halaman Intisari dengan tombol Dengarkan + `ListenFollow` (X18).

LCP ponsel (Lighthouse 13.5.0, simulasi Lantern), n=5, https://pr-143.surau.org, 2026-10-25T00:37:40.869Z
Mesin: ASUSTeK COMPUTER INC. Vivobook_ASUSLaptop M7600QE_M7600QE · AMD Ryzen 9 5900HX with Radeon Graphics (16 utas) · 15 GiB · linux 7.0.0-38-generic · Chrome/156.0.8078.4

| Jalur | Mode | Median | Sebaran | Semua (ms) |
|---|---|---|---|---|
| /kitab/ihya/1/200 | baru | 2,97 dtk | 2,46–4,41 | 2464, 2475, 4413, 4141, 2968 |
| /kitab/ihya/1/200 | both | 2,87 dtk | 2,50–5,17 | 2873, 2887, 5166, 2793, 2501 |
| /dev/intisari | baru | 3,05 dtk | 2,69–4,09 | 3121, 4091, 3053, 2690, 3022 |
| /dev/intisari | both | 2,79 dtk | 2,43–4,83 | 2791, 4829, 3788, 2506, 2429 |

Pembanding X17 (PR #139, tanpa sorotan): /dev/intisari 2,71 / 2,61 dtk; j1/200 3,12 / 3,01 dtk.
