// Bagian `id.theme` dari kamus UI (src/i18n/id.ts), dipisah per bagian (X09) supaya komponen
// klien hanya membawa string yang dipakainya.

export const theme = {
  label: "Tema",
  options: { light: "Terang", dark: "Gelap", system: "Sistem" },
} as const;
