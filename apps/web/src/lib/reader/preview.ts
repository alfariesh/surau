// Pratinjau huruf di panel Tampilan: awal teks paragraf, disalin apa adanya dari `text_raw` (DB) dan
// dipotong hanya di spasi, supaya tidak ada huruf yang terpisah dari harakatnya (teks-arab.md:
// kode menyalin, tidak mengubah huruf). Tanpa spasi di awal paragraf → tanpa pratinjau.

export const PREVIEW_CHARS = 90;

export function previewSample(text: string | undefined, max = PREVIEW_CHARS): string | null {
  if (text === undefined) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.lastIndexOf(" ", max);
  return cut > 0 ? trimmed.slice(0, cut).trimEnd() : null;
}
