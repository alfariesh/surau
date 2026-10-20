import { Typography } from "@heroui/react";
import NextLink from "next/link";

import { EDITION_SOURCE, LICENSE_URL } from "../../content/works";
import { id } from "../../i18n/id";

const t = id.reader;

// Atribusi teks digital (ADR-018) yang memenuhi CC BY-NC-SA 4.0 §3(a)(1): atribusi edisi dari DB,
// nama lisensi + tautan ke teks lisensinya, tautan ke materi sumber berlisensi (OpenITI), dan
// pernyataan bahwa materinya diolah. Dipakai di halaman karya dan footer halaman baca.
export function LicenseNotice({
  workSlug,
  editionSlug,
  attribution,
  license,
  sourceUrl,
  compact = false,
}: {
  workSlug: string;
  editionSlug: string;
  /** `edition.attribution` dari DB, apa adanya. */
  attribution: string;
  license: string;
  /** Halaman yang sama di Shamela (`PageView.source_url`), bila ada. */
  sourceUrl?: string | null;
  /** Satu paragraf ringkas (footer pembaca); rincian lengkap ada di /lisensi. */
  compact?: boolean;
}) {
  const licenseUrl = LICENSE_URL[license];
  const source = EDITION_SOURCE[`${workSlug}/${editionSlug}`];

  if (compact) {
    const linkClass = "link text-[length:inherit]";
    return (
      <Typography type="body-xs" color="muted">
        {attribution}
        {licenseUrl ? (
          <>
            {" · "}
            <a
              className={linkClass}
              href={licenseUrl}
              rel="license noopener noreferrer"
              target="_blank"
            >
              {t.licenseText}
              <span className="sr-only"> {id.common.newTab}</span>
            </a>
          </>
        ) : null}
        {sourceUrl ? (
          <>
            {" · "}
            <a className={linkClass} href={sourceUrl} rel="noopener noreferrer" target="_blank">
              {t.sourceShamela}
              <span className="sr-only"> {id.common.newTab}</span>
            </a>
          </>
        ) : null}
        {" · "}
        <NextLink className={linkClass} href="/lisensi">
          {t.licenseMoreShort}
        </NextLink>
      </Typography>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Typography type="body-xs" color="muted">
        {attribution}
      </Typography>
      <Typography type="body-xs" color="muted">
        {t.licenseLabel}: {license}
        {licenseUrl ? (
          <>
            {" "}
            (
            <a
              className="link text-[length:inherit]"
              href={licenseUrl}
              rel="license noopener noreferrer"
              target="_blank"
            >
              {t.licenseText}
              <span className="sr-only"> {id.common.newTab}</span>
            </a>
            )
          </>
        ) : null}
      </Typography>
      {source ? (
        <Typography type="body-xs" color="muted">
          {t.sourceDigital}:{" "}
          <a
            className="link text-[length:inherit]"
            href={source.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            {source.label}
            <span className="sr-only"> {id.common.newTab}</span>
          </a>
        </Typography>
      ) : null}
      <Typography type="body-xs" color="muted">
        {t.modified}
      </Typography>
      {sourceUrl ? (
        <a
          className="link self-start text-[length:inherit]"
          href={sourceUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t.sourceShamela}
          <span className="sr-only"> {id.common.newTab}</span>
        </a>
      ) : null}
      <NextLink className="link self-start text-[length:inherit]" href="/lisensi">
        {t.licenseMore}
      </NextLink>
    </div>
  );
}
