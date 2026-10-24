"use client";

import type { DigestTeaser } from "../../lib/reader/digest";
import type { ReaderSample } from "../../lib/reader/preview";

import { ProgressCircle } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { LeftToRightListBullet, TextFont } from "../../icons";
import { reader as readerText } from "../../i18n/id/reader";
import { readerPageFor, subscribeReaderPage } from "../../lib/reader/reader-page-event";
import { ArabicInline } from "../arabic";
import { useHeaderMenuAction, useHeaderMenuReadMode } from "../shell/header-menu";
import { NavbarSlot } from "../shell/navbar-slot";
import { useUnderNavbar } from "../shell/use-under-navbar";

import { preloadPanel, ReaderStyle } from "./reader-style";

const t = readerText;

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
 * "Buka Intisari bagian ini" (atau "… kitab ini" bila yang terdekat Intisari Kitab) di menu ⋮
 * navbar (X16): hanya terpasang selama bagian yang sedang dibaca punya Intisari terdekat.
 */
function DigestMenuAction({ digest }: { digest: DigestTeaser }) {
  const router = useRouter();
  useHeaderMenuAction({
    label: digest.tier === "book" ? t.intisariOpenBook : t.intisariOpenSection,
    icon: LeftToRightListBullet,
    onPress: () => router.push(digest.href),
  });
  return null;
}

/**
 * Judul ringkas pembaca di navbar: saat judul besar halaman tergulir keluar, navbar beralih mulus
 * dari judul "Kitab" ke lingkar progres + juz/halaman + nama bab. Panel Tampilan dibuka dari
 * menu ⋮ navbar (selalu terjangkau, juga sebelum judul tergulir).
 */
export function ReaderCompactHeader({
  juz,
  page,
  bab,
  digest,
  sample,
  scope,
}: {
  juz: number;
  page: number;
  /** Judul bab terdalam (teks DB) atau null. */
  bab: string | null;
  /** Intisari terdekat dari bagian halaman ini (X16: menu ⋮), atau null. */
  digest: DigestTeaser | null;
  sample: ReaderSample;
  /** Permalink halaman baca: navbar mengikuti halaman sambungan yang sedang dibaca (X04 W6). */
  scope: string;
}) {
  const visible = useUnderNavbar("[data-reader-title]");
  const [progress, setProgress] = useState(0);
  const [styleOpen, setStyleOpen] = useState(false);
  // Mode baca berlaku di halaman ini: pilihannya ikut tampil di menu ⋮ (X11).
  useHeaderMenuReadMode();
  useHeaderMenuAction({
    label: t.style,
    icon: TextFont,
    onPress: () => {
      preloadPanel();
      setStyleOpen(true);
    },
  });
  const live = useSyncExternalStore(
    subscribeReaderPage,
    () => readerPageFor(scope),
    () => null,
  );
  const at = live ?? { juz, page, bab };
  const currentDigest = live === null ? digest : live.digest;

  useEffect(() => {
    const text =
      document.querySelector(`.reader-text[data-page="${at.juz}/${at.page}"]`) ??
      document.querySelector(".reader-text");
    if (text === null) return;

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
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [at.juz, at.page]);

  return (
    <>
      {currentDigest !== null ? <DigestMenuAction digest={currentDigest} /> : null}
      <NavbarSlot>
        <div
          aria-hidden={visible ? undefined : true}
          className="navbar-compact flex min-w-0 items-center gap-2.5"
          data-visible={visible}
          inert={!visible}
        >
          <ProgressCircle
            aria-label={t.progressLabel}
            className="shrink-0"
            size="sm"
            value={progress}
          >
            <ProgressCircle.Track>
              <ProgressCircle.TrackCircle />
              <ProgressCircle.FillCircle />
            </ProgressCircle.Track>
          </ProgressCircle>
          <span className="text-foreground shrink-0 text-sm font-medium tabular-nums sm:text-base">
            <span className="sm:hidden">{t.pageShort(at.juz, at.page)}</span>
            <span className="hidden sm:inline">{t.pageHeading(at.juz, at.page)}</span>
          </span>
          {at.bab ? (
            <span className="text-muted hidden min-w-0 truncate text-sm md:inline">
              <ArabicInline>{at.bab}</ArabicInline>
            </span>
          ) : null}
        </div>
      </NavbarSlot>
      <ReaderStyle isOpen={styleOpen} sample={sample} onOpenChange={setStyleOpen} />
    </>
  );
}
