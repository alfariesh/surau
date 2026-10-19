import { env } from "cloudflare:workers";
import { beforeAll, expect, test } from "vite-plus/test";
import { BODY_1, PASSAGES, seedCore } from "../test/fixture.ts";
import { resolveEvalSource } from "./eval-source.ts";
import { evalAnswer, sourceSpan } from "./eval-schema.ts";
beforeAll(async () => {
  await seedCore(env.CORPUS);
});
test("kutipan selalu dipotong dari sumber DB dan sitasi kanonik", async () => {
  const result = await resolveEvalSource(env.CORPUS, {
    passage_id: PASSAGES.body1,
    char_start: 0,
    char_end: BODY_1.length,
  });
  expect(result?.text).toBe(BODY_1);
  expect(result?.citation.permalink).toContain("#p1");
});
test("sumber/offset palsu tidak menjadi kutipan", async () => {
  for (const p of [
    { passage_id: 1, char_start: 0, char_end: 10 },
    { passage_id: PASSAGES.body1, char_start: 1, char_end: 999 },
    { passage_id: PASSAGES.body1, char_start: 4, char_end: 4 },
  ])
    expect(await resolveEvalSource(env.CORPUS, p)).toBeNull();
  expect(sourceSpan.safeParse({ passage_id: 1, char_start: 0, char_end: 2001 }).success).toBe(
    false,
  );
});
test("kontrak menolak teks Arab dari model dan penolakan kosong", () => {
  const a = {
    mode: "answer",
    text: "",
    refused: false,
    citations: [],
    hadith: [],
    model: "fixture",
    prompt_version: "test",
    latency_ms: 0,
    cost_usd: 0,
  };
  expect(evalAnswer.safeParse({ ...a, text: BODY_1 }).success).toBe(false);
  expect(evalAnswer.safeParse({ ...a, refused: true }).success).toBe(false);
  expect(
    evalAnswer.safeParse({ ...a, text: "Tidak ditemukan dalam sumber.", refused: true }).success,
  ).toBe(true);
});
