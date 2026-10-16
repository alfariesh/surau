// Menyusun baris tabel korpus dari hasil parse, daftar isi, dan QA. ID memakai fungsi @surau/db
// (ADR-029) dengan seq dari peta ID yang di-commit; setiap baris divalidasi skema Zod @surau/db,
// jadi kolom dan tipenya pasti sama dengan migrasi.
import {
  authorRow,
  editionRow,
  footnoteRefRow,
  metaRow,
  pageId,
  pageRow,
  passageId,
  passageNeedsReviewRow,
  passageRow,
  tocNodeId,
  tocNodeRow,
  workRow,
} from "@surau/db";
import type {
  AuthorRow,
  EditionRow,
  FootnoteRefRow,
  MetaRow,
  NeedsReviewReason,
  PageRow,
  PassageNeedsReviewRow,
  PassageRow,
  TermStatRow,
  TocNodeRow,
  WorkRow,
} from "@surau/db";

import type { IdAllocator } from "./ids.ts";
import { TAKHRIJ_THRESHOLD } from "./openiti/verify.ts";
import type { TakhrijCheck } from "./openiti/verify.ts";
import type { ParsedPage, PassageDraft } from "./shamela/page.ts";
import { parseImprint } from "./shamela/source.ts";
import type { ShamelaSource } from "./shamela/source.ts";
import type { TocBuild } from "./toc.ts";
import type { WorkConfig } from "./works/ihya.ts";

/** Urutan tabel = urutan sisip (induk sebelum anak, sesuai foreign key). */
export const TABLE_ORDER = [
  "author",
  "work",
  "edition",
  "page",
  "toc_node",
  "passage",
  "footnote_ref",
  "passage_needs_review",
  "term_stat",
  "meta",
] as const;
export type CorpusTable = (typeof TABLE_ORDER)[number];

export interface CorpusRows {
  author: AuthorRow[];
  work: WorkRow[];
  edition: EditionRow[];
  page: PageRow[];
  toc_node: TocNodeRow[];
  passage: PassageRow[];
  footnote_ref: FootnoteRefRow[];
  passage_needs_review: PassageNeedsReviewRow[];
  /** Stem sangat umum di indeks FTS (S11): dihitung pipeline setelah baris paragraf ada. */
  term_stat: TermStatRow[];
  meta: MetaRow[];
}

export interface RowsInput {
  config: WorkConfig;
  source: ShamelaSource;
  pages: readonly ParsedPage[];
  toc: TocBuild;
  takhrij: TakhrijCheck;
  ids: IdAllocator;
  meta: { normVersion: number; builtAt: string; sourceHash: string };
}

/** Baris korpus dari sumber; `term_stat` menyusul dari indeks FTS (`search-index.ts`, pipeline). */
export function buildRows(input: RowsInput): Omit<CorpusRows, "term_stat"> {
  const { config, source, pages, toc, takhrij, ids } = input;
  const ed = config.edition.id;
  const imprint = parseImprint(source.book.bibliography);

  const author = [
    authorRow.parse({
      id: config.author.id,
      name_ar: source.author.name,
      name_id: config.author.nameId,
      death_hijri: source.author.deathHijri,
      shamela_author_id: source.author.id,
      wikidata_id: config.author.wikidataId,
    }),
  ];
  const work = [
    workRow.parse({
      id: config.work.id,
      slug: config.work.slug,
      openiti_uri: config.work.openitiUri,
      title_ar: source.book.name,
      title_id: config.work.titleId,
      author_id: config.author.id,
      attribution_status: config.work.attributionStatus,
      original_language: "ar",
      period: config.work.period,
    }),
  ];
  const edition = [
    editionRow.parse({
      id: ed,
      work_id: config.work.id,
      slug: config.edition.slug,
      is_default: 1,
      source: "shamela",
      source_ref: String(source.book.id),
      publisher: imprint.publisher,
      city: imprint.city,
      volumes: new Set(source.pages.map((p) => p.juz)).size,
      license: config.edition.license,
      attribution: config.edition.attribution,
    }),
  ];

  // Seq dialokasikan dalam urutan sumber (ADR-029): halaman per page.id, judul per title.id lalu
  // node patch, paragraf per halaman (badan lalu catatan kaki).
  const pageIds = pages.map((p) => pageId(ed, ids.seq("page", String(p.source.id))));
  const page = pages.map((p, i) =>
    pageRow.parse({
      id: pageIds[i],
      edition_id: ed,
      seq: (pageIds[i] as number) - ed * 100_000,
      juz: p.source.juz,
      page_no: p.source.pageNo,
      source_page_id: p.source.id,
    }),
  );

  const allocationOrder = [...toc.nodes].sort(
    (a, b) =>
      (a.sourceTitleId ?? Number.MAX_SAFE_INTEGER) - (b.sourceTitleId ?? Number.MAX_SAFE_INTEGER),
  );
  const tocIds = new Map(allocationOrder.map((n) => [n.key, tocNodeId(ed, ids.seq("toc", n.key))]));
  const tocId = (key: string): number => {
    const id = tocIds.get(key);
    if (id === undefined) throw new Error(`node daftar isi tak dikenal: ${key}`);
    return id;
  };
  const toc_node = toc.nodes.map((n) =>
    tocNodeRow.parse({
      id: tocId(n.key),
      edition_id: ed,
      parent_id: n.parentKey === null ? null : tocId(n.parentKey),
      ord: n.ord,
      level: n.level,
      title_ar: n.titleAr,
      start_page_id: pageIds[n.pageIndex],
      source_title_id: n.sourceTitleId,
      patched: n.patched ? 1 : 0,
    }),
  );

  const passage: PassageRow[] = [];
  const footnote_ref: FootnoteRefRow[] = [];
  const passage_needs_review: PassageNeedsReviewRow[] = [];
  pages.forEach((p, pi) => {
    const add = (
      d: PassageDraft,
      ord: number,
      node: string,
      extra: NeedsReviewReason[],
    ): number => {
      const id = passageId(ed, ids.seq("passage", `${p.source.id}:${d.key}`));
      passage.push(
        passageRow.parse({
          id,
          edition_id: ed,
          page_id: pageIds[pi],
          // "" = paragraf sebelum judul pertama: dilaporkan validasi (invarian gagal), bukan crash.
          toc_node_id: node === "" ? null : tocId(node),
          kind: d.kind,
          ord,
          text_raw: d.text,
        }),
      );
      for (const reason of [...new Set([...d.reasons, ...extra])].sort()) {
        passage_needs_review.push(passageNeedsReviewRow.parse({ passage_id: id, reason }));
      }
      return id;
    };
    const bodyIds = p.body.map((d, i) => add(d, i + 1, toc.body[pi]?.[i] ?? "", []));
    const footIds = p.foot.map((d, i) => {
      const score = takhrij.scores[pi]?.[i] ?? 0;
      const extra: NeedsReviewReason[] = score < TAKHRIJ_THRESHOLD ? ["takhrij_unmatched"] : [];
      return add(d, i + 1, toc.foot[pi]?.[i] ?? "", extra);
    });
    for (const l of p.links) {
      footnote_ref.push(
        footnoteRefRow.parse({
          passage_id: bodyIds[l.body],
          char_start: l.marker.start,
          char_end: l.marker.end,
          marker: l.label,
          footnote_passage_id: footIds[l.foot],
        }),
      );
    }
  });
  passage.sort((a, b) => a.id - b.id);
  footnote_ref.sort((a, b) => a.passage_id - b.passage_id || a.char_start - b.char_start);
  // Stabil: alasan per paragraf sudah terurut saat disisipkan.
  passage_needs_review.sort((a, b) => a.passage_id - b.passage_id);

  const meta = [
    ["norm_version", String(input.meta.normVersion)],
    ["corpus_version", config.corpusVersion],
    ["built_at", input.meta.builtAt],
    ["source_hash", input.meta.sourceHash],
  ].map(([key, value]) => metaRow.parse({ key, value }));

  return {
    author,
    work,
    edition,
    page,
    toc_node,
    passage,
    footnote_ref,
    passage_needs_review,
    meta,
  };
}
