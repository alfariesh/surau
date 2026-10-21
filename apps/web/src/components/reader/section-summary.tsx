"use client";

import type { SummaryView } from "@surau/core";

import { useId, useLayoutEffect, useRef, useState } from "react";

import { id } from "../../i18n/id";
import { summaryParagraphs } from "../../lib/reader/id-text";
import { ArabicInline } from "../arabic";
import { Typography } from "@heroui/react";

const t = id.reader;

// Ringkasan AI bagian daftar isi yang mulai di halaman ini (S13 dibuat, S14 tampil), berlabel
// "Ringkasan AI". Catatan tipis di bawah judul bab: garis aksen di tepi, dua baris pertama, lalu
// "Baca selengkapnya". Seluruh teks tetap ada di HTML (hanya dipotong secara visual), jadi tetap
// terbaca tanpa JS dan oleh mesin pencari. Dibuka penuh, teksnya dibagi menjadi paragraf 2–3
// kalimat (X04 W1, `summaryParagraphs`): isi kata sama persis, hanya jeda paragrafnya.
export function SectionSummary({ summary }: { summary: SummaryView }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const textId = useId();
  const labelId = useId();

  // Tombol hanya muncul bila teksnya memang lebih dari dua baris. Diukur ulang saat ukuran elemen
  // berubah (jendela menyempit, skala teks dari panel Tampilan), bukan hanya saat pasang (#76).
  useLayoutEffect(() => {
    const el = textRef.current;
    if (el === null || expanded) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded]);

  if (summary.review_status === "rejected") return null;
  return (
    <aside
      // Nama dari label yang terlihat ("Ringkasan AI · <judul bagian>"), unik per bagian, jadi
      // beberapa ringkasan di satu halaman (termasuk halaman sambungan) tidak bernama sama.
      aria-labelledby={labelId}
      className="section-summary"
      data-permalink={summary.section.permalink}
      lang="id"
    >
      <Typography id={labelId} type="body-xs" color="muted" weight="medium" className="mb-1">
        {t.aiSummary}
        <span className="font-normal">
          {" · "}
          <ArabicInline>{summary.section.title_ar}</ArabicInline>
        </span>
      </Typography>
      {expanded ? (
        <div className="section-summary-text flex flex-col gap-2" data-tr-seg="summary" id={textId}>
          {summaryParagraphs(summary.text).map((para, i) => (
            <Typography key={i} type="body-sm">
              {para}
            </Typography>
          ))}
        </div>
      ) : (
        <Typography
          ref={textRef}
          type="body-sm"
          className="section-summary-text line-clamp-2 whitespace-pre-line"
          data-tr-seg="summary"
          id={textId}
        >
          {summary.text}
        </Typography>
      )}
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
        <Typography type="body-xs" color="muted" className="mt-1">
          {t.aiMeta(summary.model, t.aiReview[summary.review_status])}
        </Typography>
      ) : null}
    </aside>
  );
}
