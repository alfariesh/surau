# S01 · Monorepo & toolchain

> **Fase:** 0 · **Status:** selesai, 1 butir tertunda (vite-plus 1.2.0 belum cukup umur; ADR-023)
> **Prasyarat:** S00 ter-commit di `main` · Tugas pemilik (wajib sebelum mulai): **T-00**, **T-01**, **T-02**
> **Perkiraan:** 1 percakapan agent (ini juga *spike*: memverifikasi pilihan toolchain ADR-008)

## Tujuan

Repo menjadi monorepo pnpm yang rapi: `web/` pindah ke `apps/web`, Vite+ menjadi toolchain tunggal (format, lint, typecheck, test), TypeScript 7 dan semua versi dipin, dan `pnpm verify` hijau. Template chat HeroUI masih berjalan seperti semula di `localhost:3004`.

## Baca dulu (hanya ini)

- [KEPUTUSAN.md](../KEPUTUSAN.md): ADR-003, 004, 007, 008.
- [STACK.md](../STACK.md): bagian *Runtime & toolchain* dan *Web*.
- [KONVENSI.md](../KONVENSI.md): bagian *Struktur*, *TypeScript*, *Gerbang perintah*, *Git*.
- [ARSITEKTUR-TEKNIS.md](../ARSITEKTUR-TEKNIS.md) §2 (struktur monorepo).
- `/docs-terbaru` untuk:
  - `vite-plus`: config `vite.config.ts` monorepo (lint, fmt, test, staged), `vp config`, dan commit hooks.
  - `pnpm` 12: workspace, catalog, `allowBuilds`, `minimumReleaseAge`.
  - `next` 16.3.8: TypeScript CLI, `agentRules`/AGENTS.md. Cek juga apakah OpenNext sudah mendukung 16.4 (gerbang X01).
  - `@heroui-pro/react`: instalasi dan postinstall.

## Langkah

1. **Cek lingkungan.**
   - `node -v` harus v24.x. Bila masih v22, T-02 belum selesai atau aplikasi Claude belum dibuka ulang: tandai MENUNGGU PEMILIK T-02 dan berhenti. Jangan membuka atau mengedit `~/.zshrc`.
   - `pnpm -v` harus 12.x dan `vp --version` harus bisa dijalankan.
   - `pnpm dlx heroui-pro@latest status` harus menunjukkan sudah login (T-01).
   - MCP `heroui-pro` harus tersedia (T-01). Cari tool `mcp__heroui-pro__list_components` lewat ToolSearch lalu panggil sekali. Bila tidak ada, minta pemilik mengetik `/mcp` dan melaporkan hasilnya. Bila salah satu cek gagal → MENUNGGU PEMILIK.
2. **Branch.** Pastikan `git status` bersih (kecuali `web/` yang belum di-track), lalu buat `sesi/s01-monorepo` dari `main`.
3. **Pindahkan template.** Jalankan `mkdir -p apps && mv web apps/web` (folder ini belum di-track git). Ubah nama paket menjadi `@surau/web`, hapus field `exports` milik paket template, dan hapus semua `.DS_Store`.
4. **File root:**
   - `package.json`:
     - `private`, `"type": "module"`, `"packageManager": "pnpm@12.11.2"`, `engines.node` `>=24.11 <25`.
     - devDependencies `vite-plus`, `typescript`, dan `wrangler` (4.151.x) lewat `catalog:`, supaya `pnpm wrangler …` bisa dijalankan dari root. Tiap Worker tetap memakai `wrangler.jsonc` miliknya (`--config`, `--name`, atau `pnpm --filter`).
     - Skrip `dev`, `check`, `fix`, `test`, `test:e2e` (placeholder sampai S04), `build`, `verify`, dan `prepare: "vp config --no-agent"`. Lihat tabel di KONVENSI.
     - Di `apps/web`, panggil script lewat `vp run`/`pnpm --filter`, bukan `vp build`/`vp dev` (itu build Vite, bukan Next).
     - **Jangan** menamai script `deploy`, karena `pnpm deploy` adalah perintah bawaan pnpm. Pakai `deploy:web` dan seterusnya, lewat `pnpm run`.
   - `pnpm-workspace.yaml`:
     - `packages: [apps/*, packages/*, tools/*]` dan `catalogMode: strict`.
     - `catalog` berisi semua versi yang dipin, minimal `typescript: 7.0.2`, `vite-plus: 1.2.0`, `@types/node` 24.x, `next: 16.3.8`, `react`/`react-dom` 19.2.x, dan `@heroui-pro/react: 1.0.0-beta.10`.
     - `allowBuilds` minimal untuk `@heroui-pro/react`, `heroui-pro`, `esbuild`, dan `workerd`; review paket lain yang dilaporkan pnpm.
     - pnpm ≥11 menolak paket berumur <24 jam (`minimumReleaseAge`). **Jangan** set ke 0; pakai versi sebelumnya.
   - `.node-version` berisi `24.22.0`.
   - `tsconfig.base.json`: strict, ESNext, `moduleResolution: bundler`, `verbatimModuleSyntax`, `isolatedModules`, `allowImportingTsExtensions: true`, `noEmit: true`, tanpa `baseUrl`.
   - `vite.config.ts` root (impor `defineConfig` dari `vite-plus`):
     - lint: plugin ditulis eksplisit (`typescript`, `unicorn`, `oxc`, `react`, `nextjs`, `jsx-a11y`, `import`, `vitest`), `typeAware` dan `typeCheck`, serta `ignorePatterns` untuk `.next`, `.open-next`, `.wrangler`, `*.d.ts` hasil generate, **`docs/**`, dan `implementasi/**`** (prototipe riset di `docs/riset/` memakai `node:test`, bukan kode produk);
     - fmt: **kecualikan** `docs/**`, `implementasi/**`, dan `*.md` supaya prosa Arab/Indonesia tidak diubah;
     - test: `include` dibatasi ke `apps/**`, `packages/**`, dan `tools/**` (tidak mengambil `docs/**`), serta `passWithNoTests: true` sampai S05;
     - staged: `{ "*.{ts,tsx,js,mjs,json,css}": "vp check --fix" }`.
   - `.vite-hooks/pre-commit` berisi `vp staged` (di-commit), sedangkan folder internal hook di-gitignore sesuai docs Vite+. Hook ini aktif lewat `pnpm install` (script `prepare`).
   - `.gitignore` ditambah: `.wrangler/`, `.open-next/`, `.dev.vars*`, `data/raw/`, `data/build/`, `evals/private/`, `.heroui-docs/`, `.claude/skills/heroui-*`, `*.tsbuildinfo`, dan `.next/`.
5. **apps/web:**
   - `@heroui-pro/react` dipin **persis** `1.0.0-beta.10` (lewat catalog). Jangan `latest` atau `^`, karena ada versi salah terbit `beta.19`.
   - Next **16.3.8** dan React/React DOM 19.2.x (ADR-003). Bila `/docs-terbaru` menunjukkan OpenNext sudah resmi mendukung 16.4, tetap pakai 16.3.8 di sesi ini, lalu tandai X01 "siap" di STATUS.
   - `typescript: catalog:`. Hapus `eslint`, `eslint-config-next`, `@eslint/eslintrc`, dan `eslint.config.mjs` (diganti Oxlint via Vite+).
   - `tsconfig.json` extend base: hapus `baseUrl`, isi `types` secara eksplisit, dan pertahankan plugin `next`.
   - `next.config.ts`: `cacheComponents: false` dan `images: { unoptimized: true }`. Pastikan gambar mock template tetap tampil, atau catat bila tidak.
6. **Install** dengan `pnpm install`. Setujui build script yang memang perlu. Pastikan artefak Pro terunduh: `heroui-pro status`, dan `pnpm --filter @surau/web build` tidak error "module not found".
7. **Instruksi agent untuk web.** Jalankan `pnpm dev` sekali. Next ≥16.3 akan menulis `apps/web/AGENTS.md` (blok terkelola; jangan diedit manual). Lalu buat `apps/web/CLAUDE.md` yang **pendek** (≤60 baris):
   - baris `@AGENTS.md`;
   - aturan: baca `apps/web/node_modules/next/dist/docs/` sebelum menulis API Next; tanpa `proxy.ts`/middleware/edge runtime/Server Actions/`'use cache'`; panggil MCP `heroui-pro` sebelum memakai komponen; aturan v3 (`onPress`, compound, `Separator`); ikon hanya `@gravity-ui/icons`; teks Arab hanya lewat `ArabicText` (dibuat di S04); string UI di `src/i18n/`;
   - perintah: dev, check, build.
8. **Hook format.** Tambahkan hook `PostToolUse` (matcher `Edit|Write|MultiEdit`) di `.claude/settings.json` yang memanggil `.claude/hooks/format.sh`.
   - Skrip membaca JSON dari stdin dan mengambil `tool_input.file_path` (pakai `node -e`, karena `jq` belum tentu terpasang).
   - Skrip menjalankan `vp fmt` pada file itu, hanya bila ekstensinya `.ts`, `.tsx`, `.js`, `.mjs`, `.json`, atau `.css` dan file tersebut berada di dalam repo.
   - Skrip harus cepat, diam bila sukses, dan **exit 0** bila formatter tidak ada.
   - Uji dengan mengedit satu file.
9. **Perbarui `CLAUDE.md` root**, bagian *Perintah*, dengan perintah yang benar-benar berlaku.
10. **MCP Next.js:** tambahkan server `next-devtools` ke `.mcp.json` (`npx -y next-devtools-mcp@<versi terbaru yang dicek>`). Server MCP baru baru aktif setelah aplikasi dibuka ulang dan disetujui pemilik. Karena itu, di sesi ini cukup uji endpoint-nya: saat `pnpm dev` berjalan, kirim JSON-RPC `tools/list` ke `http://localhost:3004/_next/mcp` dengan `curl`. Uji lewat MCP (`nextjs_index`, `nextjs_call`) dilakukan di awal S02.
11. **Verifikasi**, commit, dan catat (langkah 4–5 skill `/sesi`).
12. **Gabungkan ke `main` secara lokal** dengan izin pemilik (squash), karena repo belum punya remote. S02 akan mem-push `main` ini ke GitHub.

## Selesai bila

- [x] `node -v` = v24.x dan `pnpm -v` = 12.11.x di shell agent
- [ ] `pnpm exec tsc -v` = 7.0.x di root dan `apps/web`; `pnpm exec vp --version` menunjukkan vite-plus **lokal** 1.2.0 · *tsc 7.0.2 lolos di keduanya; vp lokal masih **1.1.0** karena 1.2.0 belum berumur 24 jam (ADR-023). Belum dicentang.*
- [x] `pnpm install --frozen-lockfile` sukses dari keadaan bersih, dan `pnpm-lock.yaml` di-commit
- [x] `pnpm verify` lolos (`vp check` + test + build Next dengan tsc CLI); `vp test` tidak mengumpulkan file di `docs/`
- [x] `pnpm dev` menampilkan template chat di `http://localhost:3004` tanpa error di console (dicek lewat browser preview)
- [x] Tidak ada ESLint/Prettier/Turborepo tersisa; `@heroui-pro/react` dipin persis; semua versi lewat `catalog:`
- [x] Next 16.3.8 tercatat di STACK.md; `next.config` memakai `cacheComponents: false` dan `images.unoptimized: true`
- [x] `apps/web/AGENTS.md` (hasil Next) dan `apps/web/CLAUDE.md` ada dan di-commit
- [x] Hook format bekerja: edit file `.tsx`, lalu file terformat otomatis
- [x] Commit uji memicu `vp staged`, dan `git diff CLAUDE.md` kosong setelah `pnpm install` (`vp config --no-agent` tidak mengubah instruksi agent)
- [x] `curl` ke `/_next/mcp` (`tools/list`) berhasil saat `pnpm dev` berjalan; `.mcp.json` memuat `next-devtools`
- [x] `git ls-files` tidak memuat `.env*`, `*.db`, `*.sqlite`, `.dev.vars`, atau skill HeroUI
- [x] Branch sesi sudah digabung ke `main` lokal (dengan izin); STATUS, LOG, dan file sesi ini diperbarui · *squash `71ba163`, izin pemilik di chat 2026-10-15*

## Di luar cakupan

- Deploy, CI, dan GitHub (S02–S03). Perubahan UI atau branding (S04). Paket `packages/*` dan DB (Fase 1).
- Bila Vite+ ternyata menghalangi (misalnya `vp check` tidak bisa memeriksa `apps/web` dengan benar), **jangan memaksakan.** Pakai cadangan ADR-008 (Biome + Vitest + `tsc`), lalu tulis ADR baru. Bila TS7 bermasalah dengan Next 16.3.8, pakai TS 6 dan tulis ADR.

## Catatan hasil

*(diisi agent)*

**2026-10-15 · percobaan 1 · terblokir di langkah 1 (cek lingkungan)**
- T-00 selesai (hook dan skill proyek aktif). T-01 selesai: `heroui-pro status` → login sebagai @alfariesh; MCP `heroui-pro` menjawab `list_components` (138 komponen).
- T-02 belum berlaku di aplikasi Claude: `node -v` di shell agent = v22.23.2 karena `~/.local/bin/node` (symlink ke Node milik Hermes) ada di depan `~/.vite-plus/bin` pada PATH yang diwarisi aplikasi. Shell login baru (`zsh -lic`) sudah menaruh `~/.vite-plus/bin` paling depan dan `node -v` = v24.22.0, jadi cukup buka ulang aplikasi Claude (Cmd+Q). Tidak diakali dengan mengubah PATH per perintah.
- `pnpm -v` = 12.11.2; `vp` global = 1.1.0 (vite-plus lokal 1.2.0 dipasang di langkah 4).

**2026-10-15 · percobaan 2 · selesai, 1 butir tertunda**

*Yang dibuat*
- Monorepo pnpm: `apps/web` (`@surau/web`, template chat HeroUI Pro), `pnpm-workspace.yaml` (catalog strict, `allowBuilds`, `minimumReleaseAge: 1440` eksplisit), `package.json` root (scripts `dev/check/fix/test/test:e2e/build/verify/prepare`), `tsconfig.base.json`, `.node-version`, `vite.config.ts` (lint 8 plugin + typeAware/typeCheck, fmt mengecualikan `docs/`, `implementasi/`, `*.md`, test hanya `apps|packages|tools`, staged), `.vite-hooks/pre-commit`.
- ESLint dan config-nya dihapus. `next.config.ts`: `cacheComponents: false`, `images.unoptimized`, `turbopack.root`. `tsconfig` web tanpa `baseUrl`, `types` eksplisit.
- Agent: `apps/web/AGENTS.md` (ditulis `next dev`), `apps/web/CLAUDE.md` (31 baris), hook `PostToolUse` → `.claude/hooks/format.sh`, `.mcp.json` + `next-devtools-mcp@0.4.0`, bagian *Perintah* di `CLAUDE.md` root, tabel perintah di KONVENSI.
- Dependensi baru di root: `vite-plus`, `typescript`, `@types/node`, `wrangler` (semua sesuai rencana ADR-008/STACK). Tidak ada dependensi app baru; daftar template dipindah apa adanya ke catalog (kecuali ESLint).

*Bukti*
- `node -v` → v24.22.0 · `pnpm -v` → 12.11.2 · `pnpm exec tsc -v` → 7.0.2 (root dan apps/web) · `pnpm exec vp --version` → lokal v1.1.0.
- `rm -rf node_modules apps/web/node_modules && pnpm install --frozen-lockfile` → sukses (postinstall HeroUI Pro "Installed ✓"; `heroui-pro status` → @heroui-pro/react@1.0.0-beta.10).
- `pnpm verify` → exit 0: format 34 file lolos, lint/type 26 file 0 error, `vp test` "No test files found" (exit 0), `next build` 16.3.8 + "Running TypeScript" lolos, 11 halaman.
- Spike: file uji `export const x: number = "salah"` di `apps/web/src` → `vp check` menangkap TS2322 (type-check app berjalan dengan tsconfig app). `docs/zz-probe.test.ts` → tidak dikumpulkan `vp test`. Tanpa `next-env.d.ts` dan `.next/` (simulasi clone bersih) → `pnpm check` tetap lolos. `vp fmt docs/riset/.../normalize.ts` → ditolak oleh ignore rules (prosa riset aman).
- Browser preview `localhost:3004` → redirect ke `/pro-ai-showcase`, console hanya info React DevTools + HMR, 3/3 gambar mock termuat (`images.unoptimized`), tampilan ponsel 375 px rapi.
- `curl -H 'Accept: application/json, text/event-stream' localhost:3004/_next/mcp` `tools/list` → SSE berisi tool `get_project_metadata`, `get_errors`, `get_page_metadata`, `get_logs`, dll.
- Hook format: Write `zz-hook-probe.tsx` berantakan → langsung terformat. Skrip juga exit 0 untuk path di luar repo dan input rusak.
- Commit `7de1025` dan `d3006e6` → `vp staged` berjalan ("✔ vp check --fix"). `git diff CLAUDE.md` kosong setelah `pnpm install` (`prepare: vp config --no-agent`).
- Lockfile tanpa eslint/prettier/turbo; semua spec di `package.json` = `catalog:`; `@heroui-pro/react: 1.0.0-beta.10` persis. `git ls-files` tanpa `.env*`, `*.db`, `*.sqlite`, `.dev.vars*`, skill HeroUI.

*Penyimpangan dan utang (ADR-023)*
- vite-plus **1.1.0** dan React **19.2.8** (versi lebih baru belum 24 jam). **Tindak lanjut kecil:** ubah catalog ke `vite-plus: 1.2.0` (boleh dipasang mulai 15 Okt 09:21 UTC ≈ 16:21 WIB) dan `react`/`react-dom: 19.2.9` (mulai 15 Okt 16:54 UTC ≈ 23:54 WIB), lalu `pnpm install` + `pnpm verify` dan centang butir di atas. Bisa dikerjakan di awal S02.
- Next 16.3.8 terkena 3 advisory kritis/tinggi (Next) + 1 kritis (React RSC). Semuanya dimitigasi dengan larangan ADR-003 dan larangan typed array dari Server Component. X01 sebaiknya sebelum `/rilis 0`.
- Build `@zowe/secrets-for-zowe-sdk` ditolak; cek lagi saat CI S02 memakai `HEROUI_AUTH_TOKEN`.
- `peerDependencies` vite/vitest dilaporkan "unmet" oleh `pnpm peers check`, karena vite-plus memakai alias `@voidzero-dev/vite-plus-core`. Ini kosmetik dan tidak mengganggu install, check, test, atau build.
- Root belum punya `tsconfig.json`, jadi `vite.config.ts` dan `.claude/hooks/*.mjs` hanya diformat dan di-lint, belum di-type-check. Cukup untuk sekarang; tambahkan bila `tools/*` muncul.
- `readonly-bash.mjs` diformat ulang Oxfmt (isi logika identik, sudah dicek peninjau).

*Untuk S02*
- Uji MCP `next-devtools` (`nextjs_index`, `nextjs_call get_errors`) setelah pemilik menyetujui server baru itu (T-00 langkah 2).
- CI: `pnpm install --frozen-lockfile` butuh `HEROUI_AUTH_TOKEN`; cache store pnpm dan `node_modules` (kuota unduhan Pro).
