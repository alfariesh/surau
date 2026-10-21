// Halaman cetak yang sedang dibaca (X04 W6, gulir bersambung): judul ringkas navbar, daftar isi
// (juga di sheet ponsel yang baru dipasang saat dibuka), dan laporan kesalahan halaman ikut menunjuk
// halaman itu. Disimpan di modul (bukan state React) supaya komponen yang dipasang belakangan tetap
// membaca nilai terakhir; setiap nilai terikat `scope` (permalink halaman pertama yang dirender
// server), jadi nilai dari halaman sebelumnya tidak dipakai sesudah navigasi.

export interface ReaderPageDetail {
  /** Permalink halaman pertama (yang dirender server) tempat nilai ini berlaku. */
  scope: string;
  juz: number;
  page: number;
  /** Permalink halaman cetak yang sedang dibaca. */
  permalink: string;
  /** Judul bab terdalam (teks DB) atau null. */
  bab: string | null;
  /** Node daftar isi yang tampil di halaman ini (urut). */
  activeIds: number[];
}

let last: ReaderPageDetail | null = null;
const listeners = new Set<() => void>();

export function announceReaderPage(detail: ReaderPageDetail | null): void {
  last = detail;
  for (const l of listeners) l();
}

export function subscribeReaderPage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Nilai terakhir untuk halaman `scope`, atau null (belum ada, atau milik halaman lain). */
export function readerPageFor(scope: string): ReaderPageDetail | null {
  return last !== null && last.scope === scope ? last : null;
}
