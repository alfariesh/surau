# Skrip ukur uji coba vinext (ADR-118)

Dipakai 2026-10-28 untuk membandingkan cabang ini (vinext) dengan `main` (Next + OpenNext). Hasil dan tafsirannya ada di `implementasi/keputusan/ADR-118.md` di `main`. Cabang ini tidak untuk digabung.

## Menyalakan keduanya

1. Worktree `main` (basis): `pnpm install`, `pnpm --filter @surau/web build` lalu bundel OpenNext (`pnpm --filter @surau/web exec opennextjs-cloudflare build`), lalu dari `apps/web`:
   `pnpm exec wrangler dev --port 3022 --persist-to <root>/.wrangler/state --var IP_HMAC_KEY:uji-lokal --var DEV_PAGES:1`
2. Worktree cabang ini: `pnpm install`, `pnpm --filter @surau/web build:vinext`, lalu dari `apps/web`:
   `pnpm exec wrangler dev --config dist/server/wrangler.json --port 3021 --persist-to <root>/.wrangler/state --var IP_HMAC_KEY:uji-lokal --var DEV_PAGES:1`
   Salin `.wrangler/state/v3/d1` dari worktree basis supaya datanya sama.
3. Proksi HTTP/2 + brotli. **Wajib**: tanpa proksi, Chrome memakai HTTP/1.1 (6 koneksi) tanpa kompresi dan hasilnya merugikan vinext.
   `openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 7 -subj /CN=localhost`
   `node proksi.mjs 4421 3021` dan `node proksi.mjs 4422 3022`

## Mengukur

- `ukur-hidrasi.mjs`: FCP, LCP, `load`, dan saat tombol Tampilan terhidrasi, berselang-seling. `THROTTLE=1` = CPU 4×, RTT 150 ms, 1,6 Mbps. Salin ke `apps/web/` lalu jalankan dengan `node` (butuh `@playwright/test`).
- `ukur-urutan-unduh.mjs`: berapa KB CSS, JS, dan font yang selesai sebelum cat pertama (throttling ponsel). Ganti daftar URL untuk kalibrasi ke produksi.
- `lighthouse.sh`: Lighthouse 13.5 ponsel, n=5 berselang-seling di j1/200 dan j3/202. Jalankan dari folder berisi `npm i lighthouse@13.5.0`. `CHROME_PATH` diambil dari Chrome for Testing milik Playwright.
- `playwright-lambat.config.ts.contoh`: e2e dengan `slowMo` (`SLOWMO=500`) untuk menguji apakah kegagalan disebabkan klik sebelum hidrasi. Salin ke `apps/web/playwright-lambat.config.ts` (bukan `.ts` di sini karena tidak bisa di-typecheck di luar `apps/web`), lalu jalankan `BASE_URL=http://localhost:3021 pnpm exec playwright test -c playwright-lambat.config.ts …`.
