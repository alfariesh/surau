import { describe, expect, test } from "vite-plus/test";

import { normalizeArabic } from "./normalize.ts";
import { findQuote } from "./quote.ts";

// Kalimat buatan dan hadits masyhur pendek (bukan salinan teks Shamela).
const RAW = "فَقَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ (١) وَقَالَ";

describe("findQuote", () => {
  test("kutipan tanpa harakat → substring mentah verbatim (port prototipe)", () => {
    const hit = findQuote(RAW, "من يرد الله به خيرا يفقهه في الدين");
    expect(hit?.rawText).toBe("مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ");
    expect(hit && RAW.slice(hit.rawStart, hit.rawEnd)).toBe(hit?.rawText);
  });

  test("kutipan bervokal dan kutipan berbeda ejaan alif/ta marbuthah tetap ditemukan", () => {
    expect(findQuote(RAW, "مَنْ يُرِدِ اللَّهُ")?.rawText).toBe("مَنْ يُرِدِ اللَّهُ");
    expect(findQuote("صَلَاةُ الْجُمُعَةِ", "صلاه الجمعة")?.rawText).toBe("صَلَاةُ الْجُمُعَةِ");
  });

  test("batas kata dihormati: خير ≠ خيرا, يرد ≠ ...يرد", () => {
    expect(findQuote(RAW, "يرد الله به خير")).toBeNull();
    expect(findQuote(RAW, "رد الله به")).toBeNull();
  });

  test("kutipan karangan ditolak", () => {
    expect(findQuote(RAW, "من يريد الله")).toBeNull();
    expect(findQuote(RAW, "من يرد الله به شرا")).toBeNull();
    expect(findQuote(RAW, "قال رسول الله صلى الله عليه وسلم العلم نور")).toBeNull();
  });

  test("melompati penanda catatan kaki (١)", () => {
    expect(findQuote(RAW, "في الدين وقال")?.rawText).toBe("فِي الدِّينِ (١) وَقَالَ");
  });

  test("kutipan kosong setelah normalisasi → null", () => {
    expect(findQuote(RAW, "")).toBeNull();
    expect(findQuote(RAW, " ، (١) ")).toBeNull();
  });

  test("mengambil kecocokan valid berikutnya bila yang pertama melanggar batas kata", () => {
    const raw = "الصبرية صبر الصبر";
    expect(findQuote(raw, "الصبر")).toEqual({ rawStart: 12, rawEnd: 17, rawText: "الصبر" });
  });

  test("menolak kecocokan yang mulai/berakhir di tengah ekspansi ﷺ", () => {
    const raw = "قال النبي \uFDFA يوما";
    expect(findQuote(raw, "الله عليه")).toBeNull();
    expect(findQuote(raw, "النبي صلى الله")).toBeNull();
    expect(findQuote(raw, "عليه وسلم يوما")).toBeNull();
    // Ekspansi utuh boleh; substring mentahnya memuat ligatur aslinya.
    expect(findQuote(raw, "النبي صلى الله عليه وسلم يوما")?.rawText).toBe("النبي \uFDFA يوما");
    expect(findQuote(raw, "صلى الله عليه وسلم")?.rawText).toBe("\uFDFA");
  });

  test("ekspansi yang menempel ke kata sebelumnya tetap bisa dikutip utuh", () => {
    const raw = "قال\uFDFAيوما";
    expect(findQuote(raw, "صلى الله عليه وسلم")?.rawText).toBe("\uFDFA");
    expect(findQuote(raw, "قال صلى الله")).toBeNull();
  });

  test("hasil normalisasi yang sudah ada bisa dipakai ulang", () => {
    const normalized = normalizeArabic(RAW);
    expect(findQuote(RAW, "في الدين", { normalized })?.rawText).toBe("فِي الدِّينِ");
    // Hasil normalisasi dari teks lain ditolak, bukan dipakai diam-diam.
    expect(() => findQuote("قال", "قال", { normalized })).toThrow(TypeError);
  });
});
