// get_hadith_takhrij (S16): teks takhrij asli yang ditautkan ke penanda (١) sebuah paragraf.
// Aturan teks-arab no. 6: status hadits hanya dari teks takhrij; tanpa takhrij tertaut, status
// "tidak diketahui" (`none`), tidak pernah ditebak. Core tidak menyimpulkan derajat hadits.
import { getPassageById, getPassagesByPage } from "@surau/db";
import type { D1Db } from "@surau/db";

import { loadCiteContext } from "./citation.ts";
import { NotFound, parseInput } from "./errors.ts";
import { toPassages } from "./passages.ts";
import { getHadithTakhrijInput } from "./schema.ts";
import type { TakhrijLink, TakhrijView } from "./schema.ts";

/**
 * Paragraf + catatan kaki yang dirujuk penandanya (urut penanda), dengan tanda `needs_review`
 * ingest. Catatan kaki halaman yang tidak dirujuk penanda mana pun dilaporkan sebagai ID saja.
 * `NotFound` bila paragraf tidak ada; `InvalidCitation` bila ID salah bentuk.
 */
export async function getHadithTakhrij(db: D1Db, passageId: number): Promise<TakhrijView> {
  const { passage_id } = parseInput(getHadithTakhrijInput, { passage_id: passageId });
  const row = await getPassageById(db, passage_id);
  if (row === null) throw new NotFound(`Passage not found: ${passage_id}`);
  const [cite, pageRows] = await Promise.all([
    loadCiteContext(db, row.edition_id),
    getPassagesByPage(db, row.page_id),
  ]);
  // Seluruh halaman dirakit sekali: penanda menunjuk catatan kaki di halaman yang sama, dan
  // catatan kaki yang tidak tertaut hanya bisa diketahui dari semua penanda halaman itu.
  const passages = await toPassages(
    db,
    cite,
    pageRows.map((r) => ({ ...r, juz: row.juz, page_no: row.page_no })),
  );
  const byId = new Map(passages.map((p) => [p.id, p]));
  const self = byId.get(row.id);
  if (self === undefined) throw new Error(`passage ${row.id} missing from its page`);
  const linked = new Set(passages.flatMap((p) => p.footnote_refs.map((r) => r.footnote_id)));
  const unlinked = passages
    .filter((p) => p.kind === "foot" && p.id !== self.id && !linked.has(p.id))
    .map((p) => p.id);
  const takhrij: TakhrijLink[] = self.footnote_refs.map((ref) => {
    const footnote = byId.get(ref.footnote_id);
    // Invarian ingest (footnote_ref): penanda selalu menunjuk catatan kaki di halaman yang sama.
    if (footnote === undefined) throw new Error(`footnote ${ref.footnote_id} not on its page`);
    return {
      marker: ref.marker,
      char_start: ref.char_start,
      char_end: ref.char_end,
      footnote,
      review_status: "unreviewed",
    };
  });
  return {
    citation: cite.citation(row.juz, row.page_no, row.id),
    passage: self,
    status: self.kind === "foot" ? "is_footnote" : takhrij.length > 0 ? "linked" : "none",
    takhrij,
    unlinked_footnote_ids: unlinked,
  };
}
