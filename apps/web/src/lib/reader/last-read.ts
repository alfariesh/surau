import { LAST_READ_PREFIX } from "./scale";

// Posisi baca terakhir (X04 W5): hanya di browser (localStorage `surau:last-read:<karya>`), tanpa
// cookie dan tanpa server. Gagal diam-diam bila penyimpanan diblokir (mode privat): fitur ini
// sekadar kemudahan, bukan data yang harus ada.

export interface LastRead {
  /** Segmen karya di URL, mis. `ihya`. */
  work: string;
  /** Judul karya berhuruf Latin (dari DB) untuk kartu "Lanjutkan membaca". */
  title: string;
  juz: number;
  page: number;
  /** Jangkar paragraf terakhir yang terlihat (`p2826`), atau null. */
  anchor: string | null;
  /** Waktu simpan (ms sejak epoch). */
  at: number;
}

const SEGMENT = /^[a-z0-9-]+(?:@[a-z0-9-]+)?$/;
const ANCHOR = /^p\d+$/;

/** Rekaman sah dari teks JSON, atau null (data rusak atau dari versi lain diabaikan). */
export function parseLastRead(raw: string | null): LastRead | null {
  if (raw === null) return null;
  try {
    const v = JSON.parse(raw) as Partial<LastRead>;
    if (
      typeof v.work !== "string" ||
      !SEGMENT.test(v.work) ||
      typeof v.title !== "string" ||
      v.title.length > 200 ||
      !Number.isInteger(v.juz) ||
      !Number.isInteger(v.page) ||
      (v.juz as number) < 1 ||
      (v.page as number) < 0 ||
      (v.anchor !== null && (typeof v.anchor !== "string" || !ANCHOR.test(v.anchor))) ||
      typeof v.at !== "number"
    ) {
      return null;
    }
    return {
      work: v.work,
      title: v.title,
      juz: v.juz as number,
      page: v.page as number,
      anchor: v.anchor ?? null,
      at: v.at,
    };
  } catch {
    return null;
  }
}

/** Permalink lanjutan: halaman cetak + jangkar paragraf. */
export function lastReadHref(r: LastRead): string {
  return `/kitab/${r.work}/${r.juz}/${r.page}${r.anchor ? `#${r.anchor}` : ""}`;
}

export function saveLastRead(r: LastRead): void {
  try {
    window.localStorage.setItem(`${LAST_READ_PREFIX}${r.work}`, JSON.stringify(r));
    document.documentElement.setAttribute("data-reading", "");
  } catch {
    // Penyimpanan diblokir: tidak ada kartu "Lanjutkan membaca".
  }
}

/** Rekaman terbaru (dari satu karya bila `work` diberikan, selain itu dari semua karya), atau null. */
export function latestLastRead(work?: string): LastRead | null {
  try {
    const store = window.localStorage;
    let best: LastRead | null = null;
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key === null || !key.startsWith(LAST_READ_PREFIX)) continue;
      if (work !== undefined && key !== `${LAST_READ_PREFIX}${work}`) continue;
      const r = parseLastRead(store.getItem(key));
      if (r !== null && (best === null || r.at > best.at)) best = r;
    }
    return best;
  } catch {
    return null;
  }
}
