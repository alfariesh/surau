// Ukuran huruf Arab pembaca (S09). Modul biasa (bukan "use client") supaya nilainya bisa dipakai
// server component (skrip awal di halaman baca) dan komponen klien (tombol A−/A+).

export const READER_SCALES = [0.85, 1, 1.15, 1.3, 1.5] as const;
export const READER_SCALE_KEY = "surau:reader-scale";

/**
 * Tampil/sembunyikan terjemahan AI di pembaca (S14), disimpan per browser. "0" = sembunyi:
 * atribut `data-translation="off"` di <html> (CSS menyembunyikan `.passage-translation`).
 */
export const READER_TRANSLATION_KEY = "surau:reader-translation";

/**
 * Skrip kecil di awal halaman baca: pasang skala dan pilihan terjemahan tersimpan sebelum teks
 * tampil, supaya tidak berkedip. Gagal diam-diam bila localStorage diblokir.
 */
export const READER_SCALE_SCRIPT = `try{var s=Number(localStorage.getItem(${JSON.stringify(READER_SCALE_KEY)}));if(${JSON.stringify(READER_SCALES)}.indexOf(s)>-1)document.documentElement.style.setProperty("--reader-scale",String(s));if(localStorage.getItem(${JSON.stringify(READER_TRANSLATION_KEY)})==="0")document.documentElement.setAttribute("data-translation","off")}catch(e){}`;
