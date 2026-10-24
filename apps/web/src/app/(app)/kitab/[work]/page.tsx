import type { Metadata } from "next";

import { BookOpen01, LeftToRightListBullet } from "../../../../icons";
import { Breadcrumbs, Card, Typography } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";

import { ContinueReading } from "../../../../components/reader/continue-reading";
import { ArabicInline } from "../../../../components/arabic";
import { BreadcrumbJsonLd } from "../../../../components/breadcrumb-json-ld";
import { WorkCover } from "../../../../components/book/work-cover";
import { LicenseNotice } from "../../../../components/reader/license-notice";
import { TocTree } from "../../../../components/reader/toc-tree";
import { HeaderMenuReadMode } from "../../../../components/shell/header-menu";
import { id } from "../../../../i18n/id";
import { PAGE_FRAME } from "../../../../lib/layout";
import { loadDigestHeaders, loadReaderToc, loadToc, loadWork } from "../../../../lib/reader/data";
import { digestHubHref } from "../../../../lib/reader/digest";
import { PageTitle } from "../../../../components/page-title";

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
  const [{ work, edition, segment: canonical }, toc, shown, digests] = await Promise.all([
    loadWork(segment),
    loadToc(segment),
    loadReaderToc(segment),
    loadDigestHeaders(segment),
  ]);
  // Hub Intisari (X16) hanya bila korpus punya Intisari Kitab (skema ≥ 9, sesudah X15b).
  const hasHub = digests.some((d) => d.tier === "book");
  const title = work.title_id ?? work.title_ar;
  const start = toc[0]?.href;

  return (
    <div className={`${PAGE_FRAME} flex flex-col gap-8 pt-6 pb-16`}>
      <BreadcrumbJsonLd
        crumbs={[
          { name: t.listTitle, href: "/kitab" },
          { name: title, href: edition.permalink },
        ]}
      />
      <Breadcrumbs aria-label={t.breadcrumbLabel}>
        <Breadcrumbs.Item href="/kitab">{t.listTitle}</Breadcrumbs.Item>
        <Breadcrumbs.Item>{title}</Breadcrumbs.Item>
      </Breadcrumbs>

      <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
        {start ? (
          <NextLink
            className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--background)]"
            href={start}
          >
            {/* Nama tautan dari teks tersembunyi, bukan aria-label: teks di sampul tidak memuat
                "Buka kitab", jadi aria-label melanggar WCAG 2.5.3 (axe label-content-name-mismatch). */}
            <span className="sr-only">{t.openWork(title)}</span>
            <div aria-hidden="true" className="contents">
              <WorkCover textured width={{ xs: 150, sm: 168, md: 196 }} work={work} />
            </div>
          </NextLink>
        ) : (
          <WorkCover textured width={{ xs: 150, sm: 168, md: 196 }} work={work} />
        )}
        <div className="flex min-w-0 flex-col gap-3">
          {/* Judul ringkas navbar hanya dari judul Indonesia: teks Arab wajib lewat ArabicInline. */}
          <PageTitle
            className="flex flex-col items-start gap-1"
            compactTitle={work.title_id ?? false}
          >
            <span>{title}</span>
            <ArabicInline className="text-muted font-normal" size="display">
              {work.title_ar}
            </ArabicInline>
          </PageTitle>
          {work.author ? (
            <Typography>
              {t.by} {work.author.name_id ?? work.author.name_ar}{" "}
              <ArabicInline className="text-muted">{work.author.name_ar}</ArabicInline>
              {work.author.death_hijri ? (
                <span className="text-muted"> · {t.deathHijri(work.author.death_hijri)}</span>
              ) : null}
            </Typography>
          ) : null}
          {start || hasHub ? (
            <div className="flex flex-wrap gap-2">
              {start ? (
                <NextLink className={buttonVariants({ variant: "primary" })} href={start}>
                  <BookOpen01 aria-hidden="true" className="size-4" />
                  {t.startReading}
                </NextLink>
              ) : null}
              {hasHub ? (
                <NextLink
                  className={buttonVariants({ variant: "secondary" })}
                  href={digestHubHref(canonical)}
                >
                  <LeftToRightListBullet aria-hidden="true" className="size-4" />
                  {id.intisari.workLink}
                </NextLink>
              ) : null}
            </div>
          ) : null}
          <ContinueReading work={canonical} />
        </div>
      </header>

      {/* Desktop: daftar isi di kolom utama, info edisi di samping. Ponsel: edisi sesudahnya. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
        <section aria-labelledby="judul-daftar-isi" className="flex flex-col gap-3">
          <Typography.Heading level={2} id="judul-daftar-isi" className="text-xl">
            {t.tocHeading}
          </Typography.Heading>
          <TocTree items={shown.items} titleSource={shown.titleSource} />
          {/* Judul Indonesia daftar isi ikut mode baca (X11): pilihannya ada di menu ⋮. */}
          {shown.titleSource ? <HeaderMenuReadMode /> : null}
        </section>
        <aside aria-label={t.editionsLabel}>
          <Card className="lg:sticky lg:top-20">
            <Card.Header>
              {/* h2 (bukan Card.Title = h3): urutan heading h1 → h2 (axe heading-order). */}
              <h2 className="card__title">{t.editionsLabel}</h2>
            </Card.Header>
            <Card.Content>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr] lg:grid-cols-1 lg:gap-y-1 lg:[&>dt:not(:first-child)]:mt-3">
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
                <dt className="text-muted">{t.sourceHeading}</dt>
                <dd className="text-foreground m-0">
                  <LicenseNotice
                    attribution={edition.attribution}
                    editionSlug={edition.slug}
                    license={edition.license}
                    workSlug={work.slug}
                  />
                </dd>
              </dl>
            </Card.Content>
          </Card>
        </aside>
      </div>
    </div>
  );
}
