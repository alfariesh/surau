import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import {
  AI_TRANSLATIONS,
  BODY_1,
  ED,
  FOOT_1,
  PASSAGES,
  T_ROOT,
  seedAiText,
  seedCore,
} from "../test/fixture.ts";
import { answerPassages, answerToc } from "./answer-context.ts";

const db = env.CORPUS;

beforeAll(async () => {
  await seedCore(db);
  await seedAiText(db);
});

describe("answerPassages", () => {
  test("urut sesuai masukan, unik, ID asing dilewati, teks mentah persis", async () => {
    const out = await answerPassages(db, [
      PASSAGES.body3,
      PASSAGES.body1,
      PASSAGES.body3,
      ED * 10_000_000 + 9999,
    ]);
    expect(out.map((p) => p.id)).toEqual([PASSAGES.body3, PASSAGES.body1]);
    expect(out[1]?.text_raw).toBe(BODY_1);
    expect(out[1]?.location).toMatchObject({ juz: 1, page_no: 1 });
    expect(out[1]?.location.permalink).toMatch(/#p1$/u);
  });

  test("terjemahan AI berlabel, catatan kaki tertaut, dan rujukan balik takhrij", async () => {
    const [body, foot] = await answerPassages(db, [PASSAGES.body1, PASSAGES.foot1]);
    expect(body?.translation).toMatchObject({
      label: "ai_translation",
      text: AI_TRANSLATIONS[PASSAGES.body1],
    });
    expect(body?.footnote_ids).toEqual([PASSAGES.foot1, PASSAGES.foot2]);
    expect(body?.referenced_by).toEqual([]);
    expect(foot?.kind).toBe("foot");
    expect(foot?.text_raw).toBe(FOOT_1);
    expect(foot?.referenced_by).toEqual([PASSAGES.body1]);
    expect(foot?.translation).toBeNull();
  });

  test("label ayat dari rujukan deterministik", async () => {
    const [p] = await answerPassages(db, [PASSAGES.body2]);
    expect(p?.ayah_labels).toEqual(["QS 1:2-3"]);
  });

  test("kosong → kosong tanpa kueri lanjutan", async () => {
    expect(await answerPassages(db, [])).toEqual([]);
  });
});

describe("answerToc", () => {
  test("semua node edisi beserta halaman awal", async () => {
    const toc = await answerToc(db, ED);
    const root = toc.find((n) => n.id === T_ROOT);
    expect(root).toMatchObject({ parent_id: null, level: 1, juz: 1, page_no: 1 });
    expect(toc.every((n) => n.title_ar.length > 0)).toBe(true);
  });
});
