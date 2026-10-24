import type { DigestAyahEvidence, DigestEvidenceView, QuranView } from "@surau/core";

import { Chip, Typography } from "@heroui/react";
import NextLink from "next/link";

import { intisari as intisariText } from "../../i18n/id/intisari";
import { ArabicInline, ArabicText } from "../arabic";
import { QuranNotice } from "../reader/quran-notice";

import { ayahAnchor, hadithAnchor, pointAnchor } from "./format";

const t = intisariText;

/** "Untuk gagasan 1 dan 3": setiap nomor tampil menaut ke gagasannya. */
function ForPoints({ ords, numbers }: { ords: readonly number[]; numbers: Map<number, number> }) {
  const shown = ords.filter((o) => numbers.has(o));
  if (shown.length === 0) return null;
  const glue = (i: number) =>
    i === 0 ? null : i < shown.length - 1 ? ", " : shown.length > 2 ? ", dan " : " dan ";
  return (
    <Typography color="muted" type="body-xs">
      {t.evidenceFor}{" "}
      {shown.map((o, i) => (
        <span key={o}>
          {glue(i)}
          <a className="link" href={`#${pointAnchor(o)}`}>
            {numbers.get(o)}
          </a>
        </span>
      ))}
    </Typography>
  );
}

/** Ayat yang dirujuk (ayat utuh, juga untuk kutipan sebagian): teks Tanzil + terjemahan Kemenag. */
function Verses({ a, quran }: { a: DigestAyahEvidence; quran: QuranView }) {
  const source = quran.sources.find((s) => s.kind === "translation")?.name ?? t.ayahTranslation;
  const verses = quran.ayat.filter(
    (v) => v.surah === a.surah && v.ayah >= a.ayah_from && v.ayah <= a.ayah_to,
  );
  return (
    <div className="flex flex-col gap-3">
      {verses.map((v) => (
        <div key={`${v.surah}:${v.ayah}`} className="flex flex-col gap-1">
          <ArabicText className="text-foreground" size="lg">
            {v.text}
          </ArabicText>
          {v.translation ? (
            <div className="flex flex-col gap-1">
              <Typography type="body-sm">
                {v.translation.text}{" "}
                <span className="text-muted text-xs">
                  ({source}, {v.surah}:{v.ayah})
                </span>
              </Typography>
              {v.translation.footnotes.length > 0 ? (
                <ul className="flex list-none flex-col gap-0.5 p-0">
                  {v.translation.footnotes.map((f) => (
                    <li key={f.marker}>
                      <Typography color="muted" type="body-xs">
                        {f.marker} {f.text}
                      </Typography>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Dalil di teks sumber (X16): ayat dan riwayat yang ada di paragraf jangkar gagasan, dihitung kode
 * (`DigestView.evidence`), bukan ditulis model. Ayat = teks Tanzil + terjemahan Kemenag verbatim
 * (aturan 9, atribusi `QuranNotice`). Riwayat = teks takhrij asli dari DB (aturan 6) + label istilah
 * kode berstatus "dikenali otomatis dari teks takhrij, belum ditinjau"; frasa Arab istilahnya
 * disalin dari teks takhrij lewat rentangnya.
 */
export function EvidenceList({
  evidence,
  numbers,
}: {
  evidence: DigestEvidenceView;
  numbers: Map<number, number>;
}) {
  const { ayat, hadith, quran } = evidence;
  return (
    <div className="flex flex-col gap-8">
      {ayat.length > 0 && quran !== null ? (
        <section aria-labelledby="dalil-ayat" className="flex flex-col gap-4">
          <Typography.Heading className="text-lg" id="dalil-ayat" level={3}>
            {t.ayahHeading}
          </Typography.Heading>
          <ol className="flex list-none flex-col gap-6 p-0">
            {ayat.map((a, i) => (
              <li key={i} className="intisari-evidence scroll-mt-24" id={ayahAnchor(i)}>
                <Typography weight="medium">{a.label}</Typography>
                <ForPoints numbers={numbers} ords={a.point_ords} />
                <Verses a={a} quran={quran} />
                {a.partial ? (
                  <Typography color="muted" type="body-xs">
                    {t.ayahPartial}
                  </Typography>
                ) : null}
                <NextLink className="link self-start text-sm" href={a.location.permalink}>
                  {t.evidenceOpen(a.location.juz, a.location.page_no)}
                </NextLink>
              </li>
            ))}
          </ol>
          <QuranNotice quran={quran} />
        </section>
      ) : null}
      {hadith.length > 0 ? (
        <section aria-labelledby="dalil-hadits" className="flex flex-col gap-4">
          <Typography.Heading className="text-lg" id="dalil-hadits" level={3}>
            {t.hadithHeading}
          </Typography.Heading>
          <ol className="flex list-none flex-col gap-6 p-0">
            {hadith.map((h, i) => (
              <li key={i} className="intisari-evidence scroll-mt-24" id={hadithAnchor(i)}>
                <div className="flex flex-wrap items-center gap-2">
                  <Typography weight="medium">
                    {(h.status.kind === "not_takhrij" ? t.footnoteItem : t.hadithItem)(
                      h.marker,
                      h.location.juz,
                      h.location.page_no,
                    )}
                  </Typography>
                  {h.status.weak ? (
                    <Chip color="danger" size="sm" variant="soft">
                      {t.hadithWeak}
                    </Chip>
                  ) : null}
                </div>
                <ForPoints numbers={numbers} ords={h.point_ords} />
                <Typography type="body-sm">
                  {h.status.text} <span className="text-muted text-xs">({t.hadithStatus})</span>
                </Typography>
                {h.status.mixed ? (
                  <Typography color="muted" type="body-sm">
                    {t.hadithMixed}
                  </Typography>
                ) : null}
                {h.status.terms.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <Typography color="muted" type="body-xs">
                      {t.hadithTerms}
                    </Typography>
                    <ul className="flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
                      {h.status.terms.map((term) => (
                        <li key={`${term.char_start}-${term.char_end}`}>
                          <Typography type="body-sm">
                            <ArabicInline>
                              {h.footnote.text_raw.slice(term.char_start, term.char_end)}
                            </ArabicInline>{" "}
                            <span className="text-muted">({term.gloss})</span>
                          </Typography>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="flex flex-col gap-1">
                  <Typography color="muted" type="body-xs">
                    {t.hadithText}
                  </Typography>
                  <ArabicText className="text-foreground">{h.footnote.text_raw}</ArabicText>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <NextLink className="link text-sm" href={h.location.permalink}>
                    {t.evidenceOpen(h.location.juz, h.location.page_no)}
                  </NextLink>
                  <NextLink className="link text-sm" href={h.footnote.location.permalink}>
                    {t.hadithFootnoteOpen}
                  </NextLink>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
