import { TAKHRIJ_TERMS_VERSION } from "@surau/text";
import { describe, expect, test } from "vite-plus/test";

import { TAKHRIJ_STATUS_MAX, takhrijLabel } from "./takhrij-label.ts";

// Kalimat BUATAN bergaya takhrij (bukan teks kitab).
describe("takhrijLabel", () => {
  test("istilah → teks status kode, urut kemunculan, dengan rentang dan arti", () => {
    const raw = "حديث تجريبي رواه فلان موقوفا بإسناد ضعيف ولم أره مرفوعا";
    const label = takhrijLabel(raw);
    expect(label).toMatchObject({
      version: TAKHRIJ_TERMS_VERSION,
      kind: "terms",
      mixed: false,
      text: "takhrij menyebut: mauquf; lemah; tidak ditemukan sebagai sabda Nabi (marfu')",
    });
    expect(label.terms.map((t) => [raw.slice(t.char_start, t.char_end), t.gloss])).toEqual([
      ["موقوفا", "mauquf"],
      ["بإسناد ضعيف", "lemah"],
      ["ولم أره مرفوعا", "tidak ditemukan sebagai sabda Nabi (marfu')"],
    ]);
  });

  // Versi 2 (ADR-108): kalimat BUATAN.
  test("catatan kaki tergabung: label dari hadits pertama, atau dari bagian yang disitasi", () => {
    const raw = "حديث تجريبي أخرجه فلان بإسناد صحيح (٤) حديث تجريبي آخر رواه فلان بسند ضعيف";
    const cut = raw.indexOf("(٤)");
    expect(takhrijLabel(raw)).toMatchObject({
      mixed: false,
      weak: false,
      text: "takhrij menyebut: sahih (hadits pertama dari beberapa)",
    });
    expect(takhrijLabel(raw, { start: cut, end: raw.length })).toMatchObject({
      mixed: false,
      weak: true,
      text: "takhrij menyebut: lemah",
    });
    // Dua hadits sekaligus: bukan "berbeda per jalur".
    expect(takhrijLabel(raw, { start: 0, end: raw.length })).toMatchObject({
      mixed: false,
      text: "takhrij menyebut: sahih; lemah (beberapa hadits)",
    });
  });

  test("penilaian yang dibantah, perawi tepercaya/diperselisihkan, rujukan bersumber", () => {
    const refuted = takhrijLabel("حديث تجريبي رواه الحاكم وقال صحيح الإسناد قلت بل منقطع");
    expect(refuted).toMatchObject({
      mixed: false,
      weak: true,
      text: "takhrij menyebut: penilaian yang dibantah penakhrij; lemah",
    });
    expect(takhrijLabel("حديث تجريبي رواه فلان ورجاله ثقات").text).toBe(
      "takhrij menyebut: perawi/sanad dinilai tepercaya",
    );
    expect(takhrijLabel("حديث تجريبي رواه فلان ورجاله ثقات إلا أن فيه انقطاعا")).toMatchObject({
      mixed: false,
      text: "takhrij menyebut: perawi/sanad dinilai tepercaya; lemah",
    });
    expect(takhrijLabel("حديث تجريبي رواه فلان وفيه فلان مختلف فيه")).toMatchObject({
      weak: false,
      text: "takhrij menyebut: perawi/sanad diperselisihkan",
    });
    expect(takhrijLabel("حديث تجريبي أخرجه الترمذي وقد تقدم").text).toBe(
      "takhrij menyebut sumber riwayat dan merujuk ke takhrij di tempat lain",
    );
    expect(takhrijLabel("حديث تجريبي تقدم في الباب الأول").text).toBe(
      "takhrij merujuk ke takhrij di tempat lain",
    );
  });

  test("muttafaq mencakup al-Bukhari/Muslim; penilaian berlawanan ditandai berbeda per jalur", () => {
    expect(takhrijLabel("حديث تجريبي متفق عليه ولمسلم من حديث فلان").text).toBe(
      "takhrij menyebut: muttafaq 'alaih",
    );
    expect(takhrijLabel("حديث تجريبي أخرجه مسلم من حديث فلان").text).toBe(
      "takhrij menyebut: riwayat Muslim",
    );
    const mixed = takhrijLabel("حديث تجريبي رواه فلان بإسناد صحيح ورواه فلان بإسناد ضعيف");
    expect(mixed).toMatchObject({ mixed: true });
    expect(mixed.text).toBe("takhrij menyebut: sahih; lemah (berbeda per jalur)");
  });

  test("tanda kelemahan dari istilah yang sama dengan label; lafaz hadits tidak dipindai", () => {
    expect(takhrijLabel("حديث تجريبي رواه فلان بإسناد ضعيف").weak).toBe(true);
    expect(takhrijLabel("حديث تجريبي لا أصل له").weak).toBe(true);
    expect(takhrijLabel("حديث تجريبي أخرجه العقيلي في الضعفاء").weak).toBe(true);
    expect(takhrijLabel("حديث تجريبي متفق عليه").weak).toBe(false);
    // "باطل" dan "منكر ونكير" di lafaz hadits, takhrijnya muttafaq 'alaih.
    expect(takhrijLabel("حديث كل شيء باطل إلا ذكر الله متفق عليه").weak).toBe(false);
    expect(takhrijLabel("حديث يأتيه منكر ونكير أخرجه فلان وحسنه").weak).toBe(false);
    expect(takhrijLabel("(٤) وقال فلان كلاما تجريبيا").weak).toBe(false);
  });

  test("dengan rentang sitasi: jenis dari teks utuh, istilah dan status dari bagian yang disitasi", () => {
    const raw = "حديث تجريبي رواه فلان بإسناد صحيح ورواه فلان بإسناد ضعيف";
    const cut = raw.indexOf("ورواه");
    // Bagian kedua tanpa penanda pembuka sendiri tetap takhrij (lafaz dinilai dari teks utuh).
    const second = takhrijLabel(raw, { start: cut, end: raw.length });
    expect(second).toMatchObject({ kind: "terms", text: "takhrij menyebut: lemah", mixed: false });
    expect(second.terms.every((t) => t.char_start >= cut)).toBe(true);
    expect(takhrijLabel(raw, { start: 0, end: 5 })).toMatchObject({
      kind: "sources_only",
      text: "bagian takhrij yang dikutip tidak memuat istilah penilaian",
    });
    expect(takhrijLabel(raw, { start: 0, end: raw.length }).text).toBe(takhrijLabel(raw).text);
  });

  test("hanya sumber, hanya rujukan, bukan takhrij", () => {
    expect(takhrijLabel("حديث تجريبي أخرجه فلان من حديث فلان")).toMatchObject({
      kind: "sources_only",
      text: "takhrij hanya menyebut sumber riwayat, tanpa istilah penilaian",
    });
    expect(takhrijLabel("حديث تجريبي تقدم في الباب الأول")).toMatchObject({
      kind: "refers_back",
      text: "takhrij merujuk ke takhrij di tempat lain",
    });
    expect(takhrijLabel("(١) قوله كذا اه مصححه").kind).toBe("not_takhrij");
    expect(takhrijLabel("(٤) وقال فلان كلاما تجريبيا").kind).toBe("not_takhrij");
  });

  test("teks status selalu Latin dan ≤ batas, dipotong 'dan lainnya' bila terlalu banyak istilah", () => {
    const raw =
      "حديث تجريبي متفق عليه دون قوله كذا ورواه فلان بإسناد حسن وقال غريب ورواه فلان " +
      "مرسلا وموقوفا وتعليقا بإسناد ضعيف جدا وهو موضوع لا أصل له ولم أجده";
    const text = takhrijLabel(raw).text;
    expect(text.length).toBeLessThanOrEqual(TAKHRIJ_STATUS_MAX);
    expect(text).toContain("dan lainnya");
    expect(text).not.toMatch(/\p{Script=Arabic}/u);
  });
});
