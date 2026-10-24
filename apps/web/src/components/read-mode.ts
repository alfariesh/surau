// Mode baca di klien (X11, ADR-091): Arab, Keduanya, atau Terjemahan untuk seluruh situs. Nilainya
// atribut `data-read-mode` di <html> yang dipasang skrip awal sebelum tampil; CSS pembaca memakai
// atribut itu langsung (tanpa JS), sedangkan komponen klien yang menyusun urutan sendiri (kartu Cari,
// kutipan Maknaz, kontrol panel) membacanya lewat `useReadMode()`.

import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

import type { ReadMode } from "../lib/reader/scale";

import { keepReadingPosition } from "../lib/keep-position";
import { applyAttr, notify, prefOf, readAttr, store, subscribe } from "../lib/prefs";
import { READ_MODE_KEY, READ_MODES } from "../lib/reader/scale";

export const READ_MODE_PREF = prefOf(READ_MODE_KEY);

function current(): ReadMode {
  const value = readAttr(READ_MODE_PREF);
  return READ_MODES.find((m) => m === value) ?? "both";
}

/**
 * Mode baca terpilih. Bernilai "both" saat render server dan hidrasi, jadi jangan dipakai untuk
 * tata letak yang dirender server (pakai CSS `data-read-mode`); cocok untuk komponen klien.
 */
export function useReadMode(): ReadMode {
  return useSyncExternalStore(subscribe, current, () => "both");
}

/**
 * Ganti mode baca tanpa menggeser yang sedang dibaca, lalu simpan. Komponen yang menyusun isinya
 * sendiri menurut mode (kartu Cari) dirender ulang di dalam pengukuran (`flushSync`), jadi
 * perubahan tingginya ikut dikompensasi, bukan hanya perubahan CSS.
 */
export function setReadMode(mode: ReadMode) {
  keepReadingPosition(() => {
    applyAttr(READ_MODE_PREF, mode);
    flushSync(notify);
  });
  store(READ_MODE_KEY, mode);
}
