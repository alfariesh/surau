// Jalankan tugas async dengan batas konkurensi (count_tokens dan uji kecil). Urutan hasil = urutan
// masukan. Retry 429/5xx ditangani SDK (maxRetries di @surau/llm).
export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number) => void,
): Promise<R[]> {
  const out: R[] = Array.from({ length: items.length });
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i] as T, i);
      done += 1;
      onProgress?.(done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
