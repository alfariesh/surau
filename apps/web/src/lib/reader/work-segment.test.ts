import type { EditionView, WorkView } from "@surau/core";

import { describe, expect, it } from "vite-plus/test";

import { editionSegment, parseWorkSegment, resolveEdition } from "./work-segment";

function edition(id: number, slug: string, isDefault: boolean): EditionView {
  return {
    id,
    slug,
    is_default: isDefault,
    source: "shamela",
    source_ref: "0",
    publisher: null,
    city: null,
    volumes: 1,
    license: "CC BY-NC-SA 4.0",
    attribution: "Fixture",
    permalink: isDefault ? "/kitab/uji" : `/kitab/uji@${slug}`,
  };
}

const WORK: WorkView = {
  slug: "uji",
  title_ar: "كتاب",
  title_id: "Kitab Uji",
  author: null,
  attribution_status: "authentic",
  original_language: "ar",
  period: null,
  openiti_uri: null,
  editions: [edition(1, "shamela", true), edition(2, "openiti", false)],
};

describe("parseWorkSegment", () => {
  it("karya saja, karya@edisi, dan @ yang masih ter-encode", () => {
    expect(parseWorkSegment("ihya")).toEqual({ workSlug: "ihya", editionSlug: null });
    expect(parseWorkSegment("ihya@dar-al-marifah")).toEqual({
      workSlug: "ihya",
      editionSlug: "dar-al-marifah",
    });
    expect(parseWorkSegment("ihya%40openiti")).toEqual({
      workSlug: "ihya",
      editionSlug: "openiti",
    });
  });

  it("menolak bentuk yang bukan slug", () => {
    for (const bad of [
      "",
      "Ihya",
      "ihya@",
      "@ihya",
      "ihya@a@b",
      "ihya ",
      "ihya--x",
      "%E0%A4%A",
      "a".repeat(131),
    ]) {
      expect(parseWorkSegment(bad), bad).toBeNull();
    }
  });
});

describe("resolveEdition", () => {
  it("tanpa @ = edisi default; edisi lain milik karya ini diterima", () => {
    expect(resolveEdition(WORK, null)).toEqual({ kind: "ok", edition: WORK.editions[0] });
    expect(resolveEdition(WORK, "openiti")).toEqual({ kind: "ok", edition: WORK.editions[1] });
  });

  it("@<edisi default> dialihkan ke URL kanonis; edisi asing = tidak ada", () => {
    expect(resolveEdition(WORK, "shamela")).toEqual({ kind: "redirect", segment: "uji" });
    expect(resolveEdition(WORK, "lain")).toEqual({ kind: "not_found" });
    expect(resolveEdition({ ...WORK, editions: [] }, null)).toEqual({ kind: "not_found" });
  });

  it("segmen kanonis", () => {
    expect(editionSegment(WORK, WORK.editions[0]!)).toBe("uji");
    expect(editionSegment(WORK, WORK.editions[1]!)).toBe("uji@openiti");
  });
});
