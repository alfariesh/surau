"use client";

import { ProgressCircle } from "@heroui/react";
import { useEffect, useState } from "react";

import { id } from "../../i18n/id";
import { ArabicInline } from "../arabic";
import { NavbarSlot } from "../shell/navbar-slot";

import { ReaderStyle } from "./reader-style";

const t = id.reader;

/**
 * Posisi baca 0–100 di dalam teks halaman: 0 saat awal teks di atas layar, 100 saat akhir teks
 * sudah terlihat. Dihitung dari posisi elemen (bukan wadah gulir), jadi berlaku untuk window
 * maupun wadah gulir AppLayout.
 */
function readProgress(text: Element): number {
  const rect = text.getBoundingClientRect();
  const total = rect.height - window.innerHeight * 0.5;
  if (total <= 0) return rect.top <= 0 ? 100 : 0;
  return Math.round(Math.min(1, Math.max(0, -rect.top / total)) * 100);
}

/**
 * Judul ringkas pembaca di navbar: saat judul besar halaman tergulir keluar, navbar beralih mulus
 * dari judul "Kitab" ke lingkar progres + juz/halaman + nama bab, dengan tombol Tampilan.
 */
export function ReaderCompactHeader({
  juz,
  page,
  bab,
  sample,
}: {
  juz: number;
  page: number;
  /** Judul bab terdalam (teks DB) atau null. */
  bab: string | null;
  sample: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const title = document.querySelector("[data-reader-title]");
    const text = document.querySelector(".reader-text");
    if (title === null || text === null) return;

    // Batas atas = bawah navbar (4rem): judul dianggap tergulir saat masuk ke balik navbar.
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry !== undefined && !entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(title);

    let frame = 0;
    function update() {
      frame = 0;
      if (text !== null) setProgress(readProgress(text));
    }
    function schedule() {
      if (frame === 0) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      observer.disconnect();
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <NavbarSlot>
      <div
        aria-hidden={visible ? undefined : true}
        className="reader-compact flex min-w-0 items-center gap-2.5"
        data-visible={visible}
        inert={!visible}
      >
        <ProgressCircle aria-label={t.progressLabel} className="shrink-0" value={progress}>
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <span className="text-foreground shrink-0 text-sm font-medium tabular-nums sm:text-base">
          <span className="sm:hidden">{t.pageShort(juz, page)}</span>
          <span className="hidden sm:inline">{t.pageHeading(juz, page)}</span>
        </span>
        {bab ? (
          <span className="text-muted hidden min-w-0 truncate text-sm md:inline">
            <ArabicInline>{bab}</ArabicInline>
          </span>
        ) : null}
        <ReaderStyle iconOnly className="ms-auto shrink-0" sample={sample} />
      </div>
    </NavbarSlot>
  );
}
