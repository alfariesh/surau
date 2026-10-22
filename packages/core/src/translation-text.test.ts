// Pemeriksa teks terjemahan manusia (X08, ADR-081). Teks Arab buatan (bukan teks kitab atau ayat).
import { describe, expect, test } from "vite-plus/test";

import { validateTranslationText } from "./translation-text.ts";
import type { AyahRef } from "./schema.ts";

const ARABIC = "قال الشيخ (١) قال تعالى {كلمة أولى ثانية} ثم قال (٢) فافهم";

function ref(text: string, surah: number, from: number, to: number): AyahRef {
  const char_start = ARABIC.indexOf(text);
  return {
    char_start,
    char_end: char_start + text.length,
    surah,
    ayah_from: from,
    ayah_to: to,
    match: "exact",
    partial: false,
    bracketed: true,
    alt_count: 0,
    label: `QS Uji [${surah}]: ${from}`,
  };
}

const ctx = { arabic: ARABIC, ayahRefs: [ref("كلمة أولى ثانية", 2, 4, 5)] };
const VALID = 'Syaikh berkata (١): Allah berfirman ⟦QS 2:4-5⟧, lalu ia berkata (٢) "pahamilah".';
const codes = (text: string, base?: string) => {
  const r = validateTranslationText(text, { ...ctx, base });
  return { ok: r.ok, errors: r.errors.map((e) => e.code), warnings: r.warnings.map((w) => w.code) };
};

describe("validateTranslationText", () => {
  test("teks valid diterima", () => {
    expect(codes(VALID)).toEqual({ ok: true, errors: [], warnings: [] });
  });

  test("placeholder ayat hilang, berubah, atau ganda ditolak", () => {
    expect(codes(VALID.replace("⟦QS 2:4-5⟧", "")).errors).toEqual(["placeholder_missing"]);
    expect(codes(VALID.replace("⟦QS 2:4-5⟧", "⟦QS 2:4⟧")).errors).toEqual([
      "placeholder_missing",
      "placeholder_unexpected",
    ]);
    expect(codes(VALID.replace("⟦QS 2:4-5⟧", "⟦QS 2:4-5⟧ ⟦QS 2:4-5⟧")).errors).toEqual([
      "placeholder_unexpected",
    ]);
  });

  test("penanda catatan kaki: yang tidak ada di Arab ditolak, melengkapi yang ada diterima", () => {
    expect(codes(VALID.replace("(٢)", "(٣)")).errors).toEqual(["marker_unknown"]);
    expect(codes(VALID.replace("(٢)", "(٢) (٢)")).errors).toEqual(["marker_unknown"]);
    // Terjemahan dasar tanpa penanda (S13): editor boleh melengkapinya; yang masih hilang = peringatan.
    const without = VALID.replace(" (٢)", "");
    expect(codes(without)).toEqual({ ok: true, errors: [], warnings: ["marker_missing"] });
    expect(codes(VALID).ok).toBe(true);
    // Angka Latin dalam kurung bukan penanda sumber.
    expect(codes(`${VALID} Ada (2) hal.`).ok).toBe(true);
  });

  test("huruf Arab ditolak, penanda (١) berangka Arab-India diterima", () => {
    expect(codes(`${VALID} الصبر`).errors).toEqual(["arabic_letters"]);
    // Ligatur hormat dan simbol berskrip Arab (bukan kategori huruf) juga ditolak.
    for (const symbol of ["\uFDFD", "\uFD41", "\uFDFA", "\u06DE"])
      expect(codes(`${VALID} ${symbol}`).errors).toEqual(["arabic_letters"]);
    expect(codes(VALID).errors).not.toContain("arabic_letters");
  });

  test("kurung siku dan petik ganda harus berpasangan, kecuali dasarnya pun tidak", () => {
    expect(codes(`${VALID} [tambahan`).errors).toEqual(["brackets_unbalanced"]);
    expect(codes(`${VALID} ]x[`).errors).toEqual(["brackets_unbalanced"]);
    expect(codes(`${VALID} [kata [bersarang]]`).errors).toEqual(["brackets_unbalanced"]);
    expect(codes(`${VALID} [kata tambahan]`).ok).toBe(true);
    expect(codes(`${VALID} "kutipan`).errors).toEqual(["quotes_unbalanced"]);
    expect(codes(`${VALID} \u201Ckutipan`).errors).toEqual(["quotes_unbalanced"]);
    expect(codes(`${VALID} \u201Ckutipan\u201D`).ok).toBe(true);
    // Kutipan lintas paragraf: dasar juga tidak berpasangan → cukup peringatan.
    expect(codes(`${VALID} "kutipan`, 'Teks dasar "terbuka')).toEqual({
      ok: true,
      errors: [],
      warnings: ["quotes_unbalanced"],
    });
  });

  test("petik tunggal transliterasi diterima", () => {
    expect(codes(`${VALID} Mu'adz bin Jabal dan 'Ali.`).ok).toBe(true);
  });

  test("tag, Markdown, tautan, dan karakter kontrol ditolak", () => {
    for (const bad of [
      `${VALID} <b>tebal</b>`,
      `${VALID} **tebal**`,
      `${VALID} *miring*`,
      `${VALID} _miring_`,
      `# Judul\n${VALID}`,
      `${VALID} [teks](https://contoh.test)`,
      `- butir\n${VALID}`,
      `${VALID} \`kode\``,
    ])
      expect(codes(bad).errors).toContain("markup");
    expect(codes(`${VALID}\u202E`).errors).toContain("control_chars");
    expect(codes(`${VALID}\nBaris kedua.`).ok).toBe(true);
    // Kata dengan garis bawah atau bintang di tengah bukan Markdown miring.
    expect(codes(`${VALID} 5*3 dan a_b`).ok).toBe(true);
  });

  test("kosong dan terlalu panjang ditolak", () => {
    expect(codes("   ").errors).toEqual(["empty"]);
    expect(codes(`${VALID} ${"a".repeat(8000)}`).errors).toEqual(["too_long"]);
  });
});
