import { describe, expect, test } from "vite-plus/test";

import {
  ID_STOPWORDS,
  LATIN_MAX_TERMS,
  findLatinSpans,
  latinIndexText,
  latinMatchExpression,
  latinTerm,
  latinTokens,
  normalizeLatinWord,
  planLatinQuery,
  stemIndonesian,
} from "./latin.ts";
import type { LatinQueryPlan } from "./latin.ts";

// Kalimat buatan (bukan salinan terjemahan korpus).
const plan = (q: string): LatinQueryPlan => {
  const p = planLatinQuery(q);
  if (p === null) throw new Error(`kueri kosong: ${q}`);
  return p;
};

describe("normalizeLatinWord / latinTokens", () => {
  test("diakritik transliterasi, apostrof, huruf besar", () => {
    expect(normalizeLatinWord("Ṣabr")).toBe("sabr");
    expect(normalizeLatinWord("mu’amalah")).toBe("muamalah");
    expect(normalizeLatinWord("Qur'an")).toBe("quran");
    expect(normalizeLatinWord("ʿIlm")).toBe("ilm");
    expect(normalizeLatinWord("Ihyāʾ")).toBe("ihya");
  });

  test("rentang = teks asli; huruf Arab, digit Arab-India, tanda hubung = pemisah", () => {
    const text = "Ibnu 'Abbas (١) berkata: orang-orang الصبر 700 kali.";
    const toks = latinTokens(text);
    expect(toks.map((t) => t.norm)).toEqual([
      "ibnu",
      "abbas",
      "berkata",
      "orang",
      "orang",
      "700",
      "kali",
    ]);
    for (const t of toks) expect(normalizeLatinWord(text.slice(t.start, t.end))).toBe(t.norm);
  });

  test("apostrof di tengah kata ikut kata, di tepi tidak", () => {
    expect(latinTokens("riya' 'ujub").map((t) => t.norm)).toEqual(["riya", "ujub"]);
    expect(latinTokens("mu'amalah").map((t) => [t.start, t.end])).toEqual([[0, 9]]);
  });
});

describe("stemIndonesian", () => {
  const cases: [string, string][] = [
    // Kata dasar ≤ 2 suku kata tidak disentuh.
    ["sabar", "sabar"],
    ["niat", "niat"],
    ["allah", "allah"],
    // Konfiks dan awalan.
    ["kesabaran", "sabar"],
    ["bersabar", "sabar"],
    ["kesabarannya", "sabar"],
    ["berniat", "niat"],
    ["pertanyaan", "tanya"],
    ["mengajar", "ajar"],
    ["pengajaran", "ajar"],
    ["menyebut", "sebut"],
    ["penyakit", "sakit"],
    ["penyusun", "susun"],
    ["penahan", "tahan"],
    ["pendosa", "dosa"],
    ["pemberian", "beri"],
    ["memberikan", "beri"],
    ["dikatakan", "kata"],
    ["tertentu", "tentu"],
    ["belajar", "ajar"],
    ["pelajar", "ajar"],
    ["bekerja", "kerja"],
    ["perbuatan", "buat"],
    ["pemimpin", "impin"],
    ["perhatikanlah", "perhati"],
    // Partikel dan kata ganti milik.
    ["sabarlah", "sabar"],
    ["apakah", "apa"],
    ["siapapun", "siapa"],
    ["tuhanmu", "tuhan"],
    ["dirinya", "diri"],
    ["hatiku", "hati"],
    // Akhiran -i (bukan -si).
    ["mencintai", "cinta"],
    ["menikmati", "ikmat"],
    ["kenikmatan", "nikmat"],
    ["dipolitisasi", "politisasi"],
    // Akar yang dilindungi.
    ["sedekah", "sedekah"],
    ["bersedekah", "sedekah"],
    ["masalah", "masalah"],
    ["abdullah", "abdullah"],
    ["berilmu", "ilmu"],
    ["bertanya", "tanya"],
    ["pengampun", "ampun"],
    ["perhatian", "perhati"],
    ["berdiri", "berdir"],
    ["kedudukan", "kedudu"],
    ["pendapat", "pendapat"],
    // Bukan a–z murni: apa adanya.
    ["700", "700"],
    ["abc1", "abc1"],
  ];
  test.each(cases)("%s → %s", (word, stem) => {
    expect(stemIndonesian(word)).toBe(stem);
  });

  test("akhiran diblokir sesuai awalan (ke- tidak membuang -kan, di- tidak membuang -an)", () => {
    expect(stemIndonesian("kebanyakan")).toBe("banyak");
    expect(stemIndonesian("dimakan")).toBe("makan");
    expect(stemIndonesian("berlari")).toBe("lari");
    expect(stemIndonesian("terlarang")).toBe("larang");
  });
});

describe("latinTerm / latinIndexText", () => {
  test("stopword dibuang, ejaan lain diseragamkan", () => {
    expect(latinTerm("yang")).toBeNull();
    expect(latinTerm("kepadanya")).toBeNull();
    expect(latinTerm("merekalah")).toBeNull();
    expect(latinTerm("taubat")).toBe("tobat");
    expect(latinTerm("shalat")).toBe("salat");
    expect(latinTerm("dzikir")).toBe("zikir");
    // Varian juga sesudah stem (temuan peninjau S14).
    expect(latinTerm("bertaubat")).toBe(latinTerm("bertobat"));
    expect(latinTerm("shalatnya")).toBe(latinTerm("salatnya"));
    expect(ID_STOPWORDS.has("allah")).toBe(false);
  });

  test("isi indeks: stem dipisah spasi, tanpa stopword", () => {
    expect(latinIndexText("Orang-orang yang bersabar akan mendapat pahala.")).toBe(
      "orang orang sabar dapat pahala",
    );
    expect(latinIndexText("")).toBe("");
  });
});

describe("planLatinQuery / latinMatchExpression", () => {
  test("kata tanpa stopword, stem unik", () => {
    expect(plan("adab murid kepada guru")).toEqual({
      words: ["adab", "murid", "guru"],
      stems: ["adab", "murid", "guru"],
    });
    expect(plan("Sabar dan kesabaran")).toEqual({
      words: ["sabar", "kesabaran"],
      stems: ["sabar"],
    });
  });

  test("kata pembingkai pertanyaan dibuang bila ada kata lain (S15, ADR-045)", () => {
    // Regresi eval S15: "cara" ikut diwajibkan sehingga bab khusyuk tidak ditemukan.
    expect(plan("cara khusyuk dalam salat")).toEqual({
      words: ["khusyuk", "salat"],
      stems: ["khusyuk", "salat"],
    });
    expect(plan("Bagaimana al-Ghazali menjelaskan sabar?")).toEqual({
      words: ["al", "sabar"],
      stems: ["al", "sabar"],
    });
    // Hanya kata pembingkai → tetap dicari apa adanya.
    expect(plan("cara")).toEqual({ words: ["cara"], stems: ["cara"] });
    // Bukan pembingkai: imam (topik imamah), turunan "cara" lain tetap kata biasa.
    expect(plan("imam salat").stems).toEqual(["imam", "salat"]);
    expect(plan("bercara").stems).toEqual(["cara"]);
  });

  test("kosong, hanya stopword, atau hanya huruf Arab → null", () => {
    expect(planLatinQuery("")).toBeNull();
    expect(planLatinQuery("yang dan di")).toBeNull();
    expect(planLatinQuery("الصبر")).toBeNull();
  });

  test("terlalu panjang → RangeError", () => {
    const words = Array.from({ length: LATIN_MAX_TERMS + 1 }, (_, i) => `kata${i}`).join(" ");
    expect(() => planLatinQuery(words)).toThrow(RangeError);
    expect(planLatinQuery(words.split(" ").slice(1).join(" "))?.words).toHaveLength(
      LATIN_MAX_TERMS,
    );
  });

  test("ekspresi MATCH: setiap stem dikutip; AND implisit atau OR", () => {
    const p = plan("adab murid guru");
    expect(latinMatchExpression(p, "all")).toBe('"adab" "murid" "guru"');
    expect(latinMatchExpression(p, "any")).toBe('"adab" OR "murid" OR "guru"');
    // Kata kunci FTS5 (AND/OR/NOT/NEAR) dari pengguna tetap hanya string.
    expect(latinMatchExpression(plan("NOT near"), "all")).toBe('"not" "near"');
  });
});

describe("findLatinSpans", () => {
  test("kata dengan stem sama disorot di teks asli, stopword tidak", () => {
    const text = "Kesabaran itu cahaya; orang yang bersabar akan beruntung. Sabar!";
    const spans = findLatinSpans(text, plan("sabar"));
    expect(spans.map((s) => text.slice(s.start, s.end))).toEqual([
      "Kesabaran",
      "bersabar",
      "Sabar",
    ]);
    expect(findLatinSpans(text, plan("sabar"), 1)).toHaveLength(1);
    expect(findLatinSpans(text, plan("zuhud"))).toEqual([]);
  });
});
