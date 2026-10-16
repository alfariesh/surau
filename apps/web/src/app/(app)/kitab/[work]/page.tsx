import type { Metadata } from "next";

import { BookOpen } from "@gravity-ui/icons";
import { Breadcrumbs, Card } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";

import { ArabicInline } from "../../../../components/arabic";
import { TocTree } from "../../../../components/reader/toc-tree";
import { id } from "../../../../i18n/id";
import { loadToc, loadWork } from "../../../../lib/reader/data";

const t = id.reader;

// Halaman karya: metadata edisi, pengarang, lisensi/atribusi (ADR-018), dan daftar isi lengkap.
// ISR on-demand seperti halaman baca (tanpa render saat build).
export const revalidate = false;
export const dynamicParams = true;
export function generateStaticParams(): { work: string }[] {
  return [];
}

interface Props {
  params: Promise<{ work: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { work: segment } = await params;
  const { work, edition } = await loadWork(segment);
  const title = work.title_id ?? work.title_ar;
  return {
    title,
    description: t.workMetaDescription(title, work.author?.name_id ?? null),
    alternates: { canonical: edition.permalink },
  };
}

export default async function WorkPage({ params }: Props) {
  const { work: segment } = await params;
  const [{ work, edition }, toc] = await Promise.all([loadWork(segment), loadToc(segment)]);
  const title = work.title_id ?? work.title_ar;
  const start = toc[0]?.href;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-6 pb-16 sm:px-6">
      <Breadcrumbs aria-label={t.breadcrumbLabel}>
        <Breadcrumbs.Item href="/kitab">{t.listTitle}</Breadcrumbs.Item>
        <Breadcrumbs.Item>{title}</Breadcrumbs.Item>
      </Breadcrumbs>

      <header className="flex flex-col gap-3">
        <h1 className="text-foreground flex flex-col gap-1 text-3xl font-semibold tracking-tight">
          <span>{title}</span>
          <ArabicInline className="text-muted text-2xl font-normal">{work.title_ar}</ArabicInline>
        </h1>
        {work.author ? (
          <p className="text-foreground text-base">
            {t.by} {work.author.name_id ?? work.author.name_ar}{" "}
            <ArabicInline className="text-muted">{work.author.name_ar}</ArabicInline>
            {work.author.death_hijri ? (
              <span className="text-muted"> · {t.deathHijri(work.author.death_hijri)}</span>
            ) : null}
          </p>
        ) : null}
        {start ? (
          <div>
            <NextLink className={buttonVariants({ variant: "primary" })} href={start}>
              <BookOpen aria-hidden="true" className="size-4" />
              {t.startReading}
            </NextLink>
          </div>
        ) : null}
      </header>

      <Card>
        <Card.Header>
          <Card.Title>{t.editionsLabel}</Card.Title>
        </Card.Header>
        <Card.Content>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted">{t.publisherLabel}</dt>
            <dd className="text-foreground m-0">
              {edition.publisher ? <ArabicInline>{edition.publisher}</ArabicInline> : null}
              {edition.city ? (
                <>
                  {", "}
                  <ArabicInline>{edition.city}</ArabicInline>
                </>
              ) : null}
              {edition.volumes ? ` · ${t.volumes(edition.volumes)}` : null}
            </dd>
            <dt className="text-muted">{t.licenseLabel}</dt>
            <dd className="text-foreground m-0">{edition.license}</dd>
            <dt className="text-muted">{t.attributionLabel}</dt>
            <dd className="text-foreground m-0">{edition.attribution}</dd>
          </dl>
        </Card.Content>
      </Card>

      <section aria-labelledby="judul-daftar-isi" className="flex flex-col gap-3">
        <h2 className="text-foreground text-xl font-semibold" id="judul-daftar-isi">
          {t.tocHeading}
        </h2>
        <TocTree items={toc} />
      </section>
    </div>
  );
}
