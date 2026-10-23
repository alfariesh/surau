import type { NeedsReviewReason } from "@surau/db";

import { Chip } from "@heroui/react";

import { reader as readerText } from "../../i18n/id/reader";

const t = readerText;

// Tanda dari pemeriksaan otomatis saat impor (passage_needs_review, ADR-032): ditampilkan apa
// adanya supaya pembaca tahu bagian mana yang belum ditinjau manusia. Bukan hasil tinjauan.
export function NeedsReviewNote({ reasons }: { reasons: readonly NeedsReviewReason[] }) {
  if (reasons.length === 0) return null;
  return (
    <div className="flex flex-col items-start gap-1">
      <Chip color="warning" size="sm" variant="soft">
        {t.needsReview}
      </Chip>
      <ul className="text-muted flex list-none flex-col gap-0.5 p-0 text-xs">
        {reasons.map((r) => (
          <li key={r}>{t.needsReviewReasons[r]}</li>
        ))}
      </ul>
    </div>
  );
}
