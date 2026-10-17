// read_page: satu halaman cetak beserta catatan kakinya, tautan penanda → catatan kaki, ayat yang
// dikutip di halaman itu (teks Tanzil + terjemahan Kemenag, S12), terjemahan AI tiap paragraf, dan
// ringkasan AI bagian yang mulai di halaman ini (S14).
import {
  AI_TEXT_LANG,
  getAdjacentPages,
  getPageByCitation,
  getPassagesByPage,
  getSummariesStartingOn,
  getTranslations,
} from "@surau/db";
import type { D1Db, SectionSummaryRow, TranslationRow } from "@surau/db";

import { loadCiteContext } from "./citation.ts";
import type { CiteContext } from "./citation.ts";
import { NotFound, parseInput } from "./errors.ts";
import { toPassages } from "./passages.ts";
import { sectionPermalink } from "./permalink.ts";
import { quranForRefs } from "./quran.ts";
import { readPageInput } from "./schema.ts";
import type { PageView, SummaryView, TranslationView } from "./schema.ts";

export function translationView(row: TranslationRow): TranslationView {
  return {
    label: "ai_translation",
    lang: row.lang,
    model: row.model,
    prompt_version: row.prompt_version,
    created_at: row.created_at,
    review_status: row.review_status,
    text: row.text,
  };
}

function summaryView(row: SectionSummaryRow, cite: CiteContext): SummaryView {
  return {
    label: "ai_summary",
    section: {
      id: row.toc_node_id,
      title_ar: row.title_ar,
      level: row.level,
      permalink: sectionPermalink(cite.path, row.toc_node_id),
    },
    lang: row.lang,
    model: row.model,
    prompt_version: row.prompt_version,
    created_at: row.created_at,
    review_status: row.review_status,
    text: row.text,
  };
}

/**
 * Halaman cetak (edisi, juz, halaman). `body` dan `footnotes` urut tampil; setiap penanda di
 * `body[].footnote_refs` menunjuk `footnotes[].id` di halaman yang sama. Setiap paragraf membawa
 * `translation` (terjemahan AI bahasa Indonesia, atau null).
 * `NotFound` bila edisi/halaman tidak ada; `InvalidCitation` bila angka salah bentuk.
 */
export async function readPage(
  db: D1Db,
  editionId: number,
  juz: number,
  pageNo: number,
): Promise<PageView> {
  const input = parseInput(readPageInput, { edition_id: editionId, juz, page_no: pageNo });
  const [cite, page] = await Promise.all([
    loadCiteContext(db, input.edition_id),
    getPageByCitation(db, input.edition_id, input.juz, input.page_no),
  ]);
  if (page === null) throw new NotFound(`Page not found: juz ${input.juz}, page ${input.page_no}`);
  const [rows, adjacent, summaries] = await Promise.all([
    getPassagesByPage(db, page.id),
    getAdjacentPages(db, page),
    getSummariesStartingOn(db, page.id, AI_TEXT_LANG),
  ]);
  const [passages, translations] = await Promise.all([
    toPassages(
      db,
      cite,
      rows.map((r) => ({ ...r, juz: page.juz, page_no: page.page_no })),
    ),
    getTranslations(
      db,
      rows.map((r) => r.id),
      AI_TEXT_LANG,
    ),
  ]);
  const translationOf = new Map(translations.map((t) => [t.passage_id, translationView(t)]));
  const withTranslation = passages.map((p) => ({
    ...p,
    translation: translationOf.get(p.id) ?? null,
  }));
  const near = (p: { juz: number; page_no: number } | null) =>
    p === null ? null : cite.location(p.juz, p.page_no);
  // Bolak-balik tambahan hanya bila halaman mengutip ayat.
  const quran = await quranForRefs(
    db,
    passages.flatMap((p) => p.ayah_refs),
  );
  return {
    citation: cite.citation(page.juz, page.page_no),
    body: withTranslation.filter((p) => p.kind === "body"),
    footnotes: withTranslation.filter((p) => p.kind === "foot"),
    prev: near(adjacent.prev),
    next: near(adjacent.next),
    source_url: cite.sourceUrl(page.source_page_id),
    quran,
    summaries: summaries.map((s) => summaryView(s, cite)),
  };
}
