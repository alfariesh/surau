"use client";

import type { ReactNode } from "react";

import type { CiteParts } from "../../lib/reader/cite";

import { toast } from "@heroui/react";
import { createContext, use, useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { id } from "../../i18n/id";
import { copyRich } from "../../lib/clipboard";
import { citeForPath, citeHtml, citeText, escapeHtml } from "../../lib/reader/cite";
import { readerPageFor, subscribeReaderPage } from "../../lib/reader/reader-page-event";

import { FeedbackDialog } from "./feedback-dialog";

const t = id.reader;

/** Paragraf yang dilaporkan / disalin sitasinya. */
export interface PassageRef {
  id: number;
  /** Label lokasi singkat untuk dialog, mis. "j. 1, h. 200 · paragraf p2826". */
  label: string;
  /** Permalink paragraf (path + `#pN`). */
  permalink: string;
}

interface ReaderContextValue {
  /** Salin sitasi untuk path ini (halaman atau paragraf); origin = situs yang sedang dibuka. */
  copyCitation: (permalink: string) => Promise<void>;
  /**
   * Bagikan tautan path ini: lembar bagi bawaan di perangkat sentuh (`navigator.share`), selain itu
   * salin URL-nya ke papan klip.
   */
  shareLink: (permalink: string) => Promise<void>;
  openReport: (passage: PassageRef | null) => void;
}

const ReaderContext = createContext<ReaderContextValue | null>(null);

export function useReader(): ReaderContextValue {
  const value = use(ReaderContext);
  if (value === null) throw new Error("useReader di luar ReaderProvider");
  return value;
}

export function ReaderProvider({
  cite,
  pagePath,
  children,
}: {
  cite: CiteParts;
  /** Permalink halaman tanpa fragmen (`/kitab/ihya/1/200`), disimpan bersama laporan. */
  pagePath: string;
  children: ReactNode;
}) {
  // `round` naik setiap dialog dibuka: FeedbackDialog dipasang ulang dengan formulir kosong.
  const [report, setReport] = useState<{
    open: boolean;
    passage: PassageRef | null;
    round: number;
  }>({
    open: false,
    passage: null,
    round: 0,
  });

  const copyCitation = useCallback(
    async (permalink: string) => {
      // Origin dari situs yang sedang dibuka: tautan Preview tetap menunjuk Preview-nya.
      const url = new URL(permalink, window.location.origin).href;
      try {
        // Juz/halaman dari permalink: paragraf halaman sambungan disitasi dengan halamannya sendiri.
        const parts = citeForPath(cite, permalink);
        await copyRich(citeText(parts, url), citeHtml(parts, url));
        toast.success(t.copied, { description: t.copiedDescription });
      } catch {
        toast.danger(t.copyFailed, { description: t.copyFailedDescription });
      }
    },
    [cite],
  );

  const shareLink = useCallback(async (permalink: string) => {
    const url = new URL(permalink, window.location.origin).href;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && typeof navigator.share === "function") {
      try {
        await navigator.share({ url });
        return;
      } catch (error) {
        // Dibatalkan pengguna: selesai. Gagal karena hal lain: salin tautannya saja.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      const href = escapeHtml(url);
      await copyRich(url, `<a href="${href}">${href}</a>`);
      toast.success(t.linkCopied, { description: t.linkCopiedDescription });
    } catch {
      toast.danger(t.copyFailed, { description: t.copyFailedDescription });
    }
  }, []);

  // Laporan untuk seluruh halaman memakai halaman yang sedang dibaca (gulir bersambung, X04 W6).
  const readingPath = useSyncExternalStore(
    subscribeReaderPage,
    () => readerPageFor(pagePath)?.permalink ?? pagePath,
    () => pagePath,
  );

  const value = useMemo<ReaderContextValue>(
    () => ({
      copyCitation,
      shareLink,
      openReport: (passage) => setReport((r) => ({ open: true, passage, round: r.round + 1 })),
    }),
    [copyCitation, shareLink],
  );

  return (
    <ReaderContext value={value}>
      {children}
      <FeedbackDialog
        key={report.round}
        isOpen={report.open}
        // Paragraf halaman sambungan (gulir bersambung) dilaporkan dengan path halamannya sendiri.
        pagePath={report.passage ? report.passage.permalink.split("#")[0]! : readingPath}
        passage={report.passage}
        onOpenChange={(open) => setReport((r) => ({ ...r, open }))}
      />
    </ReaderContext>
  );
}
