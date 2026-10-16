// Fixture kecil BUATAN (bukan teks kitab, bukan Shamela; KONVENSI §Tes): 1 karya, 1 edisi,
// 3 halaman di 2 juz, 2 catatan kaki. Teks Arabnya kalimat contoh netral.
import { pageId, passageId, tocNodeId } from "../src/ids.ts";
import type { D1Db } from "../src/d1.ts";

export const ED = 7;
export const P1 = pageId(ED, 1); // juz 1 h.1
export const P2 = pageId(ED, 2); // juz 1 h.2
export const P3 = pageId(ED, 3); // juz 2 h.1
export const T_ROOT = tocNodeId(ED, 1);
export const T_CHILD_A = tocNodeId(ED, 2);
export const T_CHILD_B = tocNodeId(ED, 3);

export const BODY_1 = "هذا نص تجريبي (١) في الصفحة الأولى (٢)";
export const FOOT_1 = "(١) حاشية تجريبية أولى";
export const FOOT_2 = "(٢) حاشية تجريبية ثانية";

export const PASSAGES = {
  body1: passageId(ED, 1),
  foot1: passageId(ED, 2),
  foot2: passageId(ED, 3),
  body2: passageId(ED, 4),
  body3: passageId(ED, 5),
} as const;

/** Kosongkan tabel korpus lalu isi fixture. Idempoten (boleh dipanggil di setiap beforeAll). */
export async function seedCorpus(db: D1Db): Promise<void> {
  const del = [
    "footnote_ref",
    "passage_needs_review",
    "translation",
    "summary",
    "passage",
    "toc_node",
    "page",
    "edition",
    "work",
    "author",
  ].map((t) => db.prepare(`DELETE FROM ${t}`));
  const marker1 = BODY_1.indexOf("(١)");
  const marker2 = BODY_1.indexOf("(٢)");
  await db.batch([
    ...del,
    db.prepare("DELETE FROM meta WHERE key <> 'schema_version'"),
    db
      .prepare("INSERT INTO author (id, name_ar, name_id, death_hijri) VALUES (?, ?, ?, ?)")
      .bind(1, "مؤلف تجريبي", "Penulis Uji", 505),
    db
      .prepare(
        `INSERT INTO work (id, slug, openiti_uri, title_ar, title_id, author_id, attribution_status, period)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(1, "uji", "0505Uji.KitabUji", "كتاب تجريبي", "Kitab Uji", 1, "authentic", "klasik"),
    db
      .prepare(
        `INSERT INTO edition (id, work_id, slug, is_default, source, source_ref, volumes, license, attribution)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        ED,
        1,
        "shamela",
        1,
        "shamela",
        "0",
        2,
        "CC BY-NC-SA 4.0",
        "Fixture buatan",
        ED + 1,
        1,
        "openiti",
        0,
        "openiti",
        "0505Uji.KitabUji.Uji001",
        2,
        "CC BY-NC-SA 4.0",
        "Fixture buatan",
      ),
    db
      .prepare(
        `INSERT INTO page (id, edition_id, seq, juz, page_no, source_page_id)
         VALUES (?, ?, 1, 1, 1, 101), (?, ?, 2, 1, 2, 102), (?, ?, 3, 2, 1, 103)`,
      )
      .bind(P1, ED, P2, ED, P3, ED),
    db
      .prepare(
        `INSERT INTO toc_node (id, edition_id, parent_id, ord, level, title_ar, start_page_id, source_title_id)
         VALUES (?, ?, NULL, 1, 1, 'باب تجريبي', ?, 1),
                (?, ?, ?, 2, 2, 'فصل ثان', ?, 3),
                (?, ?, ?, 1, 2, 'فصل أول', ?, 2)`,
      )
      .bind(T_ROOT, ED, P1, T_CHILD_A, ED, T_ROOT, P2, T_CHILD_B, ED, T_ROOT, P1),
    db
      .prepare(
        `INSERT INTO passage (id, edition_id, page_id, toc_node_id, kind, ord, text_raw) VALUES
           (?, ?, ?, ?, 'foot', 2, ?),
           (?, ?, ?, ?, 'body', 1, ?),
           (?, ?, ?, ?, 'foot', 1, ?),
           (?, ?, ?, ?, 'body', 1, 'نص الصفحة الثانية'),
           (?, ?, ?, ?, 'body', 1, 'نص الجزء الثاني')`,
      )
      .bind(
        PASSAGES.foot2,
        ED,
        P1,
        T_CHILD_B,
        FOOT_2,
        PASSAGES.body1,
        ED,
        P1,
        T_CHILD_B,
        BODY_1,
        PASSAGES.foot1,
        ED,
        P1,
        T_CHILD_B,
        FOOT_1,
        PASSAGES.body2,
        ED,
        P2,
        T_CHILD_A,
        PASSAGES.body3,
        ED,
        P3,
        T_CHILD_A,
      ),
    db
      .prepare(
        `INSERT INTO footnote_ref (passage_id, char_start, char_end, marker, footnote_passage_id)
         VALUES (?, ?, ?, '١', ?), (?, ?, ?, '٢', ?)`,
      )
      .bind(
        PASSAGES.body1,
        marker1,
        marker1 + 3,
        PASSAGES.foot1,
        PASSAGES.body1,
        marker2,
        marker2 + 3,
        PASSAGES.foot2,
      ),
  ]);
}
