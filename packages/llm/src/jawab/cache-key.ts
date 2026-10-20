// Kunci cache Jawab (S19): SHA-256 dari versi korpus + versi prompt + pertanyaan yang dirapikan.
// Teks pertanyaan sendiri tidak disimpan (ADR-064). Perapian hanya huruf kecil, spasi, dan tanda
// baca akhir: bukan normalisasi Arab (itu hanya di packages/text), jadi pertanyaan Arab yang
// berbeda harakat mendapat kunci berbeda (cache meleset, tidak salah).
export function tidyQuestion(question: string): string {
  return question
    .toLocaleLowerCase("id")
    .replaceAll(/\s+/gu, " ")
    .trim()
    .replace(/[\s?!.。؟]+$/u, "");
}

export async function answerCacheKey(
  question: string,
  corpusVersion: string,
  promptVersion: string,
): Promise<string> {
  const data = new TextEncoder().encode(
    `${corpusVersion}\n${promptVersion}\n${tidyQuestion(question)}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
