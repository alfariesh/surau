// Memuat hasil LLM yang lolos (data/build/llm/translation.jsonl, summary.jsonl) ke baris korpus
// `translation` dan `summary` (S13 langkah 8). Setiap hasil dicek ulang terhadap unit yang dibangun
// dari sumber SAAT INI: hash sumber harus sama (teks dan rujukan ayat tidak berubah sejak batch), dan
// keluaran divalidasi ulang. Hasil usang tidak dimuat; paragrafnya dihitung "belum diterjemahkan".
import { join } from "node:path";

import { QURAN_SOURCE, quranFootnotes, summaryRow, translationRow } from "@surau/db";
import type { SummaryRow, TranslationRow } from "@surau/db";
import { translationSegments } from "@surau/core";
import type { QuranView } from "@surau/core";
import { checkSummary, checkTranslation } from "@surau/llm";

import type { CorpusRows } from "../rows.ts";
import { acceptedSummary, acceptedTranslation, readJsonl } from "./store.ts";
import { buildWork } from "./work.ts";

export interface LlmStats {
  /** Paragraf badan yang harus punya terjemahan. */
  units: number;
  translations: number;
  /** Hasil yang teks/rujukan ayatnya sudah berubah sejak batch (tidak dimuat). */
  staleTranslations: number;
  /** Hasil yang tidak lolos validasi ulang (tidak dimuat). */
  invalidTranslations: number;
  /** Simpul × bahasa yang harus punya ringkasan. */
  summaryTargets: number;
  summaries: number;
  staleSummaries: number;
  invalidSummaries: number;
  /** Terjemahan yang dimuat dan memuat kutipan ayat. */
  withAyat: number;
  /**
   * Pelanggaran "ayat tidak pernah diterjemahkan model": rujukan ayat paragraf yang tidak muncul
   * sebagai segmen Kemenag utuh di terjemahan, atau placeholder yang tidak bisa dirender. Harus 0.
   */
  ayahProblems: string[];
}

export interface LlmBuild {
  translation: TranslationRow[];
  summary: SummaryRow[];
  stats: LlmStats;
}

/** QuranView seluruh mushaf dari baris korpus (untuk merender segmen persis seperti UI). */
export function quranViewFromRows(rows: CorpusRows): QuranView {
  const tr = new Map(
    rows.quran_translation
      .filter((t) => t.source_id === QURAN_SOURCE.translation)
      .map((t) => [`${t.surah}:${t.ayah}`, t]),
  );
  const lat = new Map(
    rows.quran_translation
      .filter((t) => t.source_id === QURAN_SOURCE.transliteration)
      .map((t) => [`${t.surah}:${t.ayah}`, t.text]),
  );
  return {
    surahs: rows.quran_surah.map((s) => ({ ...s })),
    ayat: rows.quran_ayah.map((a) => {
      const t = tr.get(`${a.surah}:${a.ayah}`);
      return {
        surah: a.surah,
        ayah: a.ayah,
        juz: a.juz,
        text: a.text_uthmani,
        translation:
          t === undefined
            ? null
            : {
                text: t.text,
                footnotes:
                  t.footnotes === null ? [] : quranFootnotes.parse(JSON.parse(t.footnotes)),
              },
        transliteration: lat.get(`${a.surah}:${a.ayah}`) ?? null,
      };
    }),
    sources: rows.quran_source.map((s) => ({
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

/** Baca hasil LLM yang lolos dari `dir` dan jadikan baris korpus. Tanpa file = tanpa baris. */
export function llmRows(rows: CorpusRows, dir: string): LlmBuild {
  const work = buildWork(rows);
  const quran = quranViewFromRows(rows);
  const stats: LlmStats = {
    units: work.units.size,
    translations: 0,
    staleTranslations: 0,
    invalidTranslations: 0,
    summaryTargets: work.nodes.length * 2,
    summaries: 0,
    staleSummaries: 0,
    invalidSummaries: 0,
    withAyat: 0,
    ayahProblems: [],
  };

  // Baris terakhir per paragraf menang (ulangan menimpa hasil lama).
  const latestT = new Map(
    readJsonl(join(dir, "translation.jsonl"), acceptedTranslation).map((t) => [t.passage_id, t]),
  );
  const translation: TranslationRow[] = [];
  for (const t of [...latestT.values()].sort((a, b) => a.passage_id - b.passage_id)) {
    const u = work.units.get(t.passage_id);
    if (u === undefined || u.sourceSha256 !== t.source_sha256) {
      stats.staleTranslations++;
      continue;
    }
    const c = checkTranslation(t.text, u);
    if (!c.ok || c.text !== t.text) {
      stats.invalidTranslations++;
      continue;
    }
    if (u.masked.slots.length > 0) {
      stats.withAyat++;
      const segs = translationSegments(t.text, u.masked.slots, quran);
      const ayah = segs.filter((s) => s.kind === "ayah");
      const invalid = segs.filter((s) => s.kind === "invalid");
      if (invalid.length > 0 || ayah.length !== u.masked.slots.length) {
        stats.ayahProblems.push(
          `${t.passage_id}: ${ayah.length}/${u.masked.slots.length} segmen Kemenag, ${invalid.length} placeholder tak terender`,
        );
      }
    }
    translation.push(
      translationRow.parse({
        passage_id: t.passage_id,
        lang: t.lang,
        text: t.text,
        model: t.model,
        prompt_version: t.prompt_version,
        created_at: t.created_at,
        review_status: "ai_generated",
      }),
    );
  }
  stats.translations = translation.length;

  const latestS = new Map(
    readJsonl(join(dir, "summary.jsonl"), acceptedSummary).map((s) => [
      `${s.toc_node_id}-${s.lang}`,
      s,
    ]),
  );
  const summary: SummaryRow[] = [];
  for (const s of [...latestS.values()].sort(
    (a, b) => a.toc_node_id - b.toc_node_id || (a.lang < b.lang ? -1 : 1),
  )) {
    const n = work.nodeById.get(s.toc_node_id);
    const want =
      n === undefined ? null : n.round2 ? n.sourceSha256 : (n.subtree[0]?.sourceSha256 ?? null);
    if (want === null || want !== s.source_sha256 || s.part !== null) {
      stats.staleSummaries++;
      continue;
    }
    if (!checkSummary(s.text, s.lang).ok) {
      stats.invalidSummaries++;
      continue;
    }
    summary.push(
      summaryRow.parse({
        toc_node_id: s.toc_node_id,
        lang: s.lang,
        text: s.text,
        model: s.model,
        prompt_version: s.prompt_version,
        created_at: s.created_at,
        review_status: "ai_generated",
      }),
    );
  }
  stats.summaries = summary.length;
  return { translation, summary, stats };
}
