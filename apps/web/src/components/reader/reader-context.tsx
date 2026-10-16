"use client";

import type { ReactNode } from "react";

import type { CiteParts } from "../../lib/reader/cite";

import { toast } from "@heroui/react";
import { createContext, use, useCallback, useMemo, useState } from "react";

import { id } from "../../i18n/id";
import { copyRich } from "../../lib/clipboard";
import { citeHtml, citeText } from "../../lib/reader/cite";

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
        await copyRich(citeText(cite, url), citeHtml(cite, url));
        toast.success(t.copied, { description: t.copiedDescription });
      } catch {
        toast.danger(t.copyFailed, { description: t.copyFailedDescription });
      }
    },
    [cite],
  );

  const value = useMemo<ReaderContextValue>(
    () => ({
      copyCitation,
      openReport: (passage) => setReport((r) => ({ open: true, passage, round: r.round + 1 })),
    }),
    [copyCitation],
  );

  return (
    <ReaderContext value={value}>
      {children}
      <FeedbackDialog
        key={report.round}
        isOpen={report.open}
        pagePath={pagePath}
        passage={report.passage}
        onOpenChange={(open) => setReport((r) => ({ ...r, open }))}
      />
    </ReaderContext>
  );
}
