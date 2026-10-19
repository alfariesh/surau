// Preferensi tampilan pembaca (S09, S14, panel Tampilan). Modul biasa (bukan "use client") supaya
// nilainya bisa dipakai server component (skrip awal di halaman baca) dan komponen klien.

export const READER_SCALES = [0.85, 1, 1.15, 1.3, 1.5] as const;
export const READER_SCALE_KEY = "surau:reader-scale";

/**
 * Tampil/sembunyikan terjemahan AI di pembaca (S14), disimpan per browser. "0" = sembunyi:
 * atribut `data-translation="off"` di <html> (CSS menyembunyikan `.passage-translation`).
 */
export const READER_TRANSLATION_KEY = "surau:reader-translation";

/**
 * Font Arab pilihan pembaca: atribut `data-reader-font` di <html> mengganti `--font-arabic`
 * (globals.css). Nilai pertama = bawaan (tanpa atribut). Semua font berlisensi OFL (layout.tsx).
 */
export const READER_FONTS = [
  { id: "naskh", name: "Noto Naskh Arabic", cssVar: "--font-naskh" },
  { id: "amiri", name: "Amiri", cssVar: "--font-amiri" },
  { id: "scheherazade", name: "Scheherazade New", cssVar: "--font-scheherazade" },
  { id: "sans", name: "Noto Sans Arabic", cssVar: "--font-noto-sans-arabic" },
] as const;
export type ReaderFont = (typeof READER_FONTS)[number]["id"];
export const READER_FONT_KEY = "surau:reader-font";

/** Jarak baris teks Arab: atribut `data-reader-leading` di <html>; "normal" = bawaan. */
export const READER_LEADINGS = ["tight", "normal", "loose"] as const;
export type ReaderLeading = (typeof READER_LEADINGS)[number];
export const READER_LEADING_KEY = "surau:reader-leading";

/** Perataan teks Arab: atribut `data-reader-align` di <html>; "justify" (rata kanan-kiri) = bawaan. */
export const READER_ALIGNS = ["justify", "start"] as const;
export type ReaderAlign = (typeof READER_ALIGNS)[number];
export const READER_ALIGN_KEY = "surau:reader-align";

/** Preferensi berbasis atribut <html>: kunci localStorage, nama atribut, nilai sah, bawaan. */
export const READER_ATTR_PREFS = [
  {
    key: READER_FONT_KEY,
    attr: "data-reader-font",
    values: READER_FONTS.map((f) => f.id),
    fallback: "naskh",
  },
  {
    key: READER_LEADING_KEY,
    attr: "data-reader-leading",
    values: [...READER_LEADINGS],
    fallback: "normal",
  },
  {
    key: READER_ALIGN_KEY,
    attr: "data-reader-align",
    values: [...READER_ALIGNS],
    fallback: "justify",
  },
] as const;

/**
 * Skrip kecil di awal halaman baca: pasang skala, pilihan terjemahan, font, jarak baris, dan perataan
 * tersimpan sebelum teks tampil, supaya tidak berkedip. Gagal diam-diam bila localStorage diblokir.
 */
export const READER_SCALE_SCRIPT = `try{var d=document.documentElement,l=localStorage,s=Number(l.getItem(${JSON.stringify(READER_SCALE_KEY)}));if(${JSON.stringify(READER_SCALES)}.indexOf(s)>-1)d.style.setProperty("--reader-scale",String(s));if(l.getItem(${JSON.stringify(READER_TRANSLATION_KEY)})==="0")d.setAttribute("data-translation","off");${JSON.stringify(READER_ATTR_PREFS)}.forEach(function(p){var v=l.getItem(p.key);if(v&&v!==p.fallback&&p.values.indexOf(v)>-1)d.setAttribute(p.attr,v)})}catch(e){}`;
