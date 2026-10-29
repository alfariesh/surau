// Tes audit lafaz ayat dengan mushaf BUATAN (kata karangan, bukan teks Al-Qur'an).
import { describe, expect, test } from "vite-plus/test";

import { auditTokens, buildMushafIndex, grade, guessKind, skeleton } from "./audit.ts";

const index = buildMushafIndex([
  { surah: 1, ayah: 1, text: "كتب زيد درسا طويلا في بيت العلم" },
  { surah: 1, ayah: 2, text: "سمع عمرو حديثا قصيرا" },
  { surah: 2, ayah: 1, text: "كتب زيد درسا قصيرا" },
]);

describe("audit ayat", () => {
  test("kerangka mengabaikan alif", () => {
    expect(skeleton("الكتاب")).toBe("لكتب");
    expect(skeleton("ا")).toBe("ا");
  });

  test("deret terpanjang, letak, dan pengantar", () => {
    const tokens = "قال تعالي كتب زيد درسا طويلا في بيت ثم ذهب".split(" ");
    const [hit, ...rest] = auditTokens(tokens, index);
    expect(rest).toEqual([]);
    expect(hit).toEqual({ from: 2, to: 8, places: 1, ayah: "1:1", cue: true });
    expect(grade(hit!)).toBe("kuat");
    expect(guessKind(tokens, hit!)).toBe("kutipan");
  });

  test("deret pendek di dua letak tanpa pengantar: lemah, iqtibas", () => {
    const tokens = "ثم كتب زيد درسا عنده".split(" ");
    const [hit] = auditTokens(tokens, index);
    expect(hit).toMatchObject({ from: 1, to: 4, places: 2, cue: false });
    expect(grade(hit!)).toBe("lemah");
    expect(guessKind(tokens, hit!)).toBe("iqtibas");
  });

  test("tanpa deret mushaf: kosong", () => {
    expect(auditTokens("ذهب الرجل الي السوق".split(" "), index)).toEqual([]);
  });
});
