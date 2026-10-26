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
      text: "diriwayatkan mauquf; dinilai lemah; tidak ditemukan sebagai sabda Nabi (marfu'), menurut takhrij al-'Iraqi",
    });
    expect(label.terms.map((t) => [raw.slice(t.char_start, t.char_end), t.gloss])).toEqual([
      ["موقوفا", "diriwayatkan mauquf"],
      ["بإسناد ضعيف", "dinilai lemah"],
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
      text: "dinilai sahih, menurut takhrij al-'Iraqi (hadits pertama dari beberapa)",
    });
    expect(takhrijLabel(raw, { start: cut, end: raw.length })).toMatchObject({
      mixed: false,
      weak: true,
      text: "dinilai lemah, menurut takhrij al-'Iraqi",
    });
    // Dua hadits sekaligus: bukan "berbeda per jalur".
    expect(takhrijLabel(raw, { start: 0, end: raw.length })).toMatchObject({
      mixed: false,
      text: "dinilai sahih; dinilai lemah, menurut takhrij al-'Iraqi (beberapa hadits)",
    });
  });

  test("teks status paling panjang tetap memuat istilah pertama dan ≤ batas", () => {
    const raw =
      "حديث تجريبي لم أجده مرفوعا ورواه فلان موقوفا بإسناد صحيح ورواه فلان بسند ضعيف (٤) حديث آخر رواه فلان";
    const label = takhrijLabel(raw);
    expect(label.mixed).toBe(true);
    expect(label.text.length).toBeLessThanOrEqual(TAKHRIJ_STATUS_MAX);
    expect(label.text.startsWith("tidak ditemukan sebagai sabda Nabi")).toBe(true);
    expect(takhrijLabel("حديث تجريبي رواه فلان (٢) حديث آخر رواه فلان بسند ضعيف").text).toBe(
      "takhrij al-'Iraqi hanya menyebut sumber riwayatnya, tanpa istilah penilaian (hadits pertama dari beberapa)",
    );
  });

  test("penilaian yang dibantah, perawi tepercaya/diperselisihkan, rujukan bersumber", () => {
    const refuted = takhrijLabel("حديث تجريبي رواه الحاكم وقال صحيح الإسناد قلت بل منقطع");
    expect(refuted).toMatchObject({
      mixed: false,
      weak: true,
      text: "memuat penilaian ulama lain yang dibantah; dinilai lemah, menurut takhrij al-'Iraqi",
    });
    expect(takhrijLabel("حديث تجريبي رواه فلان ورجاله ثقات").text).toBe(
      "perawi atau sanadnya dinilai tepercaya, menurut takhrij al-'Iraqi",
    );
    expect(takhrijLabel("حديث تجريبي رواه فلان ورجاله ثقات إلا أن فيه انقطاعا")).toMatchObject({
      mixed: false,
      text: "perawi atau sanadnya dinilai tepercaya; dinilai lemah, menurut takhrij al-'Iraqi",
    });
    expect(takhrijLabel("حديث تجريبي رواه فلان وفيه فلان مختلف فيه")).toMatchObject({
      weak: false,
      text: "sanad atau perawinya diperselisihkan, menurut takhrij al-'Iraqi",
    });
    expect(takhrijLabel("حديث تجريبي أخرجه الترمذي وقد تقدم").text).toBe(
      "takhrij al-'Iraqi menyebut sumber riwayatnya dan merujuk ke takhrijnya di tempat lain",
    );
    expect(takhrijLabel("حديث تجريبي تقدم في الباب الأول").text).toBe(
      "takhrij al-'Iraqi merujuk ke takhrijnya di tempat lain",
    );
  });

  test("muttafaq mencakup al-Bukhari/Muslim; penilaian berlawanan ditandai berbeda per jalur", () => {
    expect(takhrijLabel("حديث تجريبي متفق عليه ولمسلم من حديث فلان").text).toBe(
      "muttafaq 'alaih (al-Bukhari dan Muslim), menurut takhrij al-'Iraqi",
    );
    expect(takhrijLabel("حديث تجريبي أخرجه مسلم من حديث فلان").text).toBe(
      "diriwayatkan Muslim, menurut takhrij al-'Iraqi",
    );
    const mixed = takhrijLabel("حديث تجريبي رواه فلان بإسناد صحيح ورواه فلان بإسناد ضعيف");
    expect(mixed).toMatchObject({ mixed: true });
    expect(mixed.text).toBe(
      "dinilai sahih; dinilai lemah, menurut takhrij al-'Iraqi (berbeda per jalur)",
    );
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
    expect(second).toMatchObject({
      kind: "terms",
      text: "dinilai lemah, menurut takhrij al-'Iraqi",
      mixed: false,
    });
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
      text: "takhrij al-'Iraqi hanya menyebut sumber riwayatnya, tanpa istilah penilaian",
    });
    expect(takhrijLabel("حديث تجريبي تقدم في الباب الأول")).toMatchObject({
      kind: "refers_back",
      text: "takhrij al-'Iraqi merujuk ke takhrijnya di tempat lain",
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
