// read_page: satu halaman cetak beserta catatan kakinya, tautan penanda → catatan kaki, dan ayat
// yang dikutip di halaman itu (teks Tanzil + terjemahan Kemenag, S12).
import { getAdjacentPages, getPageByCitation, getPassagesByPage } from "@surau/db";
import type { D1Db } from "@surau/db";

import { loadCiteContext } from "./citation.ts";
import { NotFound, parseInput } from "./errors.ts";
import { toPassages } from "./passages.ts";
import { quranForRefs } from "./quran.ts";
import { readPageInput } from "./schema.ts";
import type { PageView } from "./schema.ts";

/**
 * Halaman cetak (edisi, juz, halaman). `body` dan `footnotes` urut tampil; setiap penanda di
 * `body[].footnote_refs` menunjuk `footnotes[].id` di halaman yang sama.
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
  const [rows, adjacent] = await Promise.all([
    getPassagesByPage(db, page.id),
    getAdjacentPages(db, page),
  ]);
  const passages = await toPassages(
    db,
    cite,
    rows.map((r) => ({ ...r, juz: page.juz, page_no: page.page_no })),
  );
  const near = (p: { juz: number; page_no: number } | null) =>
    p === null ? null : cite.location(p.juz, p.page_no);
  // Bolak-balik tambahan hanya bila halaman mengutip ayat.
  const quran = await quranForRefs(
    db,
    passages.flatMap((p) => p.ayah_refs),
  );
  return {
    citation: cite.citation(page.juz, page.page_no),
    body: passages.filter((p) => p.kind === "body"),
    footnotes: passages.filter((p) => p.kind === "foot"),
    prev: near(adjacent.prev),
    next: near(adjacent.next),
    source_url: cite.sourceUrl(page.source_page_id),
    quran,
  };
}
