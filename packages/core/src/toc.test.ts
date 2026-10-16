import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import {
  ED,
  T_CHILD_A,
  T_CHILD_B,
  T_LONG,
  T_LONG_CHILD,
  T_ROOT,
  seedCore,
} from "../test/fixture.ts";
import { InvalidCitation, NotFound } from "./errors.ts";
import { TOC_MAX_DEPTH, tocView } from "./schema.ts";
import { getToc } from "./toc.ts";

const db = env.CORPUS;

beforeAll(async () => {
  await seedCore(db);
});

describe("getToc", () => {
  test("bawaan: akar + satu tingkat anak, urut ord, dengan letak awal", async () => {
    const view = await getToc(db, ED);
    expect(tocView.parse(view)).toEqual(view);
    expect(view.depth).toBe(2);
    expect(view.ancestors).toEqual([]);
    expect(view.nodes.map((n) => [n.id, n.child_count])).toEqual([
      [T_ROOT, 2],
      [T_LONG, 1],
    ]);
    const [root] = view.nodes;
    expect(root?.children.map((c) => [c.id, c.title_ar, c.start.permalink])).toEqual([
      [T_CHILD_B, "فصل أول", "/kitab/uji/1/1"],
      [T_CHILD_A, "فصل ثان", "/kitab/uji/1/2"],
    ]);
    expect(root?.children.every((c) => c.children.length === 0 && c.child_count === 0)).toBe(true);
    expect(root?.permalink).toBe(`/kitab/uji/bab/${T_ROOT}`);
    expect(view.citation).toMatchObject({ juz: 1, page_no: 1, label: "Kitab Uji, j. 1, h. 1" });
  });

  test("depth 1: anak tidak dikirim, child_count tetap memberi tahu", async () => {
    const view = await getToc(db, ED, { depth: 1 });
    expect(view.nodes.map((n) => [n.child_count, n.children.length])).toEqual([
      [2, 0],
      [1, 0],
    ]);
  });

  test("dari node: subpohon, leluhur, flag patched", async () => {
    const view = await getToc(db, ED, { nodeId: T_LONG_CHILD, depth: 3 });
    expect(view.nodes.map((n) => [n.id, n.patched, n.start.page_no])).toEqual([
      [T_LONG_CHILD, true, 7],
    ]);
    expect(view.ancestors).toEqual([
      { id: T_LONG, title_ar: "باب طويل", level: 1, permalink: `/kitab/uji/bab/${T_LONG}` },
    ]);
    expect(view.citation).toMatchObject({ juz: 3, page_no: 7 });
  });

  test("NotFound: edisi tidak ada, node edisi lain, edisi tanpa daftar isi", async () => {
    await expect(getToc(db, 999)).rejects.toBeInstanceOf(NotFound);
    await expect(getToc(db, ED + 1, { nodeId: T_ROOT })).rejects.toThrow(
      `Table of contents node not found: ${T_ROOT}`,
    );
    await expect(getToc(db, ED + 1)).rejects.toThrow("Table of contents not found");
  });

  test("InvalidCitation: kedalaman atau ID di luar batas", async () => {
    for (const depth of [0, TOC_MAX_DEPTH + 1, 1.5]) {
      await expect(getToc(db, ED, { depth })).rejects.toBeInstanceOf(InvalidCitation);
    }
    await expect(getToc(db, 0)).rejects.toBeInstanceOf(InvalidCitation);
    await expect(getToc(db, ED, { nodeId: -1 })).rejects.toBeInstanceOf(InvalidCitation);
  });

  test("siklus parent_id (data rusak) tidak membuat getToc berputar tanpa akhir", async () => {
    // FK tetap sah (induk ada), tetapi T_ROOT ↔ T_CHILD_B saling menjadi induk.
    await db
      .prepare("UPDATE toc_node SET parent_id = ? WHERE id = ?")
      .bind(T_CHILD_B, T_ROOT)
      .run();
    try {
      const view = await getToc(db, ED, { nodeId: T_CHILD_B, depth: TOC_MAX_DEPTH });
      // Setiap node dikirim paling banyak sekali: T_CHILD_B → T_ROOT → T_CHILD_A, lalu berhenti.
      const [start] = view.nodes;
      expect(start?.children.map((c) => c.id)).toEqual([T_ROOT]);
      expect(start?.children[0]?.children.map((c) => c.id)).toEqual([T_CHILD_A]);
      expect(view.ancestors.map((a) => a.id)).toEqual([T_ROOT]);
    } finally {
      await db.prepare("UPDATE toc_node SET parent_id = NULL WHERE id = ?").bind(T_ROOT).run();
    }
  });
});
