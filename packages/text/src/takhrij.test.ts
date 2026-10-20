import { describe, expect, it } from "vite-plus/test";

import { takhrijHasWeakTerms } from "./takhrij.ts";

// Kalimat BUATAN bergaya takhrij untuk tes (bukan teks kitab).
describe("takhrijHasWeakTerms", () => {
  it("istilah kelemahan, palsu, dan tanpa asal dikenali (juga berharakat dan berproklitik)", () => {
    for (const text of [
      "أخرجه أبو داود بإسناد ضعيف",
      "رواه ابن ماجه وفيه ضعف",
      "قال فلان في إسناده ضعف",
      "أخرجه فلان وضعف إسناده",
      "رواه الطبراني وضعفه",
      "إسناده ضَعِيفٌ جدا",
      "لم أجد له أصلاً",
      "رواه فلان موقوفا ولم أجده مرفوعا",
      "ذكره فلان تعليقا ولم أظفر له بإسناد",
      "رواه فلان وأعله فلان",
      "حديث موضوع",
      "ذكره ابن الجوزي في الموضوعات",
      "وهو حديث منكر",
      "فيه راو متروك",
      "إسناده واهٍ",
      "لا يصح هذا",
      "في سنده مجهول",
      "إسناده شديد الضعف",
      "فيه فلان وهو كذاب",
      "قال فلان ليس بشيء",
      "وفيه لين",
      "رواه فلان وتركه لضعفه",
      "ذكره فلان ضعيفا",
      "فيه راو متهم",
      // "صغير" berakhiran "غير" tetapi bukan negasi.
      "وفي الإسناد راو صغير ضعيف",
    ])
      expect(takhrijHasWeakTerms(text), text).toBe(true);
  });

  it("tanpa istilah kelemahan → false; kata yang mirip tidak terpicu", () => {
    for (const text of [
      "",
      "أخرجه الترمذي وقال حسن صحيح",
      "متفق عليه من حديث أبي هريرة",
      // "رواه" memuat huruf "واه"; "المنكر" (kemungkaran) dengan "ال" bukan penilaian hadits.
      "رواه مسلم",
      "الأمر بالمعروف والنهي عن المنكر",
      // Negasi: "bukan pendusta", "tidak lemah".
      "وفيه فلان وليس بكذاب",
      "وإسناده غير ضعيف",
      // Huruf pertama kata lain bukan negasi ("صغير" ≠ ص + غير); "فاعله" = pelakunya.
      "ما لم يسم فاعله",
      // "ضعف" = lipat / lemah fisik di lafaz hadits; "منكر ونكير" = nama malaikat.
      "إلى سبعمائة ضعف",
      "لما كبر وضعف",
      "حديث سؤال منكر ونكير أخرجه فلان",
      // "الكذاب" berartikel di lafaz hadits ("الإمام الكذاب"), bukan penilaian perawi.
      "وفيه والإمام الكذاب أخرجه فلان",
    ])
      expect(takhrijHasWeakTerms(text), text).toBe(false);
  });
});
