import { Typography } from "@heroui/react";
import NextLink from "next/link";

import { intisari as intisariText } from "../../i18n/id/intisari";
import type { DigestTeaser } from "../../lib/reader/digest";
import { ArabicInline } from "../arabic";

import { ReadBadge } from "./read-mark";

const t = intisariText;

export interface HubBook {
  teaser: DigestTeaser;
  /** Judul Arab persis dari DB. */
  title: string;
  /** Judul Indonesia terjemahan AI daftar isi, bila ada. */
  titleId: string | null;
  /** Jumlah Intisari Bab di bawah kitab ini. */
  sections: number;
}

export interface HubGroup {
  /** Akar daftar isi (rub'). */
  id: number;
  title: string;
  titleId: string | null;
  books: HubBook[];
}

/** Judul Indonesia (bila ada) di atas judul Arab dari DB. */
function Titles({
  title,
  titleId,
  lang,
  strong,
}: {
  title: string;
  titleId: string | null;
  lang?: string;
  strong?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      {titleId !== null ? (
        <span className={strong ? "text-foreground font-medium" : undefined} lang={lang}>
          {titleId}
        </span>
      ) : null}
      <ArabicInline className={titleId !== null ? "text-muted" : "text-foreground"}>
        {title}
      </ArabicInline>
    </span>
  );
}

/**
 * Daftar Intisari Kitab di hub (X16), per akar daftar isi: setiap kartu menaut ke Intisari Kitab-nya
 * dengan jumlah gagasan, waktu baca, waktu dengar (bila audio X17 ada), jumlah Intisari Bab, dan
 * lencana "Sudah dibaca" (browser ini, sesudah hidrasi).
 */
export function DigestHubList({
  groups,
  titleLang,
}: {
  groups: readonly HubGroup[];
  titleLang?: string;
}) {
  return (
    <div className="flex flex-col gap-10">
      {groups.map((g) => (
        <section
          key={g.id}
          aria-labelledby={`intisari-rub-${g.id}`}
          className="flex flex-col gap-4"
        >
          <Typography.Heading className="text-lg sm:text-xl" id={`intisari-rub-${g.id}`} level={2}>
            <Titles lang={titleLang} title={g.title} titleId={g.titleId} />
          </Typography.Heading>
          <ul
            aria-label={t.hubGroupLabel(g.titleId ?? g.title)}
            className="grid list-none gap-3 p-0 sm:grid-cols-2"
          >
            {g.books.map((b) => (
              <li key={b.teaser.nodeId}>
                <NextLink className="intisari-card" href={b.teaser.href}>
                  <Titles strong lang={titleLang} title={b.title} titleId={b.titleId} />
                  <span className="text-muted flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                    <span>{t.points(b.teaser.points)}</span>
                    <span>{t.readTime(b.teaser.minutes)}</span>
                    {b.teaser.listenMinutes !== null ? (
                      <span>{t.listenTime(b.teaser.listenMinutes)}</span>
                    ) : null}
                    {b.sections > 0 ? <span>{t.hubSectionCount(b.sections)}</span> : null}
                  </span>
                  <ReadBadge nodeId={b.teaser.nodeId} />
                </NextLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
