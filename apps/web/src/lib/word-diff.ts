// Diff kata sederhana (LCS) untuk daftar "koreksi terbaru" /admin (X08). Hanya teks Indonesia
// (terjemahan), tidak pernah teks Arab. Teks sangat panjang tidak dibandingkan (biaya kuadrat),
// cukup ditandai.

export type DiffPiece = { op: "same" | "add" | "del"; text: string };

/** Batas sel tabel LCS (±1.000 × 1.000 kata). */
export const WORD_DIFF_MAX_CELLS = 1_000_000;

const words = (s: string) => s.split(/(\s+)/u).filter((w) => w !== "");

/** Potongan diff kata `before` → `after` (spasi ikut sebagai token), atau `null` bila terlalu panjang. */
export function wordDiff(before: string, after: string): DiffPiece[] | null {
  const a = words(before);
  const b = words(after);
  if (a.length * b.length > WORD_DIFF_MAX_CELLS) return null;
  // dp[i][j] = panjang LCS a[i..] dan b[j..]
  const cols = b.length + 1;
  const dp = new Uint32Array((a.length + 1) * cols);
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i * cols + j] =
        a[i] === b[j]
          ? dp[(i + 1) * cols + j + 1]! + 1
          : Math.max(dp[(i + 1) * cols + j]!, dp[i * cols + j + 1]!);
  const out: DiffPiece[] = [];
  const push = (op: DiffPiece["op"], text: string) => {
    const last = out.at(-1);
    if (last?.op === op) last.text += text;
    else out.push({ op, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push("same", a[i]!);
      i++;
      j++;
    } else if (dp[(i + 1) * cols + j]! >= dp[i * cols + j + 1]!) push("del", a[i++]!);
    else push("add", b[j++]!);
  }
  while (i < a.length) push("del", a[i++]!);
  while (j < b.length) push("add", b[j++]!);
  return out;
}
