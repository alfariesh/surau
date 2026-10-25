// Fixture: kalimat Arab buatan.
import { describe, expect, test } from "vite-plus/test";

import { quoteTruncated } from "./digest-report.ts";

describe("heuristik kutipan terpotong", () => {
  const t =
    "قال رسول الله صلى الله عليه وسلم من يرد الله به خيرا يفقهه في الدين (١) وقال أيضا كلاما آخر";
  test("batas alami: sesudah rumus ucapan, sebelum penanda, sebelum partikel klausa", () => {
    const start = t.indexOf("من يرد");
    const end = t.indexOf(" (١)");
    expect(quoteTruncated(t, start, end)).toBe(false);
    // Dibuka "وقال" (pembuka klausa) sampai akhir paragraf juga wajar.
    expect(quoteTruncated(t, t.indexOf("وقال"), t.length)).toBe(false);
  });
  test('awalan huruf bukan batas: berhenti sebelum "في الدين" = terpotong', () => {
    expect(quoteTruncated(t, t.indexOf("من يرد"), t.indexOf(" في الدين"))).toBe(true);
    // Mulai di tengah kalimat tanpa rumus ucapan.
    expect(quoteTruncated(t, t.indexOf("خيرا"), t.indexOf(" (١)"))).toBe(true);
  });
  test("wa/fa menempel pada kata (فأشرف، وكلها، فإنه) = pembuka klausa; في/فضل bukan", () => {
    const u = "قيل كذا فأشرف الصناعات تعليم العلم وكلها محمودة فإنه نور في القلب فضل كبير";
    expect(quoteTruncated(u, u.indexOf("فأشرف"), u.indexOf(" وكلها"))).toBe(false);
    expect(quoteTruncated(u, u.indexOf("وكلها"), u.indexOf(" فإنه"))).toBe(false);
    expect(quoteTruncated(u, u.indexOf("فإنه"), u.indexOf(" في القلب"))).toBe(true);
    expect(quoteTruncated(u, u.indexOf("فإنه"), u.indexOf(" فضل"))).toBe(true);
  });
});
