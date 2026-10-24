import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vite-plus/test";

import { applyLexicon, lexiconSample, parseLexicon, spokenForm } from "./lexicon.ts";

const repo = join(import.meta.dirname, "../../..");

const yaml = (entries: string) => `format: 1\nlang: id\nentries:\n${entries}`;

describe("leksikon lafal", () => {
  test("berkas repo valid; versi = 12 heks sha berkas; semua entri masih draf uji", () => {
    const source = readFileSync(join(repo, "data/lexicon/id.yaml"), "utf8");
    const lexicon = parseLexicon(source);
    expect(lexicon.lang).toBe("id");
    expect(lexicon.version).toMatch(/^[0-9a-f]{12}$/u);
    expect(lexicon.entries.length).toBeGreaterThan(20);
    // Tanpa uji dengar (T-31) tidak ada lafal yang diterapkan ke audio.
    expect(lexicon.entries.every((e) => e.status === "test")).toBe(true);
    expect(applyLexicon("Ikhlas dan riya'.", lexicon)).toBe("Ikhlas dan riya'.");
  });

  test("hanya entri active; tanpa beda huruf besar; batas kata; istilah terpanjang dulu", () => {
    const lexicon = parseLexicon(
      yaml(`  - { term: riya', ipa: riˈjaʔ, status: active }
  - { term: al-Ghazali, ipa: alɣaˈzali, status: active }
  - { term: Abu Hamid al-Ghazali, alias: Abu Hamid Al Ghazali, status: active }
  - { term: ikhlas, ipa: ixˈlas, status: test }
`),
    );
    expect(
      applyLexicon("Riya' merusak; menurut al-Ghazali dan Abu Hamid al-Ghazali.", lexicon),
    ).toBe("/riˈjaʔ/ merusak; menurut /alɣaˈzali/ dan Abu Hamid Al Ghazali.");
    // Potongan kata tidak diganti; entri uji tidak diterapkan.
    expect(applyLexicon("riya'nya ikhlas", lexicon)).toBe("riya'nya ikhlas");
    expect(applyLexicon("ikhlas", lexicon, () => true)).toBe("/ixˈlas/");
    expect(spokenForm(lexicon.entries[2]!)).toBe("Abu Hamid Al Ghazali");
  });

  test("sampel uji dengar: lafal bawaan lalu lafal leksikon untuk setiap entri uji", () => {
    const lexicon = parseLexicon(
      yaml(`  - { term: ikhlas, ipa: ixˈlas, status: test }
  - { term: zuhud, ipa: ˈzuhud, status: test }
  - { term: riya', ipa: riˈjaʔ, status: active }
`),
    );
    expect(lexiconSample(lexicon, "Pembuka.")).toBe(
      "Pembuka. Yang pertama: ikhlas. /ixˈlas/. Yang kedua: zuhud. /ˈzuhud/.",
    );
  });

  test("berkas tidak sah ditolak", () => {
    expect(() => parseLexicon(yaml("  - { term: a, ipa: /a/, status: test }\n"))).toThrow(
      /garis miring/u,
    );
    expect(() => parseLexicon(yaml("  - { term: a, status: test }\n"))).toThrow(/ipa atau alias/u);
    expect(() =>
      parseLexicon(
        yaml("  - { term: A, ipa: a, status: test }\n  - { term: a, ipa: b, status: test }\n"),
      ),
    ).toThrow(/ganda/u);
    expect(() => parseLexicon("format: 2\nlang: id\nentries: []\n")).toThrow(/./u);
  });
});
