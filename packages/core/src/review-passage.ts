// Bahan halaman koreksi terjemahan (X08, ADR-081): paragraf persis dari DB (text_raw + penanda +
// rujukan ayat + lokasi), baris terjemahan korpus apa adanya (termasuk status tinjauannya), dan
// terjemahan Kemenag ayat yang dikutip (untuk pratinjau persis seperti pembaca). Editor tidak pernah
// menulis teks Arab; yang tampil di panel Arab selalu `passage.text_raw`.
import { AI_TEXT_LANG, getPassagesByIds, getTranslations } from "@surau/db";
import type { D1Db, PassageWithPageRow, TranslationRow } from "@surau/db";

import { loadCiteContext } from "./citation.ts";
import { toPassages } from "./passages.ts";
import { quranForRefs } from "./quran.ts";
import type { Passage, QuranView } from "./schema.ts";

export interface ReviewPassage {
  passage: Passage;
  /** Terjemahan korpus (bahasa Indonesia) apa adanya, atau null. */
  translation: TranslationRow | null;
  /** Ayat yang dikutip paragraf ini (Tanzil + Kemenag verbatim), atau null. */
  quran: QuranView | null;
}

/** Paragraf untuk koreksi terjemahan, per ID (ID yang tidak ada dilewati). */
export async function reviewPassages(
  db: D1Db,
  ids: readonly number[],
): Promise<Map<number, ReviewPassage>> {
  const rows = await getPassagesByIds(db, ids);
  if (rows.length === 0) return new Map();
  const byEdition = new Map<number, PassageWithPageRow[]>();
  for (const r of rows) byEdition.set(r.edition_id, [...(byEdition.get(r.edition_id) ?? []), r]);
  const [passages, translations] = await Promise.all([
    Promise.all(
      [...byEdition].map(async ([edition, list]) =>
        toPassages(db, await loadCiteContext(db, edition), list),
      ),
    ).then((parts) => parts.flat()),
    getTranslations(
      db,
      rows.map((r) => r.id),
      AI_TEXT_LANG,
    ),
  ]);
  const translationBy = new Map(translations.map((t) => [t.passage_id, t]));
  const out = new Map<number, ReviewPassage>();
  await Promise.all(
    passages.map(async (p) => {
      out.set(p.id, {
        passage: p,
        translation: translationBy.get(p.id) ?? null,
        quran: await quranForRefs(db, p.ayah_refs),
      });
    }),
  );
  return out;
}
