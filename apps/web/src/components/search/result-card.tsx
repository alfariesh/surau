"use client";

import type { SearchHit, SearchPage as ResultPage } from "@surau/core";
import type { ReactNode } from "react";

import { Card, Chip, Typography } from "@heroui/react";
import NextLink from "next/link";

import { id } from "../../i18n/id";
import { aiSegments, markSegments, readerHref } from "../../lib/search/segments";
import type { TextSegment } from "../../lib/search/segments";
import { ArabicInline, ArabicText } from "../arabic";

const t = id.search;
const r = id.reader;

// Kartu satu halaman cetak hasil Cari (S14): judul bagian + letak (j/h), lalu setiap paragraf
// cocok: potongan Arab ASLI (irisan text_raw dari API, sorotan hanya membungkus), terjemahan AI
// berlabel, ringkasan bagian (bila jalur ringkasan cocok), asal kecocokan, dan tautan ke paragraf
// di pembaca dengan `?q=` supaya kata yang dicari ikut disorot di sana.

function render(segments: readonly TextSegment[]): ReactNode[] {
  return segments.map((s, i) => {
    if (s.kind === "mark") {
      return (
        <mark key={i} className="search-mark">
          {s.text}
        </mark>
      );
    }
    if (s.kind === "ayah") {
      // Placeholder ayat di terjemahan AI: label rujukan (terjemahan Kemenag-nya tampil di pembaca).
      return (
        <span key={i} className="search-ayah" title={t.ayahPlaceholderHint}>
          {t.ayahPlaceholder(s.ref)}
        </span>
      );
    }
    return <span key={i}>{s.text}</span>;
  });
}

function Hit({ hit, query }: { hit: SearchHit; query: string }) {
  const arabic = markSegments(hit.snippet.text, hit.snippet.char_start, hit.highlights);
  const tr = hit.translation?.review_status === "rejected" ? null : hit.translation;
  const sm = hit.summary?.review_status === "rejected" ? null : hit.summary;
  const partial = hit.matched_by.some((m) => !m.all_terms);
  return (
    <div className="flex flex-col gap-3 border-t border-separator pt-3 first:border-t-0 first:pt-0">
      {hit.kind === "foot" ? (
        <Chip className="self-start" size="sm" variant="secondary">
          {r.footnotesHeading}
        </Chip>
      ) : null}
      <ArabicText className="text-foreground search-snippet">{render(arabic)}</ArabicText>
      {tr ? (
        <div className="flex flex-col gap-1" lang="id">
          <Chip className="self-start" size="sm" variant="soft">
            {r.aiTranslation}
          </Chip>
          <Typography type="body-sm">
            {render(aiSegments(tr.snippet.text, tr.snippet.char_start, tr.highlights))}
          </Typography>
        </div>
      ) : null}
      {sm ? (
        <div className="bg-surface-secondary flex flex-col gap-1 rounded-xl p-3" lang="id">
          <div className="flex flex-wrap items-center gap-2">
            <Chip color="accent" size="sm" variant="soft">
              {r.aiSummary}
            </Chip>
            <ArabicInline className="text-foreground">{sm.section.title_ar}</ArabicInline>
          </div>
          <Typography type="body-sm">
            {render(aiSegments(sm.snippet.text, sm.snippet.char_start, sm.highlights))}
          </Typography>
          <NextLink className="link self-start text-xs" href={sm.section.permalink}>
            {t.openSection}
          </NextLink>
        </div>
      ) : null}
      <div className="text-muted flex flex-wrap items-center justify-between gap-2 text-xs">
        <span>
          {t.matchedByLabel} {hit.matched_by.map((m) => t.matchedBy[m.path]).join(" · ")}
          {partial ? ` (${t.partialMatch})` : ""}
        </span>
        <NextLink className="link text-xs" href={readerHref(hit.location.permalink, query)}>
          {t.openInReader}
        </NextLink>
      </div>
    </div>
  );
}

/** Paragraf per kartu; sisanya lewat tautan ke halaman di pembaca. */
const HITS_PER_CARD = 3;

export function ResultCard({ page, query }: { page: ResultPage; query: string }) {
  const { juz, page_no: pageNo } = page.citation;
  // Paling relevan dulu (skor null = urutan kitab, tanpa peringkat).
  const hits = page.hits
    .map((hit, i) => ({ hit, i }))
    .sort((a, b) => (b.hit.score ?? 0) - (a.hit.score ?? 0) || a.i - b.i)
    .map((x) => x.hit);
  const shown = hits.slice(0, HITS_PER_CARD);
  const rest = hits.length - shown.length;
  const section = shown.find((h) => h.section !== null)?.section ?? null;
  return (
    <li>
      <Card>
        <Card.Header className="gap-1">
          <Card.Title className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <NextLink className="link" href={readerHref(page.citation.permalink, query)}>
              {t.pageLabel(r.pageShort(juz, pageNo))}
            </NextLink>
            {section ? (
              <ArabicInline className="text-foreground font-normal">
                {section.title_ar}
              </ArabicInline>
            ) : null}
          </Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          {shown.map((hit) => (
            <Hit key={hit.id} hit={hit} query={query} />
          ))}
          {rest > 0 ? (
            <NextLink
              className="link self-start text-sm"
              href={readerHref(page.citation.permalink, query)}
            >
              {t.moreOnPage(rest)}
            </NextLink>
          ) : null}
        </Card.Content>
      </Card>
    </li>
  );
}
