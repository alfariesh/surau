// Halaman cetak yang sedang dibaca berubah (X04 W6, gulir bersambung): judul ringkas navbar dan
// daftar isi ikut menunjuk halaman itu. Event jendela biasa, supaya komponen yang terpisah jauh di
// pohon React tidak perlu konteks bersama.

export const READER_PAGE_EVENT = "surau:reader-page";

export interface ReaderPageDetail {
  juz: number;
  page: number;
  /** Judul bab terdalam (teks DB) atau null. */
  bab: string | null;
  /** Node daftar isi yang tampil di halaman ini (urut). */
  activeIds: number[];
}

export function announceReaderPage(detail: ReaderPageDetail): void {
  window.dispatchEvent(new CustomEvent<ReaderPageDetail>(READER_PAGE_EVENT, { detail }));
}

export function onReaderPage(listener: (detail: ReaderPageDetail) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<ReaderPageDetail>).detail);
  window.addEventListener(READER_PAGE_EVENT, handler);
  return () => window.removeEventListener(READER_PAGE_EVENT, handler);
}
