# Kriteria gerbang penundaan skrip Next (ADR-121 butir 2) — ditetapkan 2026-10-28T04:02:57Z, SEBELUM pengukuran Preview

Preview PR vs produksi surau.org, jendela waktu yang sama, mesin Mac16,10 M4.
1. LCP: `pnpm ukur:lcp` mode baru, n=5 berselang-seling, j1/200 dan j3/202: median Preview ≤ 0,75 × produksi di kedua halaman.
2. Hidrasi tombol Tampilan (Playwright, CPU 4x, RTT 150 ms, 1,6 Mbps, n=5 berselang-seling): median Preview ≤ produksi + 1,0 dtk di kedua halaman.
3. CLS (Playwright yang sama, layout-shift sampai 5 dtk sesudah load): median Preview ≤ 0,1 dan ≤ produksi + 0,05 di kedua halaman.
4. CI Preview: e2e (termasuk axe) hijau tanpa melonggarkan tes.
5. Fungsi: HTML pembaca sama dengan produksi kecuali tag skrip; navigasi klien (RSC) tidak tersentuh; halaman tanpa JS tetap tampil.
Gagal satu = tidak di-merge ke produksi; hasil dicatat di ADR.
