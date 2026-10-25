# @surau/media

Worker media Surau (X17, [ADR-103](../../implementasi/KEPUTUSAN.md)) di `https://media.surau.org`: audio Intisari ("Dengarkan") dari bucket R2 `surau-media`. Hanya `GET`/`HEAD` untuk kunci `<karya>/<lang>/<node>-<sha12>.mp3` (`audioObjectKey`, `@surau/core`); kunci lain 404 tanpa cache.

- **Kenapa Worker, bukan domain kustom R2:** wildcard Preview `*.surau.org` (Preview per PR web) menangkap domain kustom R2. Worker custom domain lebih diutamakan, sama dengan `mcp.surau.org`.
- **Cache:** Workers Caching (`cache` di `wrangler.jsonc`) menyimpan respons 200 penuh dan melayani `Range` (206) tanpa menjalankan Worker. Kunci memuat sidik isi, jadi `Cache-Control` immutable dan cache dipakai lintas versi Worker.
- **Unggah** tidak lewat Worker ini: `pnpm audio upload --confirm` (wrangler r2 object put, tidak pernah menimpa), lalu `pnpm audio manifest` dan `pnpm audio verify`.
- **Deploy:** job `deploy media` di `.github/workflows/deploy.yml` (push ke `main`). Manual: `pnpm --filter @surau/media run deploy:media`.
- **Privasi:** tanpa cookie, `invocation_logs: false` (tanpa IP di log, ADR-065).
