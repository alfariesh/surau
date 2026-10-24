// Preferensi tampilan pembaca di klien (panel Tampilan): baca/tulis nilai di <html> + localStorage.
// Dipakai tombol Tampilan (reader-style.tsx, selalu dimuat) dan isi panelnya
// (reader-style-panel.tsx, dimuat saat panel dibuka, X09). Penyimpanan, event, dan preferensi
// atribut umum ada di lib/prefs.ts (X11: dipakai juga menu ⋮, Cari, dan Maknaz). Modul klien tanpa JSX.

import { useEffect } from "react";

import { applyAttr, notify, prefOf, stored } from "../../lib/prefs";
import {
  READER_ALIGN_KEY,
  READER_ATTR_PREFS,
  READER_FONT_KEY,
  READER_LEADING_KEY,
  READER_SCALE_KEY,
  READER_SCALES,
  READER_TR_LAYOUT_KEY,
  READER_TR_SCALE_KEY,
  READER_TR_SCALES,
} from "../../lib/reader/scale";

// --- Ukuran huruf Arab (--reader-scale) ---

export function scaleIndex(): number {
  const value = Number(document.documentElement.style.getPropertyValue("--reader-scale") || "1");
  const i = READER_SCALES.findIndex((s) => s === value);
  return i === -1 ? 1 : i;
}

export function applyScale(scale: number) {
  document.documentElement.style.setProperty("--reader-scale", String(scale));
}

// --- Ukuran huruf terjemahan (--reader-tr-scale, X04 W1) ---

export function trScaleIndex(): number {
  const value = Number(document.documentElement.style.getPropertyValue("--reader-tr-scale") || "1");
  const i = READER_TR_SCALES.findIndex((s) => s === value);
  return i === -1 ? 1 : i;
}

export function applyTrScale(scale: number) {
  document.documentElement.style.setProperty("--reader-tr-scale", String(scale));
}

// --- Font, jarak baris, perataan, tata letak terjemahan (atribut data-*) ---

export const FONT_PREF = prefOf(READER_FONT_KEY);
export const LEADING_PREF = prefOf(READER_LEADING_KEY);
export const ALIGN_PREF = prefOf(READER_ALIGN_KEY);
export const TR_LAYOUT_PREF = prefOf(READER_TR_LAYOUT_KEY);

/**
 * Navigasi klien dari halaman lain tidak menjalankan skrip awal: pasang semua pilihan tersimpan
 * (termasuk mode baca) saat pembaca pertama kali tampil.
 */
export function useRestorePrefs() {
  useEffect(() => {
    const scale = Number(stored(READER_SCALE_KEY));
    applyScale(READER_SCALES.some((s) => s === scale) ? scale : 1);
    const trScale = Number(stored(READER_TR_SCALE_KEY));
    applyTrScale(READER_TR_SCALES.some((s) => s === trScale) ? trScale : 1);
    for (const pref of READER_ATTR_PREFS) {
      const value = stored(pref.key);
      const values: readonly string[] = pref.values;
      applyAttr(pref, value !== null && values.includes(value) ? value : pref.fallback);
    }
    notify();
  }, []);
}
