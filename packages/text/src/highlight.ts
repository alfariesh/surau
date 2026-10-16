// Sorotan dan potongan hasil pencarian di TEKS MENTAH (S11). Indeks FTS contentless tidak bisa
// memakai highlight()/snippet(), jadi kecocokan dicari ulang di kode dengan aturan yang SAMA dengan
// indeks: `normalizeArabic(text_raw)` → token → `stemToken`, lalu frasa dari `FtsQueryPlan`. Rentang
// dipetakan ke teks mentah lewat `toRawSpan`, sehingga `text_raw.slice(start, end)` selalu substring
// persis teks sumber (dengan harakatnya), bukan teks buatan.

import type { FtsQueryPlan } from "./fts.ts";
import { normalizeArabic, toRawSpan } from "./normalize.ts";
import { stemToken } from "./stem.ts";

/** Rentang di teks mentah: `[start, end)` indeks string JS (UTF-16), sama dengan `footnote_refs`. */
export interface RawSpan {
  start: number;
  end: number;
}

/** Panjang potongan hasil pencarian (karakter mentah, termasuk harakat). */
export const SNIPPET_CHARS = 160;

interface Token {
  start: number;
  end: number;
  stem: string;
}

function tokens(text: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const space = text.indexOf(" ", i);
    const end = space < 0 ? text.length : space;
    out.push({ start: i, end, stem: stemToken(text.slice(i, end)) });
    i = end + 1;
  }
  return out;
}

/**
 * Semua kemunculan rencana kueri di `raw`, urut dan tidak tumpang tindih (kecocokan terpanjang
 * menang di setiap posisi), paling banyak `limit`. Satu kata cocok bila stem token sama dengan
 * salah satu frasa (atau diawali olehnya bila `plan.prefix`); frasa cocok bila token berturut-turut
 * sama. Rentang mentah mencakup harakat yang menempel; dua token dari satu karakter mentah (ﷺ)
 * menjadi satu rentang.
 */
export function findPlanSpans(
  raw: string,
  plan: FtsQueryPlan,
  limit: number = Number.POSITIVE_INFINITY,
): RawSpan[] {
  if (plan.phrases.length === 0 || limit <= 0) return [];
  const n = normalizeArabic(raw);
  const toks = tokens(n.text);
  const spans: RawSpan[] = [];
  const firstTokens = new Set(plan.phrases.map((p) => p[0]));
  let t = 0;
  while (t < toks.length && spans.length < limit) {
    let length = 0;
    const head = toks[t] as Token;
    if (plan.prefix || firstTokens.has(head.stem)) {
      for (const phrase of plan.phrases) {
        if (phrase.length <= length || t + phrase.length > toks.length) continue;
        const matches = phrase.every((want, k) => {
          const stem = (toks[t + k] as Token).stem;
          return plan.prefix && k === phrase.length - 1 ? stem.startsWith(want) : stem === want;
        });
        if (matches) length = phrase.length;
      }
    }
    if (length === 0) {
      t++;
      continue;
    }
    const [start, end] = toRawSpan(raw, n, head.start, (toks[t + length - 1] as Token).end);
    const last = spans.at(-1);
    if (last !== undefined && start < last.end) last.end = Math.max(last.end, end);
    else spans.push({ start, end });
    t += length;
  }
  return spans;
}

const isSpace = (ch: string | undefined): boolean => ch !== undefined && /\s/u.test(ch);

/**
 * Potongan ±`size` karakter teks mentah di sekitar `focus` (biasanya sorotan pertama), dipotong di
 * batas spasi supaya tidak pernah memutus kata, pasangan surrogate, atau harakat dari hurufnya.
 * `focus` selalu utuh di dalam potongan meski lebih panjang dari `size`. Tanpa `focus`: awal teks.
 */
export function snippetSpan(
  raw: string,
  focus: RawSpan | undefined,
  size: number = SNIPPET_CHARS,
): RawSpan {
  const f = focus ?? { start: 0, end: 0 };
  if (f.start < 0 || f.end > raw.length || f.start > f.end) {
    throw new RangeError(`rentang fokus tidak valid: [${f.start}, ${f.end}) dari ${raw.length}`);
  }
  if (raw.length <= size) return trim(raw, { start: 0, end: raw.length }, f);
  const want = Math.max(size, f.end - f.start);
  let start = Math.max(0, f.start - Math.floor((want - (f.end - f.start)) / 2));
  let end = Math.min(raw.length, start + want);
  start = Math.max(0, end - want);

  // Awal: maju ke kata berikutnya (potongan memendek); bila itu melewati fokus, mundur ke awal kata.
  if (start > 0 && !isSpace(raw[start - 1])) {
    let s = start;
    while (s < f.start && !isSpace(raw[s - 1])) s++;
    if (s >= f.start && !isSpace(raw[s - 1])) {
      s = start;
      while (s > 0 && !isSpace(raw[s - 1])) s--;
    }
    start = s;
  }
  // Akhir: mundur ke akhir kata sebelumnya; bila itu memotong fokus, maju ke akhir kata.
  if (end < raw.length && !isSpace(raw[end])) {
    let e = end;
    while (e > f.end && !isSpace(raw[e])) e--;
    if (e <= f.end && !isSpace(raw[e])) {
      e = end;
      while (e < raw.length && !isSpace(raw[e])) e++;
    }
    end = e;
  }
  return trim(raw, { start, end }, f);
}

/** Buang spasi di kedua ujung potongan tanpa memotong fokus. */
function trim(raw: string, span: RawSpan, focus: RawSpan): RawSpan {
  let { start, end } = span;
  while (start < Math.min(end, focus.start) && isSpace(raw[start])) start++;
  while (end > Math.max(start, focus.end) && isSpace(raw[end - 1])) end--;
  return { start, end };
}
