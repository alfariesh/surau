// Konfigurasi audio per karya (X17). Slug dan ID edisi sama dengan tools/ingest/src/works/ihya.ts
// (dibekukan sejak rilis Fase 1, ADR-029); nama berkas manifest mengikuti pola data/patches.

export interface AudioWork {
  slug: string;
  editionId: number;
  /** Judul Latin bila korpus belum punya `title_id`. */
  title: string;
  /** Berkas metadata audio ter-commit (relatif root repo). */
  manifest: string;
}

export const WORKS: Readonly<Record<string, AudioWork>> = {
  ihya: {
    slug: "ihya",
    editionId: 1,
    title: "Ihya' 'Ulum ad-Din",
    manifest: "data/audio/ihya-9472-audio.json",
  },
};

/** Bucket R2 publik media Surau dan domainnya (r2.dev dimatikan; ADR-097 butir 6). */
export const MEDIA = { bucket: "surau-media", origin: "https://media.surau.org" } as const;

/** Asal situs untuk tautan halaman Intisari di metadata berkas. */
export const SITE_ORIGIN = "https://surau.org";

/** Kecepatan baca suara AI untuk perkiraan durasi (karakter per menit; dicek ulang dari pilot). */
export const SPOKEN_CHARS_PER_MINUTE = 900;
