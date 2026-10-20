import type { AyahRef, Passage } from "@surau/core";
import type { Metadata } from "next";

import { Fragment, Suspense } from "react";

import { ArabicInline, ArabicText } from "../../../../../../components/arabic";
import { BreadcrumbJsonLd } from "../../../../../../components/breadcrumb-json-ld";
import { AyahRefChip } from "../../../../../../components/reader/ayah-ref";
import { LicenseNotice } from "../../../../../../components/reader/license-notice";
import { FootnoteMarker } from "../../../../../../components/reader/footnote-marker";
import { NeedsReviewNote } from "../../../../../../components/reader/needs-review";
import { PageNav } from "../../../../../../components/reader/page-nav";
import { PassageActions } from "../../../../../../components/reader/passage-actions";
import { PassageTranslation } from "../../../../../../components/reader/passage-translation";
import { QuranNotice } from "../../../../../../components/reader/quran-notice";
import { ReaderProvider } from "../../../../../../components/reader/reader-context";
import { ReaderCompactHeader } from "../../../../../../components/reader/reader-compact-header";
import {
  ReaderToolbar,
  ReportPageButton,
} from "../../../../../../components/reader/reader-toolbar";
import { SearchHighlighter } from "../../../../../../components/reader/search-highlighter";
import { SectionSummary } from "../../../../../../components/reader/section-summary";
import { TocTree } from "../../../../../../components/reader/toc-tree";
import { FOOTNOTE_NOTE } from "../../../../../../content/works";
import { id } from "../../../../../../i18n/id";
import { PAGE_FRAME } from "../../../../../../lib/layout";
import { citeParts } from "../../../../../../lib/reader/cite";
import { loadPage, loadToc } from "../../../../../../lib/reader/data";
import { previewSample } from "../../../../../../lib/reader/preview";
import { READER_SCALE_SCRIPT } from "../../../../../../lib/reader/scale";
import { splitPassage } from "../../../../../../lib/reader/segments";
import {
  activeTocIds,
  headingPassages,
  sectionStarts,
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
    openGraph: { type: "article", url: citation.permalink },
  };
}

function passageLabel(juz: number, page: number, p: Passage): string {
  return `${t.pageShort(juz, page)} · ${p.anchor}`;
}

export default async function ReaderPage({ params }: Props) {
  const { work: rawSegment, juz: rawJuz, page: rawPage } = await params;
  const ctx = await loadPage(rawSegment, rawJuz, rawPage);
  const toc = await loadToc(rawSegment);
  const { page, work, edition, segment } = ctx;
  const { juz, page_no: pageNo, permalink } = page.citation;

  const activeIds = activeTocIds(toc, juz, pageNo, page.body);
  const crumbs = activeIds[0] === undefined ? [] : tocPath(toc, activeIds[0]);
  const headings = headingPassages(toc, juz, pageNo, page.body);
  const starts = sectionStarts(toc, juz, pageNo, page.body);
  const footById = new Map(page.footnotes.map((f) => [f.id, f]));
  // Potongan teks per paragraf (penanda catatan kaki dan kutipan ayat dipotong hanya di offset DB).
  // Penanda pertama yang benar-benar dirender untuk tiap catatan kaki diberi id, tujuan tautan
  // "kembali ke teks".
  const segmentsOf = new Map(
    [...page.body, ...page.footnotes].map((p) => [
      p.id,
      splitPassage(p.text_raw, p.footnote_refs, p.ayah_refs),
    ]),
  );
  const markerOf = new Map<number, string>();
  for (const b of page.body) {
    for (const s of segmentsOf.get(b.id)?.segments ?? []) {
      if (s.kind === "marker" && footById.has(s.footnoteId) && !markerOf.has(s.footnoteId)) {
        markerOf.set(s.footnoteId, `ref-${b.anchor}-${s.charStart}`);
      }
    }
  }
  // Penanda (١) di terjemahan AI → catatan kaki Arab yang sama di halaman ini.
  const footAnchor = new Map<string, string>();
  for (const b of page.body) {
    for (const r of b.footnote_refs) {
      const foot = footById.get(r.footnote_id);
      if (foot !== undefined && !footAnchor.has(r.marker)) footAnchor.set(r.marker, foot.anchor);
    }
  }
  // Ringkasan AI per bagian yang mulai di halaman ini (S14), ditaruh sesudah paragraf awalnya.
  const summaryOf = new Map((page.summaries ?? []).map((s) => [s.section.id, s]));
  const summariesAt = (nodeIds: readonly number[]) =>
    nodeIds.flatMap((nodeId) => {
      const summary = summaryOf.get(nodeId);
      return summary === undefined ? [] : [<SectionSummary key={nodeId} summary={summary} />];
    });
  const anyAi =
    summaryOf.size > 0 ||
    page.body.some((p) => p.translation !== null && p.translation !== undefined);
  const footNote = FOOTNOTE_NOTE[`${work.slug}/${edition.slug}`];
  const anyReview = [...page.body, ...page.footnotes].some((p) => p.needs_review.length > 0);
  const workTitle = work.title_id ?? work.title_ar;
  const bab = crumbs.at(-1)?.title ?? null;
  // Pratinjau huruf di panel Tampilan: awal paragraf isi pertama halaman ini (lib/reader/preview).
  const sample = previewSample(
    (page.body.find((p) => !headings.has(p.id)) ?? page.body[0])?.text_raw,
  );
  const ref = (p: Passage) => ({
    id: p.id,
    label: passageLabel(juz, pageNo, p),
    permalink: p.location.permalink,
  });

  // Ayat utuh + nama surah untuk satu rujukan (dari PageView.quran, verbatim dari DB).
  const quran = page.quran;
  function ayahChip(ref: AyahRef, key: number) {
    if (quran === null) return null;
    const ayat = quran.ayat.filter(
      (a) => a.surah === ref.surah && a.ayah >= ref.ayah_from && a.ayah <= ref.ayah_to,
    );
    const surah = quran.surahs.find((s) => s.surah === ref.surah);
    return (
      <AyahRefChip
        key={key}
        ayahRef={ref}
        ayat={ayat}
        sources={quran.sources}
        surahNameAr={surah?.name_ar ?? null}
      />
    );
  }

  function renderText(p: Passage) {
    const split = segmentsOf.get(p.id);
    if (split === undefined) return p.text_raw;
    return split.segments.map((s, i) => {
      if (s.kind === "ayah-end") {
        const ref = split.ayat[s.ayah];
        return ref === undefined ? null : ayahChip(ref, i);
      }
      let node;
      if (s.kind === "text") {
        node = s.text;
      } else {
        const foot = footById.get(s.footnoteId);
        const markerId = `ref-${p.anchor}-${s.charStart}`;
        node =
          foot === undefined ? (
            s.text
          ) : (
            <FootnoteMarker
              footnote={{
                anchor: foot.anchor,
                text: foot.text_raw,
                needsReview: foot.needs_review,
              }}
              marker={s.marker}
              refId={markerOf.get(foot.id) === markerId ? markerId : undefined}
              text={s.text}
            />
          );
      }
      return s.ayah === null ? (
        <Fragment key={i}>{node}</Fragment>
      ) : (
        <span key={i} className="ayah-quote">
          {node}
        </span>
      );
    });
  }

  return (
    <ReaderProvider cite={citeParts(page.citation.source, juz, pageNo)} pagePath={permalink}>
      <script dangerouslySetInnerHTML={{ __html: READER_SCALE_SCRIPT }} />
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
            </div>
            <ReaderToolbar
              activeIds={activeIds}
              juz={juz}
              page={pageNo}
              pagePath={permalink}
              sample={sample}
              segment={segment}
              toc={toc}
              volumes={edition.volumes ?? juz}
            />
          </header>
          <ReaderCompactHeader bab={bab} juz={juz} page={pageNo} sample={sample} />

          <section aria-label={t.textLabel} className="reader-text flex flex-col gap-3">
            {starts.unplaced.map((nodeId) => (
              <span key={nodeId} className="section-anchor" id={`bab-${nodeId}`} />
            ))}
            {summariesAt(starts.unplaced)}
            {page.body.map((p) => {
              const heading = headings.get(p.id);
              return (
                <Fragment key={p.id}>
                  {(starts.byPassage.get(p.id) ?? []).map((nodeId) => (
                    <span key={nodeId} className="section-anchor" id={`bab-${nodeId}`} />
                  ))}
                  {/* Satu kolom: teks Arab, terjemahan, dan ringkasan berbagi tepi yang sama. Menu ⋮
                      ada di akhir teks (sebaris dengan kata terakhir), bukan kolom sendiri. */}
                  <div className="passage flex flex-col gap-1" id={p.anchor}>
                    {heading ? (
                      // Judul bab di tengah seperti kitab cetak; ⋮ di luar <h2> supaya tidak ikut
                      // nama judul.
                      <div className="flex items-center justify-center gap-1">
                        <PassageActions passage={ref(p)} />
                        <ArabicText
                          as="h2"
                          className={`reader-heading ${heading.level > 2 ? "reader-heading-minor" : ""}`}
                        >
                          {renderText(p)}
                        </ArabicText>
                      </div>
                    ) : (
                      <ArabicText className="text-foreground">
                        {renderText(p)}
                        <PassageActions passage={ref(p)} />
                      </ArabicText>
                    )}
                    <NeedsReviewNote reasons={p.needs_review} />
                    <PassageTranslation
                      footAnchor={footAnchor}
                      heading={heading !== undefined}
                      passage={p}
                      quran={quran}
                    />
                  </div>
                  {summariesAt(starts.byPassage.get(p.id) ?? [])}
                </Fragment>
              );
            })}
          </section>

          {page.footnotes.length > 0 ? (
            // Seperti catatan kaki buku: garis pendek, judul kecil, huruf lebih kecil dari teks.
            <section aria-labelledby="judul-catatan-kaki" className="flex flex-col gap-3 pt-2">
              <div aria-hidden="true" className="reader-footnotes-rule" />
              <div className="flex flex-col gap-0.5">
                <Typography.Heading
                  level={2}

                  id="judul-catatan-kaki"
                  className="text-sm"
                >
                  {footNote?.heading ?? t.footnotesHeading}
                </Typography.Heading>
                {footNote ? (
                  <Typography type="body-xs" color="muted">
                    {footNote.lead}
                  </Typography>
                ) : null}
              </div>
              <ol className="reader-footnotes flex list-none flex-col gap-2 p-0">
                {page.footnotes.map((f) => {
                  const back = markerOf.get(f.id);
                  return (
                    <li key={f.id} className="passage flex flex-col gap-1" id={f.anchor}>
                      <ArabicText className="text-foreground">
                        {renderText(f)}
                        <PassageActions passage={ref(f)} />
                      </ArabicText>
                      <NeedsReviewNote reasons={f.needs_review} />
                      {back ? (
                        <a className="link self-start text-xs" href={`#${back}`}>
                          {t.footnoteBack}
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}

          {/* Navigasi halaman hanya di akhir halaman (sesudah catatan kaki), seperti membalik kitab. */}
          <div className="flex flex-col gap-2">
            <PageNav keyboard next={page.next} prev={page.prev} />
            <Typography type="body-xs" color="muted">
              {t.keyboardHint}
            </Typography>
          </div>

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
            {quran ? <QuranNotice quran={quran} /> : null}
            {anyAi ? (
              <Typography type="body-xs" color="muted">
                {t.aiNotice}
              </Typography>
            ) : null}
            {anyReview ? (
              <Typography type="body-xs" color="muted">
                {t.needsReviewNote}
              </Typography>
            ) : null}
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
            <TocTree activeIds={activeIds} items={toc} />
          </div>
        </aside>
      </div>
    </ReaderProvider>
  );
}
