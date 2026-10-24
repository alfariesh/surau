import type { DigestQuoteView } from "@surau/core";

import { Chip, Typography } from "@heroui/react";
import NextLink from "next/link";

import { intisari as intisariText } from "../../i18n/id/intisari";
import { ayahRefsOnly } from "../../lib/kutipan-handler";
import { translationLabel } from "../../lib/translation-label";
import { ArabicText } from "../arabic";

const t = intisariText;

/**
 * Kartu kutipan Intisari (X16): teks Arab = `text_raw` yang disalin `readDigest` dari DB sesudah
 * sidiknya dicek (aturan 1; kutipan basi atau yang menyentuh ayat sudah ditahan core), terjemahan
 * berlabel asalnya sendiri (kutipan anak tetap berlabel modelnya), jilid/halaman + tautan ke
 * paragrafnya, dan jenisnya (ditentukan kode). `data-quote-range` = `passage:start:end` untuk e2e
 * yang membandingkan teks kartu dengan `/api/kutipan`. Riwayat: status hanya dari takhrij (Dalil).
 */
export function QuoteCard({ quote }: { quote: DigestQuoteView }) {
  const { translation: tr } = quote;
  const label = tr === null ? null : translationLabel(tr.human_review);
  return (
    <figure
      className="intisari-quote"
      data-quote-range={`${quote.passage_id}:${quote.char_start}:${quote.char_end}`}
      id={`kutipan-${quote.ord}`}
    >
      <ArabicText as="blockquote" className="intisari-quote-ar">
        {quote.text_raw}
      </ArabicText>
      {tr !== null && label !== null ? (
        <div className="flex flex-col gap-1" lang={tr.lang}>
          <Typography type="body-sm">
            {ayahRefsOnly(tr.text)}{" "}
            <span className="ai-badge" title={label.detail}>
              {label.badge}
            </span>
          </Typography>
        </div>
      ) : null}
      <figcaption className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Chip size="sm" variant="soft">
          {t.quoteKind[quote.kind]}
        </Chip>
        <NextLink className="link text-sm" href={quote.location.permalink}>
          {quote.location.label}
        </NextLink>
      </figcaption>
      {quote.kind === "report" ? (
        <Typography color="muted" type="body-xs">
          {t.quoteReportNote}
        </Typography>
      ) : null}
    </figure>
  );
}
