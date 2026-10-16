import { getSectionPassages } from "@surau/db";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import {
  BODY_1,
  ED,
  FOOT_ONLY,
  FOOT_ONLY_PAGE,
  LONG_PAGES,
  ORPHAN_FOOT,
  ORPHAN_PAGE,
  PASSAGES,
  T_CHILD_B,
  T_LONG,
  T_LONG_CHILD,
  T_ROOT,
  longBody,
  longPassageId,
  longPassageIds,
  seedCore,
} from "../test/fixture.ts";
import { encodeCursor } from "./cursor.ts";
import { InvalidCitation, NotFound } from "./errors.ts";
import { sectionView } from "./schema.ts";
import type { Passage, SectionView } from "./schema.ts";
import { pageBlocks, pickBlocks, readSection, readSectionWithLimit } from "./section.ts";
import { SECTION_MAX_TOKENS, SECTION_MIN_TOKENS, estimateTokens } from "./tokens.ts";

const db = env.CORPUS;

beforeAll(async () => {
  await seedCore(db);
});

async function readAll(nodeId: number, rowLimit?: number): Promise<SectionView[]> {
  const chunks: SectionView[] = [];
  let cursor: string | undefined;
  do {
    const view =
      rowLimit === undefined
        ? await readSection(db, nodeId, cursor)
        : await readSectionWithLimit(db, nodeId, cursor, rowLimit);
    chunks.push(view);
    cursor = view.next_cursor ?? undefined;
    if (chunks.length > 100) throw new Error("paginasi tidak berhenti");
  } while (cursor !== undefined);
  return chunks;
}

/** Kunci halaman cetak sebuah paragraf. */
const pageOf = (p: Passage) => `${p.location.juz}:${p.location.page_no}`;

/** Paragraf buatan untuk tes blok (tanpa DB). */
function fake(id: number, kind: "body" | "foot", ord: number, refs: number[] = []): Passage {
  return {
    id,
    anchor: `p${id}`,
    kind,
    ord,
    toc_node_id: 1,
    text_raw: "نص".repeat(10),
    footnote_refs: refs.map((f, i) => ({
      marker: "١",
      char_start: i,
      char_end: i + 1,
      footnote_id: f,
    })),
    needs_review: [],
    location: { juz: 1, page_no: 5, permalink: "/x", label: "x" },
  };
}

describe("pickBlocks", () => {
  const b = (tokens: number, endsPage = false) => ({ tokens, endsPage });
  test("rentang 4–6 ribu token", () => {
    expect([SECTION_MIN_TOKENS, SECTION_MAX_TOKENS]).toEqual([4_000, 6_000]);
  });

  test("batas halaman terakhir yang ≥ 4 ribu didahulukan", () => {
    expect(pickBlocks([b(2_000, true), b(2_500, true), b(1_000, true), b(900)])).toBe(3);
    expect(pickBlocks([b(4_200, true), b(1_000), b(500)])).toBe(1);
  });

  test("tanpa batas halaman di rentang: diisi sampai batas atas", () => {
    expect(pickBlocks([b(3_000, true), b(1_000), b(1_500), b(900)])).toBe(3);
    expect(pickBlocks([b(1_000), b(1_000), b(1_000)])).toBe(3); // habis (akhir bagian)
  });

  test("blok pertama selalu ikut walau melebihi batas; daftar kosong = 0", () => {
    expect(pickBlocks([b(7_000), b(10)])).toBe(1);
    expect(pickBlocks([])).toBe(0);
  });
});

describe("pageBlocks", () => {
  test("catatan kaki ikut paragraf badan pertama yang merujuknya; yatim ikut blok terakhir", () => {
    const page = [
      fake(1, "body", 1, [12]),
      fake(2, "body", 2, [11, 12]),
      fake(3, "body", 3),
      fake(11, "foot", 1),
      fake(12, "foot", 2),
      fake(13, "foot", 3), // tidak dirujuk
    ];
    const blocks = pageBlocks(page);
    expect(blocks.map((x) => [x.key, x.body?.id, x.foots.map((f) => f.id), x.endsPage])).toEqual([
      [1, 1, [12], false],
      [2, 2, [11], false],
      [3, 3, [13], true],
    ]);
    expect(blocks[0]?.tokens).toBe(estimateTokens(page[0]) + estimateTokens(page[4]));
  });

  test("halaman tanpa paragraf badan = satu blok catatan kaki (key 0); halaman kosong = []", () => {
    const blocks = pageBlocks([fake(11, "foot", 1), fake(12, "foot", 2)]);
    expect(blocks.map((x) => [x.key, x.body, x.foots.map((f) => f.id), x.endsPage])).toEqual([
      [0, null, [11, 12], true],
    ]);
    expect(pageBlocks([])).toEqual([]);
  });
});

describe("readSection", () => {
  test("bagian pendek: satu potongan, text_raw persis, sitasi + leluhur", async () => {
    const view = await readSection(db, T_CHILD_B);
    expect(sectionView.parse(view)).toEqual(view);
    expect(view.passages.map((p) => p.id)).toEqual([
      PASSAGES.body1,
      PASSAGES.foot1,
      PASSAGES.foot2,
    ]);
    expect(view.passages[0]?.text_raw).toBe(BODY_1);
    expect(view.passages[0]?.footnote_refs.map((r) => r.footnote_id)).toEqual([
      PASSAGES.foot1,
      PASSAGES.foot2,
    ]);
    expect(view.next_cursor).toBeNull();
    expect(view.node).toEqual({
      id: T_CHILD_B,
      title_ar: "فصل أول",
      level: 2,
      permalink: `/kitab/uji/bab/${T_CHILD_B}`,
      start: { juz: 1, page_no: 1, permalink: "/kitab/uji/1/1", label: "Kitab Uji, j. 1, h. 1" },
    });
    expect(view.ancestors.map((a) => a.id)).toEqual([T_ROOT]);
    expect(view.citation).toMatchObject({ juz: 1, page_no: 1, permalink: "/kitab/uji/1/1" });
    expect(view.citation.source.license).toBe("CC BY-NC-SA 4.0");
    expect(view.estimated_tokens).toBe(view.passages.reduce((n, p) => n + estimateTokens(p), 0));
  });

  test("node induk memuat sub-bagiannya dalam urutan baca, melintasi juz", async () => {
    const view = await readSection(db, T_ROOT);
    expect(view.passages.map((p) => p.id)).toEqual([
      PASSAGES.body1,
      PASSAGES.foot1,
      PASSAGES.foot2,
      PASSAGES.body2,
      PASSAGES.body3,
    ]);
    expect(view.passages.map((p) => p.location.label)).toEqual([
      "Kitab Uji, j. 1, h. 1",
      "Kitab Uji, j. 1, h. 1",
      "Kitab Uji, j. 1, h. 1",
      "Kitab Uji, j. 1, h. 2",
      "Kitab Uji, j. 2, h. 1",
    ]);
    expect(view.ancestors).toEqual([]);
  });

  test("bagian panjang: setiap paragraf tepat sekali, utuh, dengan catatan kakinya", async () => {
    const chunks = await readAll(T_LONG);
    const ids = chunks.flatMap((c) => c.passages.map((p) => p.id));
    expect(ids.toSorted((a, b) => a - b)).toEqual(longPassageIds().toSorted((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
    // Sama dengan himpunan repository (sumber kebenaran isi bagian).
    const rows = await getSectionPassages(db, T_LONG, null, 1_000);
    expect(new Set(ids)).toEqual(new Set(rows.map((r) => r.id)));

    for (const [i, c] of chunks.entries()) {
      expect(sectionView.parse(c)).toEqual(c);
      expect(c.citation.page_no).toBe(c.passages[0]?.location.page_no);
      expect(c.next_cursor === null).toBe(i === chunks.length - 1);
      expect(c.estimated_tokens).toBeLessThanOrEqual(SECTION_MAX_TOKENS);
      // Per halaman: badan urut ord, lalu catatan kaki urut ord.
      const pages = Map.groupBy(c.passages, pageOf);
      for (const ps of pages.values()) {
        const kinds = ps.map((p) => p.kind);
        expect(kinds).toEqual(kinds.toSorted((a, b) => (a === b ? 0 : a === "body" ? -1 : 1)));
        const ords = (k: string) => ps.filter((p) => p.kind === k).map((p) => p.ord);
        expect(ords("body")).toEqual(ords("body").toSorted((a, b) => a - b));
        expect(ords("foot")).toEqual(ords("foot").toSorted((a, b) => a - b));
      }
      // Setiap penanda menunjuk catatan kaki di potongan yang sama.
      const here = new Set(c.passages.map((p) => p.id));
      for (const p of c.passages)
        for (const r of p.footnote_refs) expect(here.has(r.footnote_id)).toBe(true);
    }
  });

  test("halaman kecil: potongan = halaman utuh; halaman besar: terbelah di antara paragraf", async () => {
    const chunks = await readAll(T_LONG);
    const shape = chunks.map((c) => [...Map.groupBy(c.passages, pageOf).keys()]);
    // h.1–6 (±1,6 ribu token/halaman): batas halaman ke-3 jatuh di 4–6 ribu.
    expect(shape.slice(0, 2)).toEqual([
      ["3:1", "3:2", "3:3"],
      ["3:4", "3:5", "3:6"],
    ]);
    // h.7–12 (±3,7 ribu token/halaman): tidak ada batas halaman di rentang, jadi ada halaman
    // yang muncul di dua potongan berurutan, dan setiap potongan ≥ batas bawah kecuali terakhir.
    const later = chunks.slice(2);
    const split = later.some((c, i) => {
      const nextFirst = later[i + 1]?.passages[0];
      const last = c.passages.at(-1);
      return nextFirst !== undefined && last !== undefined && pageOf(nextFirst) === pageOf(last);
    });
    expect(split).toBe(true);
    for (const c of chunks.slice(0, -1))
      expect(c.estimated_tokens).toBeGreaterThanOrEqual(SECTION_MIN_TOKENS);
    expect(new Set(shape.flat()).size).toBe(FOOT_ONLY_PAGE);
  });

  test("text_raw tidak pernah dipotong atau diubah", async () => {
    const chunks = await readAll(T_LONG);
    const bodies = chunks.flatMap((c) => c.passages).filter((p) => p.kind === "body");
    expect(bodies).toHaveLength(LONG_PAGES * 4);
    for (const p of bodies) {
      expect(p.id).toBe(longPassageId(p.location.page_no, p.ord));
      expect(p.text_raw).toBe(longBody(p.location.page_no, p.ord));
    }
  });

  test("node anak hanya memuat halamannya sendiri; leluhur", async () => {
    const chunks = await readAll(T_LONG_CHILD);
    const pages = new Set(chunks.flatMap((c) => c.passages.map((p) => p.location.page_no)));
    expect([...pages]).toEqual([7, 8, 9, 10, 11, 12, 13]);
    expect(chunks[0]?.ancestors.map((a) => a.title_ar)).toEqual(["باب طويل"]);
  });

  test("catatan kaki yatim ikut paragraf badan terakhir halamannya, di potongan yang sama", async () => {
    const chunks = await readAll(T_LONG);
    const withOrphan = chunks.find((c) => c.passages.some((p) => p.id === ORPHAN_FOOT));
    const lastBody = longPassageId(ORPHAN_PAGE, 4);
    expect(withOrphan?.passages.some((p) => p.id === lastBody)).toBe(true);
    // Di halamannya: badan dulu, lalu catatan kaki urut ord (catatan tertaut ord 1, yatim ord 2).
    const page = withOrphan?.passages.filter((p) => p.location.page_no === ORPHAN_PAGE) ?? [];
    expect(page.filter((p) => p.kind === "foot").map((p) => p.ord)).toEqual(
      page.some((p) => p.id === longPassageId(ORPHAN_PAGE, 1)) ? [1, 2] : [2],
    );
  });

  test("halaman tanpa paragraf badan tetap terkirim sebagai satu blok catatan kaki", async () => {
    const chunks = await readAll(T_LONG_CHILD);
    const last = chunks.at(-1);
    expect(last?.passages.at(-1)).toMatchObject({
      id: FOOT_ONLY,
      kind: "foot",
      footnote_refs: [],
      location: { juz: 3, page_no: FOOT_ONLY_PAGE },
    });
    expect(chunks.flatMap((c) => c.passages).filter((p) => p.id === FOOT_ONLY)).toHaveLength(1);
  });

  test("batas baris: halaman terakhir yang terpotong diulang dari awal, tanpa hilang/ganda", async () => {
    // 5 baris per halaman kecil: 12 baris → 2 halaman utuh + 2 baris halaman ke-3 (dibuang).
    const first = await readSectionWithLimit(db, T_LONG, undefined, 12);
    expect([...new Set(first.passages.map((p) => p.location.page_no))]).toEqual([1, 2]);
    expect(first.next_cursor).toBe(encodeCursor({ nodeId: T_LONG, juz: 3, pageNo: 3, bodyOrd: 0 }));

    for (const limit of [7, 12, 25]) {
      const chunks = await readAll(T_LONG, limit);
      const ids = chunks.flatMap((c) => c.passages.map((p) => p.id));
      expect(new Set(ids).size, `limit ${limit}`).toBe(ids.length);
      expect(
        ids.toSorted((a, b) => a - b),
        `limit ${limit}`,
      ).toEqual(longPassageIds().toSorted((a, b) => a - b));
    }
  });

  test("batas baris lebih kecil dari satu halaman → error internal (bukan potongan terbelah)", async () => {
    await expect(readSectionWithLimit(db, T_LONG, undefined, 3)).rejects.toThrow(
      /melebihi 3 paragraf/,
    );
  });

  test("cursor milik node lain, versi lain, atau rusak → InvalidCitation", async () => {
    const first = await readSection(db, T_LONG);
    const cursor = first.next_cursor;
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    if (cursor === null) throw new Error("fixture terlalu pendek");
    await expect(readSection(db, T_LONG_CHILD, cursor)).rejects.toBeInstanceOf(InvalidCitation);
    const enc = (o: object) => btoa(JSON.stringify(o)).replaceAll("=", "");
    const bad = [
      "",
      "!!!",
      "bm90LWpzb24", // "not-json"
      enc({ v: 2, n: T_LONG, j: 3, p: 4, o: 0 }),
      enc({ v: 1, n: T_LONG, j: 0, p: 4, o: 0 }),
      enc({ v: 1, n: T_LONG, j: 3, p: 4 }),
      enc({ v: 1, n: T_LONG, j: 3, p: 4, o: 0, x: 1 }),
      "a".repeat(300),
    ];
    for (const c of bad) {
      await expect(readSection(db, T_LONG, c), c).rejects.toBeInstanceOf(InvalidCitation);
    }
  });

  test("cursor di luar bagian → potongan kosong tanpa kelanjutan", async () => {
    const view = await readSection(
      db,
      T_CHILD_B,
      encodeCursor({ nodeId: T_CHILD_B, juz: 9, pageNo: 1, bodyOrd: 0 }),
    );
    expect(view.passages).toEqual([]);
    expect(view.next_cursor).toBeNull();
    expect(view.citation.permalink).toBe("/kitab/uji/1/1"); // awal node
  });

  test("NotFound dan InvalidCitation untuk node", async () => {
    await expect(readSection(db, ED * 100_000 + 99)).rejects.toBeInstanceOf(NotFound);
    await expect(readSection(db, 0)).rejects.toBeInstanceOf(InvalidCitation);
    await expect(readSection(db, 1.5)).rejects.toBeInstanceOf(InvalidCitation);
  });
});
