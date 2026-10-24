import type { Metadata } from "next";

import { Breadcrumbs, Typography } from "@heroui/react";
import { notFound } from "next/navigation";

import { ArabicInline } from "../../../../../components/arabic";
import { BreadcrumbJsonLd } from "../../../../../components/breadcrumb-json-ld";
import { DigestHubList } from "../../../../../components/intisari/hub-list";
import type { HubGroup } from "../../../../../components/intisari/hub-list";
import { PageLead, PageTitle } from "../../../../../components/page-title";
import { id } from "../../../../../i18n/id";
import { PAGE_FRAME } from "../../../../../lib/layout";
import { loadDigestHeaders, loadReaderToc, loadWork } from "../../../../../lib/reader/data";
import { digestHubHref } from "../../../../../lib/reader/digest";
import { flattenToc } from "../../../../../lib/reader/toc";

const t = id.intisari;

// Hub Intisari satu karya (X16, ADR-097 butir 7): /kitab/ihya/intisari. Intisari Kitab (muqaddimah +
// 40 kitab Ihya) dikelompokkan per akar daftar isi (rub'), dengan jumlah gagasan, waktu baca/dengar,
// jumlah Intisari Bab-nya, dan tanda "sudah dibaca" dari browser ini. ISR on-demand (ADR-034/038).
// 404 bila korpus belum punya Intisari Kitab (skema < 9, atau sebelum X15b mengisinya).
export const revalidate = false;
export const dynamicParams = true;
export function generateStaticParams(): { work: string }[] {
  return [];
}

interface Props {
  params: Promise<{ work: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { work: rawSegment } = await params;
  const { work, segment } = await loadWork(rawSegment, "/intisari");
  const title = work.title_id ?? work.title_ar;
  return {
    title: t.hubMetaTitle(title),
    description: t.hubMetaDescription(title),
    alternates: { canonical: digestHubHref(segment) },
  };
}

export default async function DigestHubPage({ params }: Props) {
  const { work: rawSegment } = await params;
  const { work, edition, segment } = await loadWork(rawSegment, "/intisari");
  const [shown, headers] = await Promise.all([
    loadReaderToc(rawSegment),
    loadDigestHeaders(rawSegment),
  ]);
  const teasers = new Map(headers.map((h) => [h.nodeId, h]));
  const groups: HubGroup[] = shown.items.flatMap((root) => {
    const subtree = [root, ...flattenToc(root.children)].filter((i) => i.kind === "node");
    const books = subtree.flatMap((item) => {
      const teaser = teasers.get(item.id);
      if (teaser === undefined || teaser.tier !== "book") return [];
      // Intisari Bab di bawah kitab ini (turunan berintisari bertingkat bab).
      const sections = flattenToc(item.children).filter(
        (c) => c.kind === "node" && teasers.get(c.id)?.tier === "section",
      ).length;
      return [{ teaser, title: item.title, titleId: item.titleId ?? null, sections }];
    });
    return books.length === 0
      ? []
      : [{ id: root.id, title: root.title, titleId: root.titleId ?? null, books }];
  });
  if (groups.length === 0) notFound();
  const title = work.title_id ?? work.title_ar;
  const hubHref = digestHubHref(segment);

  return (
    <div className={`${PAGE_FRAME} flex flex-col gap-10 pt-6 pb-16`}>
      <BreadcrumbJsonLd
        crumbs={[
          { name: id.reader.listTitle, href: "/kitab" },
          { name: title, href: edition.permalink },
          { name: t.hubHeading, href: hubHref },
        ]}
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <Breadcrumbs aria-label={t.breadcrumbLabel}>
            <Breadcrumbs.Item href="/kitab">{id.reader.listTitle}</Breadcrumbs.Item>
            <Breadcrumbs.Item href={edition.permalink}>{title}</Breadcrumbs.Item>
            <Breadcrumbs.Item>{t.hubHeading}</Breadcrumbs.Item>
          </Breadcrumbs>
          <PageTitle className="flex flex-col items-start gap-1" compactTitle={t.hubHeading}>
            <span>{t.hubHeading}</span>
            <span className="text-muted text-xl font-normal sm:text-2xl">
              {title} <ArabicInline>{work.title_ar}</ArabicInline>
            </span>
          </PageTitle>
          <PageLead>{t.hubLead}</PageLead>
          <Typography color="muted" type="body-sm">
            <span className="ai-badge ms-0" title={t.aiBadgeHint}>
              {t.aiBadge}
            </span>{" "}
            {t.hubDoor}
          </Typography>
        </header>
        <DigestHubList groups={groups} titleLang={shown.titleSource?.lang} />
      </div>
    </div>
  );
}
