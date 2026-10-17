// Fixture: kalimat Arab buatan (bukan teks kitab) dan rujukan ayat rekaan.
import { maskAyat } from "@surau/core";
import type { AyahRef } from "@surau/core";
import { describe, expect, test } from "vite-plus/test";

import { CUSTOM_ID_PATTERN, passageCustomId } from "./custom-id.ts";
import {
  TRANSLATE_PROMPT,
  buildTranslateRequest,
  checkTranslation,
  translateUserText,
} from "./translate.ts";
import type { TranslateInput } from "./translate.ts";

const AYAH = "قول مصنوع";
const RAW = `قال المؤلف هذا كلام مصنوع للاختبار (١) ثم قال ${AYAH} وهذا آخر الكلام المصنوع هنا`;
const start = RAW.indexOf(AYAH);
const ref: AyahRef = {
  char_start: start,
  char_end: start + AYAH.length,
  surah: 2,
  ayah_from: 255,
  ayah_to: 255,
  match: "exact",
  partial: false,
  bracketed: false,
  alt_count: 0,
  label: "QS Al-Baqarah [2]: 255",
};

function input(previous: string | null = null): TranslateInput {
  return {
    passageId: 10_000_001,
    heading: "كتاب مصنوع › باب مصنوع",
    previous,
    masked: maskAyat(RAW, [ref]),
    markers: ["١"],
  };
}

const GOOD =
  "Penulis berkata, ini adalah perkataan buatan untuk pengujian (١), lalu ia berkata ⟦QS 2:255⟧ dan ini akhir perkataan buatan di sini.";

describe("request terjemahan", () => {
  test("parameter wajib ADR-013 dan prefix sistem yang di-cache", () => {
    const req = buildTranslateRequest(input());
    expect(req.model).toBe("claude-haiku-5-5");
    expect(req.output_config).toEqual({ effort: "low" });
    expect(req).not.toHaveProperty("temperature");
    expect(req).not.toHaveProperty("top_p");
    expect(req).not.toHaveProperty("top_k");
    expect(req).not.toHaveProperty("thinking");
    expect(req.messages).toHaveLength(1);
    expect(req.messages[0]?.role).toBe("user");
    expect(req.system).toEqual([
      {
        type: "text",
        text: TRANSLATE_PROMPT.system,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ]);
    expect(TRANSLATE_PROMPT.id).toBe("translate-passage@1");
    expect(passageCustomId(10_000_001)).toMatch(CUSTOM_ID_PATTERN);
  });

  test("prefix sistem identik untuk paragraf berbeda (syarat cache)", () => {
    const a = buildTranslateRequest(input());
    const b = buildTranslateRequest({ ...input("سابق"), passageId: 2 });
    expect(a.system).toEqual(b.system);
  });

  test("ayat tidak pernah terkirim: hanya placeholder", () => {
    const text = translateUserText(input("كلام سابق"));
    expect(text).not.toContain(AYAH);
    expect(text).toContain("⟦QS 2:255⟧");
    expect(text).toContain("<sebelumnya>\nكلام سابق\n</sebelumnya>");
    expect(text.endsWith("Terjemahkan isi <teks> ke bahasa Indonesia.")).toBe(true);
  });

  test("tanpa paragraf sebelumnya, tag <sebelumnya> tidak ada", () => {
    expect(translateUserText(input())).not.toContain("<sebelumnya>");
  });

  test("prompt sistem tanpa huruf kapital berteriak", () => {
    expect(TRANSLATE_PROMPT.system).not.toMatch(/\b[A-Z]{5,}\b/);
  });
});

describe("validasi terjemahan", () => {
  test("terjemahan yang benar lolos", () => {
    expect(checkTranslation(GOOD, input())).toMatchObject({ ok: true, problems: [] });
  });

  test("placeholder hilang atau dikarang ditolak", () => {
    const lost = checkTranslation(GOOD.replace("⟦QS 2:255⟧", "Allah Maha Hidup"), input());
    expect(lost.problems).toContain("placeholders");
    const extra = checkTranslation(`${GOOD} ⟦QS 1:1⟧`, input());
    expect(extra.problems).toContain("placeholders");
  });

  test("penanda catatan kaki wajib ada; angka lain tidak dihitung", () => {
    expect(checkTranslation(GOOD.replace(" (١)", ""), input()).problems).toContain("markers");
    expect(checkTranslation(GOOD.replace("(١)", "(1)"), input()).problems).toContain("markers");
    expect(checkTranslation(`${GOOD} (٢)`, input()).ok).toBe(true);
  });

  test("teks Arab panjang ditolak, istilah pendek hanya diberi peringatan", () => {
    const copied = checkTranslation(`${GOOD} هذا كلام مصنوع`, input());
    expect(copied.problems).toContain("arabic");
    const term = checkTranslation(`${GOOD} الإخلاص`, input());
    expect(term).toMatchObject({ ok: true, arabicWarning: true });
  });

  test("rasio panjang tidak wajar ditolak", () => {
    expect(checkTranslation("Ia berkata ⟦QS 2:255⟧ (١).", input()).problems).toContain(
      "length_ratio",
    );
    expect(checkTranslation(GOOD.repeat(12), input()).problems).toContain("placeholders");
  });

  test("kosong, Markdown, dan kalimat pembuka ditolak", () => {
    expect(checkTranslation("  ", input()).problems).toEqual(["empty"]);
    expect(checkTranslation(`**${GOOD}**`, input()).problems).toContain("markdown");
    expect(checkTranslation(`Berikut terjemahannya: ${GOOD}`, input()).problems).toContain(
      "preamble",
    );
  });
});
