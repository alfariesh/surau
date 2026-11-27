import { describe, expect, test } from "vite-plus/test";

import {
  checkStability,
  compareFingerprints,
  fingerprintFile,
  fingerprintPath,
  fingerprints,
  formatFingerprints,
  withExcluded,
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

  test("checkStability: ID hilang hanya diterima bila tercantum sebagai teks penyunting (ADR-150)", () => {
    const next = fingerprints(7, [
      { id: 1, text_raw: "أ" },
      { id: 3, text_raw: "ج" },
    ]);
    // ID 2 dikecualikan: lolos, ID lain tetap sama.
    expect(checkStability(old, next, [], [2])).toEqual({
      ok: true,
      detail: "2 ID lama ada dengan teks sama; 1 dikecualikan sebagai teks penyunting (ADR-150)",
      report: [],
    });
    // ID hilang yang tidak tercantum tetap gagal, walau ID lain dikecualikan.
    const only1 = fingerprints(7, [{ id: 1, text_raw: "أ" }]);
    const r = checkStability(old, only1, [], [2]);
    expect(r.ok).toBe(false);
    expect(r.report).toContain("### Hilang (1)");
    expect(r.report).toContain("3");
    // Tanpa daftar pengecualian, hilangnya ID 2 gagal seperti biasa.
    expect(checkStability(old, next).ok).toBe(false);
    // ID yang dikecualikan tetapi masih dimuat juga gagal.
    const loaded = checkStability(old, old, [], [2]);
    expect(loaded.ok).toBe(false);
    expect(loaded.detail).toMatch(/dikecualikan tetapi masih dimuat 1/);
    // Pengecualian tidak meloloskan teks yang berubah.
    const shifted = fingerprints(7, [
      { id: 1, text_raw: "أ" },
      { id: 3, text_raw: "ب" },
    ]);
    expect(checkStability(old, shifted, [], [2]).ok).toBe(false);
  });

  test("withExcluded: sidik rilis ID yang dikecualikan tetap ditulis, ID lain dari build", () => {
    const next = fingerprints(7, [
      { id: 1, text_raw: "أ" },
      { id: 3, text_raw: "ج" },
    ]);
    expect(withExcluded(next, old, [2])).toEqual(old);
    expect(withExcluded(next, null, [2])).toEqual(next);
    expect(withExcluded(next, old, [])).toEqual(next);
    // ID dikecualikan yang tidak pernah dirilis diabaikan (tidak ada sidik untuk dibawa).
    expect(withExcluded(next, old, [9])).toEqual(next);
  });

  test("checkStability: pengecualian tidak meloloskan koreksi teks, dan sebaliknya", () => {
    const next = fingerprints(7, [
      { id: 1, text_raw: "أ" },
      { id: 3, text_raw: "ج" },
    ]);
    // ID 2 hilang; disebut sebagai koreksi teks (accepted) saja tidak cukup.
    expect(checkStability(old, next, [2]).ok).toBe(false);
    // Disebut di keduanya: hilang diterima sebagai pengecualian, tetapi "diterima tetapi tidak
    // berubah" tetap gagal supaya daftar koreksi tidak basi.
    const both = checkStability(old, next, [2], [2]);
    expect(both.ok).toBe(false);
    expect(both.detail).toMatch(/diterima tetapi tidak berubah 1/);
  });
});
