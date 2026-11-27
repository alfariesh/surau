import { describe, expect, test } from "vite-plus/test";

import {
  TRANSLATE_NOTES,
  TRANSLATE_PROMPT,
  buildTranslateRequest,
  translatePromptFor,
} from "./translate.ts";
import type { TranslateInput } from "./translate.ts";

// Kalimat Arab buatan (bukan teks kitab).
const INPUT: TranslateInput = {
  passageId: 40_000_001,
  heading: "باب مصنوع",
  previous: null,
  masked: { text: "كلام مصنوع للاختبار", slots: [] },
  markers: [],
};

describe("translatePromptFor (ADR-149)", () => {
  test("tanpa petunjuk: prompt bawaan apa adanya (kitab lain tidak berubah)", () => {
    const p = translatePromptFor(TRANSLATE_PROMPT);
    expect(p).toBe(TRANSLATE_PROMPT);
    expect(buildTranslateRequest(INPUT, undefined, { prompt: p })).toEqual(
      buildTranslateRequest(INPUT),
    );
  });

  test("dengan petunjuk: teks di ujung prompt sistem, versi tercatat bergabung", () => {
    const note = TRANSLATE_NOTES.ajurrumiyyah;
    const p = translatePromptFor(TRANSLATE_PROMPT, note);
    expect(p.id).toBe(`${TRANSLATE_PROMPT.id}+nahwu-ajurrumiyyah@1`);
    expect(p.system.startsWith(TRANSLATE_PROMPT.system)).toBe(true);
    expect(p.system.endsWith(note.text)).toBe(true);
    const req = buildTranslateRequest(INPUT, undefined, { prompt: p });
    const system = req.system as { text: string }[];
    expect(system[0]?.text).toBe(p.system);
  });

  test("petunjuk Ajurrumiyyah meminta transliterasi dan tidak memuat huruf Arab", () => {
    const { text } = TRANSLATE_NOTES.ajurrumiyyah;
    expect(text).toMatch(/transliterasi/);
    expect(text).not.toMatch(/[؀-ۿ]/);
  });

  test("petunjuk at-Ta'rifat: istilah ditransliterasi, tanpa huruf Arab, rasio bawaan", () => {
    const note = TRANSLATE_NOTES.tarifat;
    const p = translatePromptFor(TRANSLATE_PROMPT, note);
    expect(p.id).toBe(`${TRANSLATE_PROMPT.id}+istilah-tarifat@1`);
    expect(p.system.endsWith(note.text)).toBe(true);
    expect(note.text).toMatch(/al-Jurjani/);
    expect(note.text).toMatch(/transliterasi/);
    expect(note.text).not.toMatch(/[\u0600-\u06FF]/);
    expect(note.maxLengthRatio).toBeUndefined();
  });

  test("id atau teks petunjuk tidak sah ditolak", () => {
    expect(() => translatePromptFor(TRANSLATE_PROMPT, { id: "Nahwu 1", text: "x" })).toThrow(
      /tidak sah/,
    );
    expect(() => translatePromptFor(TRANSLATE_PROMPT, { id: "nahwu@1", text: " " })).toThrow(
      /kosong/,
    );
  });
});
