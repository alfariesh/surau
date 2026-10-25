// Korpus Intisari buatan untuk tes (X15b): kalimat Arab karangan ("نص تجريبي"), bukan teks kitab.
// Satu rub' → satu kitab (judul + teks pembuka) → dua bab; bab pertama memuat ayat + penanda takhrij
// "لا أصل له", bab kedua dua halaman (bisa dipecah per halaman).
import type { PageRow, PassageAyahRefRow, PassageRow, TocNodeRow } from "@surau/db";

import type { DigestCorpus } from "../src/llm/digest-units.ts";

export const SENTENCE = "هذا نص تجريبي قصير في باب العلم والعمل. ";
export const long = (n: number) => SENTENCE.repeat(n).trim();

const page = (seq: number): PageRow => ({
  id: 100_000 + seq,
  edition_id: 1,
  seq,
  juz: 1,
  page_no: seq,
  source_page_id: null,
});
const node = (
  seq: number,
  parent: number | null,
  level: number,
  ord: number,
  title: string,
): TocNodeRow => ({
  id: 100_000 + seq,
  edition_id: 1,
  parent_id: parent === null ? null : 100_000 + parent,
  ord,
  level,
  title_ar: title,
  start_page_id: 100_001,
  source_title_id: null,
  patched: 0,
});
export const passage = (
  seq: number,
  nodeSeq: number | null,
  pageSeq: number,
  ord: number,
  text: string,
  kind: "body" | "foot" = "body",
): PassageRow => ({
  id: 10_000_000 + seq,
  edition_id: 1,
  page_id: 100_000 + pageSeq,
  toc_node_id: nodeSeq === null ? null : 100_000 + nodeSeq,
  kind,
  ord,
  text_raw: text,
});

export function digestCorpus(overrides: Partial<Record<number, string>> = {}): DigestCorpus {
  const intro = overrides[2] ?? long(4);
  const bab1 = overrides[3] ?? long(6);
  const bab2a = overrides[4] ?? long(10);
  const bab2b = long(10);
  const ayah = "{قل هل يستوي}";
  const withAyah = `${long(7)} ${ayah} ${long(3)} (١)`;
  const ayahStart = withAyah.indexOf(ayah);
  const marker = withAyah.lastIndexOf("(١)");
  return {
    page: [page(1), page(2), page(3)],
    toc_node: [
      node(2, null, 1, 1, "ربع تجريبي"),
      node(3, 2, 2, 1, "كتاب تجريبي"),
      node(4, 3, 3, 1, "باب أول"),
      node(5, 3, 3, 2, "باب ثان"),
    ],
    passage: [
      passage(1, 3, 1, 1, "كتاب تجريبي"),
      passage(2, 3, 1, 2, intro),
      passage(3, 4, 1, 3, bab1),
      passage(6, 4, 1, 4, withAyah),
      passage(4, 5, 2, 1, bab2a),
      passage(5, 5, 3, 1, bab2b),
      passage(9, null, 1, 1, overrides[9] ?? "حديث تجريبي لا أصل له", "foot"),
    ],
    footnote_ref: [
      {
        passage_id: 10_000_006,
        char_start: marker,
        char_end: marker + 3,
        marker: "١",
        footnote_passage_id: 10_000_009,
      },
    ],
    passage_ayah_ref: [
      {
        passage_id: 10_000_006,
        char_start: ayahStart,
        char_end: ayahStart + ayah.length,
        surah: 39,
        ayah_from: 9,
        ayah_to: 9,
        match: "exact",
        partial: 1,
        bracketed: 1,
        alt_count: 0,
      } satisfies PassageAyahRefRow,
    ],
    toc_title_translation: [],
  };
}
