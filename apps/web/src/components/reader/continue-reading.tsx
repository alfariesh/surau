"use client";

import NextLink from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { BookOpen01 } from "../../icons";
import { id } from "../../i18n/id";
import { lastReadHref, latestLastRead, parseLastRead } from "../../lib/reader/last-read";

const t = id.reader;

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
}: {
  className?: string;
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
    <div className={`continue-slot ${className}`}>
      {record === null ? null : (
        <NextLink className="continue-card" href={lastReadHref(record)}>
          <BookOpen01 aria-hidden="true" className="text-accent size-5 shrink-0" />
          <span className="flex min-w-0 flex-col">
            <span className="text-foreground text-sm font-medium">{t.continueReading}</span>
            <span className="text-muted truncate text-xs">
              {t.continueWhere(record.title, record.juz, record.page)}
            </span>
          </span>
        </NextLink>
      )}
    </div>
  );
}
