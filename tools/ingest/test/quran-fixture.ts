// Mushaf BUATAN untuk tes (bukan teks Al-Qur'an): 2 "surah" berisi kalimat karangan dengan format
// berkas yang sama persis dengan sumber asli (XML Tanzil + JSON Kemenag). Dipakai tes unit pencocok
// dan tes ujung-ke-ujung pipeline. Ayat 1:2 dan 2:3 sengaja berlafaz sama (uji `alt_count`).
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { QuranConfig, QuranFileKey } from "../src/quran/source.ts";

export interface FixtureAyah {
  surah: number;
  ayah: number;
  text: string;
  /** Versi "uthmani" buatan (dengan harakat), untuk membedakan teks tampilan dari indeks. */
  uthmani: string;
  translation: string;
  footnotes?: { marker: string; text: string; number: number }[];
}

export const FIXTURE_SURAHS = [
  { surah: 1, nameAr: "الأولى", nameLatin: "Al-Ula", revelation: "makkah" as const },
  { surah: 2, nameAr: "الثانية", nameLatin: "Ats-Tsaniyah", revelation: "madinah" as const },
];

export const FIXTURE_BISMILLAH = "باسم الكلمة الأولى";

export const FIXTURE_AYAT: FixtureAyah[] = [
  {
    surah: 1,
    ayah: 1,
    text: "باسم الكلمة الأولى",
    uthmani: "بِاسْمِ الْكَلِمَةِ الْأُولَى",
    translation: "Terjemahan uji satu.",
  },
  {
    surah: 1,
    ayah: 2,
    text: "والصبر نور القلوب في الظلمات",
    uthmani: "وَالصَّبْرُ نُورُ الْقُلُوبِ فِي الظُّلُمَاتِ",
    translation: "Terjemahan uji dua1) dengan catatan.",
    footnotes: [{ marker: "1)", text: "Catatan kaki uji.", number: 1 }],
  },
  {
    surah: 1,
    ayah: 3,
    text: "والعلم ثمرة العمل الصالح",
    uthmani: "وَالْعِلْمُ ثَمَرَةُ الْعَمَلِ الصَّالِحِ",
    translation: "Terjemahan uji tiga.",
  },
  {
    surah: 2,
    ayah: 1,
    text: "قل هل يستوي العالم والجاهل",
    uthmani: "قُلْ هَلْ يَسْتَوِي الْعَالِمُ وَالْجَاهِلُ",
    translation: "Terjemahan uji empat.",
  },
  {
    surah: 2,
    ayah: 2,
    text: "إنما يتذكر أولو الألباب الصادقون",
    uthmani: "إِنَّمَا يَتَذَكَّرُ أُولُو الْأَلْبَابِ الصَّادِقُونَ",
    translation: "Terjemahan uji lima.",
  },
  {
    surah: 2,
    ayah: 3,
    text: "والصبر نور القلوب في الظلمات",
    uthmani: "وَالصَّبْرُ نُورُ الْقُلُوبِ فِي الظُّلُمَاتِ",
    translation: "Terjemahan uji enam.",
  },
];

const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

function tanzilXml(field: "text" | "uthmani"): string {
  const suras = FIXTURE_SURAHS.map((s) => {
    const ayat = FIXTURE_AYAT.filter((a) => a.surah === s.surah)
      .map((a) => {
        const bismillah = a.ayah === 1 && s.surah !== 1 ? ` bismillah="${FIXTURE_BISMILLAH}"` : "";
        return `\t\t<aya index="${a.ayah}" text="${a[field]}"${bismillah} />`;
      })
      .join("\n");
    return `\t<sura index="${s.surah}" name="${s.nameAr}">\n${ayat}\n\t</sura>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="utf-8" ?>\n<!-- fixture buatan -->\n<quran>\n${suras}\n</quran>\n`;
}

/** Tulis berkas sumber buatan ke `dir` dan kembalikan konfigurasi dengan sha256-nya. */
export function writeQuranFixture(dir: string): QuranConfig {
  mkdirSync(join(dir, "tanzil"), { recursive: true });
  mkdirSync(join(dir, "kemenag"), { recursive: true });
  const key = (a: FixtureAyah) => `${a.surah}:${a.ayah}`;
  const contents: Record<QuranFileKey, [string, string]> = {
    tanzilUthmani: ["tanzil/quran-uthmani.xml", tanzilXml("uthmani")],
    tanzilSimpleClean: ["tanzil/quran-simple-clean.xml", tanzilXml("text")],
    kemenagTranslation: [
      "kemenag/kemenag-terjemahan-id.json",
      JSON.stringify(
        FIXTURE_AYAT.map((a) => ({
          ayah_key: key(a),
          surah: a.surah,
          ayah: a.ayah,
          text: a.translation,
          footnotes: a.footnotes ?? null,
        })),
      ),
    ],
    kemenagTransliteration: [
      "kemenag/kemenag-transliterasi-latin.json",
      JSON.stringify(FIXTURE_AYAT.map((a) => ({ ayah_key: key(a), text: `Translit ${key(a)}` }))),
    ],
    kemenagSurah: [
      "kemenag/surah.json",
      JSON.stringify(
        FIXTURE_SURAHS.map((s) => ({
          surah_id: String(s.surah),
          name_arabic: s.nameAr,
          name_latin: s.nameLatin,
          revelation_type: s.revelation,
          ayah_count: String(FIXTURE_AYAT.filter((a) => a.surah === s.surah).length),
        })),
      ),
    ],
    kemenagArab: [
      "kemenag/quran-arab.json",
      JSON.stringify(
        FIXTURE_AYAT.map((a) => ({
          ayah_key: key(a),
          juz_number: String(a.surah),
          text_imlaei_simple: a.text,
        })),
      ),
    ],
  };
  const files = {} as QuranConfig["files"];
  for (const [k, [path, content]] of Object.entries(contents) as [
    QuranFileKey,
    [string, string],
  ][]) {
    writeFileSync(join(dir, path), content);
    files[k] = { path, sha256: sha256(content) };
  }
  return {
    root: dir,
    files,
    expect: { surahs: FIXTURE_SURAHS.length, ayat: FIXTURE_AYAT.length },
  };
}
