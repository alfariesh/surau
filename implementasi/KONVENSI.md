# Konvensi

Aturan kerja yang berlaku untuk semua sesi. Perubahan konvensi dicatat sebagai ADR.

## Bahasa

| Apa | Bahasa |
|---|---|
| Identifier kode, nama file, tabel/kolom DB, nama tool MCP, route API | Inggris (ADR-012) |
| String UI | Indonesia, terkumpul di satu modul `apps/web/src/i18n/id.ts`. Jangan menulis string UI langsung di komponen. |
| Dokumen (`docs/`, `implementasi/`), komentar yang menjelaskan *kenapa*, pesan commit, deskripsi PR | Indonesia |
| Deskripsi tool MCP dan dokumentasi API publik | Inggris + Indonesia |
| Istilah domain | Transliterasi konsisten: `kitab`, `juz`, `takhrij`, `hadith`, `toc` (daftar isi). Catat di glosarium ARSITEKTUR-TEKNIS bila menambah istilah baru. |

## Struktur dan arah dependensi

```
apps/*    → boleh mengimpor packages/*
tools/*   → boleh mengimpor packages/* (khusus Node: node:sqlite, fs)
packages/text  → TANPA dependensi runtime (TS murni). Normalisasi Arab, offset map, pembersih HTML Shamela.
packages/db    → migrasi SQL (wrangler d1 migrations) + skema Zod baris + repository bertipe (prepare/bind). Tanpa ORM, next/*, atau cloudflare:*; menerima tipe struktural `D1Db` (src/d1.ts, ADR-029) sebagai parameter, yang dipenuhi binding D1 Worker.
packages/core  → core tools (toc, section, search, verify_quote, takhrij). Bergantung pada text + db. Tanpa next/*.
packages/llm   → (Fase 2+) pembungkus Anthropic, prompt berversi, verifikasi sitasi.
```

- Kode yang hanya jalan di Node (`node:sqlite`, `fs`) **hanya** boleh ada di `tools/*`.
- Kode yang memakai `cloudflare:*` atau `next/*` **hanya** boleh ada di `apps/*`. Pengecualian: file tes (`*.test.ts`, folder `test/`) di `packages/*` boleh mengimpor `cloudflare:test` dan `cloudflare:workers` untuk tes D1.
- Satu konsep, satu tempat. Normalisasi Arab **hanya** di `packages/text`.

## TypeScript

- `strict`, ESM saja, `verbatimModuleSyntax`, dan `import type` untuk tipe.
- Tidak boleh ada `any` (pakai `unknown` lalu persempit), `enum` (pakai union string atau objek `as const`), maupun `namespace`. Pengecualian: `declare namespace` di file `.d.ts` untuk augmentasi tipe ambien (misalnya `Cloudflare.Env` di tes), karena tidak menghasilkan kode. Ini menjaga kode bisa dijalankan dengan type stripping Node.
- Di `tools/*` **dan** `packages/*`, impor relatif ditulis lengkap dengan ekstensi `.ts` (`./normalize.ts`), karena paket juga dijalankan Node lewat type stripping dari `tools/*`. `tsconfig.base.json` memakai `allowImportingTsExtensions: true` + `noEmit: true`. Jangan memakai `--preserve-symlinks`.
- Validasi input di batas sistem (route, tool MCP, CLI) memakai Zod 4. Skemanya dibagikan dari `packages/core`.
- Error jangan ditelan. Lempar error bertipe di `packages/*`, lalu petakan ke status HTTP atau pesan UI di `apps/*`.

## Penamaan

- File: `kebab-case.ts`, sedangkan komponen React memakai `PascalCase` di dalam file `kebab-case.tsx`.
- Tabel dan kolom DB: `snake_case`, nama tabel tunggal (`passage`, `toc_node`, `footnote`).
- ID dan permalink publik **tidak boleh berubah** setelah dirilis. Bila memang harus berubah, buat tabel pengalihan (redirect).

## Tes

- Tes ditaruh berdampingan dengan kodenya: `foo.ts` dan `foo.test.ts`. Impor API tes dari `vite-plus/test`. Untuk Worker, tambahkan `cloudflare:test` (`@cloudflare/vitest-plugin`).
- Fixture **tidak boleh** memuat teks Shamela. Gunakan potongan kecil OpenITI (CC BY-NC-SA, atribusi ditulis di file fixture) atau teks buatan.
- Golden vectors normalisasi ada di `packages/text/test/golden.json`, dan perubahan normalisasi wajib memperbaruinya secara sadar.
- Setiap bug yang diperbaiki mendapat satu tes regresi.
- e2e (Playwright) hanya untuk smoke test alur utama, di chromium saja.

## Gerbang perintah

| Perintah | Kapan |
|---|---|
| `pnpm check` | Sesering mungkin: format, lint, dan typecheck (`vp check`) |
| `pnpm fix` | Memperbaiki otomatis temuan format dan lint (`vp check --fix`) |
| `pnpm test` | Setelah mengubah logika |
| `pnpm build` | Build semua app (`vp run -r build`; untuk web = `next build` dengan type-check `tsc`) |
| `pnpm verify` | **Wajib lolos** sebelum commit terakhir sesi dan sebelum PR: `check` + `test` + `build` |
| `pnpm test:e2e` | Sebelum rilis dan saat UI alur utama berubah |
| `pnpm run eval:retrieval` | Fase 2+: eval pencarian (tanpa LLM, gratis) |
| `pnpm run eval:jawab` | Fase 4+: eval jawaban (**berbayar**, minta izin pemilik dulu) |

Nama perintah yang pasti diatur di S01. Bila berubah, perbarui tabel ini. Script yang menyentuh produksi diberi nama eksplisit (`deploy:web`, `deploy:mcp`, `db:migrate:remote`, `corpus:promote`) dan selalu dipanggil dengan `pnpm run …`. **Jangan** membuat script bernama `deploy`, karena `pnpm deploy` adalah perintah bawaan pnpm dan menang atas script.

## Git

- Satu sesi = satu branch `sesi/sNN-slug` = satu PR. Merge ke `main` memakai **squash**, setelah CI hijau; agent melakukannya sendiri tanpa bertanya. Sesi berikutnya baru dimulai dari `main` yang sudah memuat sesi sebelumnya.
- Commit kecil dengan format `<tipe>(<area>): <ringkasan bahasa Indonesia>`. Tipe yang dipakai: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `data`. Contoh: `feat(reader): tampilkan catatan kaki takhrij`.
- Akhiri pesan commit dengan baris atribusi dari system prompt Claude Code (Co-Authored-By).
- **Tidak pernah** `push --force` ke `main`, dan tidak pernah meng-commit `.env*`, `.dev.vars*`, `*.db`, `*.sqlite`, data Shamela, atau skill HeroUI Pro (berlisensi).
- Push, membuat PR, merge, dan deploy dilakukan agent tanpa bertanya (aturan keras 4 di `CLAUDE.md`). Izin pemilik hanya untuk biaya LLM berbayar dan penghapusan/penimpaan data produksi.

## Rahasia dan konfigurasi

| Tempat | Isi | Siapa yang mengisi |
|---|---|---|
| `.env` (root, git-ignored) | `ANTHROPIC_API_KEY` dan kunci lain untuk skrip lokal | Pemilik |
| `.dev.vars` (per app, git-ignored) | Variabel untuk `wrangler dev` (kunci uji Turnstile, dll.) | Agent (nilai uji saja) |
| Worker secrets | Kunci produksi | Pemilik: `pnpm wrangler secret put NAMA` |
| GitHub secrets | Token CI | Pemilik: `gh secret set NAMA` |
| `wrangler.jsonc` `vars` | Konfigurasi non-rahasia | Agent |

Agent tidak pernah membaca `.env` dan tidak pernah mencetak nilai rahasia ke log atau chat.

## Dependensi

- Versi dipin di `catalog` pada `pnpm-workspace.yaml` (`catalogMode: strict`).
- Menambah dependensi harus disertai alasan di Catatan hasil sesi. Utamakan API platform (Web/Workers/Node). Lisensinya harus kompatibel dengan Apache-2.0 (bukan AGPL atau GPL).
- Paket baru dengan build script harus ditambahkan secara eksplisit ke `allowBuilds`.
- Upgrade mayor selalu lewat ADR dan sesi tersendiri.

## UI (apps/web)

- Panggil MCP `heroui-pro` (`list_components`, lalu `get_component_docs`) sebelum memakai komponen yang belum pernah dipakai di repo.
- Gunakan aturan HeroUI v3: `onPress` (bukan `onClick`), compound components (`Card.Header`), `Separator` (bukan `Divider`), tanpa token warna bernomor v2, dan komponen berat diimpor dari subpath (`@heroui-pro/react/markdown`, dll.).
- Teks Arab hanya dirender lewat komponen `ArabicText`/`ArabicInline`; aturannya ada di `.claude/rules/teks-arab.md`.
- Desain dimulai dari layar ponsel. Kontras dan fokus keyboard harus lolos aksesibilitas.

## Prompt LLM (Fase 2+)

- Prompt disimpan sebagai file berversi di `packages/llm/prompts/` dengan ID versi. Setiap keluaran yang disimpan mencatat `model`, `prompt_version`, dan tanggal pembuatannya.
- Mengubah prompt Jawab berarti menjalankan ulang eval, sebagai syarat sebelum merge.
- Prompt sistem dan kebijakan penolakan termasuk hal yang direview ustadz ([docs/05](../docs/05-kebijakan.md)).
