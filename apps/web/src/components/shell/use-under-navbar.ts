"use client";

import { useEffect, useState } from "react";

/** Tinggi navbar (4rem): elemen dianggap tergulir saat masuk ke balik navbar. */
const NAVBAR_INSET = "-64px 0px 0px 0px";

/**
 * `true` saat elemen `selector` sudah tergulir ke balik navbar (judul besar halaman, penanda awal
 * isi). Berbasis IntersectionObserver, jadi berlaku untuk gulir window maupun wadah gulir AppLayout.
 */
export function useUnderNavbar(selector: string): boolean {
  const [under, setUnder] = useState(false);

  useEffect(() => {
    const el = document.querySelector(selector);
    if (el === null) return;
    const observer = new IntersectionObserver(
      // Tidak berpotongan bisa juga berarti masih di bawah layar (layar pendek, huruf besar):
      // hanya yang sudah lewat batas atas yang dihitung.
      ([entry]) =>
        setUnder(
          entry !== undefined &&
            !entry.isIntersecting &&
            entry.boundingClientRect.top < (entry.rootBounds?.top ?? 64),
        ),
      { rootMargin: NAVBAR_INSET },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [selector]);

  return under;
}
