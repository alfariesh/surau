// Bahan dokumen Jawab (S19): paragraf kandidat beserta lokasi, terjemahan AI berlabel, takhrij
// yang tertaut, dan daftar isi ringkas untuk panggilan routing. Teks tetap `text_raw` persis dari
// DB; pipeline (packages/llm) hanya menyusun dokumen dan memetakan sitasi balik ke ID + offset.
import {
  AI_TEXT_LANG,
  getFootnoteRefsTo,
  getPassagesByIds,
  getTranslations,
  listTocNodes,
} from "@surau/db";
import type { D1Db, PassageWithPageRow } from "@surau/db";

import { loadCiteContext } from "./citation.ts";
import type { CiteContext } from "./citation.ts";
import { translationView } from "./page.ts";
import { toPassages } from "./passages.ts";
import type { Location, Passage, TranslationView } from "./schema.ts";

export interface AnswerPassage {
  id: number;
  edition_id: number;
  page_id: number;
  kind: Passage["kind"];
  toc_node_id: number | null;
  text_raw: string;
  location: Location;
  /** Terjemahan AI bahasa Indonesia (berlabel `ai_translation`), atau null. */
  translation: TranslationView | null;
  /** Catatan kaki (takhrij) yang dirujuk penanda paragraf badan ini, urut penanda. */
  footnote_ids: number[];
  /** Untuk catatan kaki: paragraf badan yang penandanya menunjuk ke sini. */
  referenced_by: number[];
  /** Rujukan ayat yang dikenali deterministik, mis. "QS 2:153" (S12). */
  ayah_labels: string[];
}

export interface AnswerTocNode {
  id: number;
  parent_id: number | null;
  level: number;
  title_ar: string;
  juz: number;
  page_no: number;
}

/**
 * Paragraf untuk dokumen Jawab, dalam urutan `ids` (unik, ID yang tidak ada dilewati). Satu
 * bolak-balik per jenis data (paragraf, penanda/ayat/tanda, terjemahan, rujukan balik takhrij).
 */
export async function answerPassages(db: D1Db, ids: readonly number[]): Promise<AnswerPassage[]> {
  const rows = await getPassagesByIds(db, ids);
  if (rows.length === 0) return [];
  const editions = [...new Set(rows.map((r) => r.edition_id))];
  const footIds = rows.filter((r) => r.kind === "foot").map((r) => r.id);
  const [cites, translations, backRefs] = await Promise.all([
    Promise.all(editions.map((e) => loadCiteContext(db, e))),
    getTranslations(
      db,
      rows.map((r) => r.id),
      AI_TEXT_LANG,
    ),
    getFootnoteRefsTo(db, footIds),
  ]);
  const citeBy = new Map<number, CiteContext>(editions.map((e, i) => [e, cites[i]!]));
  const byEdition = new Map<number, PassageWithPageRow[]>();
  for (const r of rows) byEdition.set(r.edition_id, [...(byEdition.get(r.edition_id) ?? []), r]);
  const passages = (
    await Promise.all(
      [...byEdition].map(([edition, list]) => toPassages(db, citeBy.get(edition)!, list)),
    )
  ).flat();
  const passageBy = new Map(passages.map((p) => [p.id, p]));
  const rowBy = new Map(rows.map((r) => [r.id, r]));
  const translationBy = new Map(translations.map((t) => [t.passage_id, translationView(t)]));
  const refsTo = new Map<number, number[]>();
  for (const ref of backRefs)
    refsTo.set(ref.footnote_passage_id, [
      ...(refsTo.get(ref.footnote_passage_id) ?? []),
      ref.passage_id,
    ]);
  const out: AnswerPassage[] = [];
  for (const id of new Set(ids)) {
    const p = passageBy.get(id);
    const row = rowBy.get(id);
    if (p === undefined || row === undefined) continue;
    out.push({
      id: p.id,
      edition_id: row.edition_id,
      page_id: row.page_id,
      kind: p.kind,
      toc_node_id: p.toc_node_id,
      text_raw: p.text_raw,
      location: p.location,
      translation: translationBy.get(p.id) ?? null,
      footnote_ids: p.footnote_refs.map((r) => r.footnote_id),
      referenced_by: [...new Set(refsTo.get(p.id) ?? [])],
      ayah_labels: [
        ...new Set(
          p.ayah_refs.map((a) =>
            a.ayah_from === a.ayah_to
              ? `QS ${a.surah}:${a.ayah_from}`
              : `QS ${a.surah}:${a.ayah_from}-${a.ayah_to}`,
          ),
        ),
      ],
    });
  }
  return out;
}

/** Seluruh daftar isi satu edisi, ringkas (ID, induk, tingkat, judul Arab, halaman awal). */
export async function answerToc(db: D1Db, editionId: number): Promise<AnswerTocNode[]> {
  const rows = await listTocNodes(db, editionId);
  return rows.map((r) => ({
    id: r.id,
    parent_id: r.parent_id,
    level: r.level,
    title_ar: r.title_ar,
    juz: r.start_juz,
    page_no: r.start_page_no,
  }));
}
