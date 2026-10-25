// Bait syair di teks Shamela (X04 W4): dua *syatr* dipisah " ... " di sumber. Satu aturan untuk
// pembaca web (tata letak dua kolom) dan Intisari (jenis kutipan `poetry`, X15b), supaya keduanya
// tidak pernah berbeda pendapat tentang paragraf mana yang syair.

/** Pemisah bait di sumber Shamela. */
export const VERSE_SEPARATOR = " ... ";
/**
 * Paragraf dianggap bait utuh bila SEMUA bagiannya ≤ 80 karakter. Bait yang menempel di tengah prosa
 * (bagian panjang) tidak ditata, karena batas baitnya tidak bisa diketahui tanpa menebak.
 */
export const SYATR_MAX_CHARS = 80;

/** Batas bagian bait (offset pemisah) bila paragraf = bait saja, atau `null`. */
export function verseBounds(textRaw: string): number[] | null {
  const bounds: number[] = [];
  let at = 0;
  for (;;) {
    const i = textRaw.indexOf(VERSE_SEPARATOR, at);
    if (i === -1) break;
    if (i - at > SYATR_MAX_CHARS || textRaw.slice(at, i).trim() === "") return null;
    bounds.push(i, i + VERSE_SEPARATOR.length);
    at = i + VERSE_SEPARATOR.length;
  }
  if (bounds.length === 0) return null;
  const rest = textRaw.slice(at);
  if (rest.length > SYATR_MAX_CHARS || rest.trim() === "") return null;
  return bounds;
}
