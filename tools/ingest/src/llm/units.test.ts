// Fixture: baris korpus buatan (kata Arab karangan, bukan teks kitab).
import type { FootnoteRefRow, PageRow, PassageAyahRefRow, PassageRow, TocNodeRow } from "@surau/db";
import { describe, expect, test } from "vite-plus/test";

import {
  bodyInReadingOrder,
  headingPaths,
  splitPages,
  summaryPlan,
  translationUnits,
} from "./units.ts";
import type { UnitRows } from "./units.ts";

const ED = 1;
const page = (seq: number, juz: number, no: number): PageRow => ({
  id: ED * 100_000 + seq,
  edition_id: ED,
  seq,
  juz,
  page_no: no,
  source_page_id: null,
});
const node = (seq: number, parent: number | null, ord: number, title: string): TocNodeRow => ({
  id: ED * 100_000 + seq,
  edition_id: ED,
  parent_id: parent === null ? null : ED * 100_000 + parent,
  ord,
  level: parent === null ? 1 : 2,
  title_ar: title,
  start_page_id: ED * 100_000 + 1,
  source_title_id: null,
  patched: 0,
});
const passage = (seq: number, pg: number, toc: number, ord: number, text: string): PassageRow => ({
  id: ED * 10_000_000 + seq,
  edition_id: ED,
  page_id: ED * 100_000 + pg,
  toc_node_id: ED * 100_000 + toc,
  kind: "body",
  ord,
  text_raw: text,
});

// Pohon: A (akar, punya paragraf pengantar) → B (daun kecil), C (daun tiga halaman panjang).
const LONG = "كلمة ".repeat(200).trim();
const rows: UnitRows = {
  page: [page(1, 1, 1), page(2, 1, 2), page(3, 1, 3), page(4, 1, 4)],
  toc_node: [node(1, null, 1, "كتاب"), node(2, 1, 1, "باب أول"), node(3, 1, 2, "باب ثان")],
  passage: [
    passage(2, 1, 2, 2, "نص الباب الأول"),
    passage(1, 1, 1, 1, "مقدمة الكتاب قال تعالى قول مصنوع (١)"),
    passage(3, 2, 3, 1, LONG),
    passage(4, 3, 3, 1, LONG),
    passage(5, 4, 3, 1, LONG),
  ],
  footnote_ref: [
    {
      passage_id: ED * 10_000_000 + 1,
      char_start: 33,
      char_end: 36,
      marker: "١",
      footnote_passage_id: 99,
    } satisfies FootnoteRefRow,
  ],
  passage_ayah_ref: [
    {
      passage_id: ED * 10_000_000 + 1,
      char_start: 23,
      char_end: 32,
      surah: 2,
      ayah_from: 3,
      ayah_to: 3,
      match: "exact",
      partial: 1,
      bracketed: 0,
      alt_count: 0,
    } satisfies PassageAyahRefRow,
  ],
};

describe("unit terjemahan", () => {
  test("urutan baca menurut halaman lalu ord, bukan id", () => {
    expect(bodyInReadingOrder(rows).map((p) => p.id % 100)).toEqual([1, 2, 3, 4, 5]);
  });

  test("jalur judul dari akar", () => {
    expect(headingPaths(rows.toc_node).get(ED * 100_000 + 3)).toBe("كتاب › باب ثان");
  });

  test("ayat diganti placeholder, penanda dicatat, konteks hanya dari bagian yang sama", () => {
    const { units, blocked } = translationUnits(rows);
    expect(blocked).toEqual([]);
    const [first, second, third] = units;
    expect(rows.passage[1]?.text_raw.slice(23, 32)).toBe("قول مصنوع");
    expect(first?.masked.text).toContain("⟦QS 2:3⟧");
    expect(first?.masked.text).not.toContain("قول مصنوع");
    expect(first?.markers).toEqual(["١"]);
    expect(first?.previous).toBeNull();
    // Paragraf 2 di bagian lain (B) → tanpa konteks; paragraf 4 di C sesudah paragraf 3 di C.
    expect(second?.previous).toBeNull();
    expect(third?.previous).toBeNull();
    expect(units[3]?.previous).toBe(LONG);
    // Paragraf 3–5 berteks sama → hash sama (hash = isi bertanda, bukan ID).
    expect(units).toHaveLength(5);
    expect(new Set(units.map((u) => u.sourceSha256)).size).toBe(3);
  });

  test("rujukan ayat yang tidak bisa ditandai → paragraf diblokir, tidak dikirim", () => {
    const bad: UnitRows = {
      ...rows,
      passage_ayah_ref: [
        ...rows.passage_ayah_ref,
        // Tumpang tindih dengan rujukan pertama → dilewati maskAyat.
        { ...(rows.passage_ayah_ref[0] as PassageAyahRefRow), char_start: 25, char_end: 30 },
      ],
    };
    const { units, blocked } = translationUnits(bad);
    expect(blocked.map((b) => b.passageId)).toEqual([ED * 10_000_000 + 1]);
    expect(units.map((u) => u.passageId)).not.toContain(ED * 10_000_000 + 1);
  });
});

describe("rencana ringkasan", () => {
  test("splitPages memotong di batas halaman; halaman tunggal yang besar tetap utuh", () => {
    const b = (chars: number) => ({ text: `x${chars}`, chars });
    expect(splitPages([b(10), b(10), b(10)], 25, 1)).toEqual([["x10", "x10"], ["x10"]]);
    expect(splitPages([b(100), b(10)], 25, 1)).toEqual([["x100"], ["x10"]]);
    expect(splitPages([], 25, 1)).toEqual([]);
  });

  test("daun kecil = final putaran 1; daun terpecah dan simpul induk = putaran 2", () => {
    // Satu halaman C ±1.000 karakter × 1 token/karakter: batas 2.500 → [h2, h3] + [h4].
    const plan = summaryPlan(rows, { maxTokens: 2_500, tokensPerChar: 1 });
    const brief = plan.chunks.map((c) => [c.tocNodeId % 100, c.part, c.parts, c.final]);
    expect(brief).toEqual([
      [1, 1, 1, false],
      [2, 1, 1, true],
      [3, 1, 2, false],
      [3, 2, 2, false],
    ]);
    expect(plan.chunks[0]?.text).toBe("[1/1] مقدمة الكتاب قال تعالى ⟦QS 2:3⟧ (١)");
    const nodes = new Map(plan.nodes.map((n) => [n.tocNodeId % 100, n]));
    expect(nodes.get(1)?.round2).toBe(true);
    expect(nodes.get(1)?.subtree.map((c) => `${c.tocNodeId % 100}.${c.part}`)).toEqual([
      "1.1",
      "2.1",
      "3.1",
      "3.2",
    ]);
    expect(nodes.get(2)?.round2).toBe(false);
    expect(nodes.get(3)?.round2).toBe(true);
    // Hash simpul berubah bila satu potongan subpohonnya berubah.
    const other = summaryPlan(
      {
        ...rows,
        passage: rows.passage.map((p) => (p.id % 100 === 2 ? { ...p, text_raw: "نص آخر" } : p)),
      },
      { maxTokens: 2_500, tokensPerChar: 1 },
    );
    expect(other.nodes.find((n) => n.tocNodeId % 100 === 1)?.sourceSha256).not.toBe(
      nodes.get(1)?.sourceSha256,
    );
    expect(other.nodes.find((n) => n.tocNodeId % 100 === 3)?.sourceSha256).toBe(
      nodes.get(3)?.sourceSha256,
    );
  });
});
