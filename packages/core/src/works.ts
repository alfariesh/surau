// list_works: metadata karya dan edisinya. Lisensi dan atribusi ada di setiap edisi; sitasi
// berhalaman (Citation) baru ada di keluaran yang memuat teks atau letak (halaman, bagian, toc).
import { getWorkBySlug, listEditions, listWorkAuthors, listWorks as listWorkRows } from "@surau/db";
import type { AuthorRow, D1Db, EditionRow, WorkRow } from "@surau/db";

import { NotFound, parseInput } from "./errors.ts";
import { editionPermalink } from "./permalink.ts";
import { getWorkInput } from "./schema.ts";
import type { EditionView, WorkList, WorkView } from "./schema.ts";

function toWorkView(work: WorkRow, editions: readonly EditionRow[], author: AuthorRow | null) {
  const view: WorkView = {
    slug: work.slug,
    title_ar: work.title_ar,
    title_id: work.title_id,
    author:
      author === null
        ? null
        : { name_ar: author.name_ar, name_id: author.name_id, death_hijri: author.death_hijri },
    attribution_status: work.attribution_status,
    original_language: work.original_language,
    period: work.period,
    openiti_uri: work.openiti_uri,
    editions: editions
      .filter((e) => e.work_id === work.id)
      .map((e): EditionView => ({
        id: e.id,
        slug: e.slug,
        is_default: e.is_default === 1,
        source: e.source,
        source_ref: e.source_ref,
        publisher: e.publisher,
        city: e.city,
        volumes: e.volumes,
        license: e.license,
        attribution: e.attribution,
        permalink: editionPermalink({
          workSlug: work.slug,
          editionSlug: e.slug,
          isDefault: e.is_default === 1,
        }),
      })),
  };
  return view;
}

/** Semua karya (urut ID) beserta edisinya (default dulu). */
export async function listWorks(db: D1Db): Promise<WorkList> {
  const [works, editions, authors] = await Promise.all([
    listWorkRows(db),
    listEditions(db),
    listWorkAuthors(db),
  ]);
  const authorBy = new Map(authors.map((a) => [a.id, a]));
  return {
    works: works.map((w) =>
      toWorkView(w, editions, w.author_id === null ? null : (authorBy.get(w.author_id) ?? null)),
    ),
  };
}

/** Satu karya berdasarkan slug URL (`ihya`). `NotFound` bila tidak ada. */
export async function getWork(db: D1Db, slug: string): Promise<WorkView> {
  const input = parseInput(getWorkInput, { slug });
  const [work, editions, authors] = await Promise.all([
    getWorkBySlug(db, input.slug),
    listEditions(db),
    listWorkAuthors(db),
  ]);
  if (work === null) throw new NotFound(`Work not found: ${input.slug}`);
  const author = authors.find((a) => a.id === work.author_id) ?? null;
  return toWorkView(work, editions, author);
}
