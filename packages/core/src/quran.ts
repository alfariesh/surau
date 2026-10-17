// Ayat Al-Qur'an (S12, ADR-020, ADR-040): rujukan ayat per paragraf dan teks ayat + terjemahan
// Kemenag + transliterasi, semuanya verbatim dari DB (disalin ingest dari Tanzil dan Kemenag).
// Model tidak pernah menulis atau menerjemahkan ayat. Korpus sebelum S12 (skema < 5) tidak punya
// tabel ayat: paragraf tetap tampil tanpa rujukan, `getAyahRefs` menjawab `Unavailable`.
import {
  QURAN_SCHEMA_VERSION,
  QURAN_SOURCE,
  getAyahRefs as getAyahRefRows,
  getCorpusMeta,
  getPassageById,
  getQuranAyat,
  quranFootnotes,
} from "@surau/db";
import type { AyahRefWithSurahRow, D1Db } from "@surau/db";

import { NotFound, Unavailable, parseInput } from "./errors.ts";
import { getAyahRefsInput } from "./schema.ts";
import type { AyahRef, AyahRefsView, QuranAyahView, QuranView } from "./schema.ts";

/** Label rujukan baku: "QS Al-Baqarah [2]: 255", rentang dengan tanda pisah "255–257". */
export function ayahLabel(nameLatin: string, surah: number, from: number, to: number): string {
  return `QS ${nameLatin} [${surah}]: ${to > from ? `${from}–${to}` : from}`;
}

function toAyahRef(r: AyahRefWithSurahRow): AyahRef {
  return {
    char_start: r.char_start,
    char_end: r.char_end,
    surah: r.surah,
    ayah_from: r.ayah_from,
    ayah_to: r.ayah_to,
    match: r.match,
    partial: r.partial === 1,
    bracketed: r.bracketed === 1,
    alt_count: r.alt_count,
    label: ayahLabel(r.name_latin, r.surah, r.ayah_from, r.ayah_to),
  };
}

/**
 * Rujukan ayat beberapa paragraf, per passage_id. `null` bila korpus belum punya tabel ayat
 * (skema < 5): kueri gagal "no such table", lalu skema dicek dengan satu kueri `meta`. Galat lain
 * (D1 gagal, baris rusak) diteruskan.
 */
export async function loadAyahRefs(
  db: D1Db,
  passageIds: readonly number[],
): Promise<Map<number, AyahRef[]> | null> {
  let rows: AyahRefWithSurahRow[];
  try {
    rows = await getAyahRefRows(db, passageIds);
  } catch (error) {
    const meta = await getCorpusMeta(db).catch(() => null);
    if (meta !== null && meta.schema_version < QURAN_SCHEMA_VERSION) return null;
    throw error;
  }
  const by = new Map<number, AyahRef[]>();
  for (const r of rows) {
    const list = by.get(r.passage_id) ?? [];
    list.push(toAyahRef(r));
    by.set(r.passage_id, list);
  }
  return by;
}

/**
 * Teks ayat utuh (juga untuk kutipan sebagian), terjemahan + catatan kaki, transliterasi, surah,
 * dan sumber untuk rujukan-rujukan ini, dalam satu bolak-balik D1. `null` bila tidak ada rujukan.
 */
export async function quranForRefs(
  db: D1Db,
  refs: readonly Pick<AyahRef, "surah" | "ayah_from" | "ayah_to">[],
): Promise<QuranView | null> {
  if (refs.length === 0) return null;
  const q = await getQuranAyat(
    db,
    refs.map((r) => ({ surah: r.surah, from: r.ayah_from, to: r.ayah_to })),
  );
  const kindOf = new Map(q.sources.map((s) => [s.id, s.kind]));
  const key = (surah: number, ayah: number) => surah * 1000 + ayah;
  const translation = new Map<number, QuranAyahView["translation"]>();
  const transliteration = new Map<number, string>();
  for (const t of q.translations) {
    const kind = kindOf.get(t.source_id);
    if (kind === "translation" && !translation.has(key(t.surah, t.ayah))) {
      translation.set(key(t.surah, t.ayah), {
        text: t.text,
        footnotes: t.footnotes === null ? [] : quranFootnotes.parse(JSON.parse(t.footnotes)),
      });
    } else if (kind === "transliteration" && !transliteration.has(key(t.surah, t.ayah))) {
      transliteration.set(key(t.surah, t.ayah), t.text);
    }
  }
  return {
    surahs: q.surahs.map((s) => ({
      surah: s.surah,
      name_ar: s.name_ar,
      name_latin: s.name_latin,
      revelation: s.revelation,
      ayah_count: s.ayah_count,
    })),
    ayat: q.ayat.map((a) => ({
      surah: a.surah,
      ayah: a.ayah,
      juz: a.juz,
      text: a.text_uthmani,
      translation: translation.get(key(a.surah, a.ayah)) ?? null,
      transliteration: transliteration.get(key(a.surah, a.ayah)) ?? null,
    })),
    // Hanya sumber yang ditampilkan (teks uthmani, terjemahan, transliterasi); simple-clean dipakai
    // untuk pencocokan saja.
    sources: q.sources
      .filter((s) => s.kind !== "text" || s.id === QURAN_SOURCE.uthmani)
      .map((s) => ({
        id: s.id,
        kind: s.kind,
        name: s.name,
        version: s.version,
        license: s.license,
        attribution: s.attribution,
        url: s.url,
      })),
  };
}

/**
 * get_ayah_refs: kutipan ayat di satu paragraf beserta teks ayat utuh dan terjemahan Kemenag.
 * `NotFound` bila paragraf tidak ada; `Unavailable` bila korpus belum punya tabel ayat.
 */
export async function getAyahRefs(db: D1Db, passageId: number): Promise<AyahRefsView> {
  const input = parseInput(getAyahRefsInput, { passage_id: passageId });
  const passage = await getPassageById(db, input.passage_id);
  if (passage === null) throw new NotFound(`Passage not found: ${input.passage_id}`);
  const refs = await loadAyahRefs(db, [passage.id]);
  if (refs === null) throw new Unavailable("Quran references are not available for this corpus");
  const list = refs.get(passage.id) ?? [];
  const quran = (await quranForRefs(db, list)) ?? { surahs: [], ayat: [], sources: [] };
  return { passage_id: passage.id, refs: list, quran };
}
