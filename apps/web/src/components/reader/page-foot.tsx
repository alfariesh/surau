import { Typography } from "@heroui/react";

import { reader as readerText } from "../../i18n/id/reader";
import type { PageModel } from "../../lib/reader/page-model";

import { QuranNotice } from "./quran-notice";

const t = readerText;

/**
 * Kaki halaman cetak (X10): atribusi ayat (Tanzil, Kemenag), catatan AI, dan catatan "perlu
 * ditinjau" menurut isi halaman ITU, tepat di bawah teksnya. Dipakai halaman pertama (server) dan
 * halaman sambungan gulir bersambung, jadi catatan halaman pertama tidak lagi menempel di bawah
 * halaman sambungan terakhir. Sumber + lisensi karya dan tombol laporan tetap di kaki artikel.
 */
export function PageFoot({ model }: { model: Pick<PageModel, "quran" | "ai" | "anyReview"> }) {
  const { quran, ai, anyReview } = model;
  const anyAi = ai.translation || ai.summary;
  if (!quran && !anyAi && !anyReview) return null;
  return (
    <footer className="text-muted flex flex-col gap-2 text-xs" data-page-foot="">
      {quran ? <QuranNotice quran={quran} /> : null}
      {anyAi ? (
        // Bantuan terjemahan (X11): tidak relevan di mode baca Arab (AI-nya tidak tampil).
        <Typography color="muted" data-tr-aid="" type="body-xs">
          {t.aiFootNote(ai)}
        </Typography>
      ) : null}
      {anyReview ? (
        <Typography color="muted" type="body-xs">
          {t.needsReviewNote}
        </Typography>
      ) : null}
    </footer>
  );
}
