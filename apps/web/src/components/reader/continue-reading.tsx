"use client";

import NextLink from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { BookOpen01, ChevronRight } from "../../icons";
import { reader as readerText } from "../../i18n/id/reader";
import { lastReadHref, latestLastRead, parseLastRead } from "../../lib/reader/last-read";

const t = readerText;

const noopSubscribe = () => () => {};

/**
 * Kartu "Lanjutkan membaca" (X04 W5) di beranda, /kitab, dan halaman karya: dari posisi baca
 * terakhir di browser ini (localStorage). Server merender wadah kosong; ruangnya sudah dipesan
 * sebelum tampil (skrip awal memasang `data-reading` bila ada rekaman, CSS `.continue-slot`), jadi
 * isi yang muncul sesudah hidrasi tidak menggeser tata letak.
 */
export function ContinueReading({
  className = "",
  work,
  wide = false,
}: {
  className?: string;
  /** Selebar wadahnya (Beranda: sama dengan kotak cari), bukan maksimal 26rem. */
  wide?: boolean;
  /** Segmen karya (`ihya`): hanya posisi baca karya ini (halaman karya). Tanpa = karya terbaru. */
  work?: string;
}) {
  // Snapshot berupa teks (bukan objek baru tiap baca) supaya useSyncExternalStore stabil.
  const raw = useSyncExternalStore(
    noopSubscribe,
    () => {
      const r = latestLastRead(work);
      return r === null ? null : JSON.stringify(r);
    },
    () => null,
  );
  const record = useMemo(() => parseLastRead(raw), [raw]);
  return (
    <div className={`continue-slot ${className}`} data-wide={wide || undefined}>
      {record === null ? null : (
        <NextLink className="continue-card" href={lastReadHref(record)}>
          {/* Ubin ikon berlatar aksen lembut; judul kitab = baris utama, letak baca di bawahnya. */}
          <span aria-hidden="true" className="continue-card__icon">
            <BookOpen01 className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-muted text-xs">{t.continueReading}</span>
            <span className="text-foreground truncate text-sm font-medium">
              {record.title}
              <span className="text-muted font-normal">
                {" "}
                · {t.continueAt(record.juz, record.page)}
              </span>
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="continue-card__chevron size-4 shrink-0" />
        </NextLink>
      )}
    </div>
  );
}
