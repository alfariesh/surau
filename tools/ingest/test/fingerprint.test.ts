import { describe, expect, test } from "vite-plus/test";

import {
  checkStability,
  compareFingerprints,
  fingerprintFile,
  fingerprintPath,
  fingerprints,
  formatFingerprints,
} from "../src/fingerprint.ts";

describe("sidik teks paragraf (#59)", () => {
  const old = fingerprints(7, [
    { id: 1, text_raw: "أ" },
    { id: 2, text_raw: "ب" },
    { id: 3, text_raw: "ج" },
  ]);

  test("ID hilang dan teks berubah dilaporkan; ID baru tidak", () => {
    const next = fingerprints(7, [
      { id: 1, text_raw: "أ" },
      { id: 3, text_raw: "ج!" },
      { id: 4, text_raw: "د" },
    ]);
    expect(compareFingerprints(old, next)).toEqual({ missing: [2], changed: [3] });
    expect(compareFingerprints(old, old)).toEqual({ missing: [], changed: [] });
  });

  test("format deterministik, urut ID, dan bisa dibaca ulang", () => {
    const text = formatFingerprints(
      fingerprints(7, [
        { id: 10, text_raw: "x" },
        { id: 2, text_raw: "y" },
      ]),
    );
    expect(Object.keys(fingerprintFile.parse(JSON.parse(text)).passage)).toEqual(["2", "10"]);
    expect(text.indexOf('"2"')).toBeLessThan(text.indexOf('"10"'));
    expect(fingerprintPath("data/ids/ihya-9472.json")).toBe("data/ids/ihya-9472.teks.json");
  });

  test("checkStability: koreksi hanya diterima per ID, ID hilang tidak pernah", () => {
    const next = fingerprints(7, [
      { id: 1, text_raw: "أ" },
      { id: 3, text_raw: "ج!" },
    ]);
    expect(checkStability(old, old)).toEqual({
      ok: true,
      detail: "3 ID lama ada dengan teks sama",
      report: [],
    });
    const r = checkStability(old, next, [2, 3]);
    expect(r.ok).toBe(false);
    expect(r.detail).toBe(
      "hilang 1; koreksi diterima 1; diterima tetapi tidak berubah 1 (daftar di bawah)",
    );
    expect(r.report).toContain("### Hilang (1)");
    expect(() => fingerprintPath("data/ids/peta")).toThrow(/\.json/);
  });
});
