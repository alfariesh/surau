import { describe, expect, test } from "vite-plus/test";

import { planFtsQuery } from "./fts.ts";
import type { FtsQueryPlan } from "./fts.ts";
import { SNIPPET_CHARS, findPlanSpans, snippetSpan } from "./highlight.ts";

// Kalimat buatan dan hadits masyhur pendek (bukan salinan teks Shamela).
const plan = (q: string, suffix = false): FtsQueryPlan => {
  const p = planFtsQuery(q, { suffix });
  if (p === null) throw new Error(`kueri kosong: ${q}`);
  return p;
};
const slices = (raw: string, q: string, suffix = false): string[] =>
  findPlanSpans(raw, plan(q, suffix)).map((s) => raw.slice(s.start, s.end));

describe("findPlanSpans", () => {
  test("kata tunggal: semua bentuk berklitik, rentang = teks mentah bervokal", () => {
    const raw = "وَالصَّبْرُ ضِيَاءٌ، وَصَبْرٌ جَمِيلٌ، وَالصَّابِرُونَ";
    expect(slices(raw, "الصبر")).toEqual(["وَالصَّبْرُ", "وَصَبْرٌ"]);
    expect(slices(raw, "الصَّبْرُ")).toEqual(slices(raw, "صبر"));
  });

  test("frasa berharakat dan kunyah (أبو ↔ أبي)", () => {
    const raw = "قَالَ: إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ (١) عَنْ أَبِي هُرَيْرَةَ";
    expect(slices(raw, "انما الاعمال بالنيات")).toEqual(["إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ"]);
    expect(slices(raw, "أبو هريرة")).toEqual(["أَبِي هُرَيْرَةَ"]);
    // Penanda catatan kaki adalah pemisah, bukan bagian kata.
    expect(slices(raw, "بالنيات عن")).toEqual(["بِالنِّيَّاتِ (١) عَنْ"]);
  });

  test("sufiks (awalan stem) hanya bila diminta; ة → ت sebelum sufiks", () => {
    const raw = "صَبْرُهُ نِيَّتُهُ";
    expect(slices(raw, "الصبر")).toEqual([]);
    expect(slices(raw, "الصبر", true)).toEqual(["صَبْرُهُ"]);
    expect(slices(raw, "النية", true)).toEqual(["نِيَّتُهُ"]);
  });

  test("ligatur ﷺ: token hasil ekspansi menyorot satu karakter mentahnya", () => {
    const raw = "قال رسول الله ﷺ ذلك";
    expect(slices(raw, "صلى الله عليه وسلم")).toEqual(["ﷺ"]);
    expect(slices(raw, "الله")).toEqual(["الله", "ﷺ"]);
  });

  test("batas jumlah dan rencana tanpa frasa", () => {
    const raw = "علم علم علم";
    expect(findPlanSpans(raw, plan("علم"), 2)).toHaveLength(2);
    expect(findPlanSpans(raw, plan("علم"), 0)).toEqual([]);
    expect(findPlanSpans(raw, { stems: [], phrases: [], prefix: false })).toEqual([]);
    expect(findPlanSpans("", plan("علم"))).toEqual([]);
  });

  test("frasa terpanjang menang; tidak ada rentang tumpang tindih", () => {
    const raw = "طلب العلم فريضة";
    const p: FtsQueryPlan = { stems: ["طلب"], phrases: [["طلب"], ["طلب", "علم"]], prefix: false };
    expect(findPlanSpans(raw, p).map((s) => raw.slice(s.start, s.end))).toEqual(["طلب العلم"]);
  });
});

describe("snippetSpan", () => {
  const words = Array.from({ length: 60 }, (_, i) => `كَلِمَةٌ${i}`);
  const long = words.join(" ");

  test("teks pendek → seluruh teks (tanpa spasi tepi)", () => {
    expect(snippetSpan("  الصبر ضياء ", { start: 2, end: 7 })).toEqual({ start: 2, end: 12 });
    expect(snippetSpan("", undefined)).toEqual({ start: 0, end: 0 });
  });

  test("teks panjang: fokus di tengah, dipotong di batas kata, ±SNIPPET_CHARS", () => {
    const at = long.indexOf("كَلِمَةٌ30");
    const focus = { start: at, end: at + "كَلِمَةٌ30".length };
    const s = snippetSpan(long, focus);
    expect(s.start).toBeLessThanOrEqual(focus.start);
    expect(s.end).toBeGreaterThanOrEqual(focus.end);
    expect(long[s.start - 1]).toBe(" ");
    expect(long[s.end]).toBe(" ");
    expect(s.end - s.start).toBeLessThanOrEqual(SNIPPET_CHARS);
    expect(s.end - s.start).toBeGreaterThan(SNIPPET_CHARS - 2 * "كَلِمَةٌ30 ".length);
  });

  test("tanpa fokus → awal teks; fokus di awal dan di akhir", () => {
    const head = snippetSpan(long, undefined);
    expect(head.start).toBe(0);
    expect(long[head.end]).toBe(" ");
    const tailWord = words.at(-1) ?? "";
    const tail = snippetSpan(long, { start: long.length - tailWord.length, end: long.length });
    expect(tail.end).toBe(long.length);
    expect(long[tail.start - 1]).toBe(" ");
  });

  test("fokus lebih panjang dari ukuran potongan tetap utuh", () => {
    const s = snippetSpan(long, { start: 9, end: 300 }, 50);
    expect(s.start).toBeLessThanOrEqual(9);
    expect(s.end).toBeGreaterThanOrEqual(300);
  });

  test("fokus diawali tanda baca: mundur ke awal kata, bukan memotong", () => {
    const raw = `${"ب".repeat(100)} «الصبر» ${"ت ".repeat(100)}`;
    const at = raw.indexOf("الصبر");
    const s = snippetSpan(raw, { start: at, end: at + 5 }, 20);
    expect(raw.slice(s.start, at)).toBe("«");
  });

  test("fokus di luar teks ditolak", () => {
    expect(() => snippetSpan("abc", { start: 2, end: 9 })).toThrow(RangeError);
    expect(() => snippetSpan("abc", { start: 2, end: 1 })).toThrow(RangeError);
  });
});
