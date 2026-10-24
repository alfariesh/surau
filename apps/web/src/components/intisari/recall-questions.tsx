import type { DigestPointView, DigestQuestionView } from "@surau/core";

import { Typography } from "@heroui/react";

import { intisari as intisariText } from "../../i18n/id/intisari";

import { pointAnchor } from "./format";

const t = intisariText;

/**
 * "Uji pemahaman" (X16): pertanyaan ingatan per gagasan, terlipat (`<details>`, tanpa JavaScript).
 * Jawabannya tidak disimpan: membuka pertanyaan menunjukkan gagasan yang menjawabnya, dengan
 * tautan ke gagasan itu (dan dari sana ke Dasar teks).
 */
export function RecallQuestions({
  questions,
  points,
  numbers,
}: {
  questions: readonly DigestQuestionView[];
  points: readonly DigestPointView[];
  numbers: Map<number, number>;
}) {
  const byOrd = new Map(points.map((p) => [p.ord, p]));
  const shown = questions.filter((q) => byOrd.has(q.point_ord));
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <Typography color="muted" type="body-sm">
        {t.questionsLead}
      </Typography>
      <ol className="intisari-questions flex list-none flex-col gap-2 p-0">
        {shown.map((q) => {
          const point = byOrd.get(q.point_ord)!;
          return (
            <li key={q.ord}>
              <details className="intisari-question">
                <summary>{q.text}</summary>
                <div className="flex flex-col gap-1 pt-2">
                  <Typography type="body-sm">
                    {t.questionAnswer(numbers.get(point.ord)!, point.title)}
                  </Typography>
                  <a className="link self-start text-sm" href={`#${pointAnchor(point.ord)}`}>
                    {t.questionGoto}
                  </a>
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
