// Fixture kecil BUATAN (bukan teks kitab, bukan Shamela; KONVENSI §Tes): 1 karya, 1 edisi,
// 3 halaman di 2 juz, 2 catatan kaki. Teks Arabnya kalimat contoh netral. Ditambah "mushaf" buatan
// 1 surah × 3 ayat (BUKAN teks Al-Qur'an) dan satu rujukan ayat di paragraf halaman 2 (S12).
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

export const BODY_2 = "نص الصفحة الثانية";
/** Rujukan ayat buatan di BODY_2: "الصفحة الثانية" → 1:2–3, sebagian, berkurung. */
export const AYAH_REF = {
  passage_id: PASSAGES.body2,
  char_start: BODY_2.indexOf("الصفحة"),
  char_end: BODY_2.length,
  surah: 1,
  ayah_from: 2,
  ayah_to: 3,
  match: "exact",
  partial: 1,
  bracketed: 1,
  alt_count: 0,
} as const;
export const QURAN_TRANSLATION_1_2 = "Terjemahan uji ayat dua1) dengan catatan.";
export const QURAN_FOOTNOTES_1_2 = [{ marker: "1)", text: "Catatan kaki terjemahan uji." }];

/** Kosongkan tabel korpus lalu isi fixture. Idempoten (boleh dipanggil di setiap beforeAll). */
export async function seedCorpus(db: D1Db): Promise<void> {
  const del = [
    // Intisari (skema 9) lebih dulu: anak dari toc_node dan passage.
    "audio_track",
    "digest_term",
    "digest_question",
    "digest_quote",
    "digest_anchor",
    "digest_point",
    "digest",
    "glossary_term",
    "passage_ayah_ref",
    "quran_translation",
    "quran_ayah",
    "quran_surah",
    "quran_source",
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
           (?, ?, ?, ?, 'body', 1, ?),
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
        BODY_2,
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
    db
      .prepare(
        `INSERT INTO quran_source (id, kind, lang, name, version, license, attribution, url, sha256) VALUES
           ('kemenag-id', 'translation', 'id', 'Terjemahan Uji', 'v-uji', 'Lisensi uji', 'Atribusi terjemahan uji', 'https://contoh.test', ?),
           ('kemenag-latin', 'transliteration', 'id', 'Transliterasi Uji', 'v-uji', 'Lisensi uji', 'Atribusi transliterasi uji', 'https://contoh.test', ?),
           ('tanzil-simple-clean', 'text', 'ar', 'Teks Indeks Uji', '1.1', 'CC BY 3.0', 'Atribusi teks uji', 'https://contoh.test', ?),
           ('tanzil-uthmani', 'text', 'ar', 'Teks Uthmani Uji', '1.1', 'CC BY 3.0', 'Atribusi teks uji', 'https://contoh.test', ?)`,
      )
      .bind("a".repeat(64), "b".repeat(64), "c".repeat(64), "d".repeat(64)),
    db.prepare(
      "INSERT INTO quran_surah (surah, name_ar, name_latin, revelation, ayah_count) VALUES (1, 'الأولى', 'Al-Ula', 'makkah', 3)",
    ),
    db.prepare(
      `INSERT INTO quran_ayah (surah, ayah, juz, text_uthmani, text_index) VALUES
         (1, 1, 1, 'كَلِمَةٌ أُولَى', 'كلمة أولى'),
         (1, 2, 1, 'الصَّفْحَةُ', 'الصفحة'),
         (1, 3, 1, 'الثَّانِيَةُ', 'الثانية')`,
    ),
    db
      .prepare(
        `INSERT INTO quran_translation (surah, ayah, source_id, text, footnotes) VALUES
           (1, 1, 'kemenag-id', 'Terjemahan uji ayat satu.', NULL),
           (1, 1, 'kemenag-latin', 'Translit 1:1', NULL),
           (1, 2, 'kemenag-id', ?, ?),
           (1, 2, 'kemenag-latin', 'Translit 1:2', NULL),
           (1, 3, 'kemenag-id', 'Terjemahan uji ayat tiga.', NULL),
           (1, 3, 'kemenag-latin', 'Translit 1:3', NULL)`,
      )
      .bind(QURAN_TRANSLATION_1_2, JSON.stringify(QURAN_FOOTNOTES_1_2)),
    db
      .prepare(
        `INSERT INTO passage_ayah_ref (passage_id, char_start, char_end, surah, ayah_from, ayah_to, match, partial, bracketed, alt_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        AYAH_REF.passage_id,
        AYAH_REF.char_start,
        AYAH_REF.char_end,
        AYAH_REF.surah,
        AYAH_REF.ayah_from,
        AYAH_REF.ayah_to,
        AYAH_REF.match,
        AYAH_REF.partial,
        AYAH_REF.bracketed,
        AYAH_REF.alt_count,
      ),
  ]);
}
