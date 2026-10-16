// Perkiraan ukuran keluaran untuk paginasi `readSection` (ARSITEKTUR §4: ±4–6 ribu token;
// MCP sebaiknya ≤10 ribu token per hasil, §8).
//
// Heuristik: 1 token ≈ 2 karakter (unit UTF-16) dari JSON keluaran. Angka ini sengaja konservatif
// untuk teks Arab, yang dipecah tokenizer jauh lebih halus daripada teks Inggris (±3,5 karakter/
// token); untuk bagian JSON berhuruf ASCII (nama field, angka) ia melebih-lebihkan, sehingga
// potongan cenderung lebih kecil, tidak lebih besar. Belum dikalibrasi dengan `count_tokens`
// Anthropic (butuh kunci API); kalibrasi dijadwalkan bersama Worker MCP (S16). ADR-033.

/** Karakter JSON per token (perkiraan konservatif untuk teks Arab). */
export const CHARS_PER_TOKEN = 2;
/** Batas bawah rentang potongan `readSection`: batas halaman cetak hanya dipakai di atas angka ini. */
export const SECTION_MIN_TOKENS = 4_000;
/** Batas atas: blok berikutnya tidak ditambahkan bila potongan akan melewati angka ini. */
export const SECTION_MAX_TOKENS = 6_000;
/**
 * Baris paragraf yang diambil per panggilan `readSection` (+1 untuk mendeteksi kelanjutan),
 * dihitung dari awal halaman cursor. Cukup untuk satu potongan penuh: paragraf terkecil ±125 token
 * setelah JSON (6.000 token ≈ 48 baris), ditambah sisa halaman cursor yang sudah terkirim
 * (halaman terpadat Ihya memuat 41 paragraf).
 */
export const SECTION_ROW_LIMIT = 200;

/** Perkiraan token sebuah nilai setelah diserialisasi ke JSON (seperti dikirim lewat MCP). */
export function estimateTokens(value: unknown): number {
  return Math.ceil((JSON.stringify(value)?.length ?? 0) / CHARS_PER_TOKEN);
}
