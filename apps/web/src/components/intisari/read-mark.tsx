"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

import { intisari as intisariText } from "../../i18n/id/intisari";
import {
  markDigestRead,
  parseReadIds,
  readSnapshot,
  subscribeRead,
} from "../../lib/reader/digest-read";

const t = intisariText;

/**
 * Menandai Intisari ini "sudah dibaca" di browser ini saat pembaca sampai di bagian "Lanjut ke teks
 * lengkap" (titik pengamatan tak terlihat; X16). Tidak merender teks.
 */
export function ReadMark({ nodeId }: { nodeId: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        markDigestRead(nodeId);
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [nodeId]);
  return <span ref={ref} aria-hidden="true" className="block h-px" />;
}

/** Lencana "Sudah dibaca" di hub (X16): hanya sesudah hidrasi, dari penyimpanan browser ini. */
export function ReadBadge({ nodeId }: { nodeId: number }) {
  const raw = useSyncExternalStore(subscribeRead, readSnapshot, () => null);
  if (!parseReadIds(raw).includes(nodeId)) return null;
  return <span className="intisari-read">{t.readMark}</span>;
}
