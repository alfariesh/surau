"use client";

import type { Location } from "@surau/core";

import { Button, Spinner, Typography } from "@heroui/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { id } from "../../i18n/id";
import type { PageData } from "../../lib/reader/page-handler";
import { announceReaderPage } from "../../lib/reader/reader-page-event";

import { PageNav } from "./page-nav";

const t = id.reader;

// Gulir bersambung (X04 W6): di akhir halaman cetak, halaman berikutnya dimuat di bawahnya (JSON
// /api/halaman, dirender komponen yang sama dengan halaman server). URL dan judul tab diganti ke
// halaman yang sedang dibaca (history.replaceState), jadi permalink, sitasi, dan "Lanjutkan
// membaca" tetap per halaman cetak. Komponen render halaman sambungan dimuat malas (bukan JS awal
// halaman), dan hanya bila pembaca benar-benar sampai di akhir halaman.

const ContinuousPages = dynamic(() => import("./continuous-pages").then((m) => m.ContinuousPages));

/** Halaman yang dimuat otomatis saat menggulir; sesudahnya lewat tombol (DOM tidak tumbuh tanpa batas). */
const AUTO_PAGES = 5;
/** Muat sebelum benar-benar sampai di akhir (±1,5 layar). */
const PRELOAD_MARGIN = "0px 0px 150% 0px";

type Status = "idle" | "loading" | "error" | "rate";

interface First {
  juz: number;
  page: number;
  prev: Location | null;
  next: Location | null;
  bab: string | null;
  activeIds: number[];
}

const IGNORE =
  'input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"], [role="listbox"], [role="treegrid"], [role="slider"]';

export function ContinuousReader({
  segment,
  workTitle,
  first,
  footNote,
}: {
  /** Segmen karya kanonis (`ihya`). */
  segment: string;
  workTitle: string;
  first: First;
  footNote?: { heading: string; lead: string };
}) {
  const router = useRouter();
  const [pages, setPages] = useState<PageData[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const sentinel = useRef<HTMLDivElement>(null);
  const loading = useRef(false);
  const initialUrl = useRef<string | null>(null);
  const current = useRef({ juz: first.juz, page: first.page });

  const last = pages.at(-1)?.model;
  const next = last ? last.next : first.next;
  const auto = pages.length < AUTO_PAGES;

  const load = useCallback(async () => {
    if (loading.current || next === null) return;
    loading.current = true;
    setStatus("loading");
    try {
      const res = await fetch(
        `/api/halaman?work=${encodeURIComponent(segment)}&juz=${next.juz}&page=${next.page_no}`,
      );
      if (res.status === 429) {
        setStatus("rate");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data = (await res.json()) as PageData;
      setPages((list) =>
        list.some((p) => p.model.permalink === data.model.permalink) ? list : [...list, data],
      );
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      loading.current = false;
    }
  }, [next, segment]);

  // Muat otomatis saat penanda di akhir teks mendekati layar.
  useEffect(() => {
    const el = sentinel.current;
    if (el === null || next === null || !auto || status !== "idle") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void load();
      },
      { rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [auto, load, next, status]);

  // Halaman yang sedang dibaca = teks halaman yang melewati garis 30% tinggi layar.
  useEffect(() => {
    if (pages.length === 0) return;
    initialUrl.current ??= `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const info = new Map<string, First>([
      [`${first.juz}/${first.page}`, first],
      ...pages.map(
        (p) =>
          [
            `${p.model.juz}/${p.model.pageNo}`,
            {
              juz: p.model.juz,
              page: p.model.pageNo,
              prev: p.model.prev,
              next: p.model.next,
              bab: p.bab,
              activeIds: p.activeIds,
            },
          ] as const,
      ),
    ]);
    const permalinks = new Map(
      pages.map((p) => [`${p.model.juz}/${p.model.pageNo}`, p.model.permalink]),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const key = (entry.target as HTMLElement).dataset.page ?? "";
          const page = info.get(key);
          if (page === undefined) continue;
          if (current.current.juz === page.juz && current.current.page === page.page) continue;
          current.current = { juz: page.juz, page: page.page };
          const url = permalinks.get(key) ?? initialUrl.current;
          if (url) window.history.replaceState(null, "", url);
          document.title = `${t.pageMetaTitle(page.bab, workTitle, page.juz, page.page)} · ${id.meta.siteName}`;
          announceReaderPage({
            juz: page.juz,
            page: page.page,
            bab: page.bab,
            activeIds: page.activeIds,
          });
        }
      },
      { rootMargin: "-30% 0px -70% 0px" },
    );
    for (const el of document.querySelectorAll(".reader-text[data-page]")) observer.observe(el);
    return () => observer.disconnect();
  }, [first, pages, workTitle]);

  // ← / → membalik halaman relatif terhadap halaman yang sedang dibaca (arah kitab Arab).
  useEffect(() => {
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
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const { juz, page } = current.current;
      const info =
        juz === first.juz && page === first.page
          ? first
          : pages.find((p) => p.model.juz === juz && p.model.pageNo === page)?.model;
      const to = event.key === "ArrowLeft" ? info?.next : info?.prev;
      if (to === null || to === undefined) return;
      event.preventDefault();
      router.push(to.permalink);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [first, pages, router]);

  return (
    <>
      {pages.length > 0 ? <ContinuousPages footNote={footNote} pages={pages} /> : null}
      <div ref={sentinel} aria-hidden="true" className="h-px" />
      {status === "loading" ? (
        <output className="text-muted flex items-center gap-2 text-sm">
          <Spinner size="sm" />
          {t.loadingNext}
        </output>
      ) : null}
      {status === "error" || status === "rate" ? (
        <div className="flex flex-wrap items-center gap-3" role="alert">
          <Typography color="muted" type="body-sm">
            {status === "rate" ? t.loadNextRate : t.loadNextFailed}
          </Typography>
          <Button size="sm" variant="secondary" onPress={() => void load()}>
            {t.loadNextRetry}
          </Button>
        </div>
      ) : null}
      {status === "idle" && !auto && next !== null ? (
        <div>
          <Button size="sm" variant="secondary" onPress={() => void load()}>
            {t.loadNext}
          </Button>
        </div>
      ) : null}
      {/* Navigasi halaman di akhir: Sebelumnya = sebelum halaman pertama, Berikutnya = sesudah
          halaman terakhir yang dimuat. Pintasan ←/→ dipasang di atas, relatif ke halaman terbaca. */}
      <div className="flex flex-col gap-2">
        <PageNav next={next} prev={first.prev} />
        <Typography color="muted" type="body-xs">
          {t.keyboardHint}
        </Typography>
      </div>
    </>
  );
}
