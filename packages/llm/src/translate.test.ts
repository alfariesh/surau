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
    expect(TRANSLATE_PROMPT.id).toBe("translate-passage@2");
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
    // Penanda hilang = peringatan saja (takhrij tetap tertaut di teks Arab).
    expect(checkTranslation(GOOD.replace(" (١)", ""), input())).toMatchObject({
      ok: true,
      markersMissing: ["١"],
    });
    // Angka dalam kurung berangka Latin (tahun, nomor) bukan penanda: dibiarkan.
    expect(checkTranslation(`${GOOD} (1402)`, input()).ok).toBe(true);
  });

  test("penanda berangka Latin atau superskrip dikembalikan ke angka Arab di teks yang disimpan", () => {
    expect(checkTranslation(GOOD.replace("(١)", "(1)"), input())).toMatchObject({
      ok: true,
      text: GOOD,
      markersMissing: [],
    });
    expect(checkTranslation(GOOD.replace("(١)", "(¹)"), input())).toMatchObject({ text: GOOD });
  });

  test("kata 'terjemah' ditolak kecuali sumbernya membahas ترجمة; kurung kurawal ditolak", () => {
    expect(checkTranslation(`Terjemahan:\n\n${GOOD}`, input()).problems).toContain("meta");
    expect(
      checkTranslation(`${GOOD} (Ini ringkasan konteks, bukan terjemahan.)`, input()).problems,
    ).toContain("meta");
    const withTarjama: TranslateInput = {
      ...input(),
      masked: { ...input().masked, text: `${input().masked.text} \u062A\u0631\u062C\u0645\u0629` },
    };
    expect(checkTranslation(`${GOOD} terjemahan akidah`, withTarjama).problems).not.toContain(
      "meta",
    );
    expect(
      checkTranslation(GOOD.replace("⟦QS 2:255⟧", "{⟦QS 2:255⟧}"), input()).problems,
    ).toContain("meta");
  });

  test("komentar model tentang pekerjaannya ditolak", () => {
    expect(checkTranslation(`Maaf, saya ulangi dengan benar: ${GOOD}`, input()).problems).toContain(
      "meta",
    );
    expect(checkTranslation(`${GOOD} Let me write carefully.`, input()).problems).toContain("meta");
  });

  test("harakat tidak dihitung dalam rasio panjang (judul berharakat)", () => {
    const title = "فَضِيلَةُ الْمَسْجِدِ وَمَوْضِعُ الصَّلَاةِ وَالذِّكْرِ";
    const t: TranslateInput = { ...input(), markers: [], masked: { text: title, slots: [] } };
    expect(checkTranslation("Keutamaan Masjid, Tempat Salat, dan Zikir", t).problems).toEqual([]);
  });

  test("huruf Arab apa pun ditolak, termasuk satu istilah", () => {
    expect(checkTranslation(`${GOOD} هذا كلام مصنوع`, input()).problems).toContain("arabic");
    expect(checkTranslation(`${GOOD} الإخلاص`, input()).problems).toContain("arabic");
  });

  test("penanda catatan kaki karangan model ditolak", () => {
    expect(checkTranslation(`${GOOD} (٣)`, input()).problems).toContain("markers_extra");
  });

  test("model menulis ulang isi ayat di sebelah placeholder → ditolak", () => {
    // Kutipan sesudah placeholder sering ucapan berikutnya (doa, perkataan sahabat): tidak ditolak.
    const quoted = GOOD.replace("⟦QS 2:255⟧", '⟦QS 2:255⟧ "Ya Allah, ampunilah aku"');
    expect(checkTranslation(quoted, input()).problems).not.toContain("ayah_refill");
    // Tafsiran penulis sesudah placeholder (أي … di sumber) dan kutipan yang DITUTUP tidak ditolak.
    const meaning = GOOD.replace("⟦QS 2:255⟧", "⟦QS 2:255⟧, yakni Allah Maha Hidup,");
    expect(checkTranslation(meaning, input()).problems).not.toContain("ayah_refill");
    const closing = GOOD.replace("⟦QS 2:255⟧", '"Allah berfirman, ⟦QS 2:255⟧," katanya');
    expect(checkTranslation(closing, input()).problems).not.toContain("ayah_refill");
    const translit = GOOD.replace("⟦QS 2:255⟧", "wa huwa 'alā kulli syai'in qadīr ⟦QS 2:255⟧");
    expect(checkTranslation(translit, input()).problems).toContain("ayah_refill");
  });

  test("rasio panjang tidak wajar ditolak", () => {
    expect(checkTranslation("Ia berkata ⟦QS 2:255⟧ (١).", input()).problems).toContain(
      "length_ratio",
    );
    expect(checkTranslation(GOOD.repeat(12), input()).problems).toContain("placeholders");
    // Dua versi terjemahan ≈ dua kali panjang: rasio > 4 ditolak.
    const twice = `${GOOD.replace("⟦QS 2:255⟧ ", "")} ${GOOD.repeat(2)}`;
    expect(checkTranslation(twice, input()).problems).toContain("length_ratio");
  });

  test("kosong, Markdown, dan kalimat pembuka ditolak", () => {
    expect(checkTranslation("  ", input()).problems).toEqual(["empty"]);
    expect(checkTranslation(`**${GOOD}**`, input()).problems).toContain("markdown");
    expect(checkTranslation(`Berikut terjemahannya: ${GOOD}`, input()).problems).toContain(
      "preamble",
    );
  });
});
