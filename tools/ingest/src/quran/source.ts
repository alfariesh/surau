// Sumber Al-Qur'an (S12, ADR-020, ADR-040): Tanzil 1.1 (XML: uthmani untuk tampilan, simple-clean
// untuk pencocokan) dan data Kemenag milik pemilik (terjemahan + catatan kaki, transliterasi Latin,
// metadata surah, juz). Berkas ada di data/raw (git-ignored); sha256 dipin di sini dan di
// data/SOURCES.md. Semua teks DISALIN apa adanya dari berkas; tidak ada teks ayat yang ditulis kode.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { quranFootnotes } from "@surau/db";
import type { QuranFootnotes, QuranSourceRow } from "@surau/db";
import { z } from "zod";

export interface PinnedFile {
  /** Path relatif ke folder sumber Qur'an (bawaan data/raw). */
  path: string;
  sha256: string;
}

/** Berkas sumber yang dipin (versi dan cara unduh: data/SOURCES.md). */
export const QURAN_FILES = {
  tanzilUthmani: {
    path: "tanzil/quran-uthmani.xml",
    sha256: "203f0f1bf3158b1e5be4ab9f8f6870e570aab6d9a626fe6192a70b75d4afe0fd",
  },
  tanzilSimpleClean: {
    path: "tanzil/quran-simple-clean.xml",
    sha256: "140787b7c399b11d54bfa72c237075916084232efa8a4cddf704cc8a2a74b1fe",
  },
  kemenagTranslation: {
    path: "kemenag/kemenag-terjemahan-id.json",
    sha256: "6569af2c35183be2dec884ef2532bbeabf285959b9b8aa2d0b66a0e319aa6154",
  },
  kemenagTransliteration: {
    path: "kemenag/kemenag-transliterasi-latin.json",
    sha256: "bb02c07b9bad6b8fa006c4e10307eb043027b6a890f825b445585c93ad2e018e",
  },
  kemenagSurah: {
    path: "kemenag/surah.json",
    sha256: "2f527c1cfb93465cd1cdc17af54e136b2a4781c47ed7432754e28b17c04b5eec",
  },
  /** Hanya juz per ayat + cek silang penomoran (teks Arab QUL di berkas ini TIDAK dipakai). */
  kemenagArab: {
    path: "kemenag/quran-arab.json",
    sha256: "80d9cc72bece1381102caab7851f503c726f60e8605bf575bb5cf9e8889ba028",
  },
} as const satisfies Record<string, PinnedFile>;
export type QuranFileKey = keyof typeof QURAN_FILES;

/** ID sumber di tabel `quran_source` (dirujuk kode tampilan dan core). */
export const QURAN_SOURCE_IDS = {
  uthmani: "tanzil-uthmani",
  simpleClean: "tanzil-simple-clean",
  translation: "kemenag-id",
  transliteration: "kemenag-latin",
} as const;

const TANZIL_ATTRIBUTION =
  "Tanzil Project (tanzil.net), CC BY 3.0. Disalin verbatim; teks tidak boleh diubah.";
const KEMENAG_ATTRIBUTION =
  "Kementerian Agama Republik Indonesia, Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ), quran.kemenag.go.id. Ditampilkan verbatim.";

/** Metadata sumber (tanpa sha256: diisi dari berkas yang benar-benar dibaca). */
const SOURCE_META: Record<
  keyof typeof QURAN_SOURCE_IDS,
  { file: QuranFileKey } & Omit<QuranSourceRow, "id" | "sha256">
> = {
  uthmani: {
    file: "tanzilUthmani",
    kind: "text",
    lang: "ar",
    name: "Tanzil Quran Text (Uthmani)",
    version: "1.1",
    license: "CC BY 3.0",
    attribution: TANZIL_ATTRIBUTION,
    url: "https://tanzil.net",
  },
  simpleClean: {
    file: "tanzilSimpleClean",
    kind: "text",
    lang: "ar",
    name: "Tanzil Quran Text (Simple Clean)",
    version: "1.1",
    license: "CC BY 3.0",
    attribution: TANZIL_ATTRIBUTION,
    url: "https://tanzil.net",
  },
  translation: {
    file: "kemenagTranslation",
    kind: "translation",
    lang: "id",
    name: "Terjemahan Al-Qur'an Kementerian Agama RI",
    version: "quran.kemenag.go.id, salinan 2026-06-03",
    license: "Sumber resmi pemerintah RI; dipakai ulang verbatim dengan atribusi (ADR-040)",
    attribution: KEMENAG_ATTRIBUTION,
    url: "https://quran.kemenag.go.id",
  },
  transliteration: {
    file: "kemenagTransliteration",
    kind: "transliteration",
    lang: "id",
    name: "Transliterasi Latin Al-Qur'an Kementerian Agama RI",
    version: "quran.kemenag.go.id, salinan 2026-06-03",
    license: "Sumber resmi pemerintah RI; dipakai ulang verbatim dengan atribusi (ADR-040)",
    attribution: KEMENAG_ATTRIBUTION,
    url: "https://quran.kemenag.go.id",
  },
};

export interface QuranAyahSource {
  surah: number;
  ayah: number;
  juz: number;
  uthmani: string;
  simpleClean: string;
  translation: { text: string; footnotes: QuranFootnotes | null };
  transliteration: string;
}

export interface QuranSurahSource {
  surah: number;
  nameAr: string;
  nameLatin: string;
  revelation: "makkah" | "madinah";
  ayahCount: number;
}

export interface QuranData {
  sources: QuranSourceRow[];
  surahs: QuranSurahSource[];
  /** Urut mushaf (surah, ayat). */
  ayat: QuranAyahSource[];
  /** Ayat yang teks Imlaei QUL-nya (dinormalisasi) ≠ Tanzil simple-clean: cek silang penomoran. */
  numberingMismatch: string[];
}

/** Jumlah surah/ayat mushaf (penomoran Kufah). Fixture tes memakai angka kecil. */
export const QURAN_EXPECT = { surahs: 114, ayat: 6236 } as const;

export interface QuranConfig {
  /** Folder sumber (bawaan data/raw). */
  root: string;
  files: Record<QuranFileKey, PinnedFile>;
  expect: { surahs: number; ayat: number };
}

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Baca berkas yang dipin; gagal keras bila tidak ada atau sha256 berbeda. */
export function readPinned(root: string, file: PinnedFile): { text: string; sha256: string } {
  const path = join(root, file.path);
  if (!existsSync(path)) {
    throw new Error(`${path} tidak ada. Unduh/salin sumber Qur'an (lihat data/SOURCES.md).`);
  }
  const raw = readFileSync(path);
  const actual = sha256(raw);
  if (actual !== file.sha256) {
    throw new Error(`${path}: sha256 ${actual} ≠ ${file.sha256} yang dipin di data/SOURCES.md`);
  }
  return { text: raw.toString("utf8"), sha256: actual };
}

// ── Tanzil XML ───────────────────────────────────────────────────────────────────────────

export interface TanzilAyah {
  surah: number;
  ayah: number;
  text: string;
  /** Atribut `bismillah` ayat 1 (pembuka surah); bukan bagian teks ayat. */
  bismillah: string | null;
}

export interface TanzilText {
  /** Nama surah Arab dari atribut `name`. */
  surahNames: Map<number, string>;
  ayat: TanzilAyah[];
}

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function xmlUnescape(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => XML_ENTITIES[e] ?? "");
}

/**
 * Parser minimal untuk XML Tanzil (`<quran><sura index name><aya index text [bismillah]/>`). Ketat:
 * setiap `<aya` harus cocok pola, nomor surah 1..114 dan nomor ayat berurutan tanpa celah.
 */
export function parseTanzilXml(
  xml: string,
  expect: QuranConfig["expect"] = QURAN_EXPECT,
): TanzilText {
  const surahNames = new Map<number, string>();
  const ayat: TanzilAyah[] = [];
  const suraRe = /<sura index="(\d+)" name="([^"]*)">([\s\S]*?)<\/sura>/g;
  const ayaRe = /<aya index="(\d+)" text="([^"]*)"(?: bismillah="([^"]*)")? \/>/g;
  let expectedSurah = 1;
  for (const sm of xml.matchAll(suraRe)) {
    const surah = Number(sm[1]);
    if (surah !== expectedSurah)
      throw new Error(`Tanzil: surah ${surah}, diharapkan ${expectedSurah}`);
    expectedSurah++;
    surahNames.set(surah, xmlUnescape(sm[2] ?? ""));
    const body = sm[3] ?? "";
    let expectedAyah = 1;
    for (const am of body.matchAll(ayaRe)) {
      const ayah = Number(am[1]);
      if (ayah !== expectedAyah) {
        throw new Error(`Tanzil: ${surah}:${ayah}, diharapkan ayat ${expectedAyah}`);
      }
      expectedAyah++;
      const text = xmlUnescape(am[2] ?? "");
      if (text.trim() === "") throw new Error(`Tanzil: ${surah}:${ayah} kosong`);
      ayat.push({ surah, ayah, text, bismillah: am[3] === undefined ? null : xmlUnescape(am[3]) });
    }
    const declared = (body.match(/<aya /g) ?? []).length;
    if (declared !== expectedAyah - 1) {
      throw new Error(
        `Tanzil: surah ${surah} punya ${declared} <aya>, terbaca ${expectedAyah - 1}`,
      );
    }
  }
  if (surahNames.size !== expect.surahs || ayat.length !== expect.ayat) {
    throw new Error(`Tanzil: ${surahNames.size} surah / ${ayat.length} ayat`);
  }
  return { surahNames, ayat };
}

// ── Data Kemenag (JSON dari dump DB Surau lama, milik pemilik) ─────────────────────────────

const ayahKey = z.string().regex(/^\d{1,3}:\d{1,3}$/);
const intString = z.union([z.number().int(), z.string().regex(/^\d+$/)]).transform(Number);

const translationFile = z.array(
  z.object({
    ayah_key: ayahKey,
    surah: z.number().int(),
    ayah: z.number().int(),
    text: z.string().min(1),
    footnotes: z
      // Satu catatan kaki (41:42) punya penanda kosong di sumber: disimpan apa adanya.
      .array(z.object({ text: z.string().min(1), marker: z.string(), number: z.number() }))
      .nullable(),
  }),
);
const transliterationFile = z.array(z.object({ ayah_key: ayahKey, text: z.string().min(1) }));
const surahFile = z.array(
  z.object({
    surah_id: intString,
    name_arabic: z.string().min(1),
    name_latin: z.string().min(1),
    revelation_type: z.enum(["makkah", "madinah"]),
    ayah_count: intString,
  }),
);
const arabFile = z.array(
  z.object({ ayah_key: ayahKey, juz_number: intString, text_imlaei_simple: z.string() }),
);

function byKey<T extends { ayah_key: string }>(
  rows: readonly T[],
  label: string,
  total: number,
): Map<string, T> {
  const map = new Map<string, T>();
  for (const r of rows) {
    if (map.has(r.ayah_key)) throw new Error(`${label}: ${r.ayah_key} ganda`);
    map.set(r.ayah_key, r);
  }
  if (map.size !== total) throw new Error(`${label}: ${map.size} ayat, diharapkan ${total}`);
  return map;
}

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`${what} tidak ada`);
  return value;
}

/**
 * Muat dan cek silang semua sumber Qur'an. `normalize` = normalisasi pencocokan (@surau/text),
 * dipakai hanya untuk cek silang penomoran Tanzil vs QUL; hasilnya tidak disimpan.
 */
export function loadQuran(cfg: QuranConfig, normalize: (s: string) => string): QuranData {
  const files = Object.fromEntries(
    Object.entries(cfg.files).map(([k, f]) => [k, readPinned(cfg.root, f)]),
  ) as Record<QuranFileKey, { text: string; sha256: string }>;
  const total = cfg.expect.ayat;

  const uthmani = parseTanzilXml(files.tanzilUthmani.text, cfg.expect);
  const simple = parseTanzilXml(files.tanzilSimpleClean.text, cfg.expect);
  const translation = byKey(
    translationFile.parse(JSON.parse(files.kemenagTranslation.text)),
    "terjemahan Kemenag",
    total,
  );
  const transliteration = byKey(
    transliterationFile.parse(JSON.parse(files.kemenagTransliteration.text)),
    "transliterasi Kemenag",
    total,
  );
  const arab = byKey(arabFile.parse(JSON.parse(files.kemenagArab.text)), "quran-arab", total);
  const surahRows = surahFile
    .parse(JSON.parse(files.kemenagSurah.text))
    .sort((a, b) => a.surah_id - b.surah_id);
  if (surahRows.length !== cfg.expect.surahs) throw new Error(`surah.json: ${surahRows.length}`);

  const counts = new Map<number, number>();
  for (const a of uthmani.ayat) counts.set(a.surah, a.ayah);
  const surahs: QuranSurahSource[] = surahRows.map((s, i) => {
    const surah = i + 1;
    if (s.surah_id !== surah) throw new Error(`surah.json: surah ${s.surah_id} di posisi ${surah}`);
    if (s.ayah_count !== counts.get(surah)) {
      throw new Error(
        `surah ${surah}: ${s.ayah_count} ayat (Kemenag) ≠ ${counts.get(surah)} (Tanzil)`,
      );
    }
    return {
      surah,
      // Nama Arab dari Tanzil (sumber teks ayat), nama Latin dari metadata Kemenag/QUL.
      nameAr: must(uthmani.surahNames.get(surah), `nama surah ${surah}`),
      nameLatin: s.name_latin,
      revelation: s.revelation_type,
      ayahCount: s.ayah_count,
    };
  });

  const numberingMismatch: string[] = [];
  const ayat: QuranAyahSource[] = uthmani.ayat.map((u, i) => {
    const s = must(simple.ayat[i], `simple-clean #${i}`);
    if (s.surah !== u.surah || s.ayah !== u.ayah) {
      throw new Error(`urutan simple-clean ${s.surah}:${s.ayah} ≠ uthmani ${u.surah}:${u.ayah}`);
    }
    const key = `${u.surah}:${u.ayah}`;
    const t = must(translation.get(key), `terjemahan ${key}`);
    if (t.surah !== u.surah || t.ayah !== u.ayah)
      throw new Error(`terjemahan ${key}: kunci ganjil`);
    const q = must(arab.get(key), `quran-arab ${key}`);
    if (normalize(q.text_imlaei_simple) !== normalize(s.text)) numberingMismatch.push(key);
    const footnotes =
      t.footnotes === null || t.footnotes.length === 0
        ? null
        : quranFootnotes.parse(t.footnotes.map((f) => ({ marker: f.marker, text: f.text })));
    return {
      surah: u.surah,
      ayah: u.ayah,
      juz: q.juz_number,
      uthmani: u.text,
      simpleClean: s.text,
      translation: { text: t.text, footnotes },
      transliteration: must(transliteration.get(key), `transliterasi ${key}`).text,
    };
  });

  const sources: QuranSourceRow[] = (
    Object.keys(QURAN_SOURCE_IDS) as (keyof typeof QURAN_SOURCE_IDS)[]
  )
    .map((k) => {
      const { file, ...meta } = SOURCE_META[k];
      return { id: QURAN_SOURCE_IDS[k], ...meta, sha256: files[file].sha256 };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  return { sources, surahs, ayat, numberingMismatch };
}
