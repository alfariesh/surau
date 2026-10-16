@AGENTS.md

# apps/web (`@surau/web`)

Next.js 16.4.1 (App Router) + HeroUI v3/Pro, di-deploy ke Cloudflare Workers lewat OpenNext. Aturan repo ada di `../../CLAUDE.md`; file ini hanya memuat yang khusus web.

## Sebelum menulis kode

- **API Next:** baca dulu `node_modules/next/dist/docs/` (relatif dari folder ini). Jangan menulis API Next dari ingatan.
- **Komponen HeroUI:** panggil MCP `heroui-pro` (`list_components`, lalu `get_component_docs`) sebelum memakai komponen yang belum ada di repo. Pro diimpor dari `@heroui-pro/react` (komponen berat lewat subpath, misalnya `@heroui-pro/react/markdown`), OSS dari `@heroui/react`.

## Dilarang (ADR-003)

- `proxy.ts` / `middleware.ts`, `export const runtime = "edge"`, Server Actions (`"use server"`), dan `"use cache"` / `cacheComponents`. Mutasi lewat route handler atau Worker API.
- Mengubah `images.unoptimized` atau `cacheComponents: false` di `next.config.ts`.
- Merender kutipan Arab lewat Markdown.
- Mengirim typed array (`Uint8Array` dan sejenisnya) dari Server Component ke klien. Advisory Next terkait (GHSA-673q) sudah ditambal di 16.4.1, tetapi tambalan React RSC (GHSA-xqc2) baru indikasi (ADR-030 poin 4), jadi larangan ini **tetap wajib**.

## Aturan UI

- HeroUI v3: `onPress` (bukan `onClick`), compound components (`Card.Header`, `Sheet.Content`), `Separator` (bukan `Divider`), tanpa token warna bernomor v2.
- Ikon **hanya** `@gravity-ui/icons`.
- Teks Arab **hanya** lewat komponen `ArabicText` / `ArabicInline` (dibuat di S04), dengan `lang="ar" dir="rtl"`. Aturan lengkap: `../../.claude/rules/teks-arab.md`.
- String UI (bahasa Indonesia) ditaruh di `src/i18n/`, bukan ditulis langsung di komponen.
- Desain dimulai dari layar ponsel; kontras dan fokus keyboard harus lolos aksesibilitas.

## Perintah (jalankan dari root repo)

- `pnpm dev`: dev server di http://localhost:3004 (MCP dev Next di `/_next/mcp`).
- `pnpm check`: format + lint + typecheck (`vp check`).
- `pnpm --filter @surau/web build`: build Next (type-check memakai `tsc` CLI, TypeScript 7).
- Jangan memakai `vp dev` / `vp build` di folder ini: itu build Vite, bukan Next.
