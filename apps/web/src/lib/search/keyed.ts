/** Hasil fetch beserta kunci permintaannya (kueri + bagian + percobaan). */
export type Keyed<T> = { key: string; state: T };

/**
 * Tulis hasil hanya bila kuncinya sama dengan hasil yang terakhir ditulis: "Muat lebih banyak" dari
 * kueri lama tidak menimpa hasil kueri baru yang sudah dimuat. Ini lapis kedua; penjaga utamanya
 * pembatalan fetch saat kunci berganti (AbortController di search-client).
 */
export function keepCurrent<T>(prev: Keyed<T> | null, next: Keyed<T>): Keyed<T> | null {
  return prev === null || prev.key === next.key ? next : prev;
}
