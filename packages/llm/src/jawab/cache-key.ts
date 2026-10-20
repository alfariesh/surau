// Kunci cache Jawab: HMAC-SHA256 (kunci rahasia Worker, S20) atas versi korpus + versi prompt +
// pertanyaan yang dirapikan. Teks pertanyaan sendiri tidak disimpan (ADR-064). S19 memakai SHA-256
// polos, yang bisa dibalik dengan kamus oleh pemegang akses D1; dengan HMAC, kunci tanpa secret
// tidak bisa dicocokkan dengan pertanyaan tebakan (ADR-065). Perapian hanya huruf kecil, spasi,
// dan tanda baca akhir: bukan normalisasi Arab (itu hanya di packages/text), jadi pertanyaan Arab
// yang berbeda harakat mendapat kunci berbeda (cache meleset, tidak salah).
export function tidyQuestion(question: string): string {
  return question
    .toLocaleLowerCase("id")
    .replaceAll(/\s+/gu, " ")
    .trim()
    .replace(/[\s?!.。؟]+$/u, "");
}

/** Kunci Web Crypto (tipe struktural: sama di Workers dan Node). */
export type HmacKey = Parameters<typeof crypto.subtle.sign>[1];

/** `key` = kunci HMAC-SHA256 dengan kegunaan `sign` (turunan secret Worker). Hasil 64 hex. */
export async function answerCacheKey(
  question: string,
  corpusVersion: string,
  promptVersion: string,
  key: HmacKey,
): Promise<string> {
  const data = new TextEncoder().encode(
    `${corpusVersion}\n${promptVersion}\n${tidyQuestion(question)}`,
  );
  const mac = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
}
