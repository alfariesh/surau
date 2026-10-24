import { describe, expect, it } from "vite-plus/test";

import { previewSample, previewTranslation } from "./preview";

// Teks buatan (Latin): fungsinya hanya memotong di spasi, tidak bergantung aksara.
describe("previewSample", () => {
  it("tanpa teks atau hanya spasi → null", () => {
    expect(previewSample(undefined)).toBeNull();
    expect(previewSample("   ")).toBeNull();
  });

  it("teks pendek dikembalikan utuh tanpa spasi tepi", () => {
    expect(previewSample("  satu dua  ", 20)).toBe("satu dua");
  });

  it("teks panjang dipotong di spasi terakhir sebelum batas", () => {
    expect(previewSample("satu dua tiga empat", 12)).toBe("satu dua");
    expect(previewSample("satu dua tiga empat", 13)).toBe("satu dua tiga");
  });

  it("tanpa spasi sebelum batas → null (tidak memotong di tengah kata)", () => {
    expect(previewSample("satuduatigaempat lima", 10)).toBeNull();
  });

  it("hasilnya selalu awalan teks asli", () => {
    const text = "alpha beta gamma delta epsilon";
    const sample = previewSample(text, 17);
    expect(sample).not.toBeNull();
    expect(text.startsWith(sample ?? "")).toBe(true);
  });
});

describe("previewTranslation (X11)", () => {
  const ai = (text: string) => ({ kind: "ai" as const, label: "ai_translation" as const, text });

  it("segmen AI pertama yang cukup panjang, tanpa penanda catatan kaki, dengan bahasanya", () => {
    expect(
      previewTranslation({
        segments: [ai("Ketahuilah bahwa sabar itu separuh iman (١) dan syukur separuhnya.")],
        bold: null,
        lang: "id",
      }),
    ).toEqual({
      text: "Ketahuilah bahwa sabar itu separuh iman dan syukur separuhnya.",
      lang: "id",
      review: null,
    });
  });

  it("dipotong di batas kata dengan elipsis", () => {
    const sample = previewTranslation(
      { segments: [ai("satu dua tiga empat lima enam tujuh delapan")], bold: null, lang: "en" },
      20,
    );
    expect(sample).toEqual({ text: "satu dua tiga empat…", lang: "en", review: null });
  });

  it("tanpa terjemahan atau tanpa segmen AI yang cukup panjang → null", () => {
    expect(previewTranslation(null)).toBeNull();
    expect(previewTranslation({ segments: [ai("Pendek.")], bold: null, lang: "id" })).toBeNull();
  });
});
