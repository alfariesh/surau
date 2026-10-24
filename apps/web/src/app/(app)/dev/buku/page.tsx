import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";

import { Typography } from "@heroui/react";
import { listWorks } from "@surau/core";
import { notFound } from "next/navigation";

import { ArabicInline } from "../../../../components/arabic";
import { Book, BookPattern } from "../../../../components/book/book";
import { COVER_COLORS } from "../../../../components/book/cover-colors";
import { PageLead, PageTitle } from "../../../../components/page-title";
import { id } from "../../../../i18n/id";
import { getEnv } from "../../../../lib/cloudflare";
import { PAGE_FRAME } from "../../../../lib/layout";

const t = id.devBook;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: false },
};

/** Pose terkunci: `lifted` = posisi hover, `turn` = diputar ke sudut tertentu. */
type Pose = { lifted?: boolean; turn?: string };

function Posed({ pose, label, children }: { pose: Pose; label: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-4">
      <div
        className="flex min-h-64 items-end justify-center px-6 pb-4"
        data-book-lifted={pose.lifted ? "" : undefined}
        data-book-turn={pose.turn ? "" : undefined}
        style={pose.turn ? ({ "--book-turn": pose.turn } as CSSProperties) : undefined}
      >
        {children}
      </div>
      <figcaption>
        <Typography color="muted" type="body-sm">
          {label}
        </Typography>
      </figcaption>
    </figure>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <Typography.Heading className="text-xl" level={2}>
        {heading}
      </Typography.Heading>
      <div className="flex flex-wrap items-end gap-x-10 gap-y-8">{children}</div>
    </section>
  );
}

// Pratinjau mockup buku (hanya dev): setiap variasi dalam posisi terkunci supaya perubahan
// book.css bisa dinilai tanpa hover. Judul Arab dari DB lokal (karya pertama), tidak ditulis tangan.
export default async function BookPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const env = await getEnv();
  const { works } = await listWorks(env.CORPUS_DB).catch(() => ({ works: [] }));
  const work = works[0];

  if (work === undefined) {
    return (
      <div className={`${PAGE_FRAME} flex flex-col gap-3 pt-8 pb-16`}>
        <PageTitle>{t.title}</PageTitle>
        <PageLead>{t.empty}</PageLead>
      </div>
    );
  }

  const cover = (props: {
    color?: string;
    direction?: "ltr" | "rtl";
    width?: number;
    textured?: boolean;
    key?: string;
  }) => (
    <Book
      color={props.color === undefined ? COVER_COLORS[0] : props.color || undefined}
      direction={props.direction ?? "rtl"}
      illustration={
        props.color === "" ? undefined : <BookPattern id={`dev-pattern-${props.key ?? "x"}`} />
      }
      subtitle={work.title_id ? <span dir="ltr">{work.title_id}</span> : undefined}
      textured={props.textured ?? true}
      title={<ArabicInline>{work.title_ar}</ArabicInline>}
      width={props.width ?? 168}
    />
  );

  return (
    <div className={`${PAGE_FRAME} flex flex-col gap-12 pt-8 pb-16`}>
      <header className="flex max-w-2xl flex-col gap-3">
        <PageTitle>{t.title}</PageTitle>
        <PageLead>{t.lead}</PageLead>
      </header>

      <Section heading={t.posesHeading}>
        <Posed label={t.poses.rest} pose={{}}>
          {cover({ key: "rest" })}
        </Posed>
        <Posed label={t.poses.lifted} pose={{ lifted: true }}>
          {cover({ key: "lifted" })}
        </Posed>
        <Posed label={t.poses.side} pose={{ turn: "65deg" }}>
          {cover({ key: "side" })}
        </Posed>
        <Posed label={t.poses.back} pose={{ turn: "180deg" }}>
          {cover({ key: "back" })}
        </Posed>
      </Section>

      <Section heading={t.colorsHeading}>
        {COVER_COLORS.map((color, i) => (
          <Posed key={color} label={color} pose={{ lifted: true }}>
            {cover({ color, key: `color-${i}`, width: 140 })}
          </Posed>
        ))}
      </Section>

      <Section heading={t.directionHeading}>
        <Posed label={t.directions.rtl} pose={{ lifted: true }}>
          {cover({ key: "rtl" })}
        </Posed>
        <Posed label={t.directions.ltr} pose={{ lifted: true }}>
          {cover({ direction: "ltr", key: "ltr" })}
        </Posed>
      </Section>

      <Section heading={t.sizesHeading}>
        {[132, 156, 196, 260].map((width) => (
          <Posed key={width} label={t.size(width)} pose={{ lifted: true }}>
            {cover({ key: `size-${width}`, width })}
          </Posed>
        ))}
      </Section>

      <Section heading={t.plainHeading}>
        <Posed label={t.directions.rtl} pose={{ lifted: true }}>
          {cover({ color: "", key: "plain", textured: false })}
        </Posed>
      </Section>
    </div>
  );
}
