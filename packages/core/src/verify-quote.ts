// verify_quote (S16): dasar "kode menyalin, model menunjuk" untuk klien MCP dan Jawab (S19).
// Kutipan dicari di `text_raw` satu paragraf dengan `findQuote` (@surau/text: normalisasi + peta
// offset); yang dikembalikan adalah substring MENTAH persis beserta harakat aslinya, bukan masukan.
import { editionOfPassageId, getPassageById } from "@surau/db";
import type { D1Db } from "@surau/db";
import { findQuote } from "@surau/text";

import { loadCiteContext } from "./citation.ts";
import { NotFound, parseInput } from "./errors.ts";
import { verifyQuoteInput } from "./schema.ts";
import type { QuoteVerification } from "./schema.ts";

/**
 * Cek apakah `quote` ada di paragraf `passageId` (batas kata, setelah normalisasi). `verified:
 * false` berarti kutipan tidak ada di sumber: jangan ditampilkan sebagai kutipan.
 * `NotFound` bila paragraf tidak ada; `InvalidCitation` bila ID atau kutipan salah bentuk.
 */
export async function verifyQuote(
  db: D1Db,
  passageId: number,
  quote: string,
): Promise<QuoteVerification> {
  const input = parseInput(verifyQuoteInput, { passage_id: passageId, quote });
  // Edisi terbaca dari ID paragraf (ADR-029), jadi sitasi dan paragraf diambil bersamaan.
  const [row, cite] = await Promise.all([
    getPassageById(db, input.passage_id),
    loadCiteContext(db, editionOfPassageId(input.passage_id)).catch((error: unknown) => {
      if (error instanceof NotFound) return null;
      throw error;
    }),
  ]);
  if (row === null || cite === null) throw new NotFound(`Passage not found: ${input.passage_id}`);
  const match = findQuote(row.text_raw, input.quote);
  return {
    citation: cite.citation(row.juz, row.page_no, row.id),
    passage_id: row.id,
    verified: match !== null,
    exact: match !== null && match.rawText === input.quote,
    match:
      match === null
        ? null
        : { char_start: match.rawStart, char_end: match.rawEnd, text: match.rawText },
  };
}
