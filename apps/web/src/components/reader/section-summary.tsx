import type { SummaryView } from "@surau/core";

import { id } from "../../i18n/id";
import { ArabicInline } from "../arabic";

const t = id.reader;

// Ringkasan AI bagian daftar isi yang mulai di halaman ini (S13 dibuat, S14 tampil), berlabel
// "Ringkasan AI". <details> bawaan: terlipat, bisa dibuka tanpa JS, dan tidak menggeser teks kitab.
export function SectionSummary({ summary }: { summary: SummaryView }) {
  if (summary.review_status === "rejected") return null;
  return (
    <details className="section-summary rounded-xl border border-separator px-4 py-2" lang="id">
      <summary className="text-foreground cursor-pointer py-1 text-sm font-medium">
        {t.aiSummaryOf}
        <span className="text-muted font-normal">
          {" · "}
          <ArabicInline>{summary.section.title_ar}</ArabicInline>
        </span>
      </summary>
      <div className="flex flex-col gap-2 pt-1 pb-2">
        <p className="text-foreground text-sm leading-relaxed whitespace-pre-line">
          {summary.text}
        </p>
        <p className="text-muted text-xs">
          {t.aiSummary} · {t.aiMeta(summary.model, t.aiReview[summary.review_status])}
        </p>
      </div>
    </details>
  );
}
