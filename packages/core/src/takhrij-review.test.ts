import type { TakhrijReview } from "@surau/db";
import { TAKHRIJ_TERMS_VERSION } from "@surau/text";
import { describe, expect, test } from "vite-plus/test";

import { takhrijLabel, takhrijStatus } from "./takhrij-label.ts";
import {
  effectiveTakhrijReview,
  isUstadzReviewer,
  reviewedTakhrijLabel,
  takhrijLabelHash,
  takhrijReviewInput,
  takhrijReviewsFor,
} from "./takhrij-review.ts";

// Kalimat BUATAN bergaya takhrij (bukan teks kitab).
const RAW = "حديث تجريبي رواه فلان موقوفا بإسناد ضعيف ولم أره مرفوعا";
const label = takhrijLabel(RAW);
const row = (over: Partial<TakhrijReview> = {}): TakhrijReview => ({
  passage_id: 7,
  rules_version: TAKHRIJ_TERMS_VERSION,
  label_hash: "",
  reviewer_key: "b".repeat(64),
  reviewer_name: "Anas",
  decision: "approved",
  kinds: null,
  note: "",
  corpus_version: "uji",
  updated_at: "2026-10-21T00:00:00.000Z",
  ...over,
});

describe("takhrijStatus", () => {
  test("disusun dengan aturan yang sama dengan label kode", () => {
    expect(takhrijStatus(label.terms.map((t) => t.kind)).text).toBe(label.text);
    expect(takhrijStatus(["sahih", "daif"])).toMatchObject({
      kind: "terms",
      mixed: true,
      text: "takhrij menyebut: sahih; lemah (berbeda per jalur)",
    });
    expect(takhrijStatus([])).toMatchObject({ kind: "sources_only" });
    expect(takhrijStatus(["rujukan"])).toMatchObject({ kind: "refers_back" });
  });
});

describe("tinjauan label", async () => {
  const hash = await takhrijLabelHash(label);
  test("sidik label stabil dan berubah bila istilah/rentang berubah", async () => {
    expect(hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(await takhrijLabelHash(takhrijLabel(RAW))).toBe(hash);
    expect(await takhrijLabelHash(takhrijLabel(`(١) ${RAW}`))).not.toBe(hash);
  });

  test("setuju, koreksi, dan koreksi yang sama dengan deteksi", () => {
    expect(effectiveTakhrijReview(label, hash, [row({ label_hash: hash })])).toMatchObject({
      decision: "approved",
      kinds: ["mawquf", "daif", "lam_ajid"],
    });
    expect(
      effectiveTakhrijReview(label, hash, [
        row({ label_hash: hash, decision: "corrected", kinds: ["mawquf", "mursal"] }),
      ]),
    ).toMatchObject({ decision: "corrected", kinds: ["mawquf", "mursal"] });
    expect(
      effectiveTakhrijReview(label, hash, [
        row({ label_hash: hash, decision: "corrected", kinds: ["lam_ajid", "daif", "mawquf"] }),
      ])?.decision,
    ).toBe("approved");
  });

  test("tidak berlaku: label/versi lain, bukan ustadz peninjau, ragu, atau penilai tidak sepakat", () => {
    expect(effectiveTakhrijReview(label, hash, [row({ label_hash: "c".repeat(64) })])).toBeNull();
    expect(
      effectiveTakhrijReview(label, hash, [row({ label_hash: hash, rules_version: 99 })]),
    ).toBeNull();
    expect(
      effectiveTakhrijReview(label, hash, [row({ label_hash: hash, reviewer_name: " agent QA " })]),
    ).toBeNull();
    expect(
      effectiveTakhrijReview(label, hash, [row({ label_hash: hash, reviewer_name: "Pemilik" })]),
    ).toBeNull();
    expect(isUstadzReviewer(" anas ")).toBe(true);
    expect(isUstadzReviewer("Agent QA")).toBe(false);
    expect(
      effectiveTakhrijReview(label, hash, [
        row({ label_hash: hash }),
        row({ label_hash: hash, reviewer_key: "c".repeat(64), decision: "unsure" }),
      ]),
    ).toBeNull();
    expect(
      effectiveTakhrijReview(label, hash, [
        row({ label_hash: hash }),
        row({
          label_hash: hash,
          reviewer_key: "c".repeat(64),
          decision: "corrected",
          kinds: ["mawquf"],
        }),
      ]),
    ).toBeNull();
    // Dua penilai sepakat: waktu tinjauan = yang terakhir.
    expect(
      effectiveTakhrijReview(label, hash, [
        row({ label_hash: hash }),
        row({
          label_hash: hash,
          reviewer_key: "c".repeat(64),
          updated_at: "2026-10-22T00:00:00.000Z",
        }),
      ])?.reviewed_at,
    ).toBe("2026-10-22T00:00:00.000Z");
  });

  test("label koreksi: istilah terdeteksi yang dibuang hilang, jenis tambahan tanpa frasa", () => {
    const corrected = reviewedTakhrijLabel(RAW, {
      decision: "corrected",
      kinds: ["mawquf", "mursal"],
      reviewed_at: "2026-10-21T00:00:00.000Z",
    });
    expect(corrected).toMatchObject({
      review: "corrected",
      kind: "terms",
      text: "takhrij menyebut: mauquf; mursal",
      weak: false,
      added: [{ kind: "mursal", gloss: "mursal" }],
    });
    // Frasa yang tersisa tetap rentang DB.
    expect(corrected.terms.map((t) => RAW.slice(t.char_start, t.char_end))).toEqual(["موقوفا"]);
    const approved = reviewedTakhrijLabel(RAW, {
      decision: "approved",
      kinds: ["mawquf", "daif", "lam_ajid"],
      reviewed_at: "x",
    });
    expect(approved).toMatchObject({ review: "approved", text: label.text, weak: true, added: [] });
    // Semua istilah dibuang: takhrij hanya menyebut sumber.
    expect(
      reviewedTakhrijLabel(RAW, { decision: "corrected", kinds: [], reviewed_at: "x" }),
    ).toMatchObject({ kind: "sources_only", weak: false, terms: [] });
  });

  test("sitasi sebagian: tinjauan hanya berlaku bila semua istilah ada di bagian itu", () => {
    const review = {
      decision: "approved" as const,
      kinds: label.terms.map((t) => t.kind),
      reviewed_at: "x",
    };
    const cut = RAW.indexOf("بإسناد");
    expect(reviewedTakhrijLabel(RAW, review, { start: cut, end: RAW.length })).toMatchObject({
      review: "rule",
      text: "takhrij menyebut: lemah; tidak ditemukan penakhrij",
    });
    expect(reviewedTakhrijLabel(RAW, review, { start: 0, end: RAW.length }).review).toBe(
      "approved",
    );
    expect(reviewedTakhrijLabel(RAW, null).review).toBe("rule");
    expect(reviewedTakhrijLabel("(٤) وقال فلان كلاما تجريبيا", review).review).toBe("rule");
  });

  test("peta tinjauan per catatan kaki", async () => {
    const map = await takhrijReviewsFor(
      [
        { id: 7, text_raw: RAW },
        { id: 8, text_raw: RAW },
      ],
      [row({ label_hash: hash }), row({ passage_id: 8, label_hash: "d".repeat(64) })],
    );
    expect([...map.keys()]).toEqual([7]);
  });
});

describe("takhrijReviewInput", () => {
  const input = {
    passage_id: 7,
    rules_version: 1,
    label_hash: "a".repeat(64),
    reviewer_name: "Anas",
    decision: "corrected",
    kinds: ["daif"],
    note: "",
  };
  test("koreksi wajib berisi jenis istilah yang dikenal", () => {
    expect(takhrijReviewInput.safeParse(input).success).toBe(true);
    expect(takhrijReviewInput.safeParse({ ...input, kinds: null }).success).toBe(false);
    expect(takhrijReviewInput.safeParse({ ...input, kinds: ["tidak_ada"] }).success).toBe(false);
    expect(takhrijReviewInput.safeParse({ ...input, decision: "approved" }).success).toBe(false);
    expect(
      takhrijReviewInput.safeParse({ ...input, decision: "approved", kinds: null }).success,
    ).toBe(true);
    expect(takhrijReviewInput.safeParse({ ...input, note: "a‮b" }).success).toBe(false);
  });
});
