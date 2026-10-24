"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { keepReadingPosition } from "../../lib/keep-position";
import { isHidden, revealFor } from "../../lib/reader/fold";

// Sorotan kata yang dicari saat pembaca dibuka dari hasil Cari (`?q=`, S14 langkah 7). Halaman
// baca adalah ISR statis, jadi kueri dibaca di klien (`useSearchParams`, di dalam Suspense) dan sorotan memakai CSS Custom Highlight API
// (Range di atas teks yang sudah ada): DOM dan teks kitab tidak diubah sama sekali. Bagian Arab
// kueri dicocokkan di teks Arab paragraf (`findPlanSpans`, aturan yang sama dengan indeks); bagian
// Indonesia di teks terjemahan AI (`[data-ai-text]`, `findLatinSpans`). @surau/text dimuat hanya
// bila ada `?q=`. Browser tanpa Highlight API: tanpa sorotan (paragraf tujuan tetap ditandai :target).
// Kecocokan di teks yang tersembunyi mode baca atau lipatan dibuka per paragraf (X11), tanpa
// menggeser paragraf yang sedang dibaca.

const HIGHLIGHT = "surau-cari";

interface Span {
  start: number;
  end: number;
}

/** Range untuk rentang di gabungan teks node-node teks `root` (urut dokumen). */
function rangesFor(root: Element, spans: readonly Span[]): Range[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: { node: Text; start: number }[] = [];
  let length = 0;
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    const text = n as Text;
    nodes.push({ node: text, start: length });
    length += text.data.length;
  }
  const at = (pos: number): [Text, number] | null => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const item = nodes[i];
      if (item !== undefined && item.start <= pos) return [item.node, pos - item.start];
    }
    return null;
  };
  return spans.flatMap((s) => {
    const a = at(s.start);
    const b = at(s.end);
    if (a === null || b === null) return [];
    const range = document.createRange();
    range.setStart(a[0], Math.min(a[1], a[0].data.length));
    range.setEnd(b[0], Math.min(b[1], b[0].data.length));
    return [range];
  });
}

export function SearchHighlighter() {
  const query = useSearchParams().get("q")?.trim() ?? "";
  useEffect(() => {
    if (query === "" || typeof CSS === "undefined" || !("highlights" in CSS)) return;
    let cancelled = false;
    void import("@surau/text").then((text) => {
      if (cancelled) return;
      const arabicPart = query.replace(/[\p{Script=Latin}0-9]/gu, " ");
      const latinPart = query.replace(/\p{Script=Arabic}/gu, " ");
      let arabic = null;
      let latin = null;
      try {
        arabic = text.planFtsQuery(arabicPart);
        latin = text.planLatinQuery(latinPart);
      } catch {
        return;
      }
      const ranges: Range[] = [];
      // Teks cocok yang tersembunyi mode baca atau lipatan (X11): dibuka supaya sorotannya terlihat.
      const hidden: Element[] = [];
      // Diperiksa per kecocokan (bukan per blok): di mode Terjemahan blok Arab bersubjudul tetap
      // tampil (subjudulnya) sementara paragraf di dalamnya terlipat.
      const collect = (el: Element, found: Range[]) => {
        ranges.push(...found);
        for (const range of found) {
          const at = range.startContainer.parentElement ?? el;
          if (isHidden(at)) hidden.push(at);
        }
      };
      if (arabic !== null) {
        for (const el of document.querySelectorAll(".passage .arabic-text")) {
          collect(el, rangesFor(el, text.findPlanSpans(el.textContent ?? "", arabic, 50)));
        }
      }
      if (latin !== null) {
        for (const el of document.querySelectorAll("[data-ai-text]")) {
          collect(el, rangesFor(el, text.findLatinSpans(el.textContent ?? "", latin, 50)));
        }
      }
      // Satu kali jaga posisi untuk semua paragraf yang dibuka: paragraf tujuan tidak terdorong. Satu
      // elemen per paragraf (kecocokan bisa puluhan per blok).
      const perPassage = new Map(hidden.map((el) => [el.closest(".passage") ?? el, el]));
      if (perPassage.size > 0) {
        keepReadingPosition(() => perPassage.forEach((el) => revealFor(el)));
      }
      if (ranges.length > 0) CSS.highlights.set(HIGHLIGHT, new Highlight(...ranges));
    });
    return () => {
      cancelled = true;
      if (typeof CSS !== "undefined" && "highlights" in CSS) CSS.highlights.delete(HIGHLIGHT);
    };
  }, [query]);
  return null;
}
