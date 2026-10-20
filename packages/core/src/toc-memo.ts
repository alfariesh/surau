// Memo daftar isi per isolate (#66). `listTocNodes` membaca seluruh pohon (Ihya 313 node + join
// halaman) di setiap getToc/readSection, padahal isinya hanya berubah bersama korpus. Kunci memo =
// isi `meta` korpus (corpus_version, built_at, source_hash): korpus lain, build ulang, atau staging
// yang dimuat ulang dari build lain selalu punya kunci lain, jadi memo tidak pernah basi. Tanpa
// ketiganya (fixture tes, korpus lama) tidak ada memo. Yang disimpan hasilnya, bukan Promise: di
// Workers, I/O milik satu permintaan tidak boleh ditunggu permintaan lain.
import { getCorpusMeta, listTocNodes } from "@surau/db";
import type { D1Db, TocNodeWithStartRow } from "@surau/db";

/** Batas entri (korpus × edisi); lebih dari itu memo dikosongkan. Ihya: satu entri. */
const MEMO_MAX = 8;
const memo = new Map<string, readonly TocNodeWithStartRow[]>();

export async function tocNodesOf(
  db: D1Db,
  editionId: number,
): Promise<readonly TocNodeWithStartRow[]> {
  const meta = await getCorpusMeta(db);
  if (!meta.corpus_version || !meta.built_at || !meta.source_hash) {
    return listTocNodes(db, editionId);
  }
  const key = `${meta.corpus_version}|${meta.built_at}|${meta.source_hash}|${editionId}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const rows = await listTocNodes(db, editionId);
  if (memo.size >= MEMO_MAX) memo.clear();
  memo.set(key, rows);
  return rows;
}
