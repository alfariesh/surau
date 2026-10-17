// Perkiraan ukuran keluaran untuk paginasi `readSection` (ARSITEKTUR §4: ±4–6 ribu token per
// hasil; MCP sebaiknya ≤10 ribu token per hasil, §8).
//
// Heuristik: 1 token ≈ 1,4 karakter (unit UTF-16) dari JSON keluaran. Dikalibrasi di S16 (ADR-033,
// ADR-049) dengan `count_tokens` Claude atas potongan `read_section` Ihya lewat MCP. Sebelum: 81
// potongan dengan heuristik lama (2 karakter/token) median 7.690 token sebenarnya; JSON `passages`
// median 1,63 karakter/token, p5 1,5, min. 1,38, jadi 1,4 dipilih dekat minimum itu. Sesudah (84
// potongan, data/reports/mcp-token.md): seluruh hasil tool median 5.037, maks. 6.193 token; token
// `passages` / perkiraan median 0,88, maks. 1,11 (teks Arab terpadat ±11% di atas perkiraan).
// Batas atas 5.000 token untuk `passages` menyisakan ±1.000 token untuk citation, node, ancestors,
// dan blok lisensi MCP, sehingga seluruh hasil tool ≤ ±6 ribu token.

/** Karakter JSON per token (dikalibrasi S16 dengan `count_tokens` Claude, konservatif). */
export const CHARS_PER_TOKEN = 1.4;
/** Batas bawah rentang potongan `readSection`: batas halaman cetak hanya dipakai di atas angka ini. */
export const SECTION_MIN_TOKENS = 3_500;
/** Batas atas: blok berikutnya tidak ditambahkan bila potongan akan melewati angka ini. */
export const SECTION_MAX_TOKENS = 5_000;
/**
 * Baris paragraf yang diambil per panggilan `readSection` (+1 untuk mendeteksi kelanjutan),
 * dihitung dari awal halaman cursor. Cukup untuk satu potongan penuh: paragraf terkecil ±125 token
 * setelah JSON (5.000 token ≈ 40 baris), ditambah sisa halaman cursor yang sudah terkirim
 * (halaman terpadat Ihya memuat 41 paragraf).
 */
export const SECTION_ROW_LIMIT = 200;

/** Perkiraan token sebuah nilai setelah diserialisasi ke JSON (seperti dikirim lewat MCP). */
export function estimateTokens(value: unknown): number {
  return Math.ceil((JSON.stringify(value)?.length ?? 0) / CHARS_PER_TOKEN);
}
