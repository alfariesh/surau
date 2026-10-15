// Verifikasi kutipan: dasar aturan "kode menyalin, model menunjuk". Kutipan (bervokal atau tidak)
// dicari di teks mentah setelah keduanya dinormalisasi; yang dikembalikan adalah substring MENTAH
// yang persis, beserta harakat aslinya. Itulah satu-satunya teks Arab yang boleh ditampilkan.

import { normalizeArabic, toRawSpan } from "./normalize.ts";
import type { Normalized } from "./normalize.ts";

export interface QuoteMatch {
  rawStart: number;
  rawEnd: number;
  /** `raw.slice(rawStart, rawEnd)`: teks sumber verbatim. */
  rawText: string;
}

export interface FindQuoteOptions {
  /**
   * Hasil `normalizeArabic(raw)` yang sudah ada, supaya halaman yang sama tidak dinormalisasi ulang.
   * Wajib dibuat dari `raw` yang SAMA dengan opsi default (kutipan juga dinormalisasi dengan default).
   */
  normalized?: Normalized;
}

/**
 * Cari kutipan di teks mentah. Kembalikan kecocokan pertama yang:
 * - mulai dan berakhir di batas kata (خير tidak cocok dengan خيرا), dan
 * - tidak mulai atau berakhir di tengah ekspansi satu karakter mentah (kutipan "الله عليه" tidak
 *   boleh "ditemukan" di dalam ﷺ, karena substring mentahnya akan berupa ﷺ utuh, bukan kutipan itu).
 *
 * `null` berarti kutipan tidak ada di sumber: jangan ditampilkan, catat ke log.
 */
export function findQuote(
  raw: string,
  quote: string,
  opts: FindQuoteOptions = {},
): QuoteMatch | null {
  const n = opts.normalized ?? normalizeArabic(raw);
  const lastAt = n.map.at(-1);
  if (n.map.length !== n.text.length || (lastAt !== undefined && lastAt >= raw.length)) {
    throw new TypeError("opts.normalized bukan hasil normalizeArabic dari teks mentah ini");
  }
  const q = normalizeArabic(quote).text;
  if (q === "") return null;
  const { text, map } = n;
  let from = 0;
  for (;;) {
    const start = text.indexOf(q, from);
    if (start === -1) return null;
    const end = start + q.length;
    const wordBoundary =
      (start === 0 || text[start - 1] === " ") && (end === text.length || text[end] === " ");
    // Token dipisah tepat satu spasi, jadi huruf terakhir token sebelumnya ada di start-2 dan huruf
    // pertama token sesudahnya di end+1. Bila asalnya karakter mentah yang sama, batas kata ini
    // hanya ada di dalam ekspansi (spasi di posisi itu juga bisa berasal dari karakter lain).
    const insideExpansion =
      (start >= 2 && map[start - 2] === map[start]) ||
      (end + 1 < text.length && map[end + 1] === map[end - 1]);
    if (wordBoundary && !insideExpansion) {
      const [rawStart, rawEnd] = toRawSpan(raw, n, start, end);
      return { rawStart, rawEnd, rawText: raw.slice(rawStart, rawEnd) };
    }
    from = start + 1;
  }
}
