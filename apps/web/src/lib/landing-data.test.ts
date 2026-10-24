import { describe, expect, it } from "vite-plus/test";

import { firstSentence, quoteSpan, sentenceWith, wordPrefix } from "./landing-data";

// Teks buatan (bukan teks kitab): yang diuji hanya aturan potong, tidak ada teks sumber di fixture.
describe("quoteSpan: rentang kutipan hero disalin apa adanya, hanya di batas kata", () => {
  const raw = "alif ba ta tsa jim";

  it("rentang di batas kata = potongan persis", () => {
    expect(quoteSpan(raw, 0, 10)).toBe("alif ba ta");
    expect(quoteSpan(raw, 5, 10)).toBe("ba ta");
    expect(quoteSpan(raw, 15, raw.length)).toBe("jim");
  });

  it("rentang terpotong di tengah kata ditolak", () => {
    expect(quoteSpan(raw, 0, 9)).toBeNull();
    expect(quoteSpan(raw, 1, 10)).toBeNull();
  });

  it("rentang di luar teks, kosong, atau berspasi tepi ditolak", () => {
    expect(quoteSpan(raw, 0, raw.length + 1)).toBeNull();
    expect(quoteSpan(raw, 4, 4)).toBeNull();
    expect(quoteSpan(raw, 4, 10)).toBeNull();
    expect(quoteSpan(raw, -1, 4)).toBeNull();
  });
});

describe("firstSentence: kalimat pertama terjemahan AI", () => {
  it("mengambil kalimat pertama", () => {
    expect(firstSentence("Kalimat satu. Kalimat dua.")).toBe("Kalimat satu.");
    expect(firstSentence("Tanpa titik")).toBe("Tanpa titik");
  });

  it("menolak kalimat berplaceholder ayat (ayat tidak diterjemahkan AI)", () => {
    expect(firstSentence("Allah berfirman ⟦QS 2:153⟧ demikian. Lalu.")).toBeNull();
  });

  it("menolak terjemahan kosong", () => {
    expect(firstSentence("  ")).toBeNull();
  });
});

describe("wordPrefix: potongan awal hasil Cari di batas kata", () => {
  it("teks pendek utuh, teks panjang dipotong di spasi terakhir", () => {
    expect(wordPrefix("alif ba", 20)).toEqual({ text: "alif ba", cut: false });
    expect(wordPrefix("alif ba ta tsa jim", 9)).toEqual({ text: "alif ba", cut: true });
  });
});

describe("sentenceWith: kalimat terjemahan yang memuat kata yang dicari", () => {
  it("memilih kalimat yang memuat kata, selain itu kalimat pertama", () => {
    expect(sentenceWith("Awal. Lalu sabar itu berat. Akhir.", "sabar")).toBe(
      "…Lalu sabar itu berat.",
    );
    expect(sentenceWith("Sabar itu berat. Akhir.", "sabar")).toBe("Sabar itu berat.");
    expect(sentenceWith("Awal. Kedua.", "sabar")).toBe("Awal.");
  });

  it("melewati kalimat berplaceholder ayat", () => {
    expect(sentenceWith("Sabar ⟦QS 2:153⟧ itu. Lagi sabar.", "sabar")).toBe("…Lagi sabar.");
  });
});
