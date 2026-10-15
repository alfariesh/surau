# @surau/db

Skema data Surau **tanpa ORM** ([ADR-009](../../implementasi/KEPUTUSAN.md)): migrasi SQL D1, skema Zod per baris, formula ID ([ADR-029](../../implementasi/KEPUTUSAN.md)), dan repository bertipe. Satu-satunya dependensi runtime adalah `zod`.

## Isi

| Path | Isi |
|---|---|
| `migrations/corpus/` | Migrasi DB korpus (hanya-baca, blue-green): `work`, `author`, `edition`, `page`, `toc_node`, `passage`, `footnote_ref`, `translation`, `summary`, `meta`, dan `passage_fts` (FTS5 contentless) |
| `migrations/app/` | Migrasi DB app: `settings`, `feedback` (kuota dan ledger menyusul di S20) |
| `src/schema/` | Skema Zod baris (`corpusTables`, `appTables`). Kolomnya dijaga sama dengan migrasi oleh `test/schema.test.ts` |
| `src/ids.ts` | `pageId`, `tocNodeId`, `passageId`, `passageIdRange`, `passageAnchor` (jangkar `#p<seq>`) |
| `src/repo/` | `getEdition`, `getPageByCitation`, `getAdjacentPages`, `getTocChildren`, `getPassagesByPage`, `getFootnoteRefs`, `getCorpusMeta`, `getSettings`, `createFeedback`, dll. |
| `wrangler.jsonc` | Binding `CORPUS` dan `APP` beserta `migrations_dir` dan ID DB remote (bukan rahasia) |

Repository menerima tipe struktural `D1Db` (bukan tipe global `D1Database`), jadi paket ini bisa di-typecheck dari Worker, Next, maupun Node. `env.DB` milik Worker memenuhi tipe itu.

```ts
import { getEdition, getPageByCitation, getPassagesByPage } from "@surau/db";

const edition = await getEdition(env.CORPUS, "ihya"); // edisi default
const page = edition && (await getPageByCitation(env.CORPUS, edition.id, 1, 200));
const passages = page ? await getPassagesByPage(env.CORPUS, page.id) : []; // text_raw apa adanya
```

## Perintah (dari root repo)

- `pnpm run db:migrate:local`: menerapkan migrasi korpus dan app ke D1 lokal di `.wrangler/state`, satu lokasi untuk semua app (ARSITEKTUR-TEKNIS §7).
- `pnpm run db:migrate:staging`: menerapkan migrasi ke `surau-corpus-staging` dan `surau-app-staging`.
- `pnpm run db:migrate:remote`: menerapkan migrasi ke `surau-app` **produksi** saja. Minta izin pemilik dulu.
- `pnpm exec vp test --project db`: tes di workerd dengan D1 lokal sementara (`@cloudflare/vitest-plugin`).
- Migrasi baru: `pnpm wrangler d1 migrations create CORPUS <nama> -c packages/db/wrangler.jsonc` (atau `APP`). File lama tidak pernah diedit. Migrasi korpus juga menaikkan `meta.schema_version` dan `CORPUS_SCHEMA_VERSION`.
