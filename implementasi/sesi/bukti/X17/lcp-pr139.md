# LCP ponsel PR #139 (X17, 2026-10-25)

Perintah: `pnpm ukur:lcp https://pr-139.surau.org baru,both 5 /kitab/ihya/1/200,/dev/intisari` (Preview commit 290d50e: X17 + X16 di main). `/dev/intisari` = fixture halaman Intisari X16 (staging belum punya data Intisari); pemutar global (ListenProvider) ikut di setiap halaman.

LCP ponsel (Lighthouse 13.5.0, simulasi Lantern), n=5, https://pr-139.surau.org, 2026-10-24T23:32:34.155Z
Mesin: ASUSTeK COMPUTER INC. Vivobook_ASUSLaptop M7600QE_M7600QE · AMD Ryzen 9 5900HX with Radeon Graphics (16 utas) · 15 GiB · linux 7.0.0-38-generic · Chrome/156.0.8078.4

| Jalur | Mode | Median | Sebaran | Semua (ms) |
|---|---|---|---|---|
| /kitab/ihya/1/200 | baru | 3,12 dtk | 2,50–3,26 | 3122, 2969, 2503, 3251, 3262 |
| /kitab/ihya/1/200 | both | 3,01 dtk | 2,59–4,28 | 2588, 3007, 3007, 2589, 4280 |
| /dev/intisari | baru | 2,71 dtk | 2,51–2,98 | 2707, 2978, 2756, 2596, 2512 |
| /dev/intisari | both | 2,61 dtk | 2,39–3,91 | 2392, 3913, 2818, 2612, 2555 |
