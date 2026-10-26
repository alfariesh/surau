// Tes pencocok ayat dengan mushaf BUATAN (kalimat karangan, bukan teks Al-Qur'an): cocok persis,
// multi-ayat, ejaan berbeda (mirip), kurung kurawal yang bukan ayat, letak alternatif, dan kutipan
// tanpa kurung sesudah frasa pengantar, serta kutipan tanpa tanda (S13).
import { describe, expect, test } from "vite-plus/test";

import {
  buildQuranIndex,
  crossPassageSpans,
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
  // Dua letak sama panjang, beda satu ejaan (السماوات/السموات): uji pilihan letak tanpa kurung.
  { surah: 4, ayah: 1, text: "فانظر إلى العرش والسماوات العالية" },
  { surah: 5, ayah: 1, text: "فانظر إلى العرش والسموات العالية" },
  // Memuat kalimat tauhid: uji pengecualian mode tanpa tanda.
  { surah: 6, ayah: 1, text: "وقل للحاضرين لا إله إلا هو ربكم" },
  // "يا قوم" di tiga letak: lafaz umum, tidak ditautkan sebagai kutipan pendek.
  { surah: 7, ayah: 1, text: "يا قوم اعملوا" },
  { surah: 7, ayah: 2, text: "يا قوم انظروا" },
  { surah: 7, ayah: 3, text: "يا قوم اسمعوا" },
  // Ejaan mushaf "أين ما" (dua kata) vs sumber "أينما": uji perpanjangan kutipan pendek.
  { surah: 8, ayah: 1, text: "وهو معكم أين ما كنتم تذكرون" },
  // Kutipan pendek yang berlanjut > 4 kata dengan satu beda ejaan (أولوا/أولو) di tengah.
  { surah: 9, ayah: 1, text: "ولا يغفل أولو النهى منكم والسعة عن ذكره" },
  // X21: kutipan di konteks hadits. Delapan kata (panjang), lima kata utuh satu ayat, lima kata
  // di awal ayat yang lebih panjang (sebagian), dan zikir yang kebetulan sama dengan ayat.
  { surah: 10, ayah: 1, text: "والحكمة تنفع الناس في الدنيا ويبقى الخير للصالحين" },
  { surah: 10, ayah: 2, text: "ثم أمر عباده بالصدق والصبر" },
  { surah: 10, ayah: 3, text: "وأوصى بالحق لمن سلك الطريق القويم الهادي إلى النور" },
  { surah: 11, ayah: 1, text: "له الملك وله الحمد وهو على كل شيء قدير" },
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
    // Kata pendek (<3 huruf) harus sama persis; kata ganti berbeda (ربك/ربه) bukan beda ejaan.
    expect(similarWord("في", "فا")).toBe(false);
    expect(similarWord("ربك", "ربه")).toBe(false);
    expect(similarWord("الصالحين", "الصالحون")).toBe(true);
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
    const raw =
      "قال {وفيه} ثم {ثم قال} الحديث {هذه جملة لا توجد في الكتاب أصلا} و {العلم ثمره العمل}";
    const m = matchPassage(index, raw);
    expect(m.spans).toEqual([]);
    // 3 kata tidak persis tanpa pengantar: cocok mirip tidak dicoba (bukan "tidak ada di mushaf").
    expect(m.rejected.map((r) => [r.reason, r.tokens])).toEqual([
      ["one_word", 1],
      ["two_words_no_cue", 2],
      ["no_match", 7],
      ["short_inexact", 3],
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
    // 3 kata langka sesudah pengantar: kutipan pendek (S13), bukan mode pengantar biasa.
    expect(matchPassage(index, "قال تعالى قل هل يستوي").spans.map(brief)).toEqual([
      { ref: "2:1-1", match: "exact", partial: true, kind: "cue_short", alt: 0 },
    ]);
    expect(matchPassage(index, "قال الله تعالى أنا عند ظن عبدي بي").spans).toEqual([]);
  });

  test("dua letak sama panjang: yang lafaznya sama persis dipilih, label dan alt mengikuti letak itu", () => {
    const raw = "قال تعالى فانظر إلى العرش والسموات العالية ثم تفكر";
    const [span, ...rest] = matchPassage(index, raw).spans;
    expect(rest).toEqual([]);
    // 4:1 lebih dulu di mushaf tetapi beda ejaan; 5:1 sama persis → exact, tanpa letak lain.
    expect(span && brief(span)).toEqual({
      ref: "5:1-1",
      match: "exact",
      partial: false,
      kind: "cue",
      alt: 0,
    });
    expect(span?.score).toBe(1);
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

describe("kutipan pendek sesudah pengantar (S13)", () => {
  test("2 kata langka tepat sesudah قال تعالى dikenali; lafaz umum (≥3 letak) tidak", () => {
    const raw = "ولذلك قال تعالى والعلم ثمرة لمن عقل";
    expect(
      matchPassage(index, raw).spans.map((s) => [s.kind, quoted(raw, s), s.surah, s.ayahFrom]),
    ).toEqual([["cue_short", "والعلم ثمرة", 1, 3]]);
    expect(matchPassage(index, "قال تعالى يا قوم هذا كلام").spans).toEqual([]);
    // 2 kata berawalan kata fungsi (pola hadits qudsi "قال الله تعالى لا يزال …") tidak ditautkan,
    // walaupun lafaznya hanya ada di satu letak (3:1).
    expect(matchPassage(index, "قال الله تعالى إلى السماوات ثم سكت").spans).toEqual([]);
    // Tanpa pengantar, 2 kata tidak pernah dihitung.
    expect(matchPassage(index, "كتب والعلم ثمرة لمن عقل").spans).toEqual([]);
  });
});

describe("kutipan tanpa tanda (S13)", () => {
  test("≥5 kata sama persis di tengah kalimat dikenali, tanpa kurung dan tanpa pengantar", () => {
    const raw = "كتب الشيخ في رسالته فطوبى للصابرين الذين يذكرون ربهم ثم سكت";
    const [span, ...rest] = matchPassage(index, raw).spans;
    expect(rest).toEqual([]);
    expect(span && brief(span)).toEqual({
      ref: "3:2-2",
      match: "exact",
      partial: true,
      kind: "unmarked",
      alt: 0,
    });
    expect(span && quoted(raw, span)).toBe("فطوبى للصابرين الذين يذكرون ربهم");
  });

  test("4 kata hanya dikenali sesudah kata kutip, termasuk kurung yang salah tempat {وقال}", () => {
    expect(matchPassage(index, "كتب الشيخ فطوبى للصابرين الذين يذكرون").spans).toEqual([]);
    const raw = "ثم ذكر الحال {وقال} فطوبى للصابرين الذين يذكرون";
    const m = matchPassage(index, raw);
    expect(m.spans.map((s) => [s.kind, quoted(raw, s)])).toEqual([
      ["unmarked", "فطوبى للصابرين الذين يذكرون"],
    ]);
    expect(m.rejected.map((r) => r.reason)).toEqual(["one_word"]);
  });

  test("kalimat tauhid saja tidak dihitung sebagai kutipan ayat", () => {
    expect(matchPassage(index, "فقال لا إله إلا هو").spans).toEqual([]);
    const raw = "فقال لا إله إلا هو ربكم";
    expect(matchPassage(index, raw).spans.map((s) => [s.kind, quoted(raw, s)])).toEqual([
      ["unmarked", "لا إله إلا هو ربكم"],
    ]);
  });

  test("tidak menumpuk bentang berkurung; sambungan ke ayat berikutnya jadi rujukan sendiri", () => {
    const raw = "{قل هل يستوي العالم والجاهل} إنما يتذكر أولو الألباب الصادقون";
    expect(matchPassage(index, raw).spans.map(brief)).toEqual([
      { ref: "2:1-1", match: "exact", partial: false, kind: "bracketed", alt: 0 },
      { ref: "2:2-2", match: "exact", partial: true, kind: "unmarked", alt: 0 },
    ]);
  });

  test("lafaz yang ada di beberapa letak tidak ditautkan (letaknya sembarang)", () => {
    expect(matchPassage(index, "ويقال والصبر نور القلوب في الظلمات").spans).toEqual([]);
  });

  test("قال/قوله saja bukan pengantar ayat; konteks hadits dan basmalah pembuka dikecualikan", () => {
    // 4 kata sesudah "قال" (ucapan orang) tidak cukup; sesudah "تعالى" cukup.
    expect(matchPassage(index, "ولكن قال فطوبى للصابرين الذين يذكرون").spans).toEqual([]);
    expect(
      matchPassage(index, "وقرأ فطوبى للصابرين الذين يذكرون").spans.map((s) => s.kind),
    ).toEqual(["unmarked"]);
    // Lafaz Qur'ani di dalam sabda Nabi (tanpa "قرأ" di antaranya) = lafaz hadits.
    expect(
      matchPassage(index, "قال النبي صلى الله عليه وسلم فطوبى للصابرين الذين يذكرون ربهم").spans,
    ).toEqual([]);
    expect(
      matchPassage(
        index,
        "قال النبي صلى الله عليه وسلم ثم قرأ فطوبى للصابرين الذين يذكرون ربهم",
      ).spans.map((s) => s.kind),
    ).toEqual(["unmarked"]);
  });

  test("mode S13 hanya bila diminta (paragraf badan)", () => {
    const raw = "كتب الشيخ في رسالته فطوبى للصابرين الذين يذكرون ربهم ثم سكت";
    expect(matchPassage(index, raw, { extended: false }).spans).toEqual([]);
    expect(matchPassage(index, "قال تعالى قل هل يستوي", { extended: false }).spans).toEqual([]);
  });
});

describe("perbaikan tinjauan kedua S13", () => {
  test("kutipan pendek diperpanjang melewati beda ejaan di ayat yang sama (أينما = أين ما)", () => {
    const raw = "قال تعالى وهو معكم أينما كنتم ثم قال كذا";
    const [span, ...rest] = matchPassage(index, raw).spans;
    expect(rest).toEqual([]);
    expect(span && quoted(raw, span)).toBe("وهو معكم أينما كنتم");
    expect(span).toMatchObject({ kind: "cue_short", match: "similar", surah: 8, ayahFrom: 1 });
  });

  test("perpanjangan kutipan pendek tidak berhenti di 4 kata; tidak ada placeholder ganda", () => {
    const raw = "قال تعالى ولا يغفل أولوا النهى منكم والسعة عن ذكره فهذا كلام الشيخ";
    const spans = matchPassage(index, raw).spans;
    expect(spans.map((s) => [s.kind, quoted(raw, s), s.match])).toEqual([
      ["cue_short", "ولا يغفل أولوا النهى منكم والسعة عن ذكره", "similar"],
    ]);
  });

  test("{ثم قال} yang dikurung sumber = pengantar ayat", () => {
    const raw = "كتب {ثم قال} فطوبى للصابرين الذين يذكرون";
    expect(matchPassage(index, raw).spans.map((s) => [s.kind, quoted(raw, s)])).toEqual([
      ["unmarked", "فطوبى للصابرين الذين يذكرون"],
    ]);
  });

  test("lafaz berulang diterima bila tepat didahului عز وجل (letak dipilih aturan S12)", () => {
    const [span] = matchPassage(index, "كقوله عز وجل والصبر نور القلوب في الظلمات").spans;
    expect(span).toMatchObject({ kind: "unmarked", alt: 1, partial: false });
  });

  test("zikir 'لا شريك له' dan deret dalam hadits ditolak seluruhnya (ekornya tidak dicoba)", () => {
    expect(matchPassage(index, "لا شريك له فطوبى للصابرين الذين يذكرون ربهم").spans).toEqual([]);
    // Tanpa lompat seluruh deret, ekor 5 kata "للصابرين الذين يذكرون ربهم بالليل" akan tertaut.
    expect(
      matchPassage(index, "قال النبي صلى الله عليه وسلم فطوبى للصابرين الذين يذكرون ربهم بالليل")
        .spans,
    ).toEqual([]);
  });
});

describe("kutipan Qur'ani di konteks hadits (X21, ADR-107)", () => {
  const kinds = (raw: string) => matchPassage(index, raw).spans.map((s) => [s.kind, s.surah]);

  test("deret panjang (≥ 8 kata) diterima walau di sabda/ucapan sahabat", () => {
    expect(
      kinds("قال النبي صلى الله عليه وسلم والحكمة تنفع الناس في الدنيا ويبقى الخير للصالحين"),
    ).toEqual([["unmarked", 10]]);
  });

  test("seluruh satu ayat (≥ 5 kata) diterima; lima kata sebagian ayat ditolak", () => {
    expect(kinds("فقال النبي صلى الله عليه وسلم ثم أمر عباده بالصدق والصبر")).toEqual([
      ["unmarked", 10],
    ]);
    expect(kinds("فقال النبي صلى الله عليه وسلم وأوصى بالحق لمن سلك الطريق")).toEqual([]);
  });

  test("kata wahyu di dekatnya = ayat, bukan lafaz hadits", () => {
    // "أوحي إلى رسول الله صلى الله عليه وسلم أن …": رسول di antara kata wahyu dan kutipan.
    expect(
      kinds("ولكن أوحي إلى رسول الله صلى الله عليه وسلم أن وأوصى بالحق لمن سلك الطريق"),
    ).toEqual([["unmarked", 10]]);
    // Kata wahyu di luar jendela 16 kata, atau kata "nazala" biasa, tidak membuka pengecualian.
    expect(
      kinds(
        "أوحي كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة قال النبي صلى الله عليه وسلم وأوصى بالحق لمن سلك الطريق",
      ),
    ).toEqual([]);
    expect(kinds("نزل ضيف عند النبي صلى الله عليه وسلم وأوصى بالحق لمن سلك الطريق")).toEqual([]);
    // Kata wahyu sesudah kutipan tidak ikut dihitung.
    expect(kinds("قال النبي صلى الله عليه وسلم وأوصى بالحق لمن سلك الطريق ثم أوحي")).toEqual([]);
  });

  test("zikir yang kebetulan sama dengan ayat tetap ditolak walau panjang", () => {
    expect(kinds("لا إله إلا الله وحده لا شريك له له الملك وله الحمد وهو على كل شيء قدير")).toEqual(
      [],
    );
  });
});

describe("kutipan terbelah dua paragraf (X02)", () => {
  const side = (raw: string) => ({ raw, taken: [] });
  const text = (raw: string, sp: AyahSpan) => raw.slice(sp.charStart, sp.charEnd);

  test("deret persis yang melintasi batas → dua bentang sebagian untuk ayat yang sama", () => {
    const a = "وكان يقول دائما إنما يتذكر أولو";
    const b = "الألباب الصادقون من عباده فاعلم ذلك";
    const pair = crossPassageSpans(index, side(a), side(b));
    expect(pair).not.toBeNull();
    const [sa, sb] = pair as [AyahSpan, AyahSpan];
    expect(text(a, sa)).toBe("إنما يتذكر أولو");
    expect(text(b, sb)).toBe("الألباب الصادقون من عباده");
    for (const sp of [sa, sb]) {
      expect(sp).toMatchObject({ surah: 2, ayahFrom: 2, ayahTo: 2, partial: true, kind: "cross" });
    }
    expect([sa.tokens, sb.tokens]).toEqual([3, 4]);
  });

  test("4 kata hanya bila didahului pengantar ayat", () => {
    expect(
      crossPassageSpans(index, side("وقد ذكرنا إنما يتذكر"), side("أولو الألباب ثم انصرف")),
    ).toBeNull();
    const pair = crossPassageSpans(
      index,
      side("قال تعالى إنما يتذكر"),
      side("أولو الألباب ثم انصرف"),
    );
    expect(pair?.[1]).toMatchObject({ surah: 2, ayahFrom: 2, tokens: 2 });
  });

  test("ditolak: lafaz berulang tanpa pengantar, konteks hadits, tidak melintasi batas", () => {
    // 1:2 = 2:3 (lafaz berulang).
    expect(
      crossPassageSpans(index, side("فقال والصبر نور"), side("القلوب في الظلمات كذلك")),
    ).toBeNull();
    expect(
      crossPassageSpans(
        index,
        side("قال رسول الله إنما يتذكر أولو"),
        side("الألباب الصادقون من عباده"),
      ),
    ).toBeNull();
    // Satu kata di seberang batas: sering kalimat penulis sendiri.
    expect(
      crossPassageSpans(index, side("فقال إنما يتذكر أولو الألباب الصادقون من"), side("عباده كلهم")),
    ).toBeNull();
    // Seluruh kutipan di paragraf pertama: urusan matchPassage, bukan lintas paragraf.
    expect(
      crossPassageSpans(index, side("إنما يتذكر أولو الألباب الصادقون"), side("ثم انصرف الى بيته")),
    ).toBeNull();
  });

  test("kata yang sudah dipakai bentang lain tidak dipakai lagi", () => {
    const a = "وكان يقول دائما إنما يتذكر أولو";
    const taken = [{ charStart: a.indexOf("أولو"), charEnd: a.length }];
    expect(
      crossPassageSpans(index, { raw: a, taken }, side("الألباب الصادقون من عباده")),
    ).toBeNull();
  });
});
