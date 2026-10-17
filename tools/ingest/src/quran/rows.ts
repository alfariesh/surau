// Baris tabel Qur'an (migrasi 0005) dan rujukan ayat per paragraf (S12, ADR-040). Teks ayat,
// terjemahan, dan transliterasi disalin dari berkas sumber apa adanya; rujukan ayat dihasilkan
// pencocok deterministik (`matcher.ts`). Setiap baris divalidasi skema Zod @surau/db.
import {
  passageAyahRefRow,
  quranAyahRow,
  quranSourceRow,
  quranSurahRow,
  quranTranslationRow,
} from "@surau/db";
import type {
  PassageAyahRefRow,
  PassageRow,
  QuranAyahRow,
  QuranSourceRow,
  QuranSurahRow,
  QuranTranslationRow,
} from "@surau/db";

import { buildQuranIndex, matchPassage } from "./matcher.ts";
import type { AyahSpan, RejectedSpan } from "./matcher.ts";
import { QURAN_SOURCE_IDS } from "./source.ts";
import type { QuranData } from "./source.ts";

export interface QuranRows {
  quran_source: QuranSourceRow[];
  quran_surah: QuranSurahRow[];
  quran_ayah: QuranAyahRow[];
  quran_translation: QuranTranslationRow[];
  passage_ayah_ref: PassageAyahRefRow[];
}

export interface PassageAyat {
  passageId: number;
  spans: AyahSpan[];
  rejected: RejectedSpan[];
}

/** Hasil pencocok untuk validasi dan laporan (pipeline). */
export interface AyatBuild {
  stats: AyahStats;
  matches: PassageAyat[];
  /** Ayat yang teks Imlaei QUL-nya beda dari Tanzil (cek silang penomoran). */
  numberingMismatch: string[];
}

export interface AyahStats {
  /** Semua bentang `{…}`. */
  bracketedSpans: number;
  /** Bentang `{…}` yang lolos saring kandidat (≥2 kata, aturan 2 kata) dan dicocokkan ke mushaf. */
  validated: number;
  exact: number;
  similar: number;
  /** Bentang tervalidasi yang tidak cocok (bukan ayat, tidak ditautkan). */
  unmatched: number;
  /** Bentang `{…}` yang disaring sebelum pencocokan (1 kata, 2 kata tanpa pengantar). */
  filtered: number;
  rejectedByReason: Record<RejectedSpan["reason"], number>;
  cueExact: number;
  cueSimilar: number;
  partial: number;
  multiAyah: number;
  withAlternatives: number;
  passages: number;
  /** exact / validated (gerbang S12: ≥ 0,95). */
  exactRatio: number;
}

/** Gerbang mutu pencocok (S12 "Selesai bila"): rasio exact bentang berkurung tervalidasi. */
export const EXACT_RATIO_MIN = 0.95;
/** Batas beda teks Imlaei QUL vs Tanzil (cek silang penomoran ayat; 6 ayat beda ejaan saat S12). */
export const NUMBERING_MISMATCH_MAX = 20;

export function quranTableRows(data: QuranData): Omit<QuranRows, "passage_ayah_ref"> {
  const quran_source = data.sources.map((s) => quranSourceRow.parse(s));
  const quran_surah = data.surahs.map((s) =>
    quranSurahRow.parse({
      surah: s.surah,
      name_ar: s.nameAr,
      name_latin: s.nameLatin,
      revelation: s.revelation,
      ayah_count: s.ayahCount,
    }),
  );
  const quran_ayah: QuranAyahRow[] = [];
  const quran_translation: QuranTranslationRow[] = [];
  for (const a of data.ayat) {
    quran_ayah.push(
      quranAyahRow.parse({
        surah: a.surah,
        ayah: a.ayah,
        juz: a.juz,
        text_uthmani: a.uthmani,
        text_index: a.simpleClean,
      }),
    );
    quran_translation.push(
      quranTranslationRow.parse({
        surah: a.surah,
        ayah: a.ayah,
        source_id: QURAN_SOURCE_IDS.translation,
        text: a.translation.text,
        footnotes:
          a.translation.footnotes === null ? null : JSON.stringify(a.translation.footnotes),
      }),
      quranTranslationRow.parse({
        surah: a.surah,
        ayah: a.ayah,
        source_id: QURAN_SOURCE_IDS.transliteration,
        text: a.transliteration,
        footnotes: null,
      }),
    );
  }
  // Urut kunci utama (surah, ayah, source_id): SQL yang dihasilkan deterministik.
  quran_translation.sort(
    (x, y) => x.surah - y.surah || x.ayah - y.ayah || x.source_id.localeCompare(y.source_id),
  );
  return { quran_source, quran_surah, quran_ayah, quran_translation };
}

/** Cocokkan semua paragraf (badan dan catatan kaki) ke mushaf. */
export function matchAyat(
  data: QuranData,
  passages: readonly PassageRow[],
): { refs: PassageAyahRefRow[]; matches: PassageAyat[]; stats: AyahStats } {
  const index = buildQuranIndex(
    data.ayat.map((a) => ({ surah: a.surah, ayah: a.ayah, text: a.simpleClean })),
  );
  const refs: PassageAyahRefRow[] = [];
  const matches: PassageAyat[] = [];
  const rejectedByReason: AyahStats["rejectedByReason"] = {
    one_word: 0,
    two_words_no_cue: 0,
    no_match: 0,
    below_threshold: 0,
    cross_surah: 0,
  };
  let bracketedSpans = 0;
  let exact = 0;
  let similar = 0;
  let cueExact = 0;
  let cueSimilar = 0;
  let partial = 0;
  let multiAyah = 0;
  let withAlternatives = 0;
  for (const p of passages) {
    const m = matchPassage(index, p.text_raw);
    if (m.spans.length === 0 && m.rejected.length === 0) continue;
    matches.push({ passageId: p.id, spans: m.spans, rejected: m.rejected });
    for (const r of m.rejected) {
      bracketedSpans++;
      rejectedByReason[r.reason]++;
    }
    for (const s of m.spans) {
      if (s.kind === "bracketed") {
        bracketedSpans++;
        if (s.match === "exact") exact++;
        else similar++;
      } else if (s.match === "exact") cueExact++;
      else cueSimilar++;
      if (s.partial) partial++;
      if (s.ayahTo > s.ayahFrom) multiAyah++;
      if (s.alt > 0) withAlternatives++;
      refs.push(
        passageAyahRefRow.parse({
          passage_id: p.id,
          char_start: s.charStart,
          char_end: s.charEnd,
          surah: s.surah,
          ayah_from: s.ayahFrom,
          ayah_to: s.ayahTo,
          match: s.match,
          partial: s.partial ? 1 : 0,
          bracketed: s.kind === "bracketed" ? 1 : 0,
          alt_count: s.alt,
        }),
      );
    }
  }
  refs.sort((a, b) => a.passage_id - b.passage_id || a.char_start - b.char_start);
  const filtered = rejectedByReason.one_word + rejectedByReason.two_words_no_cue;
  const unmatched =
    rejectedByReason.no_match + rejectedByReason.below_threshold + rejectedByReason.cross_surah;
  const validated = exact + similar + unmatched;
  return {
    refs,
    matches,
    stats: {
      bracketedSpans,
      validated,
      exact,
      similar,
      unmatched,
      filtered,
      rejectedByReason,
      cueExact,
      cueSimilar,
      partial,
      multiAyah,
      withAlternatives,
      passages: new Set(refs.map((r) => r.passage_id)).size,
      exactRatio: validated === 0 ? 1 : exact / validated,
    },
  };
}
