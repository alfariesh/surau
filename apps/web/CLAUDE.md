@AGENTS.md

# apps/web (`@surau/web`)

Next.js 16.4.1 (App Router) + HeroUI v3/Pro, di-deploy ke Cloudflare Workers lewat OpenNext. Aturan repo ada di `../../CLAUDE.md`; file ini hanya memuat yang khusus web.

## Sebelum menulis kode

- **API Next:** baca dulu `node_modules/next/dist/docs/` (relatif dari folder ini). Jangan menulis API Next dari ingatan.
- **Komponen HeroUI:** panggil MCP `heroui-pro` (`list_components`, lalu `get_component_docs`) sebelum memakai komponen yang belum ada di repo. Pro diimpor dari `@heroui-pro/react` (komponen berat lewat subpath, misalnya `@heroui-pro/react/markdown`), OSS dari `@heroui/react`.
- **CSS HeroUI diimpor per komponen (ADR-035).** Komponen HeroUI yang belum dipakai di repo juga butuh berkas CSS-nya di `src/app/globals.css`, selalu `layer(components)`: OSS `@heroui/styles/components/<nama>.css`, Pro `@heroui-pro/react/css/components/<nama>.css`. Termasuk komponen yang dirender di dalamnya: Dropdown → menu, menu-item, menu-section; Sidebar Pro → sheet, button, tooltip, separator, scroll-shadow; AppLayout → resizable, sheet. Tanpa itu komponen tampil tanpa gaya. `pnpm test` (`src/app/heroui-css.test.ts`) menyebut berkas yang kurang beserta jalurnya, dan memeriksa urutannya. Naik versi HeroUI: ulangi banding di `scripts/heroui-css/` (ADR-035, Tinjau ulang).

## Dilarang (ADR-003)

- `proxy.ts` / `middleware.ts`, `export const runtime = "edge"`, Server Actions (`"use server"`), dan `"use cache"` / `cacheComponents`. Mutasi lewat route handler atau Worker API.
- Mengubah `images.unoptimized` atau `cacheComponents: false` di `next.config.ts`.
- Merender kutipan Arab lewat Markdown.
- Mengirim typed array (`Uint8Array` dan sejenisnya) dari Server Component ke klien. Advisory Next terkait (GHSA-673q) sudah ditambal di 16.4.1, tetapi tambalan React RSC (GHSA-xqc2) baru indikasi (ADR-030 poin 4), jadi larangan ini **tetap wajib**.

## Aturan UI

- HeroUI v3: `onPress` (bukan `onClick`), compound components (`Card.Header`, `Sheet.Content`), `Separator` (bukan `Divider`), tanpa token warna bernomor v2.
- **Tipografi hanya lewat `Typography` HeroUI (ADR-055):** `<Typography type="body-sm" color="muted">`, `<Typography.Heading level={2} className="text-xl">`, `PageTitle`/`PageLead` (`src/components/page-title.tsx`) untuk judul dan pembuka halaman. Jangan menulis `<p>`/`<h1>`–`<h6>` mentah atau ukuran sembarang (`text-[…]`, `leading-[…]`); pakai token Tailwind bila perlu mengubah ukuran. Isi `li`/`dd`/`dt` dibungkus `Typography`. Pengecualian: teks Arab dan CSS pembaca/sampul buku.
- Ikon **hanya** dari `src/icons` (Hugeicons Pro stroke-standard, set lokal pemilik; ikon di `src/icons/svg`, komponen `src/icons/index.tsx` dihasilkan). Impor `import { Search01 } from "…/icons"`; ukuran lewat `className="size-4"`, warna ikut `currentColor`. Ikon baru: `node scripts/ikon.mjs tambah <nama-ikon>` dari root (varian duotone, dipakai untuk menu sidebar aktif: tambahkan `--duotone`, komponen berakhiran `Duotone`) (nama = nama berkas SVG di `~/Documents/huge-icons/svg/stroke-standard`, atau env `SURAU_IKON_DIR`). Jangan memasang pustaka ikon lain, jangan menulis SVG sendiri, jangan menyunting `index.tsx` dengan tangan.
- **Lisensi ikon:** Hugeicons Pro berlisensi dan melarang redistribusi file SVG. Pemilik sudah menerima risiko menyalin SVG ke repo (repo publik sementara, hanya pemilik yang memakai). Salin **hanya ikon yang dipakai**; jangan pernah menyalin satu folder kategori atau seluruh set ke repo.
- Teks Arab **hanya** lewat komponen `ArabicText` / `ArabicInline` (dibuat di S04), dengan `lang="ar" dir="rtl"`. Ukuran Arab hanya lewat prop `size` ("md" bawaan, "lg", "display"); jangan memberi kelas `text-*` ukuran pada keduanya (menimpa skala 1,25×/1,15× dan membuat Arab lebih kecil dari Latin di sekitarnya). Aturan lengkap: `../../.claude/rules/teks-arab.md`.
- String UI (bahasa Indonesia) ditaruh di `src/i18n/`, bukan ditulis langsung di komponen.
- Desain dimulai dari layar ponsel; kontras dan fokus keyboard harus lolos aksesibilitas.

## Perintah (jalankan dari root repo)

- `pnpm dev`: dev server di http://localhost:3004 (MCP dev Next di `/_next/mcp`).
- `pnpm check`: format + lint + typecheck (`vp check`).
- `pnpm --filter @surau/web build`: build Next (type-check memakai `tsc` CLI, TypeScript 7).
- Jangan memakai `vp dev` / `vp build` di folder ini: itu build Vite, bukan Next.
