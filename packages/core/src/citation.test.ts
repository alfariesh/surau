import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import { ED, PASSAGES, longPassageId, seedCore } from "../test/fixture.ts";
import { buildCitation } from "./citation.ts";
import { InvalidCitation, NotFound } from "./errors.ts";
import { readPage } from "./page.ts";
import { citation } from "./schema.ts";

const db = env.CORPUS;

beforeAll(async () => {
  await seedCore(db);
});

describe("buildCitation", () => {
  test("paragraf badan dan catatan kaki: sitasi lengkap dengan jangkar paragraf", async () => {
    const body = await buildCitation(db, PASSAGES.body1);
    expect(citation.parse(body)).toEqual(body);
    expect(body).toMatchObject({
      juz: 1,
      page_no: 1,
      permalink: "/kitab/uji/1/1#p1",
      label: "Kitab Uji, j. 1, h. 1",
    });
    expect((await buildCitation(db, PASSAGES.foot2)).permalink).toBe("/kitab/uji/1/1#p3");
    expect((await buildCitation(db, longPassageId(5, 2))).permalink).toBe("/kitab/uji/3/5#p142");
  });

  test("sama dengan sumber + letak yang dikirim readPage", async () => {
    const view = await readPage(db, ED, 1, 1);
    const [first] = view.body;
    if (first === undefined) throw new Error("fixture");
    expect(await buildCitation(db, first.id)).toEqual({
      source: view.citation.source,
      ...first.location,
    });
  });

  test("NotFound / InvalidCitation", async () => {
    await expect(buildCitation(db, ED * 10_000_000 + 9_999)).rejects.toBeInstanceOf(NotFound);
    await expect(buildCitation(db, 0)).rejects.toBeInstanceOf(InvalidCitation);
  });
});
