// Penanda ayat S13: round-trip placeholder, pemeriksaan keluaran LLM, dan aturan render label
// Kemenag (terpisah dari label "terjemahan AI"). Data buatan, bukan teks Al-Qur'an.
import { describe, expect, test } from "vite-plus/test";

import {
  ayahPlaceholder,
  ayahPlaceholderPattern,
  checkPlaceholders,
  maskAyat,
  translationSegments,
  unmaskAyat,
} from "./ayah-placeholder.ts";
import type { AyahRef, QuranView } from "./schema.ts";

const RAW = "قال تعالى {كلمة أولى ثانية} ثم قال وقوله تعالى {جملة ثالثة} فافهم";

function ref(text: string, surah: number, from: number, to: number, partial: boolean): AyahRef {
  const char_start = RAW.indexOf(text);
  return {
    char_start,
    char_end: char_start + text.length,
    surah,
    ayah_from: from,
    ayah_to: to,
    match: "exact",
    partial,
    bracketed: true,
    alt_count: 0,
    label: `QS Uji [${surah}]: ${from}`,
  };
}

const REFS = [ref("جملة ثالثة", 3, 7, 7, true), ref("كلمة أولى ثانية", 2, 4, 5, false)];

const QURAN: QuranView = {
  surahs: [],
  ayat: [
    {
      surah: 2,
      ayah: 4,
      juz: 1,
      text: "ا",
      translation: { text: "Terjemahan 2:4.", footnotes: [] },
      transliteration: null,
    },
    {
      surah: 2,
      ayah: 5,
      juz: 1,
      text: "ب",
      translation: { text: "Terjemahan 2:5.1)", footnotes: [{ marker: "1)", text: "Catatan." }] },
      transliteration: null,
    },
    {
      surah: 3,
      ayah: 7,
      juz: 1,
      text: "ج",
      translation: { text: "Terjemahan 3:7.", footnotes: [] },
      transliteration: null,
    },
  ],
  sources: [
    {
      id: "kemenag-id",
      kind: "translation",
      name: "Terjemahan Kemenag",
      version: "v-uji",
      license: "-",
      attribution: "-",
      url: "-",
    },
  ],
};

describe("placeholder", () => {
  test("format ⟦QS s:a⟧ / ⟦QS s:a-b⟧ dan cocok dengan regex", () => {
    expect(ayahPlaceholder({ surah: 2, ayah_from: 255, ayah_to: 255 })).toBe("⟦QS 2:255⟧");
    expect(ayahPlaceholder({ surah: 2, ayah_from: 255, ayah_to: 257 })).toBe("⟦QS 2:255-257⟧");
    expect(
      [..."x ⟦QS 2:255-257⟧ y ⟦QS 114:6⟧".matchAll(ayahPlaceholderPattern())].map((m) =>
        m.slice(1),
      ),
    ).toEqual([
      ["2", "255", "257"],
      ["114", "6", undefined],
    ]);
  });

  test("maskAyat mengganti kutipan (urut teks) dan unmaskAyat mengembalikan text_raw persis", () => {
    const masked = maskAyat(RAW, REFS);
    expect(masked.text).toBe("قال تعالى {⟦QS 2:4-5⟧} ثم قال وقوله تعالى {⟦QS 3:7⟧} فافهم");
    expect(masked.slots.map((s) => [s.placeholder, s.original])).toEqual([
      ["⟦QS 2:4-5⟧", "كلمة أولى ثانية"],
      ["⟦QS 3:7⟧", "جملة ثالثة"],
    ]);
    expect(unmaskAyat(masked)).toBe(RAW);
    // Tanpa rujukan: teks utuh, tanpa slot.
    expect(maskAyat(RAW, [])).toEqual({ text: RAW, slots: [] });
  });

  test("rujukan rusak (tumpang tindih, di luar teks) dilewati, teksnya dibiarkan", () => {
    const [a] = REFS.toSorted((x, y) => x.char_start - y.char_start);
    const overlap = { ...(a as AyahRef), char_start: (a as AyahRef).char_start + 2 };
    const outside = { ...(a as AyahRef), char_start: RAW.length, char_end: RAW.length + 5 };
    const masked = maskAyat(RAW, [a as AyahRef, overlap, outside]);
    expect(masked.slots).toHaveLength(1);
    expect(unmaskAyat(masked)).toBe(RAW);
  });
});

describe("placeholder + penanda catatan kaki", () => {
  const TEXT = "قال {كلمة (١) أولى} ثم";
  const marker = TEXT.indexOf("(١)");
  const fn = { marker: "١", char_start: marker, char_end: marker + 3, footnote_id: 9 };
  const span = "كلمة (١) أولى";
  const ayah: AyahRef = {
    char_start: TEXT.indexOf(span),
    char_end: TEXT.indexOf(span) + span.length,
    surah: 2,
    ayah_from: 4,
    ayah_to: 4,
    match: "exact",
    partial: true,
    bracketed: true,
    alt_count: 0,
    label: "QS Uji [2]: 4",
  };

  test("penanda di dalam kutipan tetap ada sesudah placeholder; round-trip utuh", () => {
    const masked = maskAyat(TEXT, [ayah], [fn]);
    expect(masked.text).toBe("قال {⟦QS 2:4⟧ (١)} ثم");
    expect(unmaskAyat(masked)).toBe(TEXT);
    expect(checkPlaceholders("Dia berkata ⟦QS 2:4⟧ (١) lalu", masked)).toEqual({ ok: true });
  });

  test("rujukan yang batasnya jatuh di tengah penanda dilewati (teks dibiarkan)", () => {
    const broken = { ...ayah, char_end: marker + 1 };
    expect(maskAyat(TEXT, [broken], [fn])).toEqual({ text: TEXT, slots: [] });
  });

  test("pola placeholder baru di setiap panggilan (tanpa lastIndex bersama)", () => {
    const a = ayahPlaceholderPattern();
    a.exec("⟦QS 1:1⟧");
    expect(ayahPlaceholderPattern().lastIndex).toBe(0);
    expect(ayahPlaceholderPattern("").test("x ⟦QS 1:1⟧")).toBe(true);
  });
});

describe("checkPlaceholders (keluaran LLM)", () => {
  const masked = maskAyat(RAW, REFS);

  test("urutan boleh berubah; semua placeholder harus ada tepat sekali", () => {
    expect(checkPlaceholders("Lalu ⟦QS 3:7⟧, dan firman-Nya ⟦QS 2:4-5⟧.", masked)).toEqual({
      ok: true,
    });
  });

  test("placeholder hilang, ganda, atau dikarang model → ditolak", () => {
    expect(checkPlaceholders("Hanya ⟦QS 3:7⟧.", masked)).toEqual({
      ok: false,
      missing: ["⟦QS 2:4-5⟧"],
      unexpected: [],
    });
    expect(checkPlaceholders("⟦QS 2:4-5⟧ ⟦QS 3:7⟧ ⟦QS 3:7⟧ ⟦QS 2:255⟧", masked)).toEqual({
      ok: false,
      missing: [],
      unexpected: ["⟦QS 3:7⟧", "⟦QS 2:255⟧"],
    });
  });
});

describe("translationSegments (aturan render)", () => {
  const masked = maskAyat(RAW, REFS);
  const text = "Allah berfirman ⟦QS 2:4-5⟧ kemudian ⟦QS 3:7⟧ pahamilah.";

  test("segmen AI berlabel ai_translation; ayat berlabel Kemenag dengan terjemahan verbatim + atribusi", () => {
    const segs = translationSegments(text, masked.slots, QURAN);
    expect(segs.map((s) => [s.kind, "label" in s ? s.label : null])).toEqual([
      ["ai", "ai_translation"],
      ["ayah", "kemenag"],
      ["ai", "ai_translation"],
      ["ayah", "kemenag_full_ayah"],
      ["ai", "ai_translation"],
    ]);
    const ayah = segs[1];
    expect(ayah?.kind === "ayah" && ayah.ayat).toEqual([
      { ayah: 4, text: "Terjemahan 2:4.", footnotes: [] },
      { ayah: 5, text: "Terjemahan 2:5.1)", footnotes: [{ marker: "1)", text: "Catatan." }] },
    ]);
    expect(ayah?.kind === "ayah" && ayah.attribution).toBe("Terjemahan Kemenag (v-uji)");
    // Teks AI tidak pernah memuat terjemahan Kemenag, dan sebaliknya.
    const ai = segs.filter((s) => s.kind === "ai").map((s) => (s.kind === "ai" ? s.text : ""));
    expect(ai.join("")).toBe("Allah berfirman  kemudian  pahamilah.");
    expect(ai.join("")).not.toContain("Terjemahan 2:4");
  });

  test("kutipan sebagian → label 'ayat lengkap', bukan potongan seolah terjemahan bagian itu", () => {
    const seg = translationSegments("⟦QS 3:7⟧", masked.slots, QURAN)[0];
    expect(seg).toMatchObject({ kind: "ayah", label: "kemenag_full_ayah" });
    expect(seg?.kind === "ayah" && seg.ayat.map((a) => a.text)).toEqual(["Terjemahan 3:7."]);
  });

  test("placeholder asing atau terjemahan tidak tersedia → invalid (tidak dirender sebagai terjemahan)", () => {
    expect(translationSegments("x ⟦QS 2:255⟧", masked.slots, QURAN)).toEqual([
      { kind: "ai", label: "ai_translation", text: "x " },
      { kind: "invalid", placeholder: "⟦QS 2:255⟧" },
    ]);
    expect(translationSegments("⟦QS 3:7⟧", masked.slots, null)).toEqual([
      { kind: "invalid", placeholder: "⟦QS 3:7⟧" },
    ]);
    const missing = { ...QURAN, ayat: QURAN.ayat.filter((a) => a.ayah !== 5) };
    expect(translationSegments("⟦QS 2:4-5⟧", masked.slots, missing)).toEqual([
      { kind: "invalid", placeholder: "⟦QS 2:4-5⟧" },
    ]);
  });
});
