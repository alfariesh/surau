"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { keepReadingPosition } from "../../lib/keep-position";
import { rangesFor } from "../../lib/text-ranges";
import { SUMMARY_OPEN_EVENT, isHidden, revealFor } from "../../lib/reader/fold";

// Sorotan kata yang dicari saat pembaca dibuka dari hasil Cari (`?q=`, S14 langkah 7). Halaman
// baca adalah ISR statis, jadi kueri dibaca di klien (`useSearchParams`, di dalam Suspense) dan sorotan memakai CSS Custom Highlight API
// (Range di atas teks yang sudah ada): DOM dan teks kitab tidak diubah sama sekali. Bagian Arab
// kueri dicocokkan di teks Arab paragraf (`findPlanSpans`, aturan yang sama dengan indeks); bagian
// Indonesia di teks terjemahan AI (`[data-ai-text]`) dan Ringkasan AI (`[data-tr-seg="summary"]`,
// X14), `findLatinSpans`. @surau/text dimuat hanya
// bila ada `?q=`. Browser tanpa Highlight API: tanpa sorotan (paragraf tujuan tetap ditandai :target).
// Kecocokan di teks yang tersembunyi mode baca atau lipatan dibuka per paragraf (X11), tanpa
// menggeser paragraf yang sedang dibaca; ringkasan yang cocok dibuka sementara di mode Arab dan
// dibuka penuh bila kecocokannya di bagian yang terpotong (X14).

const HIGHLIGHT = "surau-cari";

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
      // Ringkasan AI yang cocok (X14), untuk dibuka bila kecocokannya di bagian yang terpotong.
      const summaries = new Map<Element, Range[]>();
      if (latin !== null) {
        for (const el of document.querySelectorAll('[data-ai-text], [data-tr-seg="summary"]')) {
          const found = rangesFor(el, text.findLatinSpans(el.textContent ?? "", latin, 50));
          collect(el, found);
          if (found.length > 0 && el.matches('[data-tr-seg="summary"]')) summaries.set(el, found);
        }
      }
      // Satu kali jaga posisi untuk semua yang dibuka: paragraf tujuan tidak terdorong. Satu elemen
      // per paragraf atau ringkasan (kecocokan bisa puluhan per blok).
      const perBlock = new Map(
        hidden.map((el) => [el.closest(".passage, .section-summary") ?? el, el]),
      );
      if (perBlock.size > 0 || summaries.size > 0) {
        keepReadingPosition(() => {
          perBlock.forEach((el) => revealFor(el));
          // Diukur sesudah dibuka sementara (sebelumnya tanpa kotak di mode Arab).
          summaries.forEach((found, el) => {
            const bottom = el.getBoundingClientRect().bottom;
            if (found.some((r) => r.getBoundingClientRect().bottom > bottom + 1)) {
              el.closest(".section-summary")?.dispatchEvent(new Event(SUMMARY_OPEN_EVENT));
            }
          });
        });
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
