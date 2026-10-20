// Memo daftar isi per isolate (#66). `listTocNodes` membaca seluruh pohon (Ihya 313 node + join
// halaman) di setiap getToc/readSection, padahal isinya hanya berubah bersama korpus. Kunci memo =
// isi `meta` korpus (corpus_version, built_at, source_hash) + edisi. Di produksi korpus berganti =
// DB baru + deploy baru (blue-green), jadi kunci selalu berganti. `built_at` = tanggal commit, jadi
// dua build dari commit yang sama (mis. patch daftar isi yang belum di-commit, lalu D1 lokal/staging
// dimuat ulang) bisa berkunci sama: pemanggil yang menemukan node tidak ada di pohon memo membaca
// ulang dengan `fresh` (lihat getToc/readSection). Tanpa ketiga nilai meta (fixture tes, korpus
// lama) atau bila meta tidak terbaca, tidak ada memo. Yang disimpan hasilnya, bukan Promise: di
// Workers, I/O milik satu permintaan tidak boleh ditunggu permintaan lain.
import { getCorpusMeta, listTocNodes } from "@surau/db";
import type { D1Db, TocNodeWithStartRow } from "@surau/db";

/** Batas entri (korpus × edisi); lebih dari itu memo dikosongkan. Ihya: satu entri. */
const MEMO_MAX = 8;
const memo = new Map<string, readonly TocNodeWithStartRow[]>();

async function memoKey(db: D1Db, editionId: number): Promise<string | null> {
  try {
    const meta = await getCorpusMeta(db);
    if (!meta.corpus_version || !meta.built_at || !meta.source_hash) return null;
    return `${meta.corpus_version}|${meta.built_at}|${meta.source_hash}|${editionId}`;
  } catch {
    // meta tidak lolos skema: daftar isi tetap bisa dibaca seperti sebelum ada memo.
    return null;
  }
}

export async function tocNodesOf(
  db: D1Db,
  editionId: number,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<readonly TocNodeWithStartRow[]> {
  const key = await memoKey(db, editionId);
  if (key === null) return listTocNodes(db, editionId);
  const hit = fresh ? undefined : memo.get(key);
  if (hit !== undefined) return hit;
  const rows = await listTocNodes(db, editionId);
  // Edisi tanpa daftar isi (mis. edition_id acak dari MCP) tidak di-memo: tidak mengusir entri lain.
  if (rows.length === 0) return rows;
  if (memo.size >= MEMO_MAX && !memo.has(key)) memo.clear();
  memo.set(key, rows);
  return rows;
}
