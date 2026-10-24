// Preferensi tampilan pembaca di klien (panel Tampilan): baca/tulis nilai di <html> + localStorage.
// Dipakai tombol Tampilan (reader-style.tsx, selalu dimuat) dan isi panelnya
// (reader-style-panel.tsx, dimuat saat panel dibuka, X09). Modul klien tanpa JSX.

import { useEffect } from "react";

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
  READER_TRANSLATION_KEY,
} from "../../lib/reader/scale";

// Semua preferensi tampilan hidup di <html> (variabel CSS dan atribut data-*), dipasang skrip awal
// root layout (READER_SCALE_SCRIPT) supaya tidak berkedip. Komponen membaca nilainya lewat
// useSyncExternalStore dan memberi tahu pembaca lain lewat satu event.

const PREFS_EVENT = "surau:reader-prefs";

export function subscribe(onChange: () => void) {
  window.addEventListener(PREFS_EVENT, onChange);
  return () => window.removeEventListener(PREFS_EVENT, onChange);
}

export function notify() {
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Mode privat / penyimpanan diblokir: pilihan berlaku sampai halaman ditutup.
  }
}

export function stored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

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

// --- Terjemahan AI (data-translation="off") ---

export function translationShown(): boolean {
  return document.documentElement.getAttribute("data-translation") !== "off";
}

export function applyTranslation(shown: boolean) {
  if (shown) document.documentElement.removeAttribute("data-translation");
  else document.documentElement.setAttribute("data-translation", "off");
}

// --- Font dan jarak baris (data-reader-font, data-reader-leading) ---

export type AttrPref = (typeof READER_ATTR_PREFS)[number];

export function prefOf(key: string): AttrPref {
  const pref = READER_ATTR_PREFS.find((p) => p.key === key);
  if (pref === undefined) throw new Error(`Preferensi tidak dikenal: ${key}`);
  return pref;
}

export function readAttr(pref: AttrPref): string {
  return document.documentElement.getAttribute(pref.attr) ?? pref.fallback;
}

export function applyAttr(pref: AttrPref, value: string) {
  if (value === pref.fallback) document.documentElement.removeAttribute(pref.attr);
  else document.documentElement.setAttribute(pref.attr, value);
}

export const FONT_PREF = prefOf(READER_FONT_KEY);
export const LEADING_PREF = prefOf(READER_LEADING_KEY);
export const ALIGN_PREF = prefOf(READER_ALIGN_KEY);
export const TR_LAYOUT_PREF = prefOf(READER_TR_LAYOUT_KEY);

/**
 * Navigasi klien dari halaman lain tidak menjalankan skrip awal: pasang semua pilihan tersimpan
 * saat pembaca pertama kali tampil.
 */
export function useRestorePrefs() {
  useEffect(() => {
    const scale = Number(stored(READER_SCALE_KEY));
    applyScale(READER_SCALES.some((s) => s === scale) ? scale : 1);
    const trScale = Number(stored(READER_TR_SCALE_KEY));
    applyTrScale(READER_TR_SCALES.some((s) => s === trScale) ? trScale : 1);
    applyTranslation(stored(READER_TRANSLATION_KEY) !== "0");
    for (const pref of READER_ATTR_PREFS) {
      const value = stored(pref.key);
      const values: readonly string[] = pref.values;
      applyAttr(pref, value !== null && values.includes(value) ? value : pref.fallback);
    }
    notify();
  }, []);
}
