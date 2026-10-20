import { describe, expect, test } from "vite-plus/test";

import {
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
});
