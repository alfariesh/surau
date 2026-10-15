import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";
import { ZodError } from "zod";

import {
  BODY_1,
  ED,
  FOOT_1,
  FOOT_2,
  P1,
  P2,
  P3,
  PASSAGES,
  T_CHILD_A,
  T_CHILD_B,
  T_ROOT,
  seedCorpus,
} from "../../test/fixture.ts";
import {
  getAdjacentPages,
  getEdition,
  getFootnoteRefs,
  getPageByCitation,
  getPageById,
  getPassagesByPage,
  getTocChildren,
  getTocNode,
  getWorkBySlug,
  listWorks,
} from "./corpus.ts";

const db = env.CORPUS;

beforeAll(async () => {
  await seedCorpus(db);
});

describe("karya dan edisi", () => {
  test("listWorks dan getWorkBySlug", async () => {
    expect((await listWorks(db)).map((w) => w.slug)).toEqual(["uji"]);
    const work = await getWorkBySlug(db, "uji");
    expect(work).toMatchObject({ id: 1, title_ar: "كتاب تجريبي", attribution_status: "authentic" });
    expect(await getWorkBySlug(db, "tidak-ada")).toBeNull();
  });

  test("getEdition: tanpa slug → edisi default, dengan slug → edisi itu", async () => {
    expect((await getEdition(db, "uji"))?.id).toBe(ED);
    expect((await getEdition(db, "uji", "openiti"))?.id).toBe(ED + 1);
    expect(await getEdition(db, "uji", "tidak-ada")).toBeNull();
    expect(await getEdition(db, "tidak-ada")).toBeNull();
  });

  test("edisi default kedua untuk karya yang sama ditolak DB", async () => {
    await expect(
      db
        .prepare("UPDATE edition SET is_default = 1 WHERE id = ?")
        .bind(ED + 1)
        .run(),
    ).rejects.toThrow(/UNIQUE/);
  });
});

describe("halaman", () => {
  test("getPageByCitation memakai (edisi, juz, halaman)", async () => {
    expect(await getPageByCitation(db, ED, 1, 2)).toEqual({
      id: P2,
      edition_id: ED,
      seq: 2,
      juz: 1,
      page_no: 2,
      source_page_id: 102,
    });
    expect((await getPageByCitation(db, ED, 2, 1))?.id).toBe(P3);
    expect(await getPageByCitation(db, ED, 3, 1)).toBeNull();
    expect(await getPageByCitation(db, ED + 1, 1, 1)).toBeNull();
    expect((await getPageById(db, P1))?.page_no).toBe(1);
  });

  test("getAdjacentPages melintasi batas juz", async () => {
    const p2 = await getPageById(db, P2);
    if (p2 === null) throw new Error("fixture");
    const mid = await getAdjacentPages(db, p2);
    expect([mid.prev?.id, mid.next?.id]).toEqual([P1, P3]);
    const first = await getAdjacentPages(db, { edition_id: ED, juz: 1, page_no: 1 });
    expect([first.prev, first.next?.id]).toEqual([null, P2]);
    const last = await getAdjacentPages(db, { edition_id: ED, juz: 2, page_no: 1 });
    expect([last.prev?.id, last.next]).toEqual([P2, null]);
  });

  test("ID yang melanggar formula ditolak DB (CHECK)", async () => {
    await expect(
      db
        .prepare("INSERT INTO page (id, edition_id, seq, juz, page_no) VALUES (?, ?, ?, 9, 9)")
        .bind(P1 + 50, ED, 4)
        .run(),
    ).rejects.toThrow(/CHECK/);
  });

  test("sitasi ganda (edisi, juz, halaman sama) ditolak DB", async () => {
    await expect(
      db
        .prepare("INSERT INTO page (id, edition_id, seq, juz, page_no) VALUES (?, ?, 9, 1, 1)")
        .bind(ED * 100_000 + 9, ED)
        .run(),
    ).rejects.toThrow(/UNIQUE/);
  });
});

describe("daftar isi", () => {
  test("getTocChildren: akar lalu anak, urut ord", async () => {
    expect((await getTocChildren(db, ED, null)).map((n) => n.id)).toEqual([T_ROOT]);
    const kids = await getTocChildren(db, ED, T_ROOT);
    expect(kids.map((n) => n.id)).toEqual([T_CHILD_B, T_CHILD_A]);
    expect(kids.map((n) => n.title_ar)).toEqual(["فصل أول", "فصل ثان"]);
    expect(await getTocChildren(db, ED, T_CHILD_A)).toEqual([]);
    expect(await getTocChildren(db, ED + 1, null)).toEqual([]);
  });

  test("getTocNode", async () => {
    expect(await getTocNode(db, T_CHILD_A)).toMatchObject({
      parent_id: T_ROOT,
      level: 2,
      start_page_id: P2,
      patched: 0,
    });
    expect(await getTocNode(db, 1)).toBeNull();
  });
});

describe("paragraf dan catatan kaki", () => {
  test("getPassagesByPage: badan dulu, lalu catatan kaki urut ord; teks mentah apa adanya", async () => {
    const rows = await getPassagesByPage(db, P1);
    expect(rows.map((r) => [r.kind, r.ord])).toEqual([
      ["body", 1],
      ["foot", 1],
      ["foot", 2],
    ]);
    expect(rows.map((r) => r.text_raw)).toEqual([BODY_1, FOOT_1, FOOT_2]);
    expect(await getPassagesByPage(db, P3)).toHaveLength(1);
    expect(await getPassagesByPage(db, 1)).toEqual([]);
  });

  test("getFootnoteRefs: offset menunjuk penanda di text_raw", async () => {
    const refs = await getFootnoteRefs(db, [PASSAGES.body1, PASSAGES.body2, PASSAGES.body1]);
    expect(refs.map((r) => [r.marker, r.footnote_passage_id])).toEqual([
      ["١", PASSAGES.foot1],
      ["٢", PASSAGES.foot2],
    ]);
    for (const r of refs) expect(BODY_1.slice(r.char_start, r.char_end)).toBe(`(${r.marker})`);
    expect(await getFootnoteRefs(db, [])).toEqual([]);
  });

  test("getFootnoteRefs memecah >100 ID ke beberapa statement (batas parameter D1)", async () => {
    const ids = [
      PASSAGES.body1,
      ...Array.from({ length: 250 }, (_, i) => ED * 10_000_000 + 1000 + i),
    ];
    const refs = await getFootnoteRefs(db, ids);
    expect(refs).toHaveLength(2);
  });
});

describe("baris salah bentuk", () => {
  test("nilai di luar skema Zod ditolak saat dibaca, bukan diteruskan", async () => {
    await db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('norm_version', 'x')").run();
    const { getCorpusMeta } = await import("./corpus.ts");
    await expect(getCorpusMeta(db)).rejects.toBeInstanceOf(ZodError);
    await db.prepare("DELETE FROM meta WHERE key = 'norm_version'").run();
  });
});
