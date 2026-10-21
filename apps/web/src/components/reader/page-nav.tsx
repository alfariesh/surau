"use client";

import type { Location } from "@surau/core";

import { ChevronLeft, ChevronRight } from "../../icons";
import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { id } from "../../i18n/id";

const t = id.reader;

// Navigasi halaman cetak. Kitab Arab dibaca dari kanan ke kiri, jadi halaman BERIKUTNYA ada di
// kiri (← / ArrowLeft) dan SEBELUMNYA di kanan (→ / ArrowRight), sama seperti membalik kitab.
// Tombol panah diabaikan saat fokus di kolom isian, menu, dialog, atau pohon daftar isi.

const IGNORE =
  'input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"], [role="listbox"], [role="treegrid"], [role="slider"]';

export function PageNav({
  prev,
  next,
  keyboard = false,
  shortcuts = keyboard,
  label = t.pageNavLabel,
}: {
  prev: Location | null;
  next: Location | null;
  /** Pasang pintasan ←/→ (cukup sekali per halaman). */
  keyboard?: boolean;
  /** Umumkan pintasan ←/→ (aria-keyshortcuts) walau pendengarnya dipasang komponen lain. */
  shortcuts?: boolean;
  label?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!keyboard) return;
    function onKey(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(IGNORE)) return;
      const to = event.key === "ArrowLeft" ? next : event.key === "ArrowRight" ? prev : null;
      if (to === null) return;
      event.preventDefault();
      router.push(to.permalink);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keyboard, next, prev, router]);

  return (
    <nav aria-label={label} className="flex items-stretch justify-between gap-3">
      {next ? (
        <NextLink
          aria-keyshortcuts={shortcuts ? "ArrowLeft" : undefined}
          // Nomor halaman tidak ditampilkan (lebih bersih), tetapi tetap dibacakan.
          aria-label={`${t.nextShort} (${t.pageShort(next.juz, next.page_no)})`}
          className={buttonVariants({ variant: "secondary", className: "min-w-0 gap-1" })}
          href={next.permalink}
          rel="next"
        >
          <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
          {t.nextShort}
        </NextLink>
      ) : (
        <span />
      )}
      {prev ? (
        <NextLink
          aria-keyshortcuts={shortcuts ? "ArrowRight" : undefined}
          aria-label={`${t.prevShort} (${t.pageShort(prev.juz, prev.page_no)})`}
          className={buttonVariants({ variant: "secondary", className: "min-w-0 gap-1" })}
          href={prev.permalink}
          rel="prev"
        >
          {t.prevShort}
          <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
        </NextLink>
      ) : (
        <span />
      )}
    </nav>
  );
}
