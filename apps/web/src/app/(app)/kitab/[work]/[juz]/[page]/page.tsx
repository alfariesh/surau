import type { AyahRef, Passage } from "@surau/core";
import type { Metadata } from "next";

import { Breadcrumbs } from "@heroui/react";
import { Fragment, Suspense } from "react";

import { ArabicInline, ArabicText } from "../../../../../../components/arabic";
import { AyahRefChip } from "../../../../../../components/reader/ayah-ref";
import { LicenseNotice } from "../../../../../../components/reader/license-notice";
import { FootnoteMarker } from "../../../../../../components/reader/footnote-marker";
import { NeedsReviewNote } from "../../../../../../components/reader/needs-review";
import { PageNav } from "../../../../../../components/reader/page-nav";
import { PassageActions } from "../../../../../../components/reader/passage-actions";
import { PassageTranslation } from "../../../../../../components/reader/passage-translation";
import { QuranNotice } from "../../../../../../components/reader/quran-notice";
import { ReaderProvider } from "../../../../../../components/reader/reader-context";
import { ReaderToolbar } from "../../../../../../components/reader/reader-toolbar";
import { SearchHighlighter } from "../../../../../../components/reader/search-highlighter";
import { SectionSummary } from "../../../../../../components/reader/section-summary";
import { TocTree } from "../../../../../../components/reader/toc-tree";
import { FOOTNOTE_NOTE } from "../../../../../../content/works";
import { id } from "../../../../../../i18n/id";
import { citeParts } from "../../../../../../lib/reader/cite";
import { loadPage, loadToc } from "../../../../../../lib/reader/data";
import { READER_SCALE_SCRIPT } from "../../../../../../lib/reader/scale";
import { splitPassage } from "../../../../../../lib/reader/segments";
import {
  activeTocIds,
  headingPassages,
  sectionStarts,
  tocPath,
} from "../../../../../../lib/reader/toc";

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
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
        <article className="flex min-w-0 flex-col gap-6">
          <header className="flex flex-col gap-3">
            <Breadcrumbs aria-label={t.breadcrumbLabel} className="flex-wrap">
              <Breadcrumbs.Item href="/kitab">{t.listTitle}</Breadcrumbs.Item>
              <Breadcrumbs.Item href={edition.permalink}>{workTitle}</Breadcrumbs.Item>
              {crumbs.map((c, i) => (
                <Breadcrumbs.Item
                  key={c.id}
                  // Di ponsel hanya bagian terdalam yang tampil, supaya teks kitab tidak terdorong jauh.
                  // `min-w-0 shrink`: butir HeroUI `flex-shrink: 0`, sehingga judul bab yang panjang
                  // tidak membungkus dan meluber melewati gutter kanan di ponsel.
                  className={`min-w-0 shrink${i < crumbs.length - 1 ? " max-sm:hidden" : ""}`}
                  // Langsung ke halaman awal bagian (tanpa lompatan 307 lewat /bab/<id>).
                  href={`${c.href}#bab-${c.id}`}
                >
                  <ArabicInline>{c.title}</ArabicInline>
                </Breadcrumbs.Item>
              ))}
              <Breadcrumbs.Item>{t.pageShort(juz, pageNo)}</Breadcrumbs.Item>
            </Breadcrumbs>
            <div className="flex flex-col gap-1">
              <h1 className="text-foreground text-[1.75rem] leading-tight font-semibold tracking-tight sm:text-[2rem]">
                {t.pageHeading(juz, pageNo)}
              </h1>
              <p className="text-muted flex flex-wrap items-baseline gap-x-2 text-sm">
                <span>{workTitle}</span>
                <ArabicInline>{work.title_ar}</ArabicInline>
              </p>
            </div>
            <ReaderToolbar
              activeIds={activeIds}
              juz={juz}
              page={pageNo}
              pagePath={permalink}
              segment={segment}
              toc={toc}
              volumes={edition.volumes ?? juz}
            />
          </header>

          <PageNav label={t.pageNavTopLabel} next={page.next} prev={page.prev} />

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
                  <div className="passage flex flex-row-reverse items-start gap-1" id={p.anchor}>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {heading ? (
                        <ArabicText
                          as="h2"
                          className={`reader-heading ${heading.level > 2 ? "reader-heading-minor" : ""}`}
                        >
                          {renderText(p)}
                        </ArabicText>
                      ) : (
                        <ArabicText className="text-foreground">{renderText(p)}</ArabicText>
                      )}
                      <NeedsReviewNote reasons={p.needs_review} />
                      <PassageTranslation footAnchor={footAnchor} passage={p} quran={quran} />
                    </div>
                    <PassageActions passage={ref(p)} />
                  </div>
                  {summariesAt(starts.byPassage.get(p.id) ?? [])}
                </Fragment>
              );
            })}
          </section>

          <PageNav keyboard next={page.next} prev={page.prev} />
          <p className="text-muted text-xs">{t.keyboardHint}</p>

          {page.footnotes.length > 0 ? (
            <section
              aria-labelledby="judul-catatan-kaki"
              className="flex flex-col gap-3 border-t border-separator pt-6"
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-foreground text-lg font-semibold" id="judul-catatan-kaki">
                  {footNote?.heading ?? t.footnotesHeading}
                </h2>
                {footNote ? <p className="text-muted text-sm">{footNote.lead}</p> : null}
              </div>
              <ol className="flex list-none flex-col gap-3 p-0">
                {page.footnotes.map((f) => {
                  const back = markerOf.get(f.id);
                  return (
                    <li
                      key={f.id}
                      className="passage flex flex-row-reverse items-start gap-1"
                      id={f.anchor}
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <ArabicText className="text-foreground text-[0.95em]">
                          {renderText(f)}
                        </ArabicText>
                        <NeedsReviewNote reasons={f.needs_review} />
                        {back ? (
                          <a className="link self-start text-xs" href={`#${back}`}>
                            {t.footnoteBack}
                          </a>
                        ) : null}
                      </div>
                      <PassageActions passage={ref(f)} />
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}

          <footer className="text-muted flex flex-col gap-2 border-t border-separator pt-6 text-xs">
            <h2 className="text-foreground text-sm font-semibold">{t.sourceHeading}</h2>
            <LicenseNotice
              attribution={page.citation.source.attribution}
              editionSlug={edition.slug}
              license={page.citation.source.license}
              sourceUrl={page.source_url}
              workSlug={work.slug}
            />
            {quran ? <QuranNotice quran={quran} /> : null}
            {anyAi ? (
              <p>
                <span className="text-foreground font-medium">{t.aiNoticeHeading}.</span>{" "}
                {t.aiNotice}
              </p>
            ) : null}
            {anyReview ? <p>{t.needsReviewNote}</p> : null}
          </footer>
        </article>

        <aside aria-labelledby="judul-daftar-isi" className="hidden lg:order-first lg:block">
          <div
            data-toc-scroll
            className="sticky top-20 flex max-h-[calc(100dvh-6rem)] flex-col gap-2 overflow-y-auto pe-1"
          >
            <h2 className="text-foreground px-2 text-sm font-semibold" id="judul-daftar-isi">
              {t.tocHeading}
            </h2>
            <TocTree activeIds={activeIds} items={toc} />
          </div>
        </aside>
      </div>
    </ReaderProvider>
  );
}
