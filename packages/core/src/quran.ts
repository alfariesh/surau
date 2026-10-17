// Ayat Al-Qur'an (S12, ADR-020, ADR-040): rujukan ayat per paragraf dan teks ayat + terjemahan
// Kemenag + transliterasi, semuanya verbatim dari DB (disalin ingest dari Tanzil dan Kemenag).
// Model tidak pernah menulis atau menerjemahkan ayat. Korpus sebelum S12 (skema < 5) tidak punya
// tabel ayat: paragraf tetap tampil tanpa rujukan, `getAyahRefs` menjawab `Unavailable`.
import {
  QURAN_AYAT_MAX,
  QURAN_SCHEMA_VERSION,
  QURAN_SOURCE,
  getAyahRefs as getAyahRefRows,
  getCorpusMeta,
  getPassageById,
  getQuranAyat,
  quranFootnotes,
} from "@surau/db";
import type { AyahRefWithSurahRow, D1Db, QuranAyat } from "@surau/db";

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

/** Sumber yang ditampilkan: teks Uthmani, terjemahan Kemenag, transliterasi Kemenag (by ID). */
const SHOWN_SOURCES: ReadonlySet<string> = new Set([
  QURAN_SOURCE.uthmani,
  QURAN_SOURCE.translation,
  QURAN_SOURCE.transliteration,
]);

/** Ayat (urut mushaf, unik) dari rujukan-rujukan, dipecah per ≤ QURAN_AYAT_MAX ayat. */
async function loadAyat(
  db: D1Db,
  refs: readonly Pick<AyahRef, "surah" | "ayah_from" | "ayah_to">[],
): Promise<QuranAyat> {
  const keys = new Set<number>();
  for (const r of refs) for (let a = r.ayah_from; a <= r.ayah_to; a++) keys.add(r.surah * 1000 + a);
  const sorted = [...keys].sort((a, b) => a - b);
  const parts: QuranAyat[] = [];
  for (let i = 0; i < sorted.length; i += QURAN_AYAT_MAX) {
    const chunk = sorted.slice(i, i + QURAN_AYAT_MAX);
    parts.push(
      await getQuranAyat(
        db,
        chunk.map((k) => ({ surah: Math.floor(k / 1000), from: k % 1000, to: k % 1000 })),
      ),
    );
  }
  const surahs = new Map(parts.flatMap((p) => p.surahs).map((s) => [s.surah, s]));
  return {
    ayat: parts.flatMap((p) => p.ayat),
    translations: parts.flatMap((p) => p.translations),
    surahs: [...surahs.values()].sort((a, b) => a.surah - b.surah),
    sources: parts[0]?.sources ?? [],
  };
}

/**
 * Teks ayat utuh (juga untuk kutipan sebagian), terjemahan + catatan kaki, transliterasi, surah,
 * dan sumber untuk rujukan-rujukan ini. Satu bolak-balik D1 per ≤ QURAN_AYAT_MAX ayat (satu
 * halaman kitab praktis selalu satu), jadi halaman yang merujuk banyak ayat tidak gagal. `null`
 * bila tidak ada rujukan. Terjemahan dan transliterasi dipilih menurut ID sumber
 * (`QURAN_SOURCE`), bukan baris pertama berjenis sama, supaya terjemahan lain kelak tidak tampil
 * berlabel Kemenag.
 */
export async function quranForRefs(
  db: D1Db,
  refs: readonly Pick<AyahRef, "surah" | "ayah_from" | "ayah_to">[],
): Promise<QuranView | null> {
  if (refs.length === 0) return null;
  const q = await loadAyat(db, refs);
  const key = (surah: number, ayah: number) => surah * 1000 + ayah;
  const translation = new Map<number, QuranAyahView["translation"]>();
  const transliteration = new Map<number, string>();
  for (const t of q.translations) {
    if (t.source_id === QURAN_SOURCE.translation) {
      translation.set(key(t.surah, t.ayah), {
        text: t.text,
        footnotes: t.footnotes === null ? [] : quranFootnotes.parse(JSON.parse(t.footnotes)),
      });
    } else if (t.source_id === QURAN_SOURCE.transliteration) {
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
    // Hanya sumber yang ditampilkan (teks uthmani, terjemahan, transliterasi): satu per jenis.
    // Simple-clean dipakai untuk pencocokan saja.
    sources: q.sources
      .filter((s) => SHOWN_SOURCES.has(s.id))
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
