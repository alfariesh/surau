"use client";

import type { SummaryView } from "@surau/core";

import { CloseButton, Typography } from "@heroui/react";
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { reader as readerText } from "../../i18n/id/reader";
import { readMode as readModeText } from "../../i18n/id/readMode";
import { keepReadingPosition } from "../../lib/keep-position";
import { SUMMARY_OPEN_EVENT } from "../../lib/reader/fold";
import { summaryParagraphs } from "../../lib/reader/id-text";
import { ArabicInline } from "../arabic";

const t = readerText;
const rm = readModeText;

// Ringkasan AI bagian daftar isi yang mulai di halaman ini (S13 dibuat, S14 tampil), berlabel
// "Ringkasan AI". Catatan tipis di bawah judul bab: garis aksen di tepi, dua baris pertama, lalu
// "Baca selengkapnya". Seluruh teks tetap ada di HTML (hanya dipotong secara visual), jadi tetap
// terbaca tanpa JS dan oleh mesin pencari. Teksnya dibagi menjadi paragraf 2–3 kalimat (X04 W1,
// `summaryParagraphs`): isi kata sama persis, hanya jeda paragrafnya. Terpotong dan terbuka memakai
// DOM yang sama (X13): hanya atribut `data-expanded` yang berganti (CSS: paragraf sebaris + dua
// baris saat terpotong), jadi sorotan kata cari (Range di node teks) tidak hilang saat dibuka.
// Penyorot membuka ringkasan lewat `SUMMARY_OPEN_EVENT` bila kecocokannya di bagian yang terpotong,
// dan di mode Arab membukanya sementara (`data-tr-peek`) dengan tombol untuk menyembunyikannya lagi.
export function SectionSummary({ summary }: { summary: SummaryView }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
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

  // Dibuka penyorot kata cari: dirender sinkron, karena penyorot mengukur di dalam jaga posisi.
  useEffect(() => {
    const aside = asideRef.current;
    if (aside === null) return;
    const open = () => flushSync(() => setExpanded(true));
    aside.addEventListener(SUMMARY_OPEN_EVENT, open);
    return () => aside.removeEventListener(SUMMARY_OPEN_EVENT, open);
  }, []);

  if (summary.review_status === "rejected") return null;
  return (
    <aside
      ref={asideRef}
      // Nama dari label yang terlihat ("Ringkasan AI · <judul bagian>"), unik per bagian, jadi
      // beberapa ringkasan di satu halaman (termasuk halaman sambungan) tidak bernama sama.
      aria-labelledby={labelId}
      className="section-summary"
      data-permalink={summary.section.permalink}
      // Bantuan terjemahan (X11): disembunyikan di mode baca Arab. Bahasa dari datanya.
      data-tr-aid=""
      lang={summary.lang}
    >
      <div className="flex items-start justify-between gap-2">
        <Typography id={labelId} type="body-xs" color="muted" weight="medium" className="mb-1">
          {t.aiSummary}
          <span className="font-normal">
            {" · "}
            <ArabicInline>{summary.section.title_ar}</ArabicInline>
          </span>
        </Typography>
        {/* Hanya tampil di mode Arab saat ringkasan dibuka sementara oleh kata cari (CSS). */}
        <CloseButton
          aria-label={rm.summaryPeekClose}
          className="summary-peek-close"
          onPress={() => {
            const aside = asideRef.current;
            if (aside !== null) keepReadingPosition(() => aside.removeAttribute("data-tr-peek"));
          }}
        />
      </div>
      <div
        ref={textRef}
        className="section-summary-text"
        data-expanded={expanded ? "" : undefined}
        data-tr-seg="summary"
        id={textId}
      >
        {summaryParagraphs(summary.text).map((para, i) => (
          // Spasi di antara paragraf: saat terpotong paragraf sebaris, dan teks gabungannya (yang
          // dicocokkan penyorot) tidak menempelkan kata akhir dan awal paragraf.
          <Fragment key={i}>
            {i > 0 ? " " : null}
            <Typography type="body-sm">{para}</Typography>
          </Fragment>
        ))}
      </div>
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
