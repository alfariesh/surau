"use client";

import type { SummaryView } from "@surau/core";

import { useId, useLayoutEffect, useRef, useState } from "react";

import { id } from "../../i18n/id";
import { ArabicInline } from "../arabic";

const t = id.reader;

// Ringkasan AI bagian daftar isi yang mulai di halaman ini (S13 dibuat, S14 tampil), berlabel
// "Ringkasan AI". Catatan tipis di bawah judul bab: garis aksen di tepi, dua baris pertama, lalu
// "Baca selengkapnya". Seluruh teks tetap ada di HTML (hanya dipotong secara visual), jadi tetap
// terbaca tanpa JS dan oleh mesin pencari.
export function SectionSummary({ summary }: { summary: SummaryView }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const textId = useId();

  // Tombol hanya muncul bila teksnya memang lebih dari dua baris.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (el !== null && !expanded) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [expanded]);

  if (summary.review_status === "rejected") return null;
  return (
    <aside aria-label={t.aiSummaryOf} className="section-summary" lang="id">
      <p className="text-muted mb-1 text-xs font-medium">
        {t.aiSummary}
        <span className="font-normal">
          {" · "}
          <ArabicInline>{summary.section.title_ar}</ArabicInline>
        </span>
      </p>
      <p
        ref={textRef}
        className={`text-foreground text-[0.95rem] leading-relaxed whitespace-pre-line ${expanded ? "" : "line-clamp-2"}`}
        id={textId}
      >
        {summary.text}
      </p>
      {clamped || expanded ? (
        <button
          aria-controls={textId}
          aria-expanded={expanded}
          className="link mt-1 cursor-pointer text-xs font-medium"
          type="button"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t.summaryLess : t.summaryMore}
        </button>
      ) : null}
      {expanded ? (
        <p className="text-muted mt-1 text-xs">
          {t.aiMeta(summary.model, t.aiReview[summary.review_status])}
        </p>
      ) : null}
    </aside>
  );
}
