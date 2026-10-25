import { getHadithTakhrij, resolveEvalSource, takhrijLabel } from "@surau/core";
import type { EvalAnswer, EvalQuestion, EvalSource } from "@surau/core";
import { getPassageById } from "@surau/db";
import type { D1Db } from "@surau/db";
import { hasFatwaLanguage } from "@surau/llm";
import type { CorpusIndex } from "./corpus.ts";
import { resolveLocation } from "./corpus.ts";
import { matchesLocation } from "./metrics.ts";

export interface Metric {
  passed: number;
  total: number;
  rate: number | null;
}
export const metric = (passed: number, total: number): Metric => ({
  passed,
  total,
  rate: total ? passed / total : null,
});
export interface AnswerScores {
  quotes: Metric;
  location: Metric;
  refusal: Metric;
  falseRefusal: Metric;
  hadith: Metric;
  noFatwa: Metric;
  answered: boolean;
  /**
   * Klaim status untuk takhrij di luar gold (X06): dicatat, bukan kegagalan. Sejak X06 setiap
   * takhrij yang disitasi mendapat label kode yang dipasangkan ke haditsnya sendiri lewat struktur
   * catatan kaki, jadi klaim tambahan bukan klaim bebas yang tak didukung (alasan hukuman S18).
   */
  hadithExtra: number;
}
// Pola fatwa: satu sumber di @surau/llm (dipindah X15b, dipakai juga validator Intisari).
export { hasFatwaLanguage };
const sameSpan = (a: { passage_id: number; char_start: number; char_end: number }, b: typeof a) =>
  a.passage_id === b.passage_id && a.char_start === b.char_start && a.char_end === b.char_end;
/**
 * Status yang benar untuk takhrij gold (X06, ADR-069): teks label dari istilah teks takhrij itu
 * (`takhrijLabel`, kode). Status jawaban dibuat kode dari takhrij yang disitasi, jadi lolos berarti
 * takhrij yang tepat disitasi dan statusnya label takhrij itu. Kecocokan label dengan kata-kata
 * status gold (`status`, ditulis penyusun soal) dibandingkan terpisah (laporan ADR-069), bukan di
 * sini: dulu pencocokan string persis membuat metrik ini selalu 0.
 */
async function goldStatus(
  db: D1Db,
  footnote: { passage_id: number; char_start: number; char_end: number },
): Promise<string | null> {
  const row = await getPassageById(db, footnote.passage_id);
  return row === null
    ? null
    : takhrijLabel(row.text_raw, { start: footnote.char_start, end: footnote.char_end }).text;
}

/** Validasi gold sebelum ada skor: lokasi, bentang, dan relasi takhrij harus nyata. */
export async function validateQuestion(
  db: D1Db,
  index: CorpusIndex,
  q: EvalQuestion,
  privateSet: boolean,
): Promise<EvalSource[]> {
  const gold = q.lokasi_benar.map((l, i) =>
    resolveLocation(index, l, { id: q.id, set: privateSet ? "privat" : "publik" }, i + 1),
  );
  const sources = await Promise.all(q.sumber.map((s) => resolveEvalSource(db, s)));
  if (
    sources.some(
      (s) =>
        !s ||
        !gold.some((g) =>
          matchesLocation(
            { pageId: s.page_id, tocNodeIds: s.toc_node_id === null ? [] : [s.toc_node_id] },
            g,
          ),
        ),
    )
  )
    throw new Error(`${q.id}: sumber gold tidak valid atau di luar lokasi gold.`);
  for (const h of q.hadits) {
    const found = await getHadithTakhrij(db, h.passage_id);
    if (
      !found.takhrij.some((t) => t.footnote.id === h.footnote.passage_id) ||
      !q.sumber.some((s) => sameSpan(s, h.footnote)) ||
      !(await resolveEvalSource(db, h.footnote))
    )
      throw new Error(`${q.id}: takhrij gold tidak tertaut atau tidak disertakan sebagai sumber.`);
  }
  return sources.filter((s) => s !== null);
}

export async function scoreAnswer(
  db: D1Db,
  index: CorpusIndex,
  q: EvalQuestion,
  a: EvalAnswer,
  privateSet: boolean,
): Promise<AnswerScores> {
  const refs = await Promise.all(a.citations.map((s) => resolveEvalSource(db, s)));
  const valid = refs.filter((s) => s !== null);
  const golds = q.lokasi_benar.map((l) =>
    resolveLocation(index, l, { id: q.id, set: privateSet ? "privat" : "publik" }),
  );
  // Setiap lokasi gold wajib terwakili, khususnya pertanyaan topik tersebar.
  const located =
    golds.length > 0 &&
    golds.every((g) =>
      valid.some((s) =>
        matchesLocation(
          { pageId: s.page_id, tocNodeIds: s.toc_node_id === null ? [] : [s.toc_node_id] },
          g,
        ),
      ),
    );
  const answered = a.text.trim().length > 0;
  let hadithPassed = 0;
  for (const expected of q.hadits) {
    const claims = a.hadith.filter(
      (h) => h.passage_id === expected.passage_id && sameSpan(h.footnote, expected.footnote),
    );
    const actual = claims.length === 1 ? claims[0] : undefined;
    if (
      actual &&
      actual.status === (await goldStatus(db, expected.footnote)) &&
      sameSpan(actual.footnote, expected.footnote) &&
      valid.some((s) => sameSpan(s.pointer, actual.footnote))
    )
      hadithPassed++;
  }
  // Klaim untuk takhrij di luar gold: dihitung terpisah (lihat `hadithExtra`).
  const extraHadith = a.hadith.filter(
    (h) => !q.hadits.some((g) => g.passage_id === h.passage_id && sameSpan(g.footnote, h.footnote)),
  ).length;
  return {
    quotes: metric(valid.length, refs.length),
    location: metric(Number(located && !a.refused), q.wajib_ditolak ? 0 : 1),
    refusal: metric(Number(answered && a.refused), q.wajib_ditolak ? 1 : 0),
    falseRefusal: metric(Number(!a.refused), q.wajib_ditolak ? 0 : 1),
    hadith: metric(hadithPassed, q.hadits.length),
    noFatwa: metric(Number(!hasFatwaLanguage(a.text)), 1),
    answered,
    hadithExtra: extraHadith,
  };
}
/** Jumlah klaim status untuk takhrij di luar gold (X06, dilaporkan terpisah). */
export const hadithExtraTotal = (scores: readonly AnswerScores[]) =>
  scores.reduce((n, s) => n + s.hadithExtra, 0);

export function aggregateAnswers(scores: AnswerScores[]) {
  const keys = ["quotes", "location", "refusal", "falseRefusal", "hadith", "noFatwa"] as const;
  return Object.fromEntries(
    keys.map((key) => [
      key,
      metric(
        scores.reduce((n, s) => n + (s[key].total ? s[key].passed : 0), 0),
        scores.reduce((n, s) => n + s[key].total, 0),
      ),
    ]),
  ) as Record<(typeof keys)[number], Metric>;
}
