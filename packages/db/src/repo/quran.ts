// Query baca tabel Qur'an dan rujukan ayat (migrasi 0005, S12). Teks ayat, terjemahan, dan
// transliterasi dikembalikan apa adanya dari DB (disalin ingest dari sumber yang dipin).
// Korpus skema < 5 tidak punya tabel ini: pemanggil (@surau/core) yang memeriksa skema.
import { z } from "zod";

import { D1_MAX_PARAMS, chunk, placeholders } from "../d1.ts";
import type { D1Db } from "../d1.ts";
import {
  passageAyahRefRow,
  quranAyahRow,
  quranSourceRow,
  quranSurahRow,
  quranTranslationRow,
} from "../schema/corpus.ts";
import type {
  QuranAyahRow,
  QuranSourceRow,
  QuranSurahRow,
  QuranTranslationRow,
} from "../schema/corpus.ts";

/** Rujukan ayat + nama surah (untuk label "QS Al-Baqarah [2]: 255" tanpa kueri tambahan). */
export const ayahRefWithSurahRow = passageAyahRefRow.extend({
  name_ar: z.string(),
  name_latin: z.string(),
});
export type AyahRefWithSurahRow = z.infer<typeof ayahRefWithSurahRow>;

/** Rujukan ayat di paragraf-paragraf ini, urut (passage_id, char_start). */
export async function getAyahRefs(
  db: D1Db,
  passageIds: readonly number[],
): Promise<AyahRefWithSurahRow[]> {
  const unique = [...new Set(passageIds)].sort((a, b) => a - b);
  if (unique.length === 0) return [];
  const stmts = chunk(unique, D1_MAX_PARAMS).map((ids) =>
    db
      .prepare(
        `SELECT r.passage_id, r.char_start, r.char_end, r.surah, r.ayah_from, r.ayah_to, r.match,
                r.partial, r.bracketed, r.alt_count, s.name_ar, s.name_latin
         FROM passage_ayah_ref r JOIN quran_surah s ON s.surah = r.surah
         WHERE r.passage_id IN (${placeholders(ids.length)})
         ORDER BY r.passage_id, r.char_start`,
      )
      .bind(...ids),
  );
  const results = await db.batch(stmts);
  return results.flatMap((r) => r.results.map((row) => ayahRefWithSurahRow.parse(row)));
}

/** Batas ayat yang diambil sekali panggil (satu halaman kitab merujuk jauh lebih sedikit). */
export const QURAN_AYAT_MAX = 300;

export interface AyahRange {
  surah: number;
  from: number;
  to: number;
}

export interface QuranAyat {
  ayat: QuranAyahRow[];
  /** Terjemahan dan transliterasi ayat-ayat itu, urut (surah, ayah, source_id). */
  translations: QuranTranslationRow[];
  surahs: QuranSurahRow[];
  /** Semua sumber teks Qur'an (versi, lisensi, atribusi). */
  sources: QuranSourceRow[];
}

/**
 * Ayat dalam rentang-rentang ini beserta terjemahan/transliterasi, surah, dan sumbernya: SATU
 * bolak-balik D1 (batch 4 kueri). Kunci ayat dikirim sebagai JSON `surah·1000 + ayah` lewat
 * `json_each`, jadi setiap ayat dicari lewat kunci utama (tanpa memindai 6.236 baris).
 * `RangeError` bila lebih dari `QURAN_AYAT_MAX` ayat.
 */
export async function getQuranAyat(db: D1Db, ranges: readonly AyahRange[]): Promise<QuranAyat> {
  const keys = new Set<number>();
  for (const r of ranges) {
    for (let a = r.from; a <= r.to; a++) keys.add(r.surah * 1000 + a);
    if (keys.size > QURAN_AYAT_MAX) throw new RangeError(`lebih dari ${QURAN_AYAT_MAX} ayat`);
  }
  if (keys.size === 0) return { ayat: [], translations: [], surahs: [], sources: [] };
  const json = JSON.stringify([...keys].sort((a, b) => a - b));
  const [ayat, translations, surahs, sources] = await db.batch([
    db
      .prepare(
        `SELECT a.surah, a.ayah, a.juz, a.text_uthmani, a.text_index
         FROM json_each(?) k JOIN quran_ayah a ON a.surah = k.value / 1000 AND a.ayah = k.value % 1000
         ORDER BY a.surah, a.ayah`,
      )
      .bind(json),
    db
      .prepare(
        `SELECT t.surah, t.ayah, t.source_id, t.text, t.footnotes
         FROM json_each(?) k JOIN quran_translation t ON t.surah = k.value / 1000 AND t.ayah = k.value % 1000
         ORDER BY t.surah, t.ayah, t.source_id`,
      )
      .bind(json),
    db
      .prepare(
        `SELECT surah, name_ar, name_latin, revelation, ayah_count FROM quran_surah
         WHERE surah IN (SELECT DISTINCT k.value / 1000 FROM json_each(?) k) ORDER BY surah`,
      )
      .bind(json),
    db.prepare(
      "SELECT id, kind, lang, name, version, license, attribution, url, sha256 FROM quran_source ORDER BY id",
    ),
  ]);
  return {
    ayat: (ayat?.results ?? []).map((r) => quranAyahRow.parse(r)),
    translations: (translations?.results ?? []).map((r) => quranTranslationRow.parse(r)),
    surahs: (surahs?.results ?? []).map((r) => quranSurahRow.parse(r)),
    sources: (sources?.results ?? []).map((r) => quranSourceRow.parse(r)),
  };
}
