import { answerPassages, takhrijLabel, takhrijLabelHash } from "@surau/core";
import type { AnswerPassage } from "@surau/core";
import type { D1Db, TakhrijReview } from "@surau/db";
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
    ord: 1,
    ...over,
  };
}

const deps = (over: Partial<Parameters<typeof handleKutipan>[1]> = {}) => ({
  enabled: true,
  db: {} as D1Db,
  hmacKey: "kunci-uji",
  ip: "203.0.113.9",
  limit: async () => true,
  limitGlobal: async () => true,
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

  it("sakelar pembaca, batas per klien, batas global, dan secret HMAC", async () => {
    expect((await handleKutipan(req("10000001:0:5"), deps({ enabled: false }))).status).toBe(404);
    expect(
      (await handleKutipan(req("10000001:0:5"), deps({ limit: async () => false }))).status,
    ).toBe(429);
    // Ditolak per klien → batas global tidak tersentuh.
    let global = 0;
    const counting = async () => {
      global += 1;
      return false;
    };
    await handleKutipan(
      req("10000001:0:5"),
      deps({ limit: async () => false, limitGlobal: counting }),
    );
    expect(global).toBe(0);
    expect((await handleKutipan(req("10000001:0:5"), deps({ limitGlobal: counting }))).status).toBe(
      429,
    );
    expect(answerPassages).not.toHaveBeenCalled();
    expect((await handleKutipan(req("10000001:0:5"), deps({ hmacKey: undefined }))).status).toBe(
      503,
    );
  });

  it("takhrij dengan istilah kelemahan diberi `weak`; matan tidak pernah", async () => {
    // Takhrij BUATAN (bukan teks kitab).
    const FOOT = "أخرجه فلان بإسناد ضعيف";
    vi.mocked(answerPassages).mockResolvedValue([
      passage({ id: 10000002, kind: "foot", text_raw: FOOT, translation: null }),
      passage({ id: 10000003, kind: "body", text_raw: FOOT, translation: null }),
      passage({ id: 10000004, kind: "foot", text_raw: "أخرجه فلان", translation: null }),
    ]);
    const res = await handleKutipan(req("10000002:0:5,10000003:0:5,10000004:0:5"), deps());
    const { items } = (await res.json()) as { items: KutipanItem[] };
    expect(items.map((i) => i.weak)).toEqual([true, false, false]);
  });

  it("tanda `weak` mengikuti koreksi penilai (X07); galat DB app = label kode", async () => {
    const FOOT = "أخرجه فلان بإسناد ضعيف";
    const label = takhrijLabel(FOOT);
    vi.mocked(answerPassages).mockResolvedValue([
      passage({ id: 10000002, kind: "foot", text_raw: FOOT, translation: null }),
    ]);
    const row = {
      passage_id: 10000002,
      rules_version: label.version,
      label_hash: await takhrijLabelHash(label),
      reviewer_key: "b".repeat(64),
      reviewer_name: "Anas",
      decision: "corrected" as const,
      kinds: ["mursal"],
      note: "",
      corpus_version: "uji",
      updated_at: "2026-10-21T00:00:00.000Z",
    };
    const keys = new Set([row.reviewer_key]);
    const weak = async (load: () => Promise<TakhrijReview[]>, ustadzKeys = keys) => {
      const res = await handleKutipan(req("10000002:0:5"), deps({ reviews: { load, ustadzKeys } }));
      return ((await res.json()) as { items: KutipanItem[] }).items[0]?.weak;
    };
    expect(await weak(async () => [row])).toBe(false);
    expect(await weak(async () => [{ ...row, decision: "approved" as const, kinds: null }])).toBe(
      true,
    );
    // Penilai tidak terdaftar: koreksinya tidak dipakai.
    expect(await weak(async () => [row], new Set(["c".repeat(64)]))).toBe(true);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(
      await weak(async () => {
        throw new Error("app db");
      }),
    ).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("sliceRaw tidak memotong pasangan surrogate; ayahRefsOnly", () => {
    expect(sliceRaw("a😀b", 0, 2)).toBeNull();
    expect(sliceRaw("a😀b", 1, 3)).toBe("😀");
    expect(sliceRaw("abc", 0, 9)).toBeNull();
    expect(ayahRefsOnly("x ⟦QS 2:153-154⟧ y")).toBe("x (QS 2:153-154) y");
  });
});
