// Gerbang QA ADR-018: matan Shamela lokal harus identik dengan rilis OpenITI berlisensi (versi
// Shamela0009472), dan setiap takhrij Shamela dicek silang dengan takhrij di JK000001.
// Perbandingan dilakukan per halaman cetak (juz, halaman) setelah `normalizeArabic`.
import { normalizeArabic } from "@surau/text";

import type { ParsedPage } from "../shamela/page.ts";
import { bigramContainment, tokenRatio } from "../similarity.ts";
import type { OpenitiPage } from "./markdown.ts";

/** Ambang gerbang matan (ADR-018): kemiripan per halaman. */
export const MATAN_THRESHOLD = 0.95;
/** Ambang cocok takhrij: bagian bigram catatan yang ditemukan di satu segmen takhrij JK. */
export const TAKHRIJ_THRESHOLD = 0.6;
/** Catatan dengan token sesedikit ini tidak bisa dicek (mis. hanya "(٢) حديث"). */
const MIN_TAKHRIJ_TOKENS = 3;

// Penanda segmen takhrij JK setelah normalisasi: dibuka "حديث" atau menyebut sumber/sanadnya.
const TAKHRIJ_WORDS = new Set(["اخرجه", "اخرجاه", "رواه", "متفق", "باسناد", "بسند", "اسناده"]);

export function tokens(text: string): string[] {
  return normalizeArabic(text)
    .text.split(" ")
    .filter((t) => t !== "");
}

function pageKey(volume: number, page: number): string {
  return `${volume}:${page}`;
}

/** Segmen takhrij JK di satu halaman: potongan di antara ` + ` yang berbentuk takhrij. */
export function jkTakhrijSegments(pageText: string): string[][] {
  return pageText
    .split("+")
    .map(tokens)
    .filter((t) => t.length > 0 && (t[0] === "حديث" || t.some((w) => TAKHRIJ_WORDS.has(w))));
}

export interface MatanCheck {
  /** Kemiripan per halaman (urutan `pages`); 0 bila halaman tidak ada di OpenITI. */
  ratios: number[];
  /** Halaman Shamela yang tidak punya pasangan di OpenITI. */
  missing: number[];
  passed: number;
}

export function checkMatan(
  pages: readonly ParsedPage[],
  openiti: readonly OpenitiPage[],
): MatanCheck {
  const byKey = new Map(openiti.map((p) => [pageKey(p.volume, p.page), p.text]));
  const missing: number[] = [];
  const ratios = pages.map((p, i) => {
    const other = byKey.get(pageKey(p.source.juz, p.source.pageNo));
    if (other === undefined) {
      missing.push(i);
      return 0;
    }
    const a = tokens(p.bodyText);
    const b = tokens(other);
    return tokenRatio(a, b, Math.ceil((a.length + b.length) / 2));
  });
  return { ratios, missing, passed: ratios.filter((r) => r >= MATAN_THRESHOLD).length };
}

export interface TakhrijCheck {
  /** Skor per catatan kaki: `scores[halaman][catatan]` (0..1). */
  scores: number[][];
  /** Jumlah catatan di bawah ambang (ditandai `takhrij_unmatched`). */
  unmatched: number;
  total: number;
}

export function checkTakhrij(
  pages: readonly ParsedPage[],
  jk: readonly OpenitiPage[],
): TakhrijCheck {
  const byKey = new Map(jk.map((p) => [pageKey(p.volume, p.page), p.text]));
  let unmatched = 0;
  let total = 0;
  const scores = pages.map((p) => {
    const segments = jkTakhrijSegments(byKey.get(pageKey(p.source.juz, p.source.pageNo)) ?? "");
    return p.foot.map((f) => {
      const t = tokens(f.text);
      const score =
        t.length < MIN_TAKHRIJ_TOKENS
          ? 0
          : Math.max(0, ...segments.map((s) => bigramContainment(t, s)));
      total++;
      if (score < TAKHRIJ_THRESHOLD) unmatched++;
      return score;
    });
  });
  return { scores, unmatched, total };
}
