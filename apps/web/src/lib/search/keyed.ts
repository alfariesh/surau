/** Hasil fetch beserta kunci permintaannya (kueri + bagian + percobaan). */
export type Keyed<T> = { key: string; state: T };

/**
 * Tulis hasil hanya bila kuncinya masih yang terakhir dipakai. Fetch lambat dari kueri lama (mis.
 * "Muat lebih banyak" yang selesai setelah kueri berganti) tidak boleh menimpa hasil kueri baru.
 */
export function keepCurrent<T>(prev: Keyed<T> | null, next: Keyed<T>): Keyed<T> | null {
  return prev === null || prev.key === next.key ? next : prev;
}
