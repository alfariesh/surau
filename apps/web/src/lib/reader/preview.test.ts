import { describe, expect, it } from "vite-plus/test";

import { previewSample } from "./preview";

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
