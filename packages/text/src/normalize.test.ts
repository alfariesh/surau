import { describe, expect, test } from "vite-plus/test";

import { NORM_VERSION, isDroppedChar, normalizeArabic, toRawSpan } from "./normalize.ts";

describe("normalizeArabic", () => {
  test("harakat, tatweel, alif berhamzah, ى, ة (port prototipe)", () => {
    expect(normalizeArabic("الصَّبْرُ").text).toBe("الصبر");
    expect(normalizeArabic("إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ").text).toBe("انما الاعمال بالنيات");
    expect(normalizeArabic("صلاة العيدين").text).toBe("صلاه العيدين");
    expect(normalizeArabic("مُوسَى").text).toBe("موسي");
    expect(normalizeArabic("ـــالعلم").text).toBe("العلم");
    expect(normalizeArabic("الرَّحْمٰنِ").text).toBe("الرحمن");
    expect(normalizeArabic("آمنوا ٱلله").text).toBe("امنوا الله");
    expect(normalizeArabic("مسئول مسؤول").text).toBe("مسيول مسوول");
    expect(normalizeArabic("مسئول", { hamzaSeats: false }).text).toBe("مسئول");
  });

  test("HTML, catatan kaki, tanda baca, spasi (port prototipe)", () => {
    const raw = 'قَالَ (١) {يَرْفَعِ اللَّهُ}\r<span data-type="title" id=toc-6>فَضِيلَةُ التَّعَلُّمِ</span>\rأَمَّا';
    expect(normalizeArabic(raw).text).toBe("قال يرفع الله فضيله التعلم اما");
    expect(normalizeArabic("رشده (١٢) وقال", { dropFootnoteRefs: false }).text).toBe(
      "رشده 12 وقال",
    );
    expect(normalizeArabic("  ،،  ").text).toBe("");
    expect(normalizeArabic("ﷺ").text).toBe("صلي الله عليه وسلم");
  });

  test("tag HTML hanya bila diawali huruf; '<' lain menjadi pemisah biasa", () => {
    expect(normalizeArabic("a<b").text).toBe("a b");
    expect(normalizeArabic("علم < 3").text).toBe("علم 3");
    expect(normalizeArabic("علم<hr>عمل").text).toBe("علم عمل");
    expect(normalizeArabic("علم</span>عمل").text).toBe("علم عمل");
  });

  test("penanda catatan kaki: Arab-India, Persia, ASCII, berspasi; 5 digit bukan penanda", () => {
    expect(normalizeArabic("قال (١) ثم (۲) ثم (3) ثم ( ١٢ )").text).toBe("قال ثم ثم ثم");
    expect(normalizeArabic("(١٢٣٤٥)").text).toBe("12345");
    expect(normalizeArabic("(ا)").text).toBe("ا");
  });

  test("presentation forms dinormalisasi per karakter (NFKC) tanpa merusak peta", () => {
    const raw = "\uFE8D\uFEDF\uFEBC\uFE92\uFEAE \uFEB3\uFEFC\uFEE1";
    const n = normalizeArabic(raw);
    expect(n.text).toBe("الصبر سلام");
    expect([...n.map]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 7, 8]);
    // Bentuk harakat terisolasi dibuang tanpa memutus kata.
    expect(normalizeArabic("كت\uFE77ب").text).toBe("كتب");
    expect(normalizeArabic("كتب \uFE70 عمل").text).toBe("كتب عمل");
  });

  test("tanda Qur'ani: dibuang tanpa memutus kata, kecuali U+06DD/U+06DE/U+06E9 (pemisah)", () => {
    const dropped = [
      0x06d6, 0x06d7, 0x06dc, 0x06df, 0x06e5, 0x06e8, 0x06ea, 0x06ed, 0x0610, 0x061a, 0x0670,
    ];
    for (const cp of dropped) {
      expect(normalizeArabic(`كت${String.fromCodePoint(cp)}اب`).text, cp.toString(16)).toBe("كتاب");
    }
    for (const cp of [0x06dd, 0x06de, 0x06e9]) {
      expect(normalizeArabic(`قال${String.fromCodePoint(cp)}ثم`).text, cp.toString(16)).toBe(
        "قال ثم",
      );
    }
  });

  test("ligatur kehormatan: NFKC (ﷺ ﷻ ﷲ) dan tabel Unicode 14 (﵁ ﷿ ﷽)", () => {
    expect(normalizeArabic("النبي\uFDFAقال").text).toBe("النبي صلي الله عليه وسلم قال");
    expect(normalizeArabic("الله \uFDFB").text).toBe("الله جل جلاله");
    expect(normalizeArabic("\uFDF2").text).toBe("الله");
    expect(normalizeArabic("عمر \uFD41").text).toBe("عمر رضي الله عنه");
    expect(normalizeArabic("\uFD40").text).toBe("رحمه الله");
    expect(normalizeArabic("الله\uFDFF").text).toBe("الله عز وجل");
    expect(normalizeArabic("\uFDFD").text).toBe("بسم الله الرحمن الرحيم");
    // Opsi hamzaSeats juga berlaku pada hasil ekspansi.
    expect(normalizeArabic("\uFDFA", { hamzaSeats: false }).text).toBe("صلي الله عليه وسلم");
  });

  test("angka Arab-India dan Persia menjadi ASCII; Latin menjadi huruf kecil", () => {
    expect(normalizeArabic("١٤٠٢ ۱۴۰۲").text).toBe("1402 1402");
    expect(normalizeArabic("Ihya ULUM").text).toBe("ihya ulum");
    expect(normalizeArabic("e\u0301te").text).toBe("ete");
    // toLowerCase menambah U+0307 pada İ; tanda itu dibuang supaya idempoten.
    expect(normalizeArabic("\u0130BN").text).toBe("ibn");
  });

  test("code point astral tidak terbelah: huruf jadi huruf, tanda gabung dibuang, emoji pemisah", () => {
    const n = normalizeArabic("ب\u{1EE01}ت \u{1D167}ك😀ل");
    expect(n.text).toBe("ب\u{1EE01}ت ك ل");
    expect([...n.map]).toEqual([0, 1, 1, 3, 4, 7, 8, 10]);
  });

  test("karakter lebar-nol dan kontrol arah dibuang tanpa memutus kata", () => {
    expect(normalizeArabic("\uFEFFعل\u200Cم\u200D\u200F\u061C\u2066ي\u2069").text).toBe("علمي");
  });

  test("peta offset: setiap karakter normal menunjuk ke karakter mentah yang setara (port)", () => {
    const raw = "وَقَالَ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ الْعُلَمَاءُ وَرَثَةُ الْأَنْبِيَاءِ (٢) وَمَعْلُومٌ";
    const n = normalizeArabic(raw);
    expect(n.map.length).toBe(n.text.length);
    for (let j = 0; j < n.text.length; j++) {
      if (n.text[j] === " ") continue;
      expect(normalizeArabic(raw[n.map[j] as number] as string).text, `pos ${j}`).toBe(n.text[j]);
    }
    const phrase = "العلماء ورثه الانبياء";
    const idx = n.text.indexOf(phrase);
    const [rs, re] = toRawSpan(raw, n, idx, idx + phrase.length);
    expect(raw.slice(rs, re)).toBe("الْعُلَمَاءُ وَرَثَةُ الْأَنْبِيَاءِ");
  });

  test("NORM_VERSION diekspor dan berupa bilangan bulat positif", () => {
    expect(Number.isInteger(NORM_VERSION) && NORM_VERSION >= 1).toBe(true);
  });
});

describe("toRawSpan", () => {
  test("ikut menyertakan harakat/tatweel di ujung, termasuk bentuk presentasi harakat", () => {
    const raw = "الصَّبْرُ\uFE7Fـ عمل";
    const n = normalizeArabic(raw);
    const [rs, re] = toRawSpan(raw, n, 0, "الصبر".length);
    expect(raw.slice(rs, re)).toBe("الصَّبْرُ\uFE7Fـ");
  });

  test("tidak menyertakan kontrol arah/BOM sesudah kata (isolate bidi tidak bocor)", () => {
    const raw = "علم\u2067عمل\u2069";
    const n = normalizeArabic(raw);
    expect(raw.slice(...toRawSpan(raw, n, 0, 3))).toBe("علم");
  });

  test("menolak span tidak valid", () => {
    const n = normalizeArabic("علم");
    expect(() => toRawSpan("علم", n, 2, 2)).toThrow(RangeError);
    expect(() => toRawSpan("علم", n, -1, 2)).toThrow(RangeError);
    expect(() => toRawSpan("علم", n, 0, 4)).toThrow(RangeError);
    expect(() => toRawSpan("علم", n, 0.5, 2)).toThrow(RangeError);
  });
});

describe("isDroppedChar", () => {
  test("harakat, tatweel, lebar-nol, bentuk presentasi harakat → dibuang; huruf dan pemisah → tidak", () => {
    for (const ch of [
      "\u064E",
      "\u0651",
      "\u0640",
      "\u200C",
      "\uFEFF",
      "\uFE70",
      "\uFE77",
      "\u0301",
    ]) {
      expect(isDroppedChar(ch), ch.codePointAt(0)?.toString(16)).toBe(true);
    }
    for (const ch of ["ا", " ", "\u06DD", "\uFE8D", "\uFDFA", "(", "1"]) {
      expect(isDroppedChar(ch), ch.codePointAt(0)?.toString(16)).toBe(false);
    }
  });
});
