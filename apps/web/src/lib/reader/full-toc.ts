import type { TitleSource } from "./reader-toc";
import type { TocItem } from "./toc";

// Pohon daftar isi pembaca lengkap di klien (X09). HTML halaman baca hanya membawa baris yang
// tampil terbuka (`pruneToc`); pohon lengkap diambil sekali per karya dari `/kitab/<karya>/daftar-isi.json`
// (ISR) saat pohon benar-benar tampil, lalu dipakai semua TocTree (panel samping, sheet ponsel) dan
// halaman berikutnya selama tab terbuka. Gagal ambil = tetap pohon ringkas, boleh dicoba lagi.

export interface ReaderTocData {
  items: TocItem[];
  titleSource: TitleSource | null;
}

interface Entry {
  data: ReaderTocData | null;
  loading: boolean;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

export function subscribeFullToc(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function fullTocFor(segment: string): ReaderTocData | null {
  return entries.get(segment)?.data ?? null;
}

function isTocData(value: unknown): value is ReaderTocData {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { items?: unknown }).items)
  );
}

/** Mulai mengambil pohon lengkap karya ini (sekali; tidak berbuat apa-apa bila sudah/sedang). */
export function loadFullToc(segment: string): void {
  const known = entries.get(segment);
  if (known?.data || known?.loading) return;
  const entry: Entry = { data: null, loading: true };
  entries.set(segment, entry);
  fetch(`/kitab/${segment}/daftar-isi.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((body: unknown) => {
      if (isTocData(body) && body.items.length > 0) {
        entry.data = body;
        for (const listener of listeners) listener();
      }
    })
    .catch(() => {})
    .finally(() => {
      entry.loading = false;
    });
}
