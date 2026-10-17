import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import {
  AYAH_REF,
  PASSAGES,
  QURAN_FOOTNOTES_1_2,
  QURAN_TRANSLATION_1_2,
  seedCorpus,
} from "../../test/fixture.ts";
import { QURAN_AYAT_MAX, getAyahRefs, getQuranAyat } from "./quran.ts";

const db = env.CORPUS;

beforeAll(async () => {
  await seedCorpus(db);
});

describe("getAyahRefs", () => {
  test("rujukan ayat + nama surah per paragraf; paragraf tanpa rujukan = kosong", async () => {
    expect(await getAyahRefs(db, [PASSAGES.body1, PASSAGES.body2, PASSAGES.body2])).toEqual([
      { ...AYAH_REF, name_ar: "الأولى", name_latin: "Al-Ula" },
    ]);
    expect(await getAyahRefs(db, [PASSAGES.body1])).toEqual([]);
    expect(await getAyahRefs(db, [])).toEqual([]);
  });
});

describe("getQuranAyat", () => {
  test("ayat dalam rentang + terjemahan/transliterasi + surah + semua sumber, satu batch", async () => {
    const q = await getQuranAyat(db, [
      { surah: 1, from: 2, to: 3 },
      { surah: 1, from: 3, to: 3 },
    ]);
    expect(q.ayat.map((a) => [a.surah, a.ayah, a.text_index])).toEqual([
      [1, 2, "الصفحة"],
      [1, 3, "الثانية"],
    ]);
    expect(q.translations.map((t) => [t.ayah, t.source_id])).toEqual([
      [2, "kemenag-id"],
      [2, "kemenag-latin"],
      [3, "kemenag-id"],
      [3, "kemenag-latin"],
    ]);
    expect(q.translations[0]).toEqual({
      surah: 1,
      ayah: 2,
      source_id: "kemenag-id",
      text: QURAN_TRANSLATION_1_2,
      footnotes: JSON.stringify(QURAN_FOOTNOTES_1_2),
    });
    expect(q.surahs.map((s) => s.name_latin)).toEqual(["Al-Ula"]);
    expect(q.sources.map((s) => s.id)).toEqual([
      "kemenag-id",
      "kemenag-latin",
      "tanzil-simple-clean",
      "tanzil-uthmani",
    ]);
  });

  test("tanpa rentang = kosong tanpa kueri; terlalu banyak ayat = RangeError", async () => {
    expect(await getQuranAyat(db, [])).toEqual({
      ayat: [],
      translations: [],
      surahs: [],
      sources: [],
    });
    await expect(getQuranAyat(db, [{ surah: 2, from: 1, to: QURAN_AYAT_MAX + 1 }])).rejects.toThrow(
      RangeError,
    );
  });
});
