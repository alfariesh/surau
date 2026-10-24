// Bagian `id.nav` dari kamus UI (src/i18n/id.ts), dipisah per bagian (X09) supaya komponen
// klien hanya membawa string yang dipakainya.

export const nav = {
  label: "Navigasi utama",
  home: "Beranda",
  books: "Kitab",
  search: "Cari",
  ask: "Maknaz",
  about: "Tentang",
  mcp: "Pakai dengan AI",
  soon: "segera",
  soonHint: "Fitur ini sedang dibangun",
  openMenu: "Buka menu",
  toggleSidebar: "Buka atau tutup panel samping",
  more: "Menu lainnya",
} as const;
