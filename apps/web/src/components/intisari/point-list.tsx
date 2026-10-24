import type { DigestPointView, DigestView } from "@surau/core";

import { Chip, Typography } from "@heroui/react";
import NextLink from "next/link";

import { intisari as intisariText } from "../../i18n/id/intisari";

import { ayahAnchor, hadithAnchor, pointAnchor } from "./format";
import { QuoteCard } from "./quote-card";

const t = intisariText;

/** Nomor tampil gagasan (urut, tanpa celah gagasan yang ditolak) per `ord`. */
export function pointNumbers(points: readonly Pick<DigestPointView, "ord">[]): Map<number, number> {
  return new Map(points.map((p, i) => [p.ord, i + 1]));
}

/** Satu tautan per paragraf jangkar (urut seq), ke permalink paragrafnya (`#pN`). */
function basisLinks(point: DigestPointView) {
  const seen = new Set<number>();
  return point.anchors.filter((a) => !seen.has(a.passage_id) && seen.add(a.passage_id));
}

/**
 * Gagasan kunci bernomor (X16): judul + lencana sikap (pendapat penulis / yang ia nukil / yang ia
 * bantah), anjuran hanya bila ditulis penulis sendiri (`stance` author, dengan catatan "tanyakan
 * ulama"), isi,
 * "Dasar teks" ke setiap paragraf jangkarnya, chip dalil (ke daftar Dalil di halaman yang sama),
 * dan kutipan milik gagasan itu.
 */
export function PointList({ digest, author }: { digest: DigestView; author: string }) {
  const numbers = pointNumbers(digest.points);
  return (
    <ol className="intisari-points flex list-none flex-col gap-8 p-0">
      {digest.points.map((p) => {
        const n = numbers.get(p.ord)!;
        const ayat = digest.evidence.ayat.flatMap((a, i) =>
          a.point_ords.includes(p.ord) ? [{ a, i }] : [],
        );
        const hadith = digest.evidence.hadith.flatMap((h, i) =>
          h.point_ords.includes(p.ord) ? [{ h, i }] : [],
        );
        const quotes = digest.quotes.filter((q) => q.point_ord === p.ord);
        // Anjuran hanya yang ditulis penulis sendiri (ADR-097); selain itu tampil sebagai gagasan.
        const advice = p.kind === "advice" && p.stance === "author";
        const headingId = `${pointAnchor(p.ord)}-judul`;
        return (
          <li
            key={p.ord}
            aria-labelledby={headingId}
            className="intisari-point scroll-mt-24"
            id={pointAnchor(p.ord)}
          >
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="intisari-point-no">
                {n}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Typography.Heading className="text-lg sm:text-xl" id={headingId} level={3}>
                  <span className="sr-only">{t.pointLabel(n)}: </span>
                  {p.title}
                </Typography.Heading>
                <div className="flex flex-wrap gap-1.5">
                  <Chip size="sm" variant="soft">
                    {t.stance[p.stance](author)}
                  </Chip>
                  {advice ? (
                    <Chip color="accent" size="sm" variant="soft">
                      {t.advice}
                    </Chip>
                  ) : null}
                </div>
                <Typography className="text-pretty">{p.body}</Typography>
                {advice ? (
                  <Typography color="muted" type="body-sm">
                    {t.adviceNote}
                  </Typography>
                ) : null}
                <Typography className="intisari-basis" type="body-sm">
                  <span className="text-muted">{t.basis}:</span>{" "}
                  {basisLinks(p).map((a, i) => (
                    <span key={a.passage_id}>
                      {i > 0 ? ", " : null}
                      <NextLink className="link" data-basis="" href={a.location.permalink}>
                        {t.basisPage(a.location.juz, a.location.page_no)}
                      </NextLink>
                    </span>
                  ))}
                </Typography>
                {ayat.length + hadith.length > 0 ? (
                  <ul
                    aria-label={t.evidenceHeading}
                    className="flex list-none flex-wrap gap-1.5 p-0"
                  >
                    {ayat.map(({ a, i }) => (
                      <li key={`a${i}`}>
                        <a className="intisari-chip" href={`#${ayahAnchor(i)}`}>
                          {a.label}
                        </a>
                      </li>
                    ))}
                    {hadith.map(({ h, i }) => (
                      <li key={`h${i}`}>
                        <a
                          className="intisari-chip"
                          data-weak={h.status.weak || undefined}
                          href={`#${hadithAnchor(i)}`}
                        >
                          {(h.status.kind === "not_takhrij"
                            ? t.evidenceChipFootnote
                            : t.evidenceChipHadith)(h.marker, h.location.juz, h.location.page_no)}
                          {h.status.weak ? ` · ${t.evidenceChipWeak}` : null}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {quotes.map((q) => (
                  <QuoteCard key={q.ord} quote={q} />
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
