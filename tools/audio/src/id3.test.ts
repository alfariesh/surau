import { describe, expect, test } from "vite-plus/test";

import { id3v2, synchsafe } from "./id3.ts";
import type { Id3Tags } from "./id3.ts";

const TAGS: Id3Tags = {
  title: "Intisari: Kitab Ilmu",
  artist: "Dibacakan suara AI (Narator, elevenlabs eleven_v4)",
  album: "Intisari Ihya' 'Ulum ad-Din",
  language: "ind",
  date: "2026-10-25",
  copyright: "2026 Surau, CC BY-NC-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  sourceUrl: "https://surau.org/kitab/ihya/bab/100074/intisari",
  comment: "Intisari ini dibuat AI dan dibacakan suara AI.",
  extra: { AI_GENERATED: "Intisari: model; suara AI: elevenlabs" },
  encoder: "Surau tools/audio",
};

/** Bingkai ID3v2.4 → peta id → isi (teks UTF-8 tanpa byte encoding). */
function frames(tag: Uint8Array): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const size = (b: Uint8Array, at: number) =>
    (b[at]! << 21) | (b[at + 1]! << 14) | (b[at + 2]! << 7) | b[at + 3]!;
  let at = 10;
  while (at < tag.length) {
    const id = String.fromCharCode(...tag.subarray(at, at + 4));
    const n = size(tag, at + 4);
    const body = tag.subarray(at + 10, at + 10 + n);
    const text = new TextDecoder().decode(id.startsWith("W") ? body : body.subarray(1));
    out.set(id, [...(out.get(id) ?? []), text]);
    at += 10 + n;
  }
  return out;
}

describe("id3v2", () => {
  test("synchsafe 7 bit per byte; di luar 28 bit ditolak", () => {
    expect([...synchsafe(0)]).toEqual([0, 0, 0, 0]);
    expect([...synchsafe(255)]).toEqual([0, 0, 1, 127]);
    expect([...synchsafe(2 ** 28 - 1)]).toEqual([127, 127, 127, 127]);
    expect(() => synchsafe(2 ** 28)).toThrow(RangeError);
  });

  test("header v2.4 + bingkai label AI, lisensi, atribusi; deterministik", () => {
    const tag = id3v2(TAGS);
    expect(String.fromCharCode(...tag.subarray(0, 3))).toBe("ID3");
    expect([tag[3], tag[4], tag[5]]).toEqual([4, 0, 0]);
    const f = frames(tag);
    expect(f.get("TIT2")).toEqual(["Intisari: Kitab Ilmu"]);
    expect(f.get("TPE1")?.[0]).toContain("suara AI");
    expect(f.get("TCOP")).toEqual(["2026 Surau, CC BY-NC-SA 4.0"]);
    expect(f.get("WCOP")).toEqual(["https://creativecommons.org/licenses/by-nc-sa/4.0/"]);
    expect(f.get("COMM")?.[0]).toBe("ind\u0000Intisari ini dibuat AI dan dibacakan suara AI.");
    expect(f.get("TXXX")?.[0]).toBe("AI_GENERATED\u0000Intisari: model; suara AI: elevenlabs");
    expect(id3v2(TAGS)).toEqual(tag);
  });

  test("tanggal, tahun hak cipta, dan URL non-ASCII ditolak", () => {
    expect(() => id3v2({ ...TAGS, date: "25-10-2026" })).toThrow(/tanggal/u);
    expect(() => id3v2({ ...TAGS, copyright: "Surau" })).toThrow(/tahun/u);
    expect(() => id3v2({ ...TAGS, sourceUrl: "https://surau.org/é" })).toThrow(/ASCII/u);
  });
});
