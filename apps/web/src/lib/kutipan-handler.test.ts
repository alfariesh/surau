import { answerPassages } from "@surau/core";
import type { AnswerPassage } from "@surau/core";
import type { D1Db } from "@surau/db";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { KutipanItem } from "./kutipan-handler";
import { ayahRefsOnly, handleKutipan, parseRanges, sliceRaw } from "./kutipan-handler";

vi.mock("@surau/core", async (original) => ({
  ...(await original<typeof import("@surau/core")>()),
  answerPassages: vi.fn<typeof answerPassages>(),
}));

// Teks Arab BUATAN untuk tes (bukan teks kitab).
const RAW = "هذه جملة تجريبية أولى. وهذه جملة ثانية للاختبار.";

function passage(over: Partial<AnswerPassage> = {}): AnswerPassage {
  return {
    id: 10000001,
    edition_id: 1,
    page_id: 100001,
    kind: "body",
    toc_node_id: null,
    text_raw: RAW,
    location: {
      juz: 1,
      page_no: 200,
      permalink: "/kitab/ihya/1/200#p1",
      label: "Ihya, j. 1, h. 200",
    },
    translation: {
      label: "ai_translation",
      lang: "id",
      model: "m",
      prompt_version: "p",
      created_at: "2026-10-17",
      review_status: "ai_generated",
      text: "Ini kalimat pertama. ⟦QS 2:153⟧ Lalu kalimat kedua.",
    },
    footnote_ids: [],
    referenced_by: [],
    ayah_labels: [],
    ...over,
  };
}

const deps = (over: Partial<Parameters<typeof handleKutipan>[1]> = {}) => ({
  db: {} as D1Db,
  hmacKey: "kunci-uji",
  ip: "203.0.113.9",
  limit: async () => true,
  ...over,
});
const req = (r: string) => new Request(`https://surau.example/api/kutipan?r=${r}`);

beforeEach(() => {
  vi.mocked(answerPassages).mockResolvedValue([passage()]);
});

describe("GET /api/kutipan", () => {
  it("rentang tidak sah ditolak sebelum DB", async () => {
    for (const r of [
      "",
      "abc",
      "1:5:5",
      "1:9:2",
      "1:0:2001",
      "0:0:5",
      Array(21).fill("1:0:2").join(","),
    ])
      expect(parseRanges(r), r).toBeNull();
    expect((await handleKutipan(req("1:5:5"), deps())).status).toBe(400);
    expect(answerPassages).not.toHaveBeenCalled();
  });

  it("teks kutipan = potongan text_raw DB persis; terjemahan berlabel AI, ayat hanya rujukan", async () => {
    const res = await handleKutipan(req("10000001:0:21,10000001:22:47"), deps());
    expect(res.status).toBe(200);
    const { items } = (await res.json()) as { items: KutipanItem[] };
    expect(items.map((i) => i.text)).toEqual([RAW.slice(0, 21), RAW.slice(22, 47)]);
    expect(items[0]).toMatchObject({
      label: "Ihya, j. 1, h. 200",
      permalink: "/kitab/ihya/1/200#p1",
      kind: "body",
      translation: {
        label: "ai_translation",
        text: "Ini kalimat pertama. (QS 2:153) Lalu kalimat kedua.",
      },
    });
    expect(answerPassages).toHaveBeenCalledWith({}, [10000001]);
  });

  it("paragraf tidak ada atau rentang di luar teks → null (tidak pernah teks karangan)", async () => {
    const res = await handleKutipan(req("10000001:0:999,10000099:0:5"), deps());
    expect(((await res.json()) as { items: unknown[] }).items).toEqual([null, null]);
  });

  it("batas per klien dan secret HMAC", async () => {
    expect(
      (await handleKutipan(req("10000001:0:5"), deps({ limit: async () => false }))).status,
    ).toBe(429);
    expect((await handleKutipan(req("10000001:0:5"), deps({ hmacKey: undefined }))).status).toBe(
      503,
    );
  });

  it("sliceRaw tidak memotong pasangan surrogate; ayahRefsOnly", () => {
    expect(sliceRaw("a😀b", 0, 2)).toBeNull();
    expect(sliceRaw("a😀b", 1, 3)).toBe("😀");
    expect(sliceRaw("abc", 0, 9)).toBeNull();
    expect(ayahRefsOnly("x ⟦QS 2:153-154⟧ y")).toBe("x (QS 2:153-154) y");
  });
});
