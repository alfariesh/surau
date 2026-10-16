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
import type { NeedsReviewReason } from "@surau/db";
import type { FootnoteMarker, InlineTakhrijDirection } from "@surau/text";

import type { ShamelaPage } from "./source.ts";

/** Alasan `needs_review` (CHECK di migrasi korpus 0003; artinya di komentar migrasi itu). */
export type ReviewReason = NeedsReviewReason;

export interface PassageDraft {
  /**
   * Kunci posisional di halaman sumber (peta ID, ADR-032 butir 8): `b<baris>` = baris badan, atau
   * matan di DEPAN takhrij/`//` bila baris dipecah; `b<baris>.1` = matan SESUDAH `//`;
   * `t<baris>` = takhrij menempel; `f<n>` = catatan ke-n di bagian bawah halaman.
   */
  key: string;
  kind: "body" | "foot";
  text: string;
  reasons: ReviewReason[];
  /** Badan/takhrij menempel: indeks baris (paragraf) sumber; catatan kaki: -1. */
  line: number;
  /** Badan/takhrij menempel: rentang di teks badan bersih (untuk menautkan judul); catatan: -1. */
  start: number;
  end: number;
  /**
   * Nomor catatan kaki (`(١)` → 1); `null` untuk catatan tanpa nomor. Takhrij menempel mendapat
   * nomor penanda pembukanya hanya bila bagian bawah halaman tidak punya catatan bernomor sama.
   */
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
  /** Catatan bawah halaman yang tidak dirujuk penanda matan (ditandai `footnote_orphan`). */
  orphanNotes: number;
  /** Dari `orphanNotes`: yang nomornya muncul sebagai penanda di dalam takhrij menempel. */
  orphanNotesInInline: number;
  /** Penanda (١) di teks badan utuh: di matan + di takhrij menempel (invarian: tidak ada yang hilang). */
  markers: { total: number; body: number; inline: number };
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
  const inlineTakhrij: (PassageDraft & { marker: number | null })[] = [];
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
    // Batas potongan ditebak (ADR-032 butir 3), jadi matan di sebelahnya juga ditandai.
    for (const [key, s] of [
      [`b${line}`, inl.before],
      [`b${line}.1`, inl.after],
    ] as const) {
      if (s === null) continue;
      const d = draft(key, para.start + s.start, para.start + s.end);
      d.reasons.push("takhrij_boundary");
      body.push(d);
    }
    const t = draft(`t${line}`, para.start + inl.takhrij.start, para.start + inl.takhrij.end);
    inlineTakhrij.push({
      ...t,
      kind: "foot",
      reasons: ["takhrij_inline"],
      marker: inl.marker?.number ?? null,
    });
  });

  // Catatan dari bagian bawah halaman lebih dulu, lalu takhrij yang dipotong dari badan.
  const entries = splitFootnoteEntries(footClean.text);
  const sectionNumbers = new Set(entries.map((e) => e.number));
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
    // Penanda pembuka takhrij menempel tetap di matan. Bila catatan bawah bernomor sama tidak ada,
    // penanda itu ditautkan ke takhrij menempel ini.
    ...inlineTakhrij.map(({ marker, ...d }) => ({
      ...d,
      noteNumber: marker !== null && !sectionNumbers.has(marker) ? marker : null,
    })),
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
  // Catatan bawah halaman yang tak dirujuk dari matan (bernomor atau tidak) tidak bisa dicapai dari
  // penanda, jadi ditandai. Penyebab yang bisa dihitung: penandanya ada di dalam takhrij menempel.
  const referenced = new Set(links.map((l) => l.foot));
  const inlineMarkerNumbers = new Set(
    foot
      .filter((f) => f.line >= 0)
      .flatMap((f) => findFootnoteMarkers(f.text).map((m) => m.number)),
  );
  let orphanNotes = 0;
  let orphanNotesInInline = 0;
  foot.forEach((f, i) => {
    if (f.line >= 0 || referenced.has(i)) return;
    f.reasons.push("footnote_orphan");
    orphanNotes++;
    if (f.noteNumber !== null && inlineMarkerNumbers.has(f.noteNumber)) orphanNotesInInline++;
  });
  const markers = {
    total: findFootnoteMarkers(bodyText).length,
    body: refs.length,
    inline: foot
      .filter((f) => f.line >= 0)
      .reduce((a, f) => a + findFootnoteMarkers(f.text).length, 0),
  };

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
    orphanNotes,
    orphanNotesInInline,
    markers,
    inline,
    unknownTags: [...new Set([...clean.unknownTags, ...footClean.unknownTags])].sort(),
  };
}
