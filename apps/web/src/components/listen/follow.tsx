"use client";

import { useEffect, useSyncExternalStore } from "react";

import { listen } from "./engine";
import type { FollowData } from "./follow-targets";

/**
 * Sorotan kalimat mengikuti audio di halaman Intisari (X18, ADR-104). Komponen ini hanya memantau
 * apakah audio halaman ini yang sedang dimuat pemutar; logikanya (`follow-run`: ambil timestamps,
 * Highlight API, gulir, ketuk-untuk-lompat) baru dimuat saat itu, jadi JS awal halaman tidak
 * bertambah berarti. Tidak merender apa pun.
 */
export function ListenFollow({ data }: { data: FollowData }) {
  const active = useSyncExternalStore(
    listen.subscribe,
    () => listen.get().track?.key === data.trackKey,
    () => false,
  );
  useEffect(() => {
    if (!active) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    import("./follow-run")
      .then(async (m) => {
        const run = await m.startFollow(data);
        if (cancelled) run?.();
        else stop = run;
      })
      .catch(() => {
        // Potongan gagal dimuat (deploy baru, luring): audio tetap jalan, tanpa sorotan.
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [active, data]);
  return null;
}
