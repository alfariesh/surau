// Fixture tes core: fixture kecil S06 (packages/db/test/fixture.ts: 1 karya, 2 edisi, 3 halaman,
// 2 catatan kaki) ditambah satu bagian panjang BUATAN untuk paginasi: node akar "باب طويل" dengan
// satu anak, 12 halaman di juz 3, setiap halaman 4 paragraf badan (kalimat contoh yang diulang)
// + 1 catatan kaki tertaut. Halaman 1–6 kecil (±1,6 ribu token setelah JSON: batas halaman jatuh
// di rentang 4–6 ribu), halaman 7–12 besar (±3,7 ribu token: halaman harus terbelah).
// Tidak ada teks kitab (KONVENSI §Tes).
import { pageId, passageId, tocNodeId } from "@surau/db";
import type { D1Db } from "@surau/db";

import { ED, PASSAGES, seedCorpus } from "../../db/test/fixture.ts";

export * from "../../db/test/fixture.ts";

export const T_LONG = tocNodeId(ED, 4);
export const T_LONG_CHILD = tocNodeId(ED, 5);
export const LONG_PAGES = 12;
export const LONG_BODY_PER_PAGE = 4;
/** Halaman (juz 3, h.1..12) mulai seq 4; halaman 7 dst. milik node anak. */
export const LONG_CHILD_FROM_PAGE = 7;
const SENTENCE = "هذه جملة تجريبية لاختبار تقسيم الأقسام الطويلة ";

/** Paragraf badan ke-`k` (1..4) di halaman `n` (1..12): ±480 (h.1–6) atau ±1.400 karakter. */
export function longBody(n: number, k: number): string {
  const repeat = n >= LONG_CHILD_FROM_PAGE ? 30 : 10;
  return `${SENTENCE.repeat(repeat)}${n}-${k}${k === 1 ? " (١)" : ""}`;
}

/** Paragraf bagian panjang dalam urutan baca: per halaman 4 badan lalu 1 catatan kaki. */
export function longPassageIds(): number[] {
  const ids: number[] = [];
  for (let n = 1; n <= LONG_PAGES; n++) {
    for (let k = 1; k <= LONG_BODY_PER_PAGE + 1; k++) ids.push(longPassageId(n, k));
  }
  return ids;
}

/** k = 1..4 badan, k = 5 catatan kaki. Seq mulai 100 supaya tidak bertabrakan dengan fixture S06. */
export function longPassageId(n: number, k: number): number {
  return passageId(ED, 100 + (n - 1) * 10 + k);
}

export async function seedCore(db: D1Db): Promise<void> {
  await seedCorpus(db);
  // Urutan mengikuti foreign key: halaman → daftar isi → paragraf → penanda/tanda.
  const pages = [];
  const passages = [];
  const refs = [];
  for (let n = 1; n <= LONG_PAGES; n++) {
    const page = pageId(ED, 3 + n);
    const node = n >= LONG_CHILD_FROM_PAGE ? T_LONG_CHILD : T_LONG;
    pages.push(
      db
        .prepare(
          "INSERT INTO page (id, edition_id, seq, juz, page_no, source_page_id) VALUES (?, ?, ?, 3, ?, NULL)",
        )
        .bind(page, ED, 3 + n, n),
    );
    for (let k = 1; k <= LONG_BODY_PER_PAGE; k++) {
      passages.push(
        db
          .prepare(
            "INSERT INTO passage (id, edition_id, page_id, toc_node_id, kind, ord, text_raw) VALUES (?, ?, ?, ?, 'body', ?, ?)",
          )
          .bind(longPassageId(n, k), ED, page, node, k, longBody(n, k)),
      );
    }
    const foot = longPassageId(n, LONG_BODY_PER_PAGE + 1);
    passages.push(
      db
        .prepare(
          "INSERT INTO passage (id, edition_id, page_id, toc_node_id, kind, ord, text_raw) VALUES (?, ?, ?, ?, 'foot', 1, ?)",
        )
        .bind(foot, ED, page, node, `(١) حاشية تجريبية للصفحة ${n}`),
    );
    const start = longBody(n, 1).lastIndexOf("(١)");
    refs.push(
      db
        .prepare(
          "INSERT INTO footnote_ref (passage_id, char_start, char_end, marker, footnote_passage_id) VALUES (?, ?, ?, '١', ?)",
        )
        .bind(longPassageId(n, 1), start, start + 3, foot),
    );
  }
  await db.batch([
    ...pages,
    db
      .prepare(
        `INSERT INTO toc_node (id, edition_id, parent_id, ord, level, title_ar, start_page_id, source_title_id, patched)
         VALUES (?, ?, NULL, 2, 1, 'باب طويل', ?, 4, 0), (?, ?, ?, 1, 2, 'فصل طويل', ?, NULL, 1)`,
      )
      .bind(
        T_LONG,
        ED,
        pageId(ED, 4),
        T_LONG_CHILD,
        ED,
        T_LONG,
        pageId(ED, 3 + LONG_CHILD_FROM_PAGE),
      ),
    ...passages,
    ...refs,
    db
      .prepare("INSERT INTO passage_needs_review (passage_id, reason) VALUES (?, ?), (?, ?)")
      .bind(PASSAGES.foot2, "takhrij_unmatched", PASSAGES.foot2, "footnote_orphan"),
  ]);
}
