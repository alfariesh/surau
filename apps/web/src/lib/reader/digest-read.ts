// Tanda "sudah dibaca" Intisari (X16) di browser ini: daftar ID node yang Intisari-nya sudah dibaca
// sampai bagian "Lanjut ke teks lengkap". Hanya di localStorage (dicatat di /privasi), tidak pernah
// dikirim ke server. Penyimpanan diblokir atau isi rusak = belum ada yang dibaca.

export const DIGEST_READ_KEY = "surau:intisari:read:v1";
/** Batas entri (lebih dari jumlah Intisari Ihya, ±311); yang paling lama dibuang. */
export const DIGEST_READ_MAX = 600;

/** ID dari isi mentah penyimpanan; bentuk tidak sah = kosong. */
export function parseReadIds(raw: string | null): number[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is number => Number.isInteger(v) && v > 0);
  } catch {
    return [];
  }
}

/** Daftar baru sesudah `nodeId` ditandai: dipindah ke akhir, paling banyak `DIGEST_READ_MAX`. */
export function withRead(ids: readonly number[], nodeId: number): number[] {
  return [...ids.filter((id) => id !== nodeId), nodeId].slice(-DIGEST_READ_MAX);
}

const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(DIGEST_READ_KEY);
  } catch {
    return null;
  }
}

/** Isi mentah penyimpanan (snapshot `useSyncExternalStore`: string stabil, bukan array baru). */
export const readSnapshot = (): string | null => readRaw();

export function subscribeRead(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === DIGEST_READ_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function markDigestRead(nodeId: number): void {
  try {
    const next = withRead(parseReadIds(readRaw()), nodeId);
    window.localStorage.setItem(DIGEST_READ_KEY, JSON.stringify(next));
  } catch {
    // Penyimpanan diblokir atau penuh: tanda tidak tersimpan, Intisari tetap terbaca.
  }
  for (const l of listeners) l();
}
