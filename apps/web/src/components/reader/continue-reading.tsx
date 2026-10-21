"use client";

import NextLink from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { BookOpen01 } from "../../icons";
import { id } from "../../i18n/id";
import { lastReadHref, latestLastRead, parseLastRead } from "../../lib/reader/last-read";

const t = id.reader;

const noopSubscribe = () => () => {};
/** Snapshot berupa teks (bukan objek baru tiap baca) supaya useSyncExternalStore stabil. */
const snapshot = () => {
  const r = latestLastRead();
  return r === null ? null : JSON.stringify(r);
};

/**
 * Kartu "Lanjutkan membaca" (X04 W5) di beranda, /kitab, dan halaman karya: dari posisi baca
 * terakhir di browser ini (localStorage). Server merender wadah kosong; ruangnya sudah dipesan
 * sebelum tampil (skrip awal memasang `data-reading` bila ada rekaman, CSS `.continue-slot`), jadi
 * isi yang muncul sesudah hidrasi tidak menggeser tata letak.
 */
export function ContinueReading({ className = "" }: { className?: string }) {
  const raw = useSyncExternalStore(noopSubscribe, snapshot, () => null);
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
