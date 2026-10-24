"use client";

import { useEffect } from "react";

import { saveLastRead } from "../../lib/reader/last-read";

/** Batas atas area baca (di bawah navbar 4rem + sedikit ruang). */
const TOP = 96;

/**
 * Mencatat posisi baca terakhir (X04 W5) di browser: halaman cetak + paragraf teratas yang terlihat,
 * termasuk halaman sambungan gulir bersambung (setiap teks halaman membawa `data-page="juz/hal"`).
 * Disimpan saat halaman dibuka, paling sering sekali per 1,5 detik saat menggulir, dan saat tab
 * ditinggalkan. Tanpa server dan tanpa cookie.
 */
export function ReadingTracker({ work, title }: { work: string; title: string }) {
  useEffect(() => {
    let timer = 0;
    function record() {
      timer = 0;
      const passages = document.querySelectorAll<HTMLElement>(".reader-text .passage[id^='p']");
      let current: HTMLElement | null = null;
      for (const p of passages) {
        if (p.getBoundingClientRect().bottom > TOP) {
          current = p;
          break;
        }
      }
      const pageEl = (current ?? passages[0])?.closest<HTMLElement>("[data-page]");
      const [juz, page] = (pageEl?.dataset.page ?? "").split("/").map(Number);
      if (
        juz === undefined ||
        page === undefined ||
        !Number.isInteger(juz) ||
        !Number.isInteger(page)
      ) {
        return;
      }
      saveLastRead({ work, title, juz, page, anchor: current?.id ?? null, at: Date.now() });
    }
    function schedule() {
      if (timer === 0) timer = window.setTimeout(record, 1500);
    }
    function onHide() {
      if (document.visibilityState === "hidden") record();
    }
    record();
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    document.addEventListener("visibilitychange", onHide);
    return () => {
      if (timer !== 0) window.clearTimeout(timer);
      window.removeEventListener("scroll", schedule, { capture: true });
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [work, title]);
  return null;
}
