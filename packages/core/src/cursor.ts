// Cursor paginasi `readSection`: base64url dari JSON kecil {v, n, j, p, o} = versi format, node,
// juz dan halaman cetak, dan `ord` paragraf badan pertama potongan berikutnya di halaman itu
// (0 = dari awal halaman). Isinya bukan rahasia; cursor dibuat opak supaya klien MCP tidak
// menyusunnya sendiri, dan selalu divalidasi ulang (node harus sama).
import { z } from "zod";

import { InvalidCitation } from "./errors.ts";

const CURSOR_VERSION = 1;

const cursorBody = z.strictObject({
  v: z.literal(CURSOR_VERSION),
  n: z.number().int().positive(),
  j: z.number().int().positive(),
  p: z.number().int().nonnegative(),
  o: z.number().int().nonnegative(),
});

export interface SectionCursor {
  nodeId: number;
  juz: number;
  pageNo: number;
  /** `ord` paragraf badan pertama yang belum dikirim di halaman itu; 0 = awal halaman. */
  bodyOrd: number;
}

export function encodeCursor(c: SectionCursor): string {
  const json = JSON.stringify({
    v: CURSOR_VERSION,
    n: c.nodeId,
    j: c.juz,
    p: c.pageNo,
    o: c.bodyOrd,
  });
  // JSON ini hanya berisi ASCII, jadi btoa aman tanpa TextEncoder.
  return btoa(json).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

/** Cursor → posisi. `InvalidCitation` bila rusak, versi lain, atau milik node lain. */
export function decodeCursor(cursor: string, nodeId: number): SectionCursor {
  if (!/^[A-Za-z0-9_-]+$/.test(cursor)) throw new InvalidCitation("Invalid cursor");
  let body: unknown;
  try {
    body = JSON.parse(atob(cursor.replaceAll("-", "+").replaceAll("_", "/")));
  } catch {
    throw new InvalidCitation("Invalid cursor");
  }
  const parsed = cursorBody.safeParse(body);
  if (!parsed.success || parsed.data.n !== nodeId) throw new InvalidCitation("Invalid cursor");
  const { n, j, p, o } = parsed.data;
  return { nodeId: n, juz: j, pageNo: p, bodyOrd: o };
}
