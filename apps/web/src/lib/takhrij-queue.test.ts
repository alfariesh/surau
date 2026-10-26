import { answerPassages, takhrijLabel, takhrijLabelHash } from "@surau/core";
import type { AnswerPassage } from "@surau/core";
import {
  getCorpusMeta,
  getPassagesByIds,
  getTakhrijReviews,
  listFootnoteTexts,
  listTakhrijReviews,
  saveTakhrijReview,
  takhrijCitedCounts,
} from "@surau/db";
import type { D1Db, TakhrijReview } from "@surau/db";
import { TAKHRIJ_TERMS_VERSION } from "@surau/text";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { queueOrder, saveTakhrijDecision, takhrijQueue, takhrijReviewItem } from "./takhrij-queue";

vi.mock("@surau/core", async (original) => ({
  ...(await original<typeof import("@surau/core")>()),
  answerPassages: vi.fn<typeof answerPassages>(),
}));
vi.mock("@surau/db", async (original) => ({
  ...(await original<typeof import("@surau/db")>()),
  getCorpusMeta: vi.fn<typeof getCorpusMeta>(),
  getPassagesByIds: vi.fn<typeof getPassagesByIds>(),
  getTakhrijReviews: vi.fn<typeof getTakhrijReviews>(),
  listFootnoteTexts: vi.fn<typeof listFootnoteTexts>(),
  listTakhrijReviews: vi.fn<typeof listTakhrijReviews>(),
  saveTakhrijReview: vi.fn<typeof saveTakhrijReview>(),
  takhrijCitedCounts: vi.fn<typeof takhrijCitedCounts>(),
}));

// Teks takhrij BUATAN (bukan teks kitab).
const WEAK = "حديث تجريبي رواه فلان بإسناد ضعيف";
const MIXED = "حديث تجريبي رواه فلان بإسناد صحيح ورواه فلان بإسناد ضعيف";
const PLAIN = "حديث تجريبي أخرجه فلان";
const NOTE = "(٤) وقال فلان كلاما تجريبيا";
const ME = "a".repeat(64);
const deps = {
  corpus: {} as D1Db,
  app: {} as D1Db,
  identity: ME,
  now: "2026-10-21T00:00:00Z",
  ustadzKeys: new Set([ME]),
};
let built = 0;

const review = async (passage_id: number, text: string, over: Partial<TakhrijReview> = {}) => ({
  passage_id,
  rules_version: TAKHRIJ_TERMS_VERSION,
  label_hash: await takhrijLabelHash(takhrijLabel(text)),
  reviewer_key: ME,
  reviewer_name: "Anas",
  decision: "approved" as const,
  kinds: null,
  note: "",
  corpus_version: "uji",
  updated_at: "2026-10-20T00:00:00Z",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  // Versi korpus baru per tes: indeks label di isolate tidak terbawa antar tes.
  vi.mocked(getCorpusMeta).mockResolvedValue({
    schema_version: 7,
    corpus_version: `uji-${++built}`,
  });
  vi.mocked(listFootnoteTexts).mockResolvedValue([
    { id: 10, text_raw: PLAIN },
    { id: 11, text_raw: MIXED },
    { id: 12, text_raw: WEAK },
    { id: 13, text_raw: NOTE },
  ]);
  vi.mocked(takhrijCitedCounts).mockResolvedValue(new Map([[12, 3]]));
  vi.mocked(listTakhrijReviews).mockResolvedValue([]);
  vi.mocked(getPassagesByIds).mockImplementation(async (_db, ids) =>
    ids.map(
      (id) => ({ id, juz: 1, page_no: id }) as Awaited<ReturnType<typeof getPassagesByIds>>[number],
    ),
  );
});

describe("antrean label takhrij", () => {
  it("urutan: paling sering dikutip, lalu berbeda per jalur, lalu urutan kitab", () => {
    const e = (id: number, mixed: boolean) => ({ id, label: { mixed } });
    expect(
      queueOrder([e(1, false), e(2, true), e(3, false), e(4, true)], new Map([[3, 2]])).map(
        (x) => x.id,
      ),
    ).toEqual([3, 2, 4, 1]);
  });

  it("antrean memuat takhrij saja; keputusan penilai ini memindahkan butir; label berubah = tinjau ulang", async () => {
    const q = await takhrijQueue(deps, "todo", 0);
    expect(q.items.map((i) => i.passage_id)).toEqual([12, 11, 10]);
    expect(q.items[0]).toMatchObject({ location: "j. 1, h. 12", cites: 3, weak: true, own: null });
    expect(q.counts).toEqual({ todo: 3, unsure: 0, done: 0 });
    expect(q.ustadz_account).toBe(true);
    expect((await takhrijQueue({ ...deps, ustadzKeys: new Set() }, "todo", 0)).ustadz_account).toBe(
      false,
    );
    vi.mocked(getCorpusMeta).mockResolvedValue({
      schema_version: 7,
      corpus_version: `uji-${++built}`,
    });
    vi.mocked(listTakhrijReviews).mockResolvedValue([
      await review(12, WEAK),
      await review(11, MIXED, { decision: "unsure" }),
      // Keputusan penilai lain tidak memindahkan butir penilai ini.
      await review(10, PLAIN, { reviewer_key: "b".repeat(64) }),
      // Label yang ditinjau sudah berbeda dari label sekarang.
      await review(10, PLAIN, { label_hash: "c".repeat(64) }),
    ]);
    const after = await takhrijQueue(deps, "todo", 0);
    expect(after.counts).toEqual({ todo: 1, unsure: 1, done: 1 });
    expect(after.items).toMatchObject([{ passage_id: 10, stale_review: true, own: "approved" }]);
    expect((await takhrijQueue(deps, "done", 0)).items.map((i) => i.passage_id)).toEqual([12]);
  });

  const passage = (id: number, text: string, kind: "foot" | "body" = "foot") =>
    ({
      id,
      kind,
      text_raw: text,
      referenced_by: [],
      location: { label: `Ihya, j. 1, h. ${id}`, permalink: `/kitab/ihya/1/${id}` },
    }) as unknown as AnswerPassage;

  it("butir: teks dari DB, label kode, label yang dipakai Jawab, keputusan tanpa kunci penilai", async () => {
    vi.mocked(answerPassages).mockResolvedValue([passage(12, WEAK)]);
    vi.mocked(getTakhrijReviews).mockResolvedValue([
      await review(12, WEAK, { decision: "corrected", kinds: ["mursal"] }),
    ]);
    const item = await takhrijReviewItem(deps, 12);
    expect(item).toMatchObject({
      text: WEAK,
      label: { text: "dinilai lemah, menurut takhrij al-'Iraqi" },
      current: { review: "corrected", text: "diriwayatkan mursal, menurut peninjau" },
      cites: 3,
    });
    expect(item?.own).toMatchObject({ decision: "corrected", stale: false });
    expect(JSON.stringify(item)).not.toContain(ME);
    // Akun tidak terdaftar: keputusannya tersimpan, label yang dipakai Jawab tetap label kode.
    expect((await takhrijReviewItem({ ...deps, ustadzKeys: new Set() }, 12))?.current.review).toBe(
      "rule",
    );
    vi.mocked(answerPassages).mockResolvedValue([passage(13, NOTE)]);
    expect(await takhrijReviewItem(deps, 13)).toBeNull();
    vi.mocked(answerPassages).mockResolvedValue([passage(14, WEAK, "body")]);
    expect(await takhrijReviewItem(deps, 14)).toBeNull();
  });

  it("simpan: hanya label yang sama dengan yang dilihat penilai", async () => {
    vi.mocked(answerPassages).mockResolvedValue([passage(12, WEAK)]);
    const input = {
      passage_id: 12,
      rules_version: TAKHRIJ_TERMS_VERSION,
      label_hash: await takhrijLabelHash(takhrijLabel(WEAK)),
      reviewer_name: "Penilai",
      decision: "approved" as const,
      kinds: null,
      note: "",
    };
    expect(await saveTakhrijDecision(deps, { ...input, label_hash: "d".repeat(64) })).toBe("stale");
    expect(
      await saveTakhrijDecision(deps, { ...input, rules_version: TAKHRIJ_TERMS_VERSION + 1 }),
    ).toBe("stale");
    expect(saveTakhrijReview).not.toHaveBeenCalled();
    expect(await saveTakhrijDecision(deps, input)).toBe("ok");
    expect(saveTakhrijReview).toHaveBeenCalledWith(
      deps.app,
      expect.objectContaining({ reviewer_key: ME, updated_at: deps.now, decision: "approved" }),
    );
  });
});
