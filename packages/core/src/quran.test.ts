import { env } from "cloudflare:workers";
import type { D1Db } from "@surau/db";
import { beforeAll, describe, expect, test } from "vite-plus/test";

import {
  AYAH_REF,
  BODY_2,
  ED,
  PASSAGES,
  QURAN_FOOTNOTES_1_2,
  QURAN_TRANSLATION_1_2,
  seedCore,
} from "../test/fixture.ts";
import { NotFound, Unavailable } from "./errors.ts";
import { readPage } from "./page.ts";
import { ayahLabel, getAyahRefs, loadAyahRefs } from "./quran.ts";
import { ayahRefsView, pageView } from "./schema.ts";

const db = env.CORPUS;

beforeAll(async () => {
  await seedCore(db);
});

/** D1 tiruan untuk korpus lama: kueri tabel ayat gagal, `meta` menjawab skema tertentu. */
function oldCorpus(
  schemaVersion: number,
  error = "D1_ERROR: no such table: passage_ayah_ref",
): D1Db {
  return {
    prepare(sql: string) {
      const stmt = {
        bind: () => stmt,
        all: async () => {
          if (sql.includes("FROM meta")) {
            return { results: [{ key: "schema_version", value: String(schemaVersion) }] };
          }
          throw new Error(error);
        },
        first: async () => null,
      };
      return stmt;
    },
    batch: async () => {
      throw new Error(error);
    },
  };
}

describe("ayahLabel", () => {
  test("satu ayat dan rentang (tanda pisah)", () => {
    expect(ayahLabel("Al-Baqarah", 2, 255, 255)).toBe("QS Al-Baqarah [2]: 255");
    expect(ayahLabel("Al-Baqarah", 2, 255, 257)).toBe("QS Al-Baqarah [2]: 255–257");
  });
});

describe("readPage + ayat", () => {
  test("paragraf membawa ayah_refs dan halaman membawa ayat utuh + terjemahan Kemenag", async () => {
    const view = await readPage(db, ED, 1, 2);
    expect(pageView.parse(view)).toEqual(view);
    const [body] = view.body;
    expect(body?.ayah_refs).toEqual([
      {
        char_start: AYAH_REF.char_start,
        char_end: AYAH_REF.char_end,
        surah: 1,
        ayah_from: 2,
        ayah_to: 3,
        match: "exact",
        partial: true,
        bracketed: true,
        alt_count: 0,
        label: "QS Al-Ula [1]: 2–3",
      },
    ]);
    expect(BODY_2.slice(AYAH_REF.char_start, AYAH_REF.char_end)).toBe("الصفحة الثانية");
    expect(view.quran?.ayat).toEqual([
      {
        surah: 1,
        ayah: 2,
        juz: 1,
        text: "الصَّفْحَةُ",
        translation: { text: QURAN_TRANSLATION_1_2, footnotes: QURAN_FOOTNOTES_1_2 },
        transliteration: "Translit 1:2",
      },
      {
        surah: 1,
        ayah: 3,
        juz: 1,
        text: "الثَّانِيَةُ",
        translation: { text: "Terjemahan uji ayat tiga.", footnotes: [] },
        transliteration: "Translit 1:3",
      },
    ]);
    // Sumber yang ditampilkan: teks uthmani, terjemahan, transliterasi (bukan teks indeks).
    expect(view.quran?.sources.map((s) => s.id)).toEqual([
      "kemenag-id",
      "kemenag-latin",
      "tanzil-uthmani",
    ]);
    expect(view.quran?.surahs).toEqual([
      { surah: 1, name_ar: "الأولى", name_latin: "Al-Ula", revelation: "makkah", ayah_count: 3 },
    ]);
  });

  test("halaman tanpa kutipan ayat: quran = null, ayah_refs kosong", async () => {
    const view = await readPage(db, ED, 1, 1);
    expect(view.quran).toBeNull();
    expect([...view.body, ...view.footnotes].every((p) => p.ayah_refs.length === 0)).toBe(true);
  });
});

describe("getAyahRefs", () => {
  test("rujukan satu paragraf + ayat utuhnya", async () => {
    const view = await getAyahRefs(db, PASSAGES.body2);
    expect(ayahRefsView.parse(view)).toEqual(view);
    expect(view.refs.map((r) => r.label)).toEqual(["QS Al-Ula [1]: 2–3"]);
    expect(view.quran.ayat.map((a) => a.ayah)).toEqual([2, 3]);
    const none = await getAyahRefs(db, PASSAGES.body1);
    expect(none).toEqual({
      passage_id: PASSAGES.body1,
      refs: [],
      quran: { surahs: [], ayat: [], sources: [] },
    });
  });

  test("NotFound untuk paragraf yang tidak ada", async () => {
    await expect(getAyahRefs(db, 999_999_999)).rejects.toBeInstanceOf(NotFound);
  });
});

describe("korpus sebelum S12 (skema < 5)", () => {
  test("loadAyahRefs = null (paragraf tetap tampil); getAyahRefs = Unavailable", async () => {
    expect(await loadAyahRefs(oldCorpus(4), [PASSAGES.body2])).toBeNull();
    const err = await getAyahRefs(
      {
        ...oldCorpus(4),
        // getPassageById harus berhasil: paragraf ada di korpus lama.
        prepare: (sql: string) =>
          sql.includes("FROM passage p") ? db.prepare(sql) : oldCorpus(4).prepare(sql),
      },
      PASSAGES.body2,
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Unavailable);
  });

  test("galat lain di korpus skema 5 diteruskan, tidak ditelan", async () => {
    await expect(loadAyahRefs(oldCorpus(5, "D1_ERROR: network"), [1])).rejects.toThrow(
      "D1_ERROR: network",
    );
  });
});
