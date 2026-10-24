// Preferensi tampilan di klien (dipisah dari reader-style-prefs.ts di X11): nilainya hidup di <html>
// (variabel CSS dan atribut data-*, dipasang skrip awal root layout `READER_SCALE_SCRIPT` supaya tidak
// berkedip), disimpan di localStorage, dan diberitahukan ke komponen lain lewat satu event. Dipakai
// panel Tampilan pembaca, menu ⋮ navbar (mode baca), Cari, dan Maknaz. Tanpa React dan tanpa JSX.

import { READER_ATTR_PREFS } from "./reader/scale";

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

// --- Preferensi berbasis atribut <html> (font, jarak baris, perataan, tata letak, mode baca) ---

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
