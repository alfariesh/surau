import type { Metadata } from "next";

import { BreadcrumbJsonLd } from "../../../../../../../components/breadcrumb-json-ld";
import { DigestPage } from "../../../../../../../components/intisari/digest-page";
import type { ChildDigest } from "../../../../../../../components/intisari/digest-page";
import { CITE_AUTHOR } from "../../../../../../../content/works";
import { id } from "../../../../../../../i18n/id";
import { PAGE_FRAME } from "../../../../../../../lib/layout";
import { loadDigest, loadDigestHeaders, loadReaderToc } from "../../../../../../../lib/reader/data";
import { digestHref, digestHubHref } from "../../../../../../../lib/reader/digest";
import { flattenToc } from "../../../../../../../lib/reader/toc";
import { OPEN_GRAPH_BASE } from "../../../../../../../lib/site";

const t = id.intisari;

// Halaman Intisari satu bagian daftar isi (X16, ADR-097 butir 7): /kitab/ihya/bab/<id>/intisari.
// ISR on-demand seperti halaman baca (ADR-034/038): tidak dirender saat build (CI tanpa D1), render
// pertama saat dibuka lalu disimpan sampai deploy berikutnya. 404 di korpus skema < 9 (tanpa
// Intisari), bila node belum punya Intisari, atau node milik edisi lain (`loadDigest`). Data audio
// `dengar.json` di folder ini milik X17.
export const revalidate = false;
export const dynamicParams = true;
export function generateStaticParams(): { work: string; id: string }[] {
  return [];
}

interface Props {
  params: Promise<{ work: string; id: string }>;
}

/** Judul tampil bagian: Indonesia (terjemahan AI daftar isi) bila ada, selain itu Arab dari DB. */
async function sectionTitles(rawSegment: string, nodeId: number) {
  const shown = await loadReaderToc(rawSegment);
  const node = flattenToc(shown.items).find((i) => i.kind === "node" && i.id === nodeId);
  return { shown, node };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { work: rawSegment, id: rawId } = await params;
  const { digest, work, segment } = await loadDigest(rawSegment, rawId);
  const { node } = await sectionTitles(rawSegment, digest.section.id);
  const workTitle = work.title_id ?? work.title_ar;
  const section = node?.titleId ?? digest.section.title_ar;
  const path = digestHref(segment, digest.section.id);
  return {
    title: t.metaTitle(section, workTitle),
    description: t.metaDescription(section, workTitle),
    alternates: { canonical: path },
    openGraph: { ...OPEN_GRAPH_BASE, type: "article", url: path },
  };
}

export default async function DigestRoute({ params }: Props) {
  const { work: rawSegment, id: rawId } = await params;
  const { digest, work, edition, segment } = await loadDigest(rawSegment, rawId);
  const [{ shown, node }, headers] = await Promise.all([
    sectionTitles(rawSegment, digest.section.id),
    loadDigestHeaders(rawSegment),
  ]);
  const teasers = new Map(headers.map((h) => [h.nodeId, h]));
  // Tata letak Kitab: Intisari Bab turunan bagian ini, urut daftar isi.
  const sections: ChildDigest[] =
    digest.tier === "book" && node !== undefined
      ? flattenToc(node.children).flatMap((item) => {
          const teaser = item.kind === "node" ? teasers.get(item.id) : undefined;
          return teaser === undefined || teaser.tier !== "section"
            ? []
            : [{ teaser, title: item.title, ...(item.titleId ? { titleId: item.titleId } : {}) }];
        })
      : [];
  const workTitle = work.title_id ?? work.title_ar;
  const hubHref = digestHubHref(segment);
  const crumbs = [
    { name: id.reader.listTitle, href: "/kitab" },
    { name: workTitle, href: edition.permalink },
    { name: t.hubHeading, href: hubHref },
  ];

  return (
    <div className={`${PAGE_FRAME} pt-6 pb-16`}>
      <BreadcrumbJsonLd
        crumbs={[
          ...crumbs,
          {
            name: node?.titleId ?? digest.section.title_ar,
            href: digestHref(segment, digest.section.id),
          },
        ]}
      />
      <DigestPage
        author={CITE_AUTHOR[work.slug] ?? work.author?.name_id ?? t.authorFallback}
        crumbs={crumbs}
        digest={digest}
        editionSlug={edition.slug}
        hubHref={hubHref}
        sections={sections}
        titleId={node?.titleId ?? null}
        titleLang={shown.titleSource?.lang}
        workSlug={work.slug}
      />
    </div>
  );
}
