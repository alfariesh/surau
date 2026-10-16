// Memecah satu halaman Shamela menjadi draf paragraf (badan + catatan kaki), posisi judul, dan
// tautan penanda (١). Semua logika teks memakai @surau/text; modul ini hanya menyusun hasilnya.
// Teks paragraf adalah potongan PERSIS dari teks bersih (`text_raw`); yang dibuang hanya pemisah:
// baris baru, garis catatan kaki, dan `//` bila takhrij yang menempel berhasil dipisah.
import {
  cleanShamelaHtml,
  findFootnoteMarkers,
  linkFootnoteMarkers,
  splitFootnoteEntries,
  splitFootnotes,
  splitInlineTakhrij,
  splitParagraphs,
} from "@surau/text";
import type { FootnoteMarker, InlineTakhrijDirection } from "@surau/text";

import type { ShamelaPage } from "./source.ts";

/**
 * Alasan paragraf ditandai `needs_review` (tabel `passage_needs_review`):
 * - `takhrij_inline`: takhrij yang menempel ke matan lewat `//`, dipotong ke catatan kaki;
 * - `takhrij_unmatched`: catatan kaki yang tidak ditemukan di takhrij OpenITI JK000001 halaman itu;
 * - `inline_unsplit`: paragraf badan memuat `//` tetapi takhrijnya tidak dikenali (tidak dipecah).
 */
export type ReviewReason = "takhrij_inline" | "takhrij_unmatched" | "inline_unsplit";

export interface PassageDraft {
  /** Kunci stabil di halaman sumber: `b<baris>`, `b<baris>.<potongan>`, `t<baris>`, `f<catatan>`. */
  key: string;
  kind: "body" | "foot";
  text: string;
  reasons: ReviewReason[];
  /** Badan/takhrij menempel: indeks baris (paragraf) sumber; catatan kaki: -1. */
  line: number;
  /** Badan/takhrij menempel: rentang di teks badan bersih (untuk menautkan judul); catatan: -1. */
  start: number;
  end: number;
  /** Nomor catatan kaki (`(١)` → 1); `null` untuk catatan tanpa nomor dan takhrij menempel. */
  noteNumber: number | null;
}

export interface TitleAnchor {
  /** `title.id` dari `id=toc-N`. */
  tocId: number;
  /** Offset awal span judul di teks badan bersih. */
  offset: number;
}

export interface FootnoteLink {
  /** Indeks paragraf badan di `ParsedPage.body`. */
  body: number;
  /** Penanda, offset relatif terhadap teks paragraf badan itu. */
  marker: FootnoteMarker;
  /** Teks penanda di dalam kurung, persis seperti sumber (mis. `١`). */
  label: string;
  /** Indeks catatan di `ParsedPage.foot`. */
  foot: number;
}

export interface ParsedPage {
  source: ShamelaPage;
  /** Teks badan bersih utuh (sebelum `//` dipisah), untuk QA OpenITI. */
  bodyText: string;
  body: PassageDraft[];
  foot: PassageDraft[];
  titles: TitleAnchor[];
  /** Span judul tanpa `id=toc-N` (dilaporkan). */
  untitledSpans: number;
  links: FootnoteLink[];
  orphanRefs: FootnoteMarker[];
  orphanNotes: number;
  /** Arah takhrij menempel di halaman ini (`null` = ada `//` tetapi tidak dipecah). */
  inline: { direction: InlineTakhrijDirection | null; line: number }[];
  unknownTags: string[];
}

// Catatan kaki yang memanjang beberapa baris tetap satu paragraf; baris barunya diseragamkan ke
// `\n` (Shamela memakai `\r`, yang tidak dianggap baris baru oleh CSS).
function unifyNewlines(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

export function parsePage(source: ShamelaPage): ParsedPage {
  const split = splitFootnotes(source.content);
  const clean = cleanShamelaHtml(split.body);
  const footClean = cleanShamelaHtml(split.footnotes);
  const bodyText = clean.text;

  const body: PassageDraft[] = [];
  const inlineTakhrij: PassageDraft[] = [];
  const inline: ParsedPage["inline"] = [];
  splitParagraphs(bodyText).forEach((para, line) => {
    const draft = (key: string, start: number, end: number): PassageDraft => ({
      key,
      kind: "body",
      text: bodyText.slice(start, end),
      reasons: [],
      line,
      start,
      end,
      noteNumber: null,
    });
    const inl = splitInlineTakhrij(para.text);
    if (inl === null) {
      body.push(draft(`b${line}`, para.start, para.end));
      return;
    }
    inline.push({ direction: inl.direction, line });
    if (inl.takhrij === null) {
      const d = draft(`b${line}`, para.start, para.end);
      d.reasons.push("inline_unsplit");
      body.push(d);
      return;
    }
    inl.body.forEach((s, i) => {
      body.push(
        draft(i === 0 ? `b${line}` : `b${line}.${i}`, para.start + s.start, para.start + s.end),
      );
    });
    const t = draft(`t${line}`, para.start + inl.takhrij.start, para.start + inl.takhrij.end);
    inlineTakhrij.push({ ...t, kind: "foot", reasons: ["takhrij_inline"] });
  });

  // Catatan dari bagian bawah halaman lebih dulu, lalu takhrij yang dipotong dari badan.
  const entries = splitFootnoteEntries(footClean.text);
  const foot: PassageDraft[] = [
    ...entries.map((e, i): PassageDraft => ({
      key: `f${i}`,
      kind: "foot",
      text: unifyNewlines(e.text),
      reasons: [],
      line: -1,
      start: -1,
      end: -1,
      noteNumber: e.number,
    })),
    ...inlineTakhrij,
  ];

  const refs = body.flatMap((d, i) =>
    findFootnoteMarkers(d.text).map((marker) => ({ body: i, marker, number: marker.number })),
  );
  const linked = linkFootnoteMarkers(
    refs,
    foot.map((f) => ({ number: f.noteNumber })),
  );
  const links = linked.links.map(({ ref, note }): FootnoteLink => {
    const r = refs[ref] as (typeof refs)[number];
    const text = (body[r.body] as PassageDraft).text.slice(r.marker.start, r.marker.end);
    return { body: r.body, marker: r.marker, label: text.slice(1, -1).trim(), foot: note };
  });

  return {
    source,
    bodyText,
    body,
    foot,
    titles: clean.titles.flatMap((t) =>
      t.tocId === null ? [] : [{ tocId: t.tocId, offset: t.start }],
    ),
    untitledSpans: clean.titles.filter((t) => t.tocId === null).length,
    links,
    orphanRefs: linked.orphanRefs.map((i) => (refs[i] as (typeof refs)[number]).marker),
    orphanNotes: linked.orphanNotes.length,
    inline,
    unknownTags: [...new Set([...clean.unknownTags, ...footClean.unknownTags])].sort(),
  };
}
