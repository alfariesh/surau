import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import { BODY_1, ED, FOOT_1, FOOT_2, PASSAGES, seedCore } from "../test/fixture.ts";
import { InvalidCitation, NotFound } from "./errors.ts";
import { readPage } from "./page.ts";
import { pageView } from "./schema.ts";

const db = env.CORPUS;

beforeAll(async () => {
  await seedCore(db);
});

describe("readPage", () => {
  test("badan + catatan kaki dengan text_raw persis dan penanda tertaut", async () => {
    const view = await readPage(db, ED, 1, 1);
    expect(pageView.parse(view)).toEqual(view);
    expect(view.body.map((p) => p.text_raw)).toEqual([BODY_1]);
    expect(view.footnotes.map((p) => p.text_raw)).toEqual([FOOT_1, FOOT_2]);
    const [body] = view.body;
    expect(body?.footnote_refs.map((r) => [r.marker, r.footnote_id])).toEqual([
      ["١", PASSAGES.foot1],
      ["٢", PASSAGES.foot2],
    ]);
    for (const r of body?.footnote_refs ?? []) {
      expect(BODY_1.slice(r.char_start, r.char_end)).toBe(`(${r.marker})`);
      expect(view.footnotes.some((f) => f.id === r.footnote_id)).toBe(true);
    }
    expect(view.footnotes.map((f) => f.footnote_refs)).toEqual([[], []]);
  });

  test("sitasi lengkap, jangkar paragraf, dan tanda perlu ditinjau", async () => {
    const view = await readPage(db, ED, 1, 1);
    expect(view.citation).toEqual({
      source: {
        work: {
          slug: "uji",
          title_ar: "كتاب تجريبي",
          title_id: "Kitab Uji",
          author: { name_ar: "مؤلف تجريبي", name_id: "Penulis Uji", death_hijri: 505 },
          attribution_status: "authentic",
        },
        edition: { id: ED, slug: "shamela", is_default: true, publisher: null, city: null },
        license: "CC BY-NC-SA 4.0",
        attribution: "Fixture buatan",
      },
      juz: 1,
      page_no: 1,
      permalink: "/kitab/uji/1/1",
      label: "Kitab Uji, j. 1, h. 1",
    });
    expect(view.body[0]).toMatchObject({
      id: PASSAGES.body1,
      anchor: "p1",
      kind: "body",
      ord: 1,
      location: { juz: 1, page_no: 1, permalink: "/kitab/uji/1/1#p1" },
    });
    expect(view.footnotes.map((f) => f.needs_review)).toEqual([
      [],
      ["footnote_orphan", "takhrij_unmatched"],
    ]);
  });

  test("halaman sebelum/sesudah melintasi juz; ujung edisi = null", async () => {
    const first = await readPage(db, ED, 1, 1);
    expect(first.prev).toBeNull();
    expect(first.next?.permalink).toBe("/kitab/uji/1/2");
    const j2 = await readPage(db, ED, 2, 1);
    expect(j2.prev?.label).toBe("Kitab Uji, j. 1, h. 2");
    expect(j2.next?.permalink).toBe("/kitab/uji/3/1");
    expect((await readPage(db, ED, 3, 13)).next).toBeNull();
  });

  test("halaman tanpa catatan kaki: footnotes kosong", async () => {
    const view = await readPage(db, ED, 1, 2);
    expect(view.body.map((p) => p.text_raw)).toEqual(["نص الصفحة الثانية"]);
    expect(view.footnotes).toEqual([]);
  });

  test("NotFound untuk halaman atau edisi yang tidak ada", async () => {
    await expect(readPage(db, ED, 9, 1)).rejects.toBeInstanceOf(NotFound);
    await expect(readPage(db, ED, 1, 999)).rejects.toThrow("Page not found: juz 1, page 999");
    await expect(readPage(db, 999, 1, 1)).rejects.toThrow("Edition not found: 999");
  });

  test("InvalidCitation untuk angka salah bentuk, dengan pesan tanpa detail internal", async () => {
    for (const [juz, page] of [
      [0, 1],
      [-1, 1],
      [1.5, 1],
      [1, -2],
      [Number.NaN, 1],
    ] as const) {
      const err = await readPage(db, ED, juz, page).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(InvalidCitation);
      expect((err as InvalidCitation).code).toBe("invalid_citation");
      expect((err as Error).message).toMatch(/^Invalid (juz|page_no): /);
      expect((err as Error).message).not.toMatch(/SELECT|passage|D1/i);
    }
  });
});

describe("readPage edisi non-default", () => {
  test("permalink memakai @<edisi>", async () => {
    await db
      .prepare(
        "INSERT INTO page (id, edition_id, seq, juz, page_no) VALUES (?, ?, 1, 1, 5) ON CONFLICT DO NOTHING",
      )
      .bind((ED + 1) * 100_000 + 1, ED + 1)
      .run();
    const view = await readPage(db, ED + 1, 1, 5);
    expect(view.citation.permalink).toBe("/kitab/uji@openiti/1/5");
    expect(view.citation.label).toBe("Kitab Uji (openiti), j. 1, h. 5");
    expect(view.citation.source.edition.is_default).toBe(false);
    expect(view.body).toEqual([]);
  });
});
