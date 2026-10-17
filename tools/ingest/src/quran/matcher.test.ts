// Tes pencocok ayat dengan mushaf BUATAN (kalimat karangan, bukan teks Al-Qur'an): cocok persis,
// multi-ayat, ejaan berbeda (mirip), kurung kurawal yang bukan ayat, letak alternatif, dan kutipan
// tanpa kurung sesudah frasa pengantar.
import { describe, expect, test } from "vite-plus/test";

import {
  buildQuranIndex,
  exactHits,
  locate,
  matchPassage,
  semiGlobal,
  similarWord,
  wordDistance,
} from "./matcher.ts";
import type { AyahSpan } from "./matcher.ts";

const AYAT = [
  { surah: 1, ayah: 1, text: "باسم الكلمة الأولى" },
  { surah: 1, ayah: 2, text: "والصبر نور القلوب في الظلمات" },
  { surah: 1, ayah: 3, text: "والعلم ثمرة العمل الصالح" },
  { surah: 2, ayah: 1, text: "قل هل يستوي العالم والجاهل" },
  { surah: 2, ayah: 2, text: "إنما يتذكر أولو الألباب الصادقون من عباده المخلصين" },
  { surah: 2, ayah: 3, text: "والصبر نور القلوب في الظلمات" },
  { surah: 3, ayah: 1, text: "ثم قال لهم انظروا الى السماوات والأرض وما بينهما" },
  { surah: 3, ayah: 2, text: "فطوبى للصابرين الذين يذكرون ربهم بالليل والنهار" },
];
const index = buildQuranIndex(AYAT);

const quoted = (raw: string, s: { charStart: number; charEnd: number }) =>
  raw.slice(s.charStart, s.charEnd);
const brief = (s: AyahSpan) => ({
  ref: `${s.surah}:${s.ayahFrom}-${s.ayahTo}`,
  match: s.match,
  partial: s.partial,
  kind: s.kind,
  alt: s.alt,
});

describe("indeks dan letak", () => {
  test("exactHits di batas kata; locate memberi surah, rentang ayat, dan partial", () => {
    const hits = exactHits(index, ["نور", "القلوب"]);
    expect(hits).toHaveLength(2);
    expect(hits.map((h) => locate(index, h))).toEqual([
      { surah: 1, ayahFrom: 2, ayahTo: 2, partial: true },
      { surah: 2, ayahFrom: 3, ayahTo: 3, partial: true },
    ]);
    // "نو" bukan kata utuh.
    expect(exactHits(index, ["نو"])).toEqual([]);
  });

  test("rentang yang melintasi batas surah ditolak", () => {
    const hits = exactHits(index, ["الصالح", "قل", "هل"]);
    expect(hits).toHaveLength(1);
    expect(locate(index, hits[0] as { from: number; to: number })).toBeNull();
  });
});

describe("kemiripan huruf", () => {
  test("huruf lemah dan ه/ت setengah biaya", () => {
    expect(wordDistance("اولوا", "اولو")).toBe(0.5);
    expect(wordDistance("السموات", "السماوات")).toBe(0.5);
    expect(wordDistance("نعمه", "نعمت")).toBe(0.5);
    expect(wordDistance("كتب", "قلب")).toBe(2);
    expect(similarWord("اولوا", "اولو")).toBe(true);
    expect(similarWord("كتب", "قلب")).toBe(false);
    // Kata pendek (<3 huruf) harus sama persis.
    expect(similarWord("في", "فا")).toBe(false);
  });

  test("semiGlobal menjajarkan pola utuh ke potongan teks", () => {
    expect(semiGlobal("نور", "الصبرنورالقلوب")).toEqual({ cost: 0, start: 5, end: 8 });
  });
});

describe("bentang {…}", () => {
  test("cocok persis: harakat di kitab diabaikan, offset = isi kurung, letak lain dihitung", () => {
    const raw = "قال الشيخ {وَالصَّبْرُ نور القلوب في الظلمات} فاعلم ذلك";
    const m = matchPassage(index, raw);
    expect(m.rejected).toEqual([]);
    expect(m.spans.map(brief)).toEqual([
      { ref: "1:2-2", match: "exact", partial: false, kind: "bracketed", alt: 1 },
    ]);
    expect(quoted(raw, m.spans[0] as AyahSpan)).toBe("وَالصَّبْرُ نور القلوب في الظلمات");
  });

  test("multi-ayat: kutipan menyambung dua ayat; 2 kata tanpa pengantar dan lintas surah ditolak", () => {
    const raw =
      "{العمل الصالح} و {ثمرة العمل الصالح قل هل} و {في الظلمات والعلم ثمرة العمل الصالح}";
    const m = matchPassage(index, raw);
    // Bentang ketiga: akhir 1:2 (sebagian) + 1:3 utuh. "في الظلمات" juga akhir 2:3, tetapi 2:3
    // diikuti surah 3, jadi hanya satu letak.
    expect(m.spans.map(brief)).toEqual([
      { ref: "1:2-3", match: "exact", partial: true, kind: "bracketed", alt: 0 },
    ]);
    expect(m.rejected.map((r) => r.reason)).toEqual(["two_words_no_cue", "cross_surah"]);
  });

  test("beda ejaan (أولوا/أولو) → similar dengan skor", () => {
    const raw = "{إنما يتذكر أولوا الألباب الصادقون}";
    const [span] = matchPassage(index, raw).spans;
    expect(span && brief(span)).toEqual({
      ref: "2:2-2",
      match: "similar",
      partial: true,
      kind: "bracketed",
      alt: 0,
    });
    expect(span?.score).toBeGreaterThanOrEqual(0.93);
    expect(span?.score).toBeLessThan(1);
  });

  test("kurung yang bukan ayat: 1 kata, 2 kata tanpa pengantar, dan kalimat karangan ditolak", () => {
    const raw = "قال {وفيه} ثم {ثم قال} الحديث {هذه جملة لا توجد في الكتاب أصلا}";
    const m = matchPassage(index, raw);
    expect(m.spans).toEqual([]);
    expect(m.rejected.map((r) => [r.reason, r.tokens])).toEqual([
      ["one_word", 1],
      ["two_words_no_cue", 2],
      ["no_match", 7],
    ]);
  });

  test("2 kata diterima bila tepat didahului pengantar, ayat utuh, atau satu surah dengan kutipan sebelumnya", () => {
    expect(matchPassage(index, "وقد قال تعالى {ثم قال}").spans.map(brief)).toEqual([
      { ref: "3:1-1", match: "exact", partial: true, kind: "bracketed", alt: 0 },
    ]);
    // Pengantar jauh (4 kata sebelum kurung) tidak cukup.
    expect(matchPassage(index, "قوله تعالى كلام آخر هنا {ثم قال}").spans).toEqual([]);
    expect(
      matchPassage(index, "{قل هل يستوي العالم والجاهل} إلى قوله {الألباب الصادقون}").spans.map(
        (s) => s.surah,
      ),
    ).toEqual([2, 2]);
  });

  test("letak alternatif memilih surah kutipan sebelumnya di paragraf", () => {
    const raw = "{قل هل يستوي العالم والجاهل} ثم قال {والصبر نور القلوب في الظلمات}";
    const spans = matchPassage(index, raw).spans;
    expect(spans.map(brief)).toEqual([
      { ref: "2:1-1", match: "exact", partial: false, kind: "bracketed", alt: 0 },
      { ref: "2:3-3", match: "exact", partial: false, kind: "bracketed", alt: 1 },
    ]);
  });
});

describe("kutipan tanpa kurung sesudah pengantar", () => {
  test("berhenti di kata terakhir yang sama persis; kata penulis sesudahnya tidak ikut", () => {
    const raw = "وقال الله تعالى: فطوبى للصابرين الذين يذكرون ربهم بالليل فهذا بيان (١) لمن عقل";
    const [span, ...rest] = matchPassage(index, raw).spans;
    expect(rest).toEqual([]);
    expect(span && brief(span)).toEqual({
      ref: "3:2-2",
      match: "exact",
      partial: true,
      kind: "cue",
      alt: 0,
    });
    expect(span && quoted(raw, span)).toBe("فطوبى للصابرين الذين يذكرون ربهم بالليل");
  });

  test("ejaan berbeda di tengah kutipan (السموات) → similar; terlalu pendek atau bukan ayat ditolak", () => {
    const raw = "قال تعالى ثم قال لهم انظروا الى السموات والأرض وما بينهما";
    const [span] = matchPassage(index, raw).spans;
    expect(span && brief(span)).toEqual({
      ref: "3:1-1",
      match: "similar",
      partial: false,
      kind: "cue",
      alt: 0,
    });
    // 8 dari 9 kata sama persis (السموات ≠ السماوات).
    expect(span?.score).toBeCloseTo(8 / 9, 3);
    expect(matchPassage(index, "قال تعالى قل هل يستوي").spans).toEqual([]);
    expect(matchPassage(index, "قال الله تعالى أنا عند ظن عبدي بي").spans).toEqual([]);
  });

  test("kutipan berhenti sebelum kurung berikutnya; bentang berkurung tidak dihitung dua kali", () => {
    const raw = "قال تعالى {والعلم ثمرة العمل الصالح} وقال عز وجل والصبر نور القلوب في {الظلمات}";
    const m = matchPassage(index, raw);
    expect(m.spans.map((s) => [s.kind, quoted(raw, s), `${s.surah}:${s.ayahFrom}`, s.alt])).toEqual(
      [
        ["bracketed", "والعلم ثمرة العمل الصالح", "1:3", 0],
        // Lafaz ada di 1:2 dan 2:3: surah kutipan berkurung sebelumnya (1) dipilih.
        ["cue", "والصبر نور القلوب في", "1:2", 1],
      ],
    );
    expect(m.rejected.map((r) => r.reason)).toEqual(["one_word"]);
  });
});
