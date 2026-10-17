import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import { BODY_1, ED, FOOT_1, PASSAGES, seedCore } from "../test/fixture.ts";
import { buildCitation } from "./citation.ts";
import { InvalidCitation, NotFound } from "./errors.ts";
import { quoteVerification } from "./schema.ts";
import { verifyQuote } from "./verify-quote.ts";

const db = env.CORPUS;

beforeAll(async () => {
  await seedCore(db);
});

describe("verifyQuote", () => {
  test("kutipan persis: match = substring mentah, sitasi paragraf", async () => {
    const quote = "نص تجريبي";
    const out = await verifyQuote(db, PASSAGES.body1, quote);
    expect(quoteVerification.parse(out)).toEqual(out);
    expect(out).toMatchObject({ passage_id: PASSAGES.body1, verified: true, exact: true });
    expect(out.match).toEqual({
      char_start: BODY_1.indexOf(quote),
      char_end: BODY_1.indexOf(quote) + quote.length,
      text: quote,
    });
    expect(out.citation).toEqual(await buildCitation(db, PASSAGES.body1));
  });

  test("kutipan bervokal: tetap cocok, tetapi yang dikembalikan teks sumber (tanpa harakat masukan)", async () => {
    const out = await verifyQuote(db, PASSAGES.body1, "نَصٌّ تَجْرِيبِيٌّ");
    expect(out.verified).toBe(true);
    expect(out.exact).toBe(false);
    expect(out.match?.text).toBe("نص تجريبي");
    const m = out.match;
    if (m === null) throw new Error("match");
    expect(BODY_1.slice(m.char_start, m.char_end)).toBe(m.text);
  });

  test("kutipan karangan ditolak: kata yang tidak ada, potongan kata, paragraf lain", async () => {
    for (const quote of ["نص مزيف لم يكتب", "تجريب", FOOT_1.slice(4), "Hello"]) {
      const out = await verifyQuote(db, PASSAGES.body1, quote);
      expect(out, quote).toMatchObject({ verified: false, exact: false, match: null });
    }
  });

  test("catatan kaki juga bisa diverifikasi", async () => {
    const out = await verifyQuote(db, PASSAGES.foot1, "حاشية تجريبية");
    expect(out).toMatchObject({ verified: true, exact: true });
    expect(out.citation.permalink).toBe("/kitab/uji/1/1#p2");
  });

  test("NotFound / InvalidCitation", async () => {
    await expect(verifyQuote(db, ED * 10_000_000 + 9_999, "نص")).rejects.toBeInstanceOf(NotFound);
    // Edisi yang tidak ada (ID di bawah 10⁷ = edisi 0) tetap NotFound paragraf, bukan edisi.
    await expect(verifyQuote(db, 5, "نص")).rejects.toThrow("Passage not found: 5");
    await expect(verifyQuote(db, 0, "نص")).rejects.toBeInstanceOf(InvalidCitation);
    await expect(verifyQuote(db, PASSAGES.body1, "")).rejects.toBeInstanceOf(InvalidCitation);
    await expect(verifyQuote(db, PASSAGES.body1, "ن".repeat(2_001))).rejects.toBeInstanceOf(
      InvalidCitation,
    );
  });
});
