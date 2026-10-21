import type { AyahRef, QuranView } from "@surau/core";
import type { ReactNode } from "react";

import { Typography } from "@heroui/react";
import { Fragment } from "react";

import { id } from "../../i18n/id";
import type { Block } from "../../lib/reader/blocks";
import type { PageModel, PassageModel } from "../../lib/reader/page-model";
import type { PassageSegment } from "../../lib/reader/segments";
import { ArabicText } from "../arabic";

import { AyahRefChip } from "./ayah-ref";
import { FootnoteMarker } from "./footnote-marker";
import { HeadingOrnament } from "./heading-ornament";
import { NeedsReviewNote } from "./needs-review";
import { PassageActions } from "./passage-actions";
import { joinTranslations, PassageTranslation } from "./passage-translation";
import { SectionSummary } from "./section-summary";

const t = id.reader;

// Teks satu halaman cetak (badan + catatan kaki) dari `PageModel` (X04). Dipakai halaman baca yang
// dirender server dan halaman sambungan gulir bersambung (W6), jadi tanpa akses data atau API
// server: semua potongan, peran judul, dan terjemahan sudah disiapkan `buildPageModel`. Teks Arab
// hanya `text_raw` yang dipotong di offset DB/kurasi (blok, penanda, kutipan ayat).

interface Ctx {
  model: PageModel;
  footById: Map<number, PassageModel>;
}

function ayahChip(quran: QuranView | null, ref: AyahRef | undefined, key: number): ReactNode {
  if (quran === null || ref === undefined) return null;
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

function renderSegments(
  segments: readonly PassageSegment[],
  p: PassageModel,
  ctx: Ctx,
  keyBase: string,
): ReactNode[] {
  return segments.map((s, i) => {
    const key = `${keyBase}-${i}`;
    if (s.kind === "ayah-end")
      return <Fragment key={key}>{ayahChip(ctx.model.quran, p.ayat[s.ayah], i)}</Fragment>;
    let node: ReactNode;
    if (s.kind === "text") {
      node = s.text;
    } else {
      const foot = ctx.footById.get(s.footnoteId);
      const markerId = `ref-${p.anchor}-${s.charStart}`;
      node =
        foot === undefined ? (
          s.text
        ) : (
          <FootnoteMarker
            footnote={{
              anchor: foot.anchor,
              text: foot.blocks
                .flatMap((b) => b.segments)
                .map((x) => (x.kind === "ayah-end" ? "" : x.text))
                .join(""),
              needsReview: foot.needsReview,
            }}
            marker={s.marker}
            refId={ctx.model.markerIds[s.footnoteId] === markerId ? markerId : undefined}
            text={s.text}
          />
        );
    }
    return s.ayah === null ? (
      <Fragment key={key}>{node}</Fragment>
    ) : (
      <span key={key} className="ayah-quote">
        {node}
      </span>
    );
  });
}

/**
 * Isi teks blok-blok paragraf (teks biasa atau bait syair) sebagai konten sebaris. Subjudul yang
 * menempel tidak lewat sini: PassageView merendernya sebagai elemen judul sendiri.
 */
function renderBlocks(p: PassageModel, ctx: Ctx, blocks: readonly Block[] = p.blocks): ReactNode[] {
  const out: ReactNode[] = [];
  let row: ReactNode[] = [];
  const flushRow = (key: number) => {
    if (row.length === 0) return;
    out.push(
      <span key={`row-${key}`} className="verse-row">
        {row}
      </span>,
    );
    row = [];
  };
  blocks.forEach((b, i) => {
    const content = renderSegments(b.segments, p, ctx, `${p.anchor}-${b.kind}-${i}`);
    if (b.kind === "syatr") {
      row.push(
        <span key={i} className="syatr">
          {content}
        </span>,
      );
    } else if (b.kind === "syatr-sep") {
      // Pemisah ke-1, ke-3, … ada di dalam bait (antara dua syatr); ke-2, ke-4, … antarbait.
      if (Math.floor(i / 2) % 2 === 0) {
        row.push(
          <span key={i} className="syatr-sep">
            {content}
          </span>,
        );
      } else {
        flushRow(i);
        out.push(
          <span key={i} className="syatr-sep syatr-sep-row">
            {content}
          </span>,
        );
      }
    } else {
      out.push(<Fragment key={i}>{content}</Fragment>);
    }
  });
  flushRow(blocks.length);
  return out;
}

/**
 * Tingkat subjudul untuk setiap paragraf badan, urut baca: 3 bila sudah ada judul node (h2) sebelum
 * paragraf itu di halaman ini (atau teks ini halaman sambungan yang sudah ber-h2), selain itu 2,
 * supaya urutan heading tetap berurutan (axe heading-order).
 */
function subLevels(body: readonly PassageModel[], afterH2: boolean): (2 | 3)[] {
  const levels: (2 | 3)[] = [];
  let seen = afterH2;
  for (const p of body) {
    levels.push(seen ? 3 : 2);
    if (p.heading?.kind === "toc") seen = true;
  }
  return levels;
}

/** Rujukan paragraf untuk menu ⋮ dan laporan; label lokasi dari halaman model ini. */
function passageRef(p: PassageModel, model: PageModel) {
  return {
    id: p.id,
    label: `${t.pageShort(model.juz, model.pageNo)} · ${p.anchor}`,
    permalink: p.permalink,
  };
}

/**
 * `level` = tingkat subjudul di posisi paragraf ini: 3 bila sudah ada judul node (h2) sebelumnya di
 * halaman ini atau teks ini halaman sambungan (sudah ber-h2), selain itu 2 (urutan heading, axe).
 */
function PassageView({ p, ctx, level }: { p: PassageModel; ctx: Ctx; level: 2 | 3 }) {
  // Jangkar bab (#bab-N, tujuan /kitab/…/bab/N) di dalam paragraf, diletakkan absolut di tepi atas.
  const anchors = p.sectionAnchors.map((nodeId) => (
    <span key={nodeId} className="section-anchor" id={`bab-${nodeId}`} />
  ));
  if (p.heading !== null) {
    const toc = p.heading.kind === "toc";
    const tag = toc ? "h2" : level === 3 ? "h3" : "h2";
    const translation = joinTranslations(
      [p, ...p.continuations].flatMap((x) => (x.translation === null ? [] : [x.translation])),
    );
    return (
      <div className={`passage passage-heading ${toc ? "" : "passage-subheading"}`} id={p.anchor}>
        {anchors}
        {/* Judul di tengah seperti kitab cetak; ⋮ di ruang tepi (padding sama di kedua sisi). */}
        <div className="relative flex items-center justify-center gap-2 px-7 sm:gap-3 sm:px-9">
          <span className="absolute start-0 top-1/2 -translate-y-1/2">
            <PassageActions passage={passageRef(p, ctx.model)} />
          </span>
          {toc ? <HeadingOrnament side="start" /> : null}
          <ArabicText
            as={tag}
            className={
              toc
                ? `reader-heading ${p.heading.kind === "toc" && p.heading.level > 2 ? "reader-heading-minor" : ""}`
                : "reader-heading reader-subheading"
            }
          >
            {renderBlocks(p, ctx)}
            {p.continuations.map((c) => (
              <span key={c.id} className="passage-cont" id={c.anchor}>
                {" "}
                {renderBlocks(c, ctx)}
              </span>
            ))}
          </ArabicText>
          {toc ? <HeadingOrnament side="end" /> : null}
        </div>
        <NeedsReviewNote
          reasons={[...p.needsReview, ...p.continuations.flatMap((c) => c.needsReview)]}
        />
        <PassageTranslation
          heading
          anchor={p.anchor}
          footAnchor={ctx.model.footAnchor}
          permalink={p.permalink}
          translation={translation}
        />
      </div>
    );
  }
  const verse = p.blocks.some((b) => b.kind === "syatr");
  const sub = p.blocks.findIndex((b) => b.kind === "subheading");
  const SubTag = level === 3 ? "h3" : "h2";
  return (
    <div className={`passage ${verse ? "passage-verse" : ""}`} id={p.anchor}>
      {anchors}
      {sub === -1 ? (
        <ArabicText className={`text-foreground ${verse ? "verse" : ""}`}>
          {renderBlocks(p, ctx)}
          <PassageActions passage={passageRef(p, ctx.model)} />
        </ArabicText>
      ) : (
        // Subjudul yang menempel di awal/akhir paragraf: baris judul sendiri + sisa paragrafnya.
        // Keduanya potongan text_raw yang sama (offset kurasi), di dalam satu blok Arab.
        <ArabicText as="div" className="text-foreground">
          {p.blocks.map((b, i) =>
            b.kind === "subheading" ? (
              <SubTag key={i} className="reader-heading reader-inline-subheading">
                {renderSegments(b.segments, p, ctx, `${p.anchor}-sub`)}
              </SubTag>
            ) : (
              <p key={i}>
                {renderBlocks(p, ctx, [b])}
                <PassageActions passage={passageRef(p, ctx.model)} />
              </p>
            ),
          )}
        </ArabicText>
      )}
      <NeedsReviewNote reasons={p.needsReview} />
      <PassageTranslation
        anchor={p.anchor}
        footAnchor={ctx.model.footAnchor}
        permalink={p.permalink}
        translation={p.translation}
      />
    </div>
  );
}

export function PageText({
  model,
  footNote,
  afterH2 = false,
  label = t.textLabel,
  footnotesHeadingId = "judul-catatan-kaki",
  notice,
}: {
  model: PageModel;
  /** Judul + keterangan catatan kaki edisi (FOOTNOTE_NOTE), bila diketahui. */
  footNote?: { heading: string; lead: string };
  /** Sudah ada h2 sebelum teks ini (halaman sambungan): subjudul selalu h3. */
  afterH2?: boolean;
  /** Nama wilayah teks (pembaca layar). */
  label?: string;
  footnotesHeadingId?: string;
  /** Catatan di awal teks (mis. catatan terjemahan AI). */
  notice?: ReactNode;
}) {
  const ctx: Ctx = { model, footById: new Map(model.footnotes.map((f) => [f.id, f])) };
  const levels = subLevels(model.body, afterH2);
  const summaries = (list: PassageModel["summaries"]) =>
    list.map((s) => <SectionSummary key={s.section.id} summary={s} />);

  return (
    <>
      <section
        aria-label={label}
        className="reader-text flex flex-col"
        data-page={`${model.juz}/${model.pageNo}`}
      >
        {notice}
        {model.unplaced.map((nodeId) => (
          <span key={nodeId} className="section-anchor" id={`bab-${nodeId}`} />
        ))}
        {summaries(model.unplacedSummaries)}
        {model.body.map((p, i) => {
          const view = <PassageView ctx={ctx} level={levels[i] ?? 2} p={p} />;
          return (
            <Fragment key={p.id}>
              {view}
              {summaries(p.summaries)}
            </Fragment>
          );
        })}
      </section>

      {model.footnotes.length > 0 ? (
        // Seperti catatan kaki buku: garis pendek, judul kecil, huruf lebih kecil dari teks.
        <section aria-labelledby={footnotesHeadingId} className="flex flex-col gap-3 pt-2">
          <div aria-hidden="true" className="reader-footnotes-rule" />
          <div className="flex flex-col gap-0.5">
            <Typography.Heading className="text-sm" id={footnotesHeadingId} level={afterH2 ? 3 : 2}>
              {footNote?.heading ?? t.footnotesHeading}
              {/* Halaman sambungan: nama wilayah catatan kaki dibedakan per halaman (pembaca layar). */}
              {afterH2 ? (
                <span className="sr-only"> · {t.pageShort(model.juz, model.pageNo)}</span>
              ) : null}
            </Typography.Heading>
            {footNote ? (
              <Typography color="muted" type="body-xs">
                {footNote.lead}
              </Typography>
            ) : null}
          </div>
          <ol className="reader-footnotes flex list-none flex-col gap-2 p-0">
            {model.footnotes.map((f) => {
              const back = model.markerIds[f.id];
              return (
                <li key={f.id} className="passage flex flex-col gap-1" id={f.anchor}>
                  <ArabicText className="text-foreground">
                    {renderBlocks(f, ctx)}
                    <PassageActions passage={passageRef(f, model)} />
                  </ArabicText>
                  <NeedsReviewNote reasons={f.needsReview} />
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
    </>
  );
}
