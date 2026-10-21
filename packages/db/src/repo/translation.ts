// Terjemahan dan ringkasan AI (S13, dibaca sejak S14). Tabelnya ada sejak skema 1 (kosong sebelum
// ihya-v4), jadi kueri ini aman di korpus lama: hasilnya kosong, bukan "no such table".
import { D1_MAX_PARAMS, chunk, placeholders } from "../d1.ts";
import type { D1Db } from "../d1.ts";
import { z } from "zod";

import { passageIdRange, tocNodeIdRange } from "../ids.ts";
import {
  TITLE_SCHEMA_VERSION,
  subheadingTranslationRow,
  summaryRow,
  tocTitleTranslationRow,
  translationRow,
} from "../schema/corpus.ts";
import type {
  SubheadingTranslationRow,
  TocTitleTranslationRow,
  TranslationRow,
} from "../schema/corpus.ts";
import { getCorpusMeta } from "./corpus.ts";
import { allRows } from "./rows.ts";

const SUMMARY_COLS =
  "s.toc_node_id, s.lang, s.text, s.model, s.prompt_version, s.created_at, s.review_status";

/** Terjemahan sekumpulan paragraf dalam satu bahasa, urut passage_id (≤100 ID per kueri, satu batch). */
export async function getTranslations(
  db: D1Db,
  passageIds: readonly number[],
  lang: string,
): Promise<TranslationRow[]> {
  const unique = [...new Set(passageIds)].sort((a, b) => a - b);
  if (unique.length === 0) return [];
  const stmts = chunk(unique, D1_MAX_PARAMS - 1).map((ids) =>
    db
      .prepare(
        `SELECT passage_id, lang, text, model, prompt_version, created_at, review_status
         FROM translation WHERE lang = ? AND passage_id IN (${placeholders(ids.length)})
         ORDER BY passage_id`,
      )
      .bind(lang, ...ids),
  );
  const results = await db.batch(stmts);
  return results.flatMap((r) => r.results.map((row) => translationRow.parse(row)));
}

/** Ringkasan + judul node daftar isinya. */
export const sectionSummaryRow = summaryRow.extend({
  title_ar: z.string(),
  level: z.number().int().positive(),
});
export type SectionSummaryRow = z.infer<typeof sectionSummaryRow>;

/**
 * Ringkasan bagian-bagian yang MULAI di satu halaman (`toc_node.start_page_id`), urut level lalu
 * `ord` (induk dulu, seperti urutan baca daftar isi). Indeks `toc_node_start` (skema 6) membuatnya
 * pencarian indeks; di korpus lama kueri ini memindai daftar isi (±300 baris untuk Ihya).
 */
export function getSummariesStartingOn(
  db: D1Db,
  pageId: number,
  lang: string,
): Promise<SectionSummaryRow[]> {
  return allRows(
    db
      .prepare(
        `SELECT ${SUMMARY_COLS}, t.title_ar, t.level
         FROM toc_node t JOIN summary s ON s.toc_node_id = t.id AND s.lang = ?2
         WHERE t.start_page_id = ?1 ORDER BY t.level, t.ord, t.id`,
      )
      .bind(pageId, lang),
    sectionSummaryRow,
  );
}

const TITLE_COLS = "lang, text, model, prompt_version, created_at, review_status";

export interface TitleTranslations {
  toc: TocTitleTranslationRow[];
  sub: SubheadingTranslationRow[];
}

/**
 * Judul daftar isi Indonesia satu edisi (X04 bagian B): judul node + subjudul kurasi, urut ID, dalam
 * satu batch (filter rentang ID edisi). `null` bila korpus belum punya tabelnya (skema < 7): kueri
 * gagal "no such table", lalu skema dicek dengan satu kueri `meta` (pola `loadAyahRefs`). Galat lain
 * diteruskan.
 */
export async function listTitleTranslations(
  db: D1Db,
  editionId: number,
  lang: string,
): Promise<TitleTranslations | null> {
  const node = tocNodeIdRange(editionId);
  const passage = passageIdRange(editionId);
  try {
    const [toc, sub] = await db.batch([
      db
        .prepare(
          `SELECT toc_node_id, ${TITLE_COLS} FROM toc_title_translation
           WHERE lang = ?1 AND toc_node_id BETWEEN ?2 AND ?3 ORDER BY toc_node_id`,
        )
        .bind(lang, node.min, node.max),
      db
        .prepare(
          `SELECT passage_id, ${TITLE_COLS}, source_sha256 FROM subheading_translation
           WHERE lang = ?1 AND passage_id BETWEEN ?2 AND ?3 ORDER BY passage_id`,
        )
        .bind(lang, passage.min, passage.max),
    ]);
    return {
      toc: (toc?.results ?? []).map((r) => tocTitleTranslationRow.parse(r)),
      sub: (sub?.results ?? []).map((r) => subheadingTranslationRow.parse(r)),
    };
  } catch (error) {
    const meta = await getCorpusMeta(db).catch(() => null);
    if (meta !== null && meta.schema_version < TITLE_SCHEMA_VERSION) return null;
    throw error;
  }
}
