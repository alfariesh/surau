"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useEffect, useSyncExternalStore } from "react";

import { listen } from "./engine";

// Tampilan pemutar + Media Session dimuat terpisah, hanya bila ada audio yang aktif (X17): JS awal
// halaman hanya bertambah mesin pemutar kecil ini.
const MiniPlayer = dynamic(() => import("./mini-player").then((m) => m.MiniPlayer), { ssr: false });

const hasTrack = () => listen.get().track !== null;

/**
 * Pemutar "Dengarkan" global di shell situs: tetap berjalan saat pindah halaman (navigasi klien
 * tidak me-remount shell), dan memulihkan sesi terakhir (dijeda) sesudah muat ulang.
 */
export function ListenProvider({ children }: { children: ReactNode }) {
  const active = useSyncExternalStore(listen.subscribe, hasTrack, () => false);
  useEffect(() => {
    void listen.restore();
  }, []);
  return (
    <>
      {children}
      {active ? (
        <>
          {/* Ruang di akhir konten supaya pemutar (fixed) tidak menutupi baris terakhir. */}
          <div aria-hidden className="h-32 shrink-0" />
          <MiniPlayer />
        </>
      ) : null}
    </>
  );
}
