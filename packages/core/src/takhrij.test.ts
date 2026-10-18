import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import {
  BODY_1,
  ED,
  FOOT_1,
  FOOT_2,
  ORPHAN_FOOT,
  ORPHAN_PAGE,
  PASSAGES,
  longPassageId,
  seedCore,
} from "../test/fixture.ts";
import { InvalidCitation, NotFound } from "./errors.ts";
import { readPage } from "./page.ts";
import { takhrijView } from "./schema.ts";
import { getHadithTakhrij } from "./takhrij.ts";

const db = env.CORPUS;

beforeAll(async () => {
  await seedCore(db);
});

describe("getHadithTakhrij", () => {
  test("paragraf berpenanda: catatan kaki tertaut urut penanda, teks verbatim, tanda tinjau", async () => {
    const out = await getHadithTakhrij(db, PASSAGES.body1);
    expect(takhrijView.parse(out)).toEqual(out);
    expect(out.status).toBe("linked");
    expect(out.passage.text_raw).toBe(BODY_1);
    expect(out.citation.permalink).toBe("/kitab/uji/1/1#p1");
    expect(out.takhrij.map((t) => [t.marker, t.footnote.id, t.footnote.text_raw])).toEqual([
      ["١", PASSAGES.foot1, FOOT_1],
      ["٢", PASSAGES.foot2, FOOT_2],
    ]);
    for (const t of out.takhrij) {
      expect(BODY_1.slice(t.char_start, t.char_end)).toBe(`(${t.marker})`);
      expect(t.review_status).toBe("unreviewed");
    }
    expect(out.takhrij[1]?.footnote.needs_review).toEqual(["footnote_orphan", "takhrij_unmatched"]);
    expect(out.unlinked_footnote_ids).toEqual([]);
  });

  test("sama dengan paragraf di readPage (satu sumber kebenaran)", async () => {
    const page = await readPage(db, ED, 1, 1);
    const out = await getHadithTakhrij(db, PASSAGES.body1);
    const { translation: _t, ...body } = page.body[0] ?? {};
    expect(out.passage).toEqual(body);
    expect(out.takhrij.map((t) => t.footnote)).toEqual(
      page.footnotes.map(({ translation: _f, ...f }) => f),
    );
  });

  test("tanpa penanda: status none (derajat tidak diketahui); catatan kaki yatim dilaporkan", async () => {
    const plain = await getHadithTakhrij(db, PASSAGES.body2);
    expect(plain).toMatchObject({ status: "none", takhrij: [], unlinked_footnote_ids: [] });
    const onOrphanPage = await getHadithTakhrij(db, longPassageId(ORPHAN_PAGE, 2));
    expect(onOrphanPage.status).toBe("none");
    expect(onOrphanPage.unlinked_footnote_ids).toEqual([ORPHAN_FOOT]);
  });

  test("paragraf catatan kaki: is_footnote, dirinya tidak dihitung yatim", async () => {
    const out = await getHadithTakhrij(db, ORPHAN_FOOT);
    expect(out.status).toBe("is_footnote");
    expect(out.passage.kind).toBe("foot");
    expect(out.unlinked_footnote_ids).toEqual([]);
  });

  test("NotFound / InvalidCitation", async () => {
    await expect(getHadithTakhrij(db, ED * 10_000_000 + 9_999)).rejects.toBeInstanceOf(NotFound);
    await expect(getHadithTakhrij(db, -1)).rejects.toBeInstanceOf(InvalidCitation);
  });
});
