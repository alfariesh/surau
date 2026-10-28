/** Warna sampul bergiliran: zaitun, tanah liat, nila, cokelat, hijau laut (gelap, kontras teks putih). */
export const COVER_COLORS = [
  "var(--book-zaitun)",
  "oklch(0.5 0.1 45)",
  "oklch(0.42 0.07 255)",
  "oklch(0.42 0.06 70)",
  "oklch(0.45 0.06 195)",
] as const;

/**
 * Warna sampul kitab kandidat "Segera hadir" per bidang (ADR-115): hue sama dengan `--kategori-*`
 * (ikon + teks chip), tetapi gelap dan tetap di semua tema seperti sampul fisik; teks putih kontras.
 */
export const FIELD_COVER_COLORS = {
  tasawuf: "oklch(0.44 0.08 320)",
  quran: "oklch(0.45 0.06 195)",
  fikih: "var(--book-zaitun)",
  ushul: "oklch(0.42 0.08 260)",
  bahasa: "oklch(0.5 0.1 55)",
  istilah: "oklch(0.47 0.11 20)",
} as const;
