"use client";

import { Typography } from "@heroui/react";

import { reader as readerText } from "../../i18n/id/reader";
import type { PageData } from "../../lib/reader/page-handler";

import { PageFoot } from "./page-foot";
import { PageText } from "./page-text";

const t = readerText;

/**
 * Halaman sambungan gulir bersambung (X04 W6), dimuat malas oleh ContinuousReader: setiap halaman
 * cetak berikutnya dirender dengan komponen yang sama dengan halaman server (PageText), di bawah
 * pemisah tipis "Juz 1 · Halaman 201" (h2). Teks dan terjemahan dari model JSON /api/halaman.
 * Kaki halaman sambungan menurut halaman itu sendiri (X10, `PageFoot`, sama dengan halaman pertama).
 */
export function ContinuousPages({
  pages,
  footNote,
}: {
  pages: readonly PageData[];
  footNote?: { heading: string; lead: string };
}) {
  return pages.map(({ model }) => {
    const key = `${model.juz}-${model.pageNo}`;
    return (
      <section
        key={key}
        aria-labelledby={`hal-${key}`}
        className="reader-continued flex flex-col gap-6"
        data-continued={`${model.juz}/${model.pageNo}`}
      >
        <div className="reader-page-divider">
          <Typography.Heading className="text-sm" id={`hal-${key}`} level={2}>
            <a className="reader-page-divider-link" href={model.permalink}>
              {t.pageHeading(model.juz, model.pageNo)}
            </a>
          </Typography.Heading>
        </div>
        <PageText
          afterH2
          footNote={footNote}
          footnotesHeadingId={`catatan-kaki-${key}`}
          label={t.continuedRegion(model.juz, model.pageNo)}
          model={model}
        />
        <PageFoot model={model} />
      </section>
    );
  });
}
