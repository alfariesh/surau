// Format kecil halaman Intisari (X16), sama di server dan klien.

/** Tanggal ISO (YYYY-MM-DD atau waktu lengkap) → "24 Oktober 2026" (UTC); tidak sah = apa adanya. */
export function longDate(iso: string): string {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/u.test(iso) ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "UTC" }).format(date);
}

/** Jangkar elemen gagasan dan dalil di halaman Intisari. */
export const pointAnchor = (ord: number) => `gagasan-${ord}`;
export const ayahAnchor = (i: number) => `dalil-ayat-${i + 1}`;
export const hadithAnchor = (i: number) => `dalil-hadits-${i + 1}`;
