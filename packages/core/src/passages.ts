// Merakit `Passage` dari baris DB: text_raw apa adanya, penanda catatan kaki, dan tanda
// "perlu ditinjau". Satu-satunya "transformasi" di core adalah pemisahan struktur (badan vs
// catatan kaki, kelompok per halaman); teks tidak pernah diubah, dipangkas, atau dinormalisasi.
import { getFootnoteRefs, getNeedsReview, passageAnchor } from "@surau/db";
import type { D1Db, NeedsReviewReason, PassageWithPageRow } from "@surau/db";

import type { CiteContext } from "./citation.ts";
import type { FootnoteRef, Passage } from "./schema.ts";

export async function toPassages(
  db: D1Db,
  cite: CiteContext,
  rows: readonly PassageWithPageRow[],
): Promise<Passage[]> {
  if (rows.length === 0) return [];
  const bodyIds = rows.filter((r) => r.kind === "body").map((r) => r.id);
  const [refs, flags] = await Promise.all([
    getFootnoteRefs(db, bodyIds),
    getNeedsReview(
      db,
      rows.map((r) => r.id),
    ),
  ]);
  const refsBy = new Map<number, FootnoteRef[]>();
  for (const r of refs) {
    const list = refsBy.get(r.passage_id) ?? [];
    list.push({
      marker: r.marker,
      char_start: r.char_start,
      char_end: r.char_end,
      footnote_id: r.footnote_passage_id,
    });
    refsBy.set(r.passage_id, list);
  }
  const flagsBy = new Map<number, NeedsReviewReason[]>();
  for (const f of flags) {
    const list = flagsBy.get(f.passage_id) ?? [];
    list.push(f.reason);
    flagsBy.set(f.passage_id, list);
  }
  return rows.map((r) => ({
    id: r.id,
    anchor: passageAnchor(r.id),
    kind: r.kind,
    ord: r.ord,
    toc_node_id: r.toc_node_id,
    text_raw: r.text_raw,
    footnote_refs: refsBy.get(r.id) ?? [],
    needs_review: flagsBy.get(r.id) ?? [],
    location: cite.location(r.juz, r.page_no, r.id),
  }));
}
