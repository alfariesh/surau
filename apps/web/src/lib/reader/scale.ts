// Preferensi tampilan pembaca (S09, S14, panel Tampilan; X04 menambah terjemahan, perataan otomatis,
// catatan AI, dan posisi baca). Modul biasa (bukan "use client") supaya nilainya bisa dipakai server
// component (skrip awal di root layout) dan komponen klien.

export const READER_SCALES = [0.85, 1, 1.15, 1.3, 1.5] as const;
export const READER_SCALE_KEY = "surau:reader-scale";

/** Ukuran huruf terjemahan (X04 W1): variabel `--reader-tr-scale`, terpisah dari skala Arab. */
export const READER_TR_SCALES = [0.9, 1, 1.1, 1.2, 1.35] as const;
export const READER_TR_SCALE_KEY = "surau:reader-tr-scale";

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

/**
 * Perataan teks Arab: atribut `data-reader-align` di <html>. "auto" (bawaan, X04) = rata
 * kanan-kiri di layar ≥ 640 px dan rata kanan di ponsel, karena di kolom sempit rata kanan-kiri
 * melebarkan spasi antarkata secara mencolok.
 */
export const READER_ALIGNS = ["auto", "justify", "start"] as const;
export type ReaderAlign = (typeof READER_ALIGNS)[number];
export const READER_ALIGN_KEY = "surau:reader-align";

/**
 * Tata letak terjemahan (X04 W2): atribut `data-tr-layout`. "interleave" (bawaan) = di bawah
 * paragraf Arabnya; "fold" = dilipat, dibuka per paragraf; "side" = berdampingan di kolom lebar.
 */
export const READER_TR_LAYOUTS = ["interleave", "fold", "side"] as const;
export type ReaderTrLayout = (typeof READER_TR_LAYOUTS)[number];
export const READER_TR_LAYOUT_KEY = "surau:reader-tr-layout";

/** Catatan terjemahan AI di awal teks sudah ditutup ("off"): atribut `data-ai-notice="off"`. */
export const AI_NOTICE_KEY = "surau:ai-notice";

/** Posisi baca terakhir per karya (W5): `surau:last-read:<karya>`; ada = atribut `data-reading`. */
export const LAST_READ_PREFIX = "surau:last-read:";

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
    fallback: "auto",
  },
  {
    key: READER_TR_LAYOUT_KEY,
    attr: "data-tr-layout",
    values: [...READER_TR_LAYOUTS],
    fallback: "interleave",
  },
] as const;

/**
 * Skrip kecil di awal setiap halaman (root layout): pasang skala Arab dan terjemahan, pilihan
 * terjemahan, font, jarak baris, perataan, tata letak terjemahan, catatan AI yang sudah ditutup, dan
 * tanda posisi baca tersimpan sebelum teks tampil, supaya tidak berkedip atau menggeser tata letak.
 * Gagal diam-diam bila localStorage diblokir.
 */
export const READER_SCALE_SCRIPT = `try{var d=document.documentElement,l=localStorage,s=Number(l.getItem(${JSON.stringify(READER_SCALE_KEY)})),r=Number(l.getItem(${JSON.stringify(READER_TR_SCALE_KEY)}));if(${JSON.stringify(READER_SCALES)}.indexOf(s)>-1)d.style.setProperty("--reader-scale",String(s));if(${JSON.stringify(READER_TR_SCALES)}.indexOf(r)>-1)d.style.setProperty("--reader-tr-scale",String(r));if(l.getItem(${JSON.stringify(READER_TRANSLATION_KEY)})==="0")d.setAttribute("data-translation","off");if(l.getItem(${JSON.stringify(AI_NOTICE_KEY)})==="off")d.setAttribute("data-ai-notice","off");${JSON.stringify(READER_ATTR_PREFS)}.forEach(function(p){var v=l.getItem(p.key);if(v&&v!==p.fallback&&p.values.indexOf(v)>-1)d.setAttribute(p.attr,v)});for(var i=0;i<l.length;i++){var k=l.key(i);if(k&&k.indexOf(${JSON.stringify(LAST_READ_PREFIX)})===0){d.setAttribute("data-reading","");break}}}catch(e){}`;
