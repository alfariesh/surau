import { describe, expect, test } from "vite-plus/test";

import { subheadingPartText, subheadingTitle, subheadingTocTargets } from "./subheading-title.ts";
import type { SubheadingSpanEntry } from "./subheading-title.ts";

// Teks buatan (bukan teks kitab).
describe("subheadingTocTargets", () => {
  test("subjudul utuh + lanjutan berantai, awal, akhir; plain dan judul node dilewati", () => {
    const entries = new Map<number, SubheadingSpanEntry>([
      [10, { kind: "heading" }],
      [11, { kind: "heading", of: 10 }],
      [12, { kind: "heading", of: 11 }],
      [20, { kind: "lead", end: 5 }],
      [30, { kind: "tail", start: 7 }],
      [40, { kind: "plain" }],
      [41, { kind: "tail", start: 3, node: 9 }],
      [50, { kind: "heading", of: 49 }],
    ]);
    expect(subheadingTocTargets(entries)).toEqual([
      {
        seq: 10,
        parts: [
          { seq: 10, start: null, end: null },
          { seq: 11, start: null, end: null },
          { seq: 12, start: null, end: null },
        ],
      },
      { seq: 20, parts: [{ seq: 20, start: null, end: 5 }] },
      { seq: 30, parts: [{ seq: 30, start: 7, end: null }] },
    ]);
  });
});

describe("subheadingPartText", () => {
  test("potongan offset tanpa penanda catatan kaki dan spasi tepi", () => {
    const text = "باب فضل (١) العلم وأهله";
    const at = text.indexOf("(١)");
    const markers = [{ char_start: at, char_end: at + 3 }];
    expect(subheadingPartText(text, { start: null, end: null }, markers)).toBe(
      "باب فضل  العلم وأهله",
    );
    expect(subheadingPartText(text, { start: null, end: at }, markers)).toBe("باب فضل");
    expect(subheadingPartText(text, { start: at + 4, end: null }, markers)).toBe("العلم وأهله");
    expect(subheadingPartText(" نص ", { start: null, end: null })).toBe("نص");
  });
});

describe("subheadingTitle", () => {
  test("bagian disambung satu spasi; berhenti di bagian pertama yang usang", () => {
    const target = {
      seq: 1,
      parts: [
        { seq: 1, start: null, end: null },
        { seq: 2, start: null, end: null },
        { seq: 3, start: null, end: null },
      ],
    };
    const rows = new Map([
      [1, { text: "باب ", markers: [] }],
      [2, { text: "العلم", markers: [] }],
      [3, { text: "وأهله", markers: [] }],
    ]);
    expect(subheadingTitle(target, (s) => rows.get(s) ?? null)).toBe("باب العلم وأهله");
    expect(subheadingTitle(target, (s) => (s === 2 ? null : (rows.get(s) ?? null)))).toBe("باب");
    expect(subheadingTitle(target, () => null)).toBe("");
  });
});
