import { ANSWER_KINDS } from "@surau/core";
import type { AnswerRecord, JudgeRecord } from "./answer-data.ts";
import { aggregateAnswers, hadithExtraTotal, metric } from "./answer-metrics.ts";
import type { AnswerScores, Metric } from "./answer-metrics.ts";
import { calibration } from "./answer-review.ts";
import type { ReviewExport } from "./answer-review.ts";
import { JUDGE_VERSION } from "./answer-judge.ts";
import { SAVED_ROUTE_SUFFIX, SEMANTIC_FILE_SUFFIX } from "./answer-run.ts";

const pct = (m: Metric) =>
  m.rate === null ? "— (0 sampel)" : `${(m.rate * 100).toFixed(1)}% (${m.passed}/${m.total})`;
export function answerReport(
  rows: { record: AnswerRecord; scores: AnswerScores }[],
  judge: JudgeRecord[],
  reviews: ReviewExport[],
  reviewer: string,
) {
  if (!rows.length) throw new Error("Laporan kosong.");
  const records = rows.map((r) => r.record);
  const matching = judge.filter(
    (j) =>
      j.judge_version === JUDGE_VERSION &&
      records.some(
        (r) =>
          r.id === j.id &&
          r.answer_hash === j.answer_hash &&
          r.question_hash === j.question_hash &&
          r.corpus_version === j.corpus_version,
      ),
  );
  if (new Set(judge.map((j) => j.id)).size !== judge.length || matching.length !== judge.length)
    throw new Error("Judge ganda, versi lama, atau hash tidak cocok.");
  const official = rows.filter((r) => r.record.question.disetujui_oleh !== null);
  const cal = calibration(records, matching, reviews, reviewer);
  const result = [
    "# Eval Jawab",
    "",
    `Korpus: ${[...new Set(records.map((r) => r.corpus_version))].join(", ")}. Run: ${[...new Set(records.map((r) => r.run_id))].join(", ")}.`,
    `Soal: ${rows.length}; resmi: ${official.length}; draf: ${rows.length - official.length}; privat: ${records.filter((r) => r.private).length}.`,
    `Versi jawaban: ${[...new Set(records.map((r) => r.answer.prompt_version))].join(", ")}. Judge: ${JUDGE_VERSION}.`,
    "",
    "Hasil draf belum menjadi gerbang rilis. Kutipan dihitung per bentang sumber; lokasi benar menuntut semua lokasi gold. Jawaban kosong tidak lulus penolakan. Flag penolakan adalah keluaran pipeline, bukan penilaian kebenaran semantik; kesetiaan dinilai terpisah. Pola bahasa fatwa hanya pemeriksaan heuristik.",
    "",
    "| Set | n | Kutipan valid | Lokasi | Penolakan tepat | Tidak salah menolak | Takhrij | Tanpa pola fatwa |",
    "|---|---:|---|---|---|---|---|---|",
  ];
  const group = (label: string, subset: typeof rows) => {
    const s = aggregateAnswers(subset.map((r) => r.scores));
    result.push(
      `| ${label} | ${subset.length} | ${pct(s.quotes)} | ${pct(s.location)} | ${pct(s.refusal)} | ${pct(s.falseRefusal)} | ${pct(s.hadith)} | ${pct(s.noFatwa)} |`,
    );
  };
  group("Resmi", official);
  group(
    "Draf",
    rows.filter((r) => r.record.question.disetujui_oleh === null),
  );
  group(
    "Privat (agregat)",
    rows.filter((r) => r.record.private),
  );
  for (const kind of ANSWER_KINDS)
    group(
      kind,
      rows.filter((r) => r.record.question.jenis === kind),
    );
  const scored = matching.filter((j) => j.scores !== null);
  result.push(
    "",
    `Judge valid: ${scored.length}/${rows.length}; gagal/hilang: ${rows.length - scored.length}.`,
    `Kesetiaan: ${pct(metric(scored.filter((j) => j.scores?.faithfulness).length, scored.length))}. Atribusi: ${pct(metric(scored.filter((j) => j.scores?.attribution).length, scored.length))}.`,
    `Kalibrasi: ${cal.paired_answers} jawaban berpasangan dengan dua skor manusia. Kesepakatan kesetiaan ${pct(cal.faithfulness)}; atribusi ${pct(cal.attribution)}. ${cal.paired_answers < 30 ? "Belum terkalibrasi (target ±30)." : "Pasangan tersedia; periksa perbedaan sebelum memakai judge sebagai gerbang."}`,
    `Bahasa Indonesia: ${cal.language.mean?.toFixed(2) ?? "—"}/5, n=${cal.language.n}.`,
    `Jawaban berisi teks: ${rows.filter((r) => r.scores.answered).length}/${rows.length}.`,
    `Takhrij: takhrij gold disitasi dan status = label kode takhrij itu (sejak X06, ADR-069; status tidak lagi tulisan model). Klaim status untuk takhrij lain yang disitasi (bukan kegagalan): ${hadithExtraTotal(rows.map((r) => r.scores))}.`,
    `Biaya jawaban: $${records.reduce((n, r) => n + r.answer.cost_usd, 0).toFixed(6)}; latensi rerata ${(records.reduce((n, r) => n + r.answer.latency_ms, 0) / rows.length).toFixed(0)} ms. Biaya judge dicatat terpisah di manifest batch.`,
    ...(records.some((r) => r.answer.prompt_version.includes(SAVED_ROUTE_SUFFIX))
      ? [
          "Rute routing diambil dari arsip run lain (`--rute`, akhiran `+rute-tersimpan`): biaya dan latensi tanpa panggilan routing, dan angka ini mengukur tahap jawaban atas dokumen yang sama, bukan pipeline penuh.",
        ]
      : []),
    ...(records.some((r) => r.answer.prompt_version.includes(SEMANTIC_FILE_SUFFIX))
      ? [
          "Daftar makna diambil dari berkas peringkat (`--semantik`, akhiran `+makna-berkas`, X13), bukan indeks vektor Worker: pencarian makna di produksi belum menyala.",
        ]
      : []),
    "",
    "Soal privat dan teks kitab tidak dimuat dalam laporan ini. Arsip per soal, alasan judge, dan penilaian manusia berada di penyimpanan privat.",
    "",
  );
  return result.join("\n");
}
