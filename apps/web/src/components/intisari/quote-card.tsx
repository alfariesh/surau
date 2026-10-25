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
 * sidiknya dicek (aturan 1; kutipan basi, yang menyentuh ayat, dan riwayat yang takhrijnya sangat
 * lemah/palsu/tanpa asal sudah ditahan core), terjemahan berlabel asalnya sendiri (kutipan anak tetap
 * berlabel modelnya), jilid/halaman + tautan ke paragrafnya, dan jenisnya (ditentukan kode).
 * Takhrij milik kutipan (penanda di dalam/tepat sesudah rentangnya) tampil dengan label kodenya dan
 * teks takhrij asli; riwayat tanpa takhrij = "status belum diketahui" (aturan 6).
 * `data-quote-range` = `passage:start:end` untuk e2e yang membandingkan teks dengan `/api/kutipan`.
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
            {/* Panjang sama dengan tr.text (⟦ ⟧ → ( )): rentang sorotan audio tetap (X18). */}
            <span data-say={`quote-${quote.ord}`}>{ayahRefsOnly(tr.text)}</span>{" "}
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
      {quote.takhrij.map((tk) => (
        <div key={`${tk.char_start}-${tk.footnote.id}`} className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Typography type="body-sm" weight="medium">
              {t.quoteTakhrij(tk.marker)}: {tk.status.text}
            </Typography>
            {tk.status.weak ? (
              <Chip color="danger" size="sm" variant="soft">
                {t.hadithWeak}
              </Chip>
            ) : null}
          </div>
          <Typography color="muted" type="body-xs">
            {t.hadithStatus}
          </Typography>
          <ArabicText className="text-foreground">{tk.footnote.text_raw}</ArabicText>
          <NextLink className="link self-start text-xs" href={tk.footnote.location.permalink}>
            {t.quoteTakhrijOpen}
          </NextLink>
        </div>
      ))}
      {quote.kind === "report" && quote.takhrij.length === 0 ? (
        <Typography color="muted" type="body-xs">
          {t.quoteReportUnknown}
        </Typography>
      ) : null}
    </figure>
  );
}
