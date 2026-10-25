// Posisi dengar (X17): hanya di browser (localStorage `surau:listen:v1`), tanpa cookie dan tanpa
// server (docs/05 §12, dicatat di /privasi). Isi: kecepatan, Intisari yang terakhir didengar, dan
// posisi per Intisari (berikut kunci objeknya: audio yang dibuat ulang mulai dari awal). Gagal
// diam-diam bila penyimpanan diblokir; data rusak atau dari versi lain diabaikan.

export const LISTEN_KEY = "surau:listen:v1";
/** Posisi yang disimpan paling banyak (yang terlama dibuang). */
export const LISTEN_MAX_POSITIONS = 50;
export const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export interface SavedPosition {
  key: string;
  /** Detik. */
  t: number;
  /** Waktu simpan (ms sejak epoch). */
  at: number;
}

export interface ListenSaved {
  rate: number;
  /** `id` track yang terakhir didengar (dipulihkan sesudah muat ulang), atau null. */
  current: string | null;
  positions: Record<string, SavedPosition>;
}

const EMPTY: ListenSaved = { rate: 1, current: null, positions: {} };
const ID = /^[a-z0-9-]+(?:@[a-z0-9-]+)?\/\d+$/u;
const KEY = /^[a-z0-9-]+\/[a-z]{2,3}\/\d+-[0-9a-f]{12}\.mp3$/u;

export function parseListen(raw: string | null): ListenSaved {
  if (raw === null) return EMPTY;
  try {
    const v = JSON.parse(raw) as Partial<ListenSaved>;
    const rate = RATES.includes(v.rate as (typeof RATES)[number]) ? (v.rate as number) : 1;
    const positions: Record<string, SavedPosition> = {};
    for (const [id, p] of Object.entries(v.positions ?? {})) {
      if (
        ID.test(id) &&
        typeof p === "object" &&
        p !== null &&
        typeof p.key === "string" &&
        KEY.test(p.key) &&
        Number.isFinite(p.t) &&
        p.t >= 0 &&
        typeof p.at === "number"
      ) {
        positions[id] = { key: p.key, t: p.t, at: p.at };
      }
    }
    const current = typeof v.current === "string" && ID.test(v.current) ? v.current : null;
    return { rate, current, positions };
  } catch {
    return EMPTY;
  }
}

export function readListen(): ListenSaved {
  try {
    return parseListen(window.localStorage.getItem(LISTEN_KEY));
  } catch {
    return EMPTY;
  }
}

function write(next: ListenSaved): void {
  try {
    window.localStorage.setItem(LISTEN_KEY, JSON.stringify(next));
  } catch {
    // Penyimpanan diblokir: posisi tidak dilanjutkan, pemutar tetap jalan.
  }
}

/** Simpan posisi (detik) satu track dan jadikan track terakhir; yang terlama dibuang bila penuh. */
export function savePosition(
  track: { id: string; key: string },
  t: number,
  now = Date.now(),
): void {
  const saved = readListen();
  const positions = { ...saved.positions, [track.id]: { key: track.key, t, at: now } };
  const ids = Object.keys(positions).sort((a, b) => positions[b]!.at - positions[a]!.at);
  for (const id of ids.slice(LISTEN_MAX_POSITIONS)) delete positions[id];
  write({ ...saved, current: track.id, positions });
}

/** Posisi tersimpan bila kunci objeknya sama (audio yang sama), selain itu 0. */
export function savedPosition(track: { id: string; key: string }): number {
  const p = readListen().positions[track.id];
  return p !== undefined && p.key === track.key ? p.t : 0;
}

export function saveRate(rate: number): void {
  write({ ...readListen(), rate });
}

/** Pemutar ditutup: tidak dipulihkan lagi sesudah muat ulang (posisi tetap disimpan). */
export function clearCurrent(): void {
  write({ ...readListen(), current: null });
}
