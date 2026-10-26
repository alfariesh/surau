import type { TakhrijReview } from "@surau/db";
import { TAKHRIJ_TERMS_VERSION } from "@surau/text";
import { describe, expect, test } from "vite-plus/test";

import { takhrijLabel, takhrijStatus } from "./takhrij-label.ts";
import {
  effectiveTakhrijReview,
  isUstadzReviewer,
  parseUstadzKeys,
  reviewedTakhrijLabel,
  takhrijLabelHash,
  takhrijReviewInput,
  takhrijReviewsFor,
} from "./takhrij-review.ts";

// Kalimat BUATAN bergaya takhrij (bukan teks kitab).
const RAW = "حديث تجريبي رواه فلان موقوفا بإسناد ضعيف ولم أجده";
const label = takhrijLabel(RAW);
const KEYS = new Set(["b".repeat(64)]);
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
  const eff = (rows: TakhrijReview[], keys = KEYS) =>
    effectiveTakhrijReview(label, hash, rows, keys);
  test("sidik label stabil dan berubah bila istilah/rentang berubah", async () => {
    expect(hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(await takhrijLabelHash(takhrijLabel(RAW))).toBe(hash);
    expect(await takhrijLabelHash(takhrijLabel(`(١) ${RAW}`))).not.toBe(hash);
    // Arti baku atau kalimat status yang berubah tanpa naik versi juga membatalkan tinjauan.
    expect(await takhrijLabelHash({ ...label, text: `${label.text}.` })).not.toBe(hash);
    expect(
      await takhrijLabelHash({
        ...label,
        terms: label.terms.map((t, i) => (i === 0 ? { ...t, gloss: "lain" } : t)),
      }),
    ).not.toBe(hash);
  });

  test("hanya akun ustadz peninjau terdaftar DAN namanya yang dipakai", () => {
    expect(eff([row({ label_hash: hash })], new Set())).toBeNull();
    expect(eff([row({ label_hash: hash, reviewer_key: "c".repeat(64) })])).toBeNull();
    expect(eff([row({ label_hash: hash })])?.decision).toBe("approved");
    expect([...parseUstadzKeys(` ${"b".repeat(64)} ,bukan-kunci,,${"c".repeat(64)}`)]).toEqual([
      "b".repeat(64),
      "c".repeat(64),
    ]);
    expect(parseUstadzKeys(undefined).size).toBe(0);
  });

  test("setuju, koreksi, dan koreksi yang sama dengan deteksi", () => {
    expect(eff([row({ label_hash: hash })])).toMatchObject({
      decision: "approved",
      kinds: ["mawquf", "daif", "lam_ajid"],
    });
    expect(
      eff([row({ label_hash: hash, decision: "corrected", kinds: ["mawquf", "mursal"] })]),
    ).toMatchObject({ decision: "corrected", kinds: ["mawquf", "mursal"] });
    expect(
      eff([row({ label_hash: hash, decision: "corrected", kinds: ["lam_ajid", "daif", "mawquf"] })])
        ?.decision,
    ).toBe("approved");
  });

  test("tidak berlaku: label/versi lain, bukan ustadz peninjau, ragu, atau penilai tidak sepakat", () => {
    expect(eff([row({ label_hash: "c".repeat(64) })])).toBeNull();
    expect(eff([row({ label_hash: hash, rules_version: 99 })])).toBeNull();
    expect(eff([row({ label_hash: hash, reviewer_name: " agent QA " })])).toBeNull();
    expect(eff([row({ label_hash: hash, reviewer_name: "Pemilik" })])).toBeNull();
    expect(isUstadzReviewer(" anas ")).toBe(true);
    expect(isUstadzReviewer("Agent QA")).toBe(false);
    // Dua akun ustadz terdaftar.
    const TWO = new Set(["b".repeat(64), "c".repeat(64)]);
    expect(
      eff(
        [
          row({ label_hash: hash }),
          row({ label_hash: hash, reviewer_key: "c".repeat(64), decision: "unsure" }),
        ],
        TWO,
      ),
    ).toBeNull();
    expect(
      eff(
        [
          row({ label_hash: hash }),
          row({
            label_hash: hash,
            reviewer_key: "c".repeat(64),
            decision: "corrected",
            kinds: ["mawquf"],
          }),
        ],
        TWO,
      ),
    ).toBeNull();
    // Dua penilai sepakat: waktu tinjauan = yang terakhir.
    expect(
      eff(
        [
          row({ label_hash: hash }),
          row({
            label_hash: hash,
            reviewer_key: "c".repeat(64),
            updated_at: "2026-10-22T00:00:00.000Z",
          }),
        ],
        TWO,
      )?.reviewed_at,
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
      // Jenis tambahan penilai disebut terpisah, tidak pernah sebagai isi takhrij.
      text: "takhrij menyebut: mauquf; menurut peninjau: mursal",
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
    // Hanya jenis tambahan: tanpa "takhrij menyebut".
    expect(
      reviewedTakhrijLabel(RAW, { decision: "corrected", kinds: ["sahih"], reviewed_at: "x" }).text,
    ).toBe("menurut peninjau: sahih");
    expect(takhrijStatus(["mawquf"], ["sahih", "daif"])).toMatchObject({
      mixed: true,
      text: "takhrij menyebut: mauquf; menurut peninjau: sahih; lemah (berbeda per jalur)",
    });
  });

  test("sitasi sebagian: tinjauan diterapkan pada istilah di bagian itu; yang ditolak tidak muncul lagi", () => {
    const review = {
      decision: "approved" as const,
      kinds: label.terms.map((t) => t.kind),
      reviewed_at: "x",
    };
    const cut = RAW.indexOf("بإسناد");
    const tail = { start: cut, end: RAW.length };
    expect(reviewedTakhrijLabel(RAW, review, tail)).toMatchObject({
      review: "approved",
      text: "takhrij menyebut: lemah; tidak ditemukan penakhrij",
    });
    // Penilai menolak "lemah" (mis. bagian lafaz): sitasi sebagian tidak menyebutnya lagi.
    const noWeak = {
      decision: "corrected" as const,
      kinds: ["mawquf" as const, "lam_ajid" as const],
      reviewed_at: "x",
    };
    const part = reviewedTakhrijLabel(RAW, noWeak, tail);
    expect(part).toMatchObject({
      review: "corrected",
      text: "takhrij menyebut: tidak ditemukan penakhrij",
      weak: true,
    });
    expect(part.terms.map((t) => t.kind)).toEqual(["lam_ajid"]);
    // Bagian tanpa istilah yang dipilih (yang dipilih ada di luar bagian).
    expect(reviewedTakhrijLabel(RAW, noWeak, { start: 0, end: RAW.indexOf("موقوفا") }).text).toBe(
      "bagian takhrij yang dikutip tidak memuat istilah penilaian",
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
      KEYS,
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
    expect(takhrijReviewInput.safeParse({ ...input, note: "a\u202eb" }).success).toBe(false);
    // Penilai tidak menulis teks Arab (aturan teks-arab no. 1).
    const arabic = "\u0636\u0639\u064a\u0641";
    expect(takhrijReviewInput.safeParse({ ...input, note: `istilah ${arabic}` }).success).toBe(
      false,
    );
    expect(takhrijReviewInput.safeParse({ ...input, reviewer_name: arabic }).success).toBe(false);
  });
});

describe("tinjauan label catatan kaki tergabung (versi 2, ADR-108)", () => {
  // Dua takhrij dalam satu paragraf: tinjauan menilai label hadits pertama saja.
  const merged = "حديث تجريبي أخرجه فلان بإسناد صحيح (٤) حديث تجريبي آخر رواه فلان بسند ضعيف";
  const second = { start: merged.indexOf("(٤)"), end: merged.length };
  test("sitasi di segmen lain tidak memakai tinjauan hadits pertama", () => {
    const corrected = {
      decision: "corrected" as const,
      kinds: ["hasan" as const],
      reviewed_at: "x",
    };
    expect(reviewedTakhrijLabel(merged, corrected)).toMatchObject({
      review: "corrected",
      text: "menurut peninjau: hasan (hadits pertama dari beberapa)",
    });
    expect(reviewedTakhrijLabel(merged, corrected, second)).toMatchObject({
      review: "rule",
      text: "takhrij menyebut: lemah",
    });
  });
});
