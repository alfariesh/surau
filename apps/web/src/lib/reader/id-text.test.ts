import { describe, expect, it } from "vite-plus/test";

import { aiRuns, labelledCopy, quotePairs, summaryParagraphs } from "./id-text";

const LABELS = { ai: "Terjemahan AI", summary: "Ringkasan AI" };
const plain = (runs: ReturnType<typeof aiRuns>) => runs.map((r) => r.text).join("");
const straight = (text: string) => text.replaceAll("“", '"').replaceAll("”", '"');

describe("kutipan langsung", () => {
  it("petik lurus berpasangan menjadi “…” bergaya kutipan; kata tidak berubah", () => {
    const text = 'Beliau bersabda, "Sabarlah." Lalu ia berkata "ya" dan pergi.';
    expect(quotePairs(text)).toHaveLength(2);
    const runs = aiRuns(text);
    expect(runs.filter((r) => r.quote).map((r) => r.text)).toEqual(["“Sabarlah.”", "“ya”"]);
    expect(straight(plain(runs))).toBe(text);
  });

  it("petik tidak berpasangan atau tanpa petik: teks dibiarkan apa adanya", () => {
    const odd = 'Ia berkata, "Sabarlah. Lalu pergi.';
    expect(quotePairs(odd)).toEqual([]);
    expect(aiRuns(odd)).toEqual([{ text: odd, quote: false, bold: false }]);
    expect(aiRuns("Tanpa petik.")).toEqual([{ text: "Tanpa petik.", quote: false, bold: false }]);
  });

  it("bagian tebal (padanan subjudul) dihitung dari offset teks terjemahan lengkap", () => {
    const text = 'Malam Kamis. Nabi bersabda, "Salatlah."';
    const runs = aiRuns(text, 0, { start: 0, end: 12 });
    expect(runs[0]).toEqual({ text: "Malam Kamis.", quote: false, bold: true });
    expect(runs.some((r) => r.quote && r.text === "“Salatlah.”")).toBe(true);
    expect(straight(plain(runs))).toBe(text);
    // Segmen yang mulai di tengah teks lengkap: rentang tebal digeser offset-nya.
    expect(aiRuns("bersabda.", 18, { start: 0, end: 12 })).toEqual([
      { text: "bersabda.", quote: false, bold: false },
    ]);
  });
});

describe("summaryParagraphs", () => {
  it("≤ 3 kalimat = satu paragraf; lebih dari itu dibagi 2–3 kalimat", () => {
    expect(summaryParagraphs("Satu. Dua. Tiga.")).toEqual(["Satu. Dua. Tiga."]);
    expect(summaryParagraphs("Satu. Dua. Tiga. Empat.")).toEqual(["Satu. Dua.", "Tiga. Empat."]);
    const seven = "A satu. B dua. C tiga. D empat. E lima. F enam. G tujuh.";
    expect(summaryParagraphs(seven)).toEqual([
      "A satu. B dua. C tiga.",
      "D empat. E lima.",
      "F enam. G tujuh.",
    ]);
  });

  it("singkatan saw. tidak memotong kalimat; isi kata sama persis", () => {
    const text =
      "Bab ini membahas salat. Rasulullah saw. Beliau salat malam. Al-Ghazali menjelaskan adabnya. Ia juga menukil ulama. Penutupnya doa.";
    const paras = summaryParagraphs(text);
    expect(paras).toHaveLength(2);
    expect(paras[0]).toContain("Rasulullah saw. Beliau salat malam.");
    expect(paras.join(" ")).toBe(text);
  });
});

describe("labelledCopy", () => {
  it("label AI + permalink sesudah setiap segmen AI; label Kemenag bila belum ikut terseleksi", () => {
    const text = labelledCopy(
      [
        { text: "نص", kind: "plain", group: "b0", block: "0" },
        {
          text: "Ia berkata, ",
          kind: "ai",
          group: "s1",
          block: "1",
          url: "https://surau.org/kitab/ihya/1/200#p1",
        },
        {
          text: "terjemahan ayat",
          kind: "ayah",
          group: "s2",
          block: "1",
          label: "QS 2:255 · Terjemahan Kemenag",
        },
        {
          text: " lalu pergi.",
          kind: "ai",
          group: "s3",
          block: "1",
          url: "https://surau.org/kitab/ihya/1/200#p1",
        },
      ],
      LABELS,
    );
    expect(text).toBe(
      "نص\nIa berkata, (Terjemahan AI, https://surau.org/kitab/ihya/1/200#p1) terjemahan ayat (QS 2:255 · Terjemahan Kemenag) lalu pergi. (Terjemahan AI, https://surau.org/kitab/ihya/1/200#p1)",
    );
  });

  it("label ayat yang sudah terseleksi tidak diulang; teks Arab saja apa adanya", () => {
    expect(
      labelledCopy(
        [
          {
            text: "QS 2:255 · Terjemahan Kemenag ayat",
            kind: "ayah",
            group: "s1",
            block: "0",
            label: "QS 2:255 · Terjemahan Kemenag",
            labelIncluded: true,
          },
        ],
        LABELS,
      ),
    ).toBe("QS 2:255 · Terjemahan Kemenag ayat");
    // Ringkasan AI ikut berlabel saat disalin.
    expect(
      labelledCopy(
        [
          {
            text: "Bab ini membahas sabar.",
            kind: "summary",
            group: "s9",
            block: "0",
            url: "https://surau.org/kitab/ihya/4/61",
          },
        ],
        LABELS,
      ),
    ).toBe("Bab ini membahas sabar. (Ringkasan AI, https://surau.org/kitab/ihya/4/61)");
    expect(
      labelledCopy([{ text: "نص عربي", kind: "plain", group: "b0", block: "0" }], LABELS),
    ).toBe("نص عربي");
  });
});
