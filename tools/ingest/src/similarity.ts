// Ukuran kemiripan token untuk QA sumber (verify-openiti). Token = hasil `normalizeArabic` dipecah
// spasi, jadi harakat, ejaan alif/ya/ta marbuta, dan penanda (١) tidak dihitung sebagai beda.

/**
 * Rasio kemiripan dua barisan token: `2·LCS / (|a| + |b|)` (1 = identik, 0 = tak ada yang sama),
 * dihitung dengan algoritma Myers O((N+M)·D). Bila jarak sunting D melewati `maxD`, perhitungan
 * berhenti dan hasilnya batas atas `1 − (maxD+1)/(N+M)` (sudah pasti di bawah ambang yang dipakai).
 */
export function tokenRatio(a: readonly string[], b: readonly string[], maxD?: number): number {
  const n = a.length;
  const m = b.length;
  if (n + m === 0) return 1;
  const limit = Math.min(maxD ?? n + m, n + m);
  const offset = limit + 1;
  const v = new Int32Array(2 * limit + 3);
  for (let d = 0; d <= limit; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && (v[offset + k - 1] as number) < (v[offset + k + 1] as number))
          ? (v[offset + k + 1] as number)
          : (v[offset + k - 1] as number) + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) return 1 - d / (n + m);
    }
  }
  return 1 - (limit + 1) / (n + m);
}

function bigrams(tokens: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 1; i < tokens.length; i++) out.add(`${tokens[i - 1]} ${tokens[i]}`);
  return out;
}

/**
 * Seberapa besar `needle` termuat di `hay`: bagian bigram token `needle` yang juga ada di `hay`
 * (0..1). Dipakai untuk mencocokkan satu catatan takhrij dengan segmen takhrij JK000001 yang bisa
 * lebih panjang (pasangan ` + ` di JK tidak andal, jadi segmen kadang menggabung beberapa takhrij).
 */
export function bigramContainment(needle: readonly string[], hay: readonly string[]): number {
  const need = bigrams(needle);
  if (need.size === 0) return 0;
  const have = bigrams(hay);
  let hit = 0;
  for (const g of need) if (have.has(g)) hit++;
  return hit / need.size;
}
