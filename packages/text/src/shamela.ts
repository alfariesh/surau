// Pembersih dan pemecah struktur halaman Shamela (`page.content`). Semua fungsi murni dan
// deterministik: input yang sama selalu menghasilkan `text_raw`, offset, dan tautan yang sama.
// Struktur yang dikenali (diperiksa di Ihya 9472 dan sampel ±200 kitab Shamela, 15 Okt 2026):
// paragraf dipisah `\r`; judul `<span data-type="title" id=toc-N>…</span>` (kutip ganda atau
// tunggal, kadang tanpa id); catatan kaki setelah satu baris garis bawah (Shamela: tepat 9 `_`),
// dengan penanda `(١)` berangka Arab-India. Membaca file Shamela sendiri dikerjakan di tools/ingest.

/** Rentang `[start, end)` di sebuah string. */
export interface Span {
  start: number;
  end: number;
}

export interface FootnoteSplit {
  /** Badan teks (matan) sebelum garis pemisah. */
  body: string;
  /** Teks catatan kaki sesudah garis pemisah ("" bila tidak ada). */
  footnotes: string;
  /** Offset awal `footnotes` di input (= panjang input bila tidak ada catatan kaki). */
  footStart: number;
}

// Satu baris berisi ≥5 garis bawah saja. Shamela memakai tepat 9; batas 5 menjaga dari variasi
// cetakan tanpa menangkap garis bawah di tengah kalimat.
const FOOTNOTE_RULE = /(?:^|\r\n?|\n)_{5,}[ \t]*(?:\r\n?|\n|$)/;

/** Pisahkan badan teks dan catatan kaki pada baris garis bawah pertama. */
export function splitFootnotes(content: string): FootnoteSplit {
  const m = FOOTNOTE_RULE.exec(content);
  if (m === null) return { body: content, footnotes: "", footStart: content.length };
  const footStart = m.index + m[0].length;
  return { body: content.slice(0, m.index), footnotes: content.slice(footStart), footStart };
}

export interface Paragraph extends Span {
  /** `source.slice(start, end)`: paragraf tanpa spasi di awal/akhir. */
  text: string;
}

/** Pecah teks per baris (`\r`, `\r\n`, atau `\n`). Baris kosong dilewati; offset menunjuk ke input. */
export function splitParagraphs(source: string): Paragraph[] {
  const out: Paragraph[] = [];
  for (const m of source.matchAll(/[^\r\n]+/g)) {
    const line = m[0];
    const lead = line.length - line.trimStart().length;
    const text = line.trim();
    if (text === "") continue;
    const start = m.index + lead;
    out.push({ start, end: start + text.length, text });
  }
  return out;
}

export interface TitleSpan extends Span {
  /** N dari `id=toc-N` (= Shamela `title.id`), atau `null` bila span judul tanpa id. */
  tocId: number | null;
  /** Teks judul (= `text.slice(start, end)` hasil pembersihan). */
  text: string;
}

export interface CleanedHtml {
  /** Teks tanpa tag; entitas HTML sudah diurai. Inilah dasar `text_raw`. */
  text: string;
  /** Posisi judul di `text` (span judul dibuang, isinya tetap). */
  titles: TitleSpan[];
}

const TAG = /<(\/?)([A-Za-z][A-Za-z0-9]*)([^>]*)>/g;
const TITLE_ATTR = /data-type\s*=\s*["']?title["']?|class\s*=\s*["']?title["']?/i;
const TOC_ID = /\bid\s*=\s*["']?toc-(\d+)/i;
const ENTITY = /&(?:#(\d{1,7})|#[xX]([0-9A-Fa-f]{1,6})|(amp|lt|gt|quot|apos|nbsp));/g;
const NAMED_ENTITY: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
};

function decodeEntities(s: string): string {
  return s.replace(ENTITY, (whole, dec?: string, hex?: string, named?: string) => {
    if (named !== undefined) return NAMED_ENTITY[named] ?? whole;
    const cp = Number.parseInt(dec ?? hex ?? "", dec !== undefined ? 10 : 16);
    return cp > 0 && cp <= 0x10ffff && (cp < 0xd800 || cp > 0xdfff)
      ? String.fromCodePoint(cp)
      : whole;
  });
}

/**
 * Bersihkan HTML Shamela secara deterministik menjadi teks mentah + posisi judul.
 *
 * - Span judul dibuang, isinya tetap; posisinya dicatat di `titles` (judul tetap bagian teks).
 * - `<br>` dan `<hr>` menjadi `\r` (batas paragraf); tag lain (`<span id="aya-N">`, `<img>`, dst.)
 *   dibuang tanpa sisa, termasuk gambar base64.
 * - Entitas `&amp; &lt; &gt; &quot; &apos; &nbsp;` dan entitas angka diurai.
 * Span bersarang ditangani dengan tumpukan; `</span>` yatim diabaikan; judul yang tidak ditutup
 * berakhir di akhir teks.
 */
export function cleanShamelaHtml(html: string): CleanedHtml {
  let text = "";
  const titles: TitleSpan[] = [];
  // Tumpukan span terbuka: indeks judul di `titles`, atau -1 untuk span biasa.
  const stack: number[] = [];
  let last = 0;
  for (const m of html.matchAll(TAG)) {
    text += decodeEntities(html.slice(last, m.index));
    last = m.index + m[0].length;
    const closing = m[1] === "/";
    const name = (m[2] as string).toLowerCase();
    const attrs = m[3] ?? "";
    if (name === "br" || name === "hr") {
      text += "\r";
    } else if (name === "span" && !closing) {
      if (TITLE_ATTR.test(attrs)) {
        const id = TOC_ID.exec(attrs)?.[1];
        titles.push({
          tocId: id === undefined ? null : Number(id),
          start: text.length,
          end: -1,
          text: "",
        });
        stack.push(titles.length - 1);
      } else {
        stack.push(-1);
      }
    } else if (name === "span" && closing) {
      const idx = stack.pop();
      const title = idx === undefined || idx < 0 ? undefined : titles[idx];
      if (title !== undefined) title.end = text.length;
    }
  }
  text += decodeEntities(html.slice(last));
  for (const t of titles) {
    if (t.end < 0) t.end = text.length;
    t.text = text.slice(t.start, t.end);
  }
  return { text, titles };
}

/** Judul-judul (span `data-type="title"`) dalam HTML halaman, dengan posisi di teks bersih. */
export function extractTitles(html: string): TitleSpan[] {
  return cleanShamelaHtml(html).titles;
}

// ---------------------------------------------------------------------------
// Penanda catatan kaki

export interface FootnoteMarker extends Span {
  /** Angka penanda (١٢ → 12). */
  number: number;
}

export interface Footnote extends Span {
  /** Angka penanda catatan kaki, atau `null` untuk teks sebelum penanda pertama. */
  number: number | null;
  /** `footnotes.slice(start, end)`: catatan kaki utuh termasuk penandanya, tanpa spasi tepi. */
  text: string;
}

export interface FootnoteLinks {
  /** Penanda di badan teks, urut posisi. */
  refs: FootnoteMarker[];
  /** Catatan kaki, urut posisi. */
  notes: Footnote[];
  /** Pasangan indeks `refs[ref]` → `notes[note]` (satu catatan bisa dirujuk lebih dari sekali). */
  links: { ref: number; note: number }[];
  /** Indeks `refs` yang tidak punya catatan kaki bernomor sama (masuk laporan validasi). */
  orphanRefs: number[];
  /** Indeks `notes` bernomor yang tidak pernah dirujuk dari badan teks. */
  orphanNotes: number[];
}

const MARKER = /\(\s*([\u0660-\u0669\u06F0-\u06F90-9]{1,4})\s*\)/g;

function parseDigits(digits: string): number {
  let n = 0;
  for (const ch of digits) {
    const code = ch.charCodeAt(0);
    const d = code >= 0x06f0 ? code - 0x06f0 : code >= 0x0660 ? code - 0x0660 : code - 0x30;
    n = n * 10 + d;
  }
  return n;
}

/** Semua penanda `(١)`/`(12)` di badan teks beserta posisinya. */
export function findFootnoteMarkers(body: string): FootnoteMarker[] {
  return [...body.matchAll(MARKER)].map((m) => ({
    number: parseDigits(m[1] as string),
    start: m.index,
    end: m.index + m[0].length,
  }));
}

/**
 * Pecah teks catatan kaki menjadi catatan bernomor. Catatan baru dimulai oleh penanda di awal
 * baris, atau oleh penanda bernomor *berikutnya yang diharapkan* di tengah baris (Shamela kadang
 * menulis beberapa catatan dalam satu baris). Baris tanpa penanda menyambung catatan sebelumnya.
 */
export function splitFootnoteEntries(footnotes: string): Footnote[] {
  const starts: { at: number; number: number | null }[] = [];
  let expected = 1;
  for (const m of footnotes.matchAll(MARKER)) {
    const number = parseDigits(m[1] as string);
    const lineStart = footnotes.slice(0, m.index).search(/[^\r\n]*$/);
    const atLineStart = footnotes.slice(lineStart, m.index).trim() === "";
    if (atLineStart || number === expected) {
      starts.push({ at: atLineStart ? lineStart : m.index, number });
      expected = number + 1;
    }
  }
  const firstAt = starts[0]?.at ?? footnotes.length;
  if (footnotes.slice(0, firstAt).trim() !== "") starts.unshift({ at: 0, number: null });

  const notes: Footnote[] = [];
  starts.forEach((s, i) => {
    const segEnd = starts[i + 1]?.at ?? footnotes.length;
    const seg = footnotes.slice(s.at, segEnd);
    const lead = seg.length - seg.trimStart().length;
    const text = seg.trim();
    if (text === "") return;
    const start = s.at + lead;
    notes.push({ number: s.number, start, end: start + text.length, text });
  });
  return notes;
}

/** Petakan penanda `(١)` di badan teks ke catatan kaki bernomor sama. */
export function linkFootnotes(body: string, footnotes: string): FootnoteLinks {
  const refs = findFootnoteMarkers(body);
  const notes = splitFootnoteEntries(footnotes);
  const byNumber = new Map<number, number>();
  notes.forEach((n, i) => {
    if (n.number !== null && !byNumber.has(n.number)) byNumber.set(n.number, i);
  });
  const links: { ref: number; note: number }[] = [];
  const orphanRefs: number[] = [];
  const used = new Set<number>();
  refs.forEach((r, i) => {
    const note = byNumber.get(r.number);
    if (note === undefined) {
      orphanRefs.push(i);
    } else {
      links.push({ ref: i, note });
      used.add(note);
    }
  });
  const orphanNotes = notes.flatMap((n, i) => (n.number !== null && !used.has(i) ? [i] : []));
  return { refs, notes, links, orphanRefs, orphanNotes };
}
