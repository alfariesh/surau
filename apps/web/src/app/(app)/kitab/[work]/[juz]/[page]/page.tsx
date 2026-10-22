import type { Metadata } from "next";

import { Suspense } from "react";

import { ArabicInline } from "../../../../../../components/arabic";
import { BreadcrumbJsonLd } from "../../../../../../components/breadcrumb-json-ld";
import { AiNotice } from "../../../../../../components/reader/ai-notice";
import { LicenseNotice } from "../../../../../../components/reader/license-notice";
import { ContinuousReader } from "../../../../../../components/reader/continuous-reader";
import { PageFoot } from "../../../../../../components/reader/page-foot";
import { PageText } from "../../../../../../components/reader/page-text";
import { ReaderProvider } from "../../../../../../components/reader/reader-context";
import { ReaderCompactHeader } from "../../../../../../components/reader/reader-compact-header";
import { ReaderEnhancements } from "../../../../../../components/reader/reader-enhancements";
import { ReadingTracker } from "../../../../../../components/reader/reading-tracker";
import {
  ReaderToolbar,
  ReportPageButton,
} from "../../../../../../components/reader/reader-toolbar";
import { SearchHighlighter } from "../../../../../../components/reader/search-highlighter";
import { TocTree } from "../../../../../../components/reader/toc-tree";
import { FOOTNOTE_NOTE } from "../../../../../../content/works";
import { id } from "../../../../../../i18n/id";
import { PAGE_FRAME } from "../../../../../../lib/layout";
import { citeParts } from "../../../../../../lib/reader/cite";
import { loadPage, loadReaderToc, loadToc } from "../../../../../../lib/reader/data";
import { buildPageModel } from "../../../../../../lib/reader/page-model";
import { previewSample } from "../../../../../../lib/reader/preview";
import { OPEN_GRAPH_BASE } from "../../../../../../lib/site";
import {
  activeRowId,
  activeTocIds,
  flattenToc,
  pageSections,
  pruneToc,
  tocHref,
  tocPath,
} from "../../../../../../lib/reader/toc";
import { Typography } from "@heroui/react";

const t = id.reader;

// Halaman cetak (permalink ADR-029): /kitab/ihya/1/200. ISR on-demand: tidak ada halaman yang
// dirender saat build (CI tanpa D1); render pertama saat dibuka, lalu disimpan di cache R2 sampai
// deploy berikutnya. Konten kitab tidak berubah per versi korpus (ARSITEKTUR-TEKNIS §5).
export const revalidate = false;
export const dynamicParams = true;
export function generateStaticParams(): { work: string; juz: string; page: string }[] {
  return [];
}

interface Props {
  params: Promise<{ work: string; juz: string; page: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { work: segment, juz, page } = await params;
  // Halaman dulu, baru daftar isi: alamat yang 404 tidak ikut membaca seluruh pohon (ADR-034).
  const ctx = await loadPage(segment, juz, page);
  const toc = await loadToc(segment);
  const { citation, body } = ctx.page;
  const [first] = activeTocIds(toc, citation.juz, citation.page_no, body);
  const bab = first === undefined ? null : (tocPath(toc, first).at(-1)?.title ?? null);
  const title = ctx.work.title_id ?? ctx.work.title_ar;
  const author = ctx.work.author?.name_id ?? null;
  return {
    title: t.pageMetaTitle(bab, title, citation.juz, citation.page_no),
    description: t.pageMetaDescription(title, author, citation.juz, citation.page_no),
    alternates: { canonical: citation.permalink },
    openGraph: { ...OPEN_GRAPH_BASE, type: "article", url: citation.permalink },
  };
}

export default async function ReaderPage({ params }: Props) {
  const { work: rawSegment, juz: rawJuz, page: rawPage } = await params;
  const ctx = await loadPage(rawSegment, rawJuz, rawPage);
  const toc = await loadToc(rawSegment);
  // Pohon TAMPILAN (subjudul kurasi + judul Indonesia, X04 bagian B); breadcrumb, judul tab, dan
  // OG tetap dari `toc` (judul Arab).
  const shown = await loadReaderToc(rawSegment);
  const { page, work, edition, segment } = ctx;
  const { juz, page_no: pageNo, permalink } = page.citation;

  const activeIds = activeTocIds(toc, juz, pageNo, page.body);
  const crumbs = activeIds[0] === undefined ? [] : tocPath(toc, activeIds[0]);
  // Pohon yang dikirim ke klien hanya baris yang tampil terbuka (X09: pohon lengkap 522 baris
  // berjudul ganda menambah ±20 KB gzip di setiap halaman); TocTree mengambil pohon lengkap
  // (`/kitab/<karya>/daftar-isi.json`) saat pohon tampil. Leluhur baris aktif (node, atau subjudul
  // kurasinya sampai halaman ini, X10) = baris yang dibuka TocTree.
  const lastActive = activeIds.at(-1);
  const rowId =
    lastActive === undefined ? undefined : activeRowId(shown.items, lastActive, juz, pageNo);
  const openIds = new Set(
    (rowId === undefined ? [] : tocPath(shown.items, rowId).slice(0, -1)).map((n) => n.id),
  );
  const tocShell = pruneToc(shown.items, openIds);
  // Model siap render (subjudul kurasi, syair, terjemahan): bentuk yang sama dipakai halaman
  // sambungan gulir bersambung (X04).
  const model = await buildPageModel(page, {
    editionId: edition.id,
    sections: pageSections(toc, juz, pageNo),
  });
  const footNote = FOOTNOTE_NOTE[`${work.slug}/${edition.slug}`];
  const workTitle = work.title_id ?? work.title_ar;
  const bab = crumbs.at(-1)?.title ?? null;
  const babNode = crumbs.at(-1);
  // Judul Indonesia bagian ini hanya di kepala halaman, berlencana "Terjemahan AI" (W8).
  const babId =
    babNode === undefined
      ? undefined
      : flattenToc(shown.items).find((i) => i.kind === "node" && i.id === babNode.id)?.titleId;
  // Pratinjau huruf di panel Tampilan: awal paragraf isi pertama halaman ini (lib/reader/preview).
  const firstText = model.body.find((p) => p.heading === null);
  const sample = previewSample(
    (page.body.find((p) => p.id === firstText?.id) ?? page.body[0])?.text_raw,
  );

  return (
    <ReaderProvider cite={citeParts(page.citation.source, juz, pageNo)} pagePath={permalink}>
      {/* Sorotan kata dari hasil Cari (?q=): klien saja, di dalam Suspense (halaman tetap ISR). */}
      <Suspense fallback={null}>
        <SearchHighlighter />
      </Suspense>
      <div
        className={`${PAGE_FRAME} grid gap-6 pt-6 pb-16 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10`}
      >
        <article className="flex min-w-0 flex-col gap-6">
          <header className="flex flex-col gap-3">
            {/* Breadcrumb tidak ditampilkan di halaman baca (daftar isi menunjukkan posisi); markup untuk Google tetap ada. */}
            <BreadcrumbJsonLd
              crumbs={[
                { name: t.listTitle, href: "/kitab" },
                { name: workTitle, href: edition.permalink },
                ...crumbs.map((c) => ({ name: c.title, href: tocHref(c) })),
                { name: t.pageHeading(juz, pageNo), href: permalink },
              ]}
            />
            <div className="flex flex-col gap-1" data-reader-title>
              <Typography type="h1" className="text-2xl sm:text-3xl">
                {t.pageHeading(juz, pageNo)}
              </Typography>
              <Typography
                type="body-sm"
                color="muted"
                className="flex flex-wrap items-baseline gap-x-2"
              >
                <span>{workTitle}</span>
                <ArabicInline>{work.title_ar}</ArabicInline>
              </Typography>
              {bab !== null && babId !== undefined ? (
                <Typography type="body-sm" className="flex flex-wrap items-baseline gap-x-2">
                  <span lang="id">
                    {babId}
                    <span className="ai-badge" title={t.tocTitleHint}>
                      {t.tocTitleBadge}
                    </span>
                  </span>
                  <ArabicInline>{bab}</ArabicInline>
                </Typography>
              ) : null}
            </div>
            <ReaderToolbar
              activeIds={activeIds}
              juz={juz}
              page={pageNo}
              pagePath={permalink}
              sample={sample}
              segment={segment}
              titleSource={shown.titleSource}
              toc={tocShell}
              volumes={edition.volumes ?? juz}
            />
          </header>
          <ReaderCompactHeader
            bab={bab}
            juz={juz}
            page={pageNo}
            sample={sample}
            scope={permalink}
          />

          <ReaderEnhancements />
          <ReadingTracker title={workTitle} work={segment} />
          <PageText
            model={model}
            footNote={footNote}
            notice={model.ai.translation ? <AiNotice mixed={model.ai.reviewed} /> : null}
          />
          <PageFoot model={model} />

          {/* Gulir bersambung (X04 W6): halaman berikutnya dimuat di bawah saat pembaca sampai di
              akhir halaman; navigasi halaman (dan pintasan ←/→) tetap di akhir, seperti membalik
              kitab. */}
          <ContinuousReader
            first={{
              juz,
              page: pageNo,
              permalink,
              prev: page.prev,
              next: page.next,
              bab,
              activeIds,
            }}
            footNote={footNote}
            segment={segment}
            workTitle={workTitle}
          />

          <footer className="text-muted flex flex-col gap-2 border-t border-separator pt-6 text-xs">
            <Typography.Heading level={2} className="text-sm">
              {t.sourceHeading}
            </Typography.Heading>
            <LicenseNotice
              compact
              attribution={page.citation.source.attribution}
              editionSlug={edition.slug}
              license={page.citation.source.license}
              sourceUrl={page.source_url}
              workSlug={work.slug}
            />
            <ReportPageButton />
          </footer>
        </article>

        <aside aria-labelledby="judul-daftar-isi" className="hidden lg:order-first lg:block">
          <div
            data-toc-scroll
            className="scrollbar sticky top-20 flex max-h-[calc(100dvh-6rem)] flex-col gap-2 overflow-y-auto pe-1"
          >
            <Typography.Heading
              level={2}

              className="text-sm px-2"
              id="judul-daftar-isi"
            >
              {t.tocHeading}
            </Typography.Heading>
            <TocTree
              activeIds={activeIds}
              at={{ juz, page: pageNo }}
              fullFrom={segment}
              items={tocShell}
              scope={permalink}
              titleSource={shown.titleSource}
            />
          </div>
        </aside>
      </div>
    </ReaderProvider>
  );
}
