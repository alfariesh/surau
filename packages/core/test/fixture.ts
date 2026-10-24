// Fixture tes core: fixture kecil S06 (packages/db/test/fixture.ts: 1 karya, 2 edisi, 3 halaman,
// 2 catatan kaki) ditambah satu bagian panjang BUATAN untuk paginasi: node akar "باب طويل" dengan
// satu anak, 12 halaman di juz 3, setiap halaman 4 paragraf badan (kalimat contoh yang diulang)
// + 1 catatan kaki tertaut. Halaman 1–6 kecil (±2,3 ribu token setelah JSON: batas halaman jatuh
// di rentang 3,5–5 ribu), halaman 7–12 besar (±5,3 ribu token: halaman harus terbelah).
// Tambahan untuk kasus tepi blok: catatan kaki yatim (tidak dirujuk) di h.8, dan h.13 yang hanya
// berisi catatan kaki. Tidak ada teks kitab (KONVENSI §Tes).
import { pageId, passageId, tocNodeId } from "@surau/db";
import type { D1Db } from "@surau/db";
import {
  LATIN_NORM_VERSION,
  NORM_VERSION,
  latinIndexText,
  normalizeArabic,
  stemText,
} from "@surau/text";
import { z } from "zod";

import { BODY_1, ED, PASSAGES, T_ROOT, seedCorpus } from "../../db/test/fixture.ts";
import { textSha256 } from "../src/translation-revision.ts";

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

/** Halaman yang punya catatan kaki yatim (ord 2, tidak dirujuk paragraf badan mana pun). */
export const ORPHAN_PAGE = 8;
export const ORPHAN_FOOT = passageId(ED, 300);
/** Halaman (juz 3) yang hanya berisi catatan kaki, milik node anak. */
export const FOOT_ONLY_PAGE = LONG_PAGES + 1;
export const FOOT_ONLY = passageId(ED, 301);

/** Paragraf bagian panjang dalam urutan baca: per halaman 4 badan lalu catatan kakinya. */
export function longPassageIds(): number[] {
  const ids: number[] = [];
  for (let n = 1; n <= LONG_PAGES; n++) {
    for (let k = 1; k <= LONG_BODY_PER_PAGE + 1; k++) ids.push(longPassageId(n, k));
    if (n === ORPHAN_PAGE) ids.push(ORPHAN_FOOT);
  }
  ids.push(FOOT_ONLY);
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
  pages.push(
    db
      .prepare(
        "INSERT INTO page (id, edition_id, seq, juz, page_no, source_page_id) VALUES (?, ?, ?, 3, ?, NULL)",
      )
      .bind(pageId(ED, 3 + FOOT_ONLY_PAGE), ED, 3 + FOOT_ONLY_PAGE, FOOT_ONLY_PAGE),
  );
  passages.push(
    db
      .prepare(
        "INSERT INTO passage (id, edition_id, page_id, toc_node_id, kind, ord, text_raw) VALUES (?, ?, ?, ?, 'foot', 2, ?), (?, ?, ?, ?, 'foot', 1, ?)",
      )
      .bind(
        ORPHAN_FOOT,
        ED,
        pageId(ED, 3 + ORPHAN_PAGE),
        T_LONG_CHILD,
        "(٢) حاشية يتيمة تجريبية",
        FOOT_ONLY,
        ED,
        pageId(ED, 3 + FOOT_ONLY_PAGE),
        T_LONG_CHILD,
        "(٣) حاشية في صفحة بلا متن",
      ),
  );
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

/**
 * Indeks pencarian untuk SEMUA paragraf fixture, dengan aturan yang sama dengan ingest (S11,
 * ADR-039): stem dari bentuk normal, kolom sesuai kind, body/foot kosong. `common` = stem yang
 * dicatat sebagai kata sangat umum (df dihitung dari indeks). `meta.norm_version` = NORM_VERSION.
 */
export async function seedSearchIndex(db: D1Db, common: readonly string[] = []): Promise<void> {
  const { results } = await db.prepare("SELECT id, kind, text_raw FROM passage ORDER BY id").all();
  const stems = results
    .map((r) => z.object({ id: z.number(), kind: z.string(), text_raw: z.string() }).parse(r))
    .map((r) => ({ ...r, stem: stemText(normalizeArabic(r.text_raw).text) }));
  const df = (term: string): number => stems.filter((r) => r.stem.split(" ").includes(term)).length;
  await db.batch([
    db.prepare("INSERT INTO passage_fts (passage_fts) VALUES ('delete-all')"),
    db.prepare("DELETE FROM term_stat"),
    db
      .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('norm_version', ?)")
      .bind(String(NORM_VERSION)),
    ...common.map((term) =>
      db.prepare("INSERT INTO term_stat (term, df) VALUES (?, ?)").bind(term, df(term)),
    ),
    ...stems.map((r) =>
      db
        .prepare(
          "INSERT INTO passage_fts (rowid, body, foot, sbody, sfoot) VALUES (?, '', '', ?, ?)",
        )
        .bind(r.id, r.kind === "body" ? r.stem : "", r.kind === "foot" ? r.stem : ""),
    ),
  ]);
}

// ── Teks AI buatan (S14) ─────────────────────────────────────────────────────────────────
// Terjemahan dan ringkasan BUATAN (kalimat contoh, bukan terjemahan kitab), beserta indeks
// Indonesia yang diisi dengan aturan ingest (placeholder ayat dibuang, `latinIndexText`).

/** Kalimat pengisi untuk menguji potongan (snippet) teks AI yang panjang. */
const FILLER = "Kalimat pengisi yang cukup panjang untuk menguji potongan teks. ";

export const AI_TRANSLATIONS: Readonly<Record<number, string>> = {
  [PASSAGES.body1]: "Kesabaran adalah cahaya bagi murid yang menuntut ilmu (١) dan adab (٢).",
  [PASSAGES.body2]: `${FILLER.repeat(3)}Guru yang sabar ⟦QS 1:2-3⟧ mengajarkan adab kepada muridnya.`,
  [PASSAGES.body3]: "Niat yang ikhlas menjadi dasar amal.",
};

export const AI_SUMMARIES: Readonly<Record<number, string>> = {
  [tocNodeId(ED, 1)]: "Bab ini membahas niat dan adab.",
  [tocNodeId(ED, 2)]: "Pasal tentang sabar dan syukur.",
};

export async function seedAiText(db: D1Db): Promise<void> {
  const ai = (table: string, key: string) =>
    `INSERT INTO ${table} (${key}, lang, text, model, prompt_version, created_at) VALUES (?, 'id', ?, 'model-uji', ?, '2026-10-17')`;
  const index = (text: string) => latinIndexText(text.replace(/⟦QS [^⟧]*⟧/g, " "));
  await db.batch([
    db.prepare("DELETE FROM translation_review"),
    db.prepare("DELETE FROM translation"),
    db.prepare("DELETE FROM summary"),
    db.prepare("INSERT INTO translation_fts (translation_fts) VALUES ('delete-all')"),
    db.prepare("INSERT INTO summary_fts (summary_fts) VALUES ('delete-all')"),
    db
      .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('latin_norm_version', ?)")
      .bind(String(LATIN_NORM_VERSION)),
    ...Object.entries(AI_TRANSLATIONS).flatMap(([id, text]) => [
      db.prepare(ai("translation", "passage_id")).bind(Number(id), text, "translate-passage@2"),
      db
        .prepare("INSERT INTO translation_fts (rowid, terms) VALUES (?, ?)")
        .bind(Number(id), index(text)),
    ]),
    ...Object.entries(AI_SUMMARIES).flatMap(([id, text]) => [
      db.prepare(ai("summary", "toc_node_id")).bind(Number(id), text, "summarize-section@2"),
      db
        .prepare("INSERT INTO summary_fts (rowid, terms) VALUES (?, ?)")
        .bind(Number(id), index(text)),
    ]),
  ]);
}

/**
 * Tinjauan manusia buatan (X08, skema 8) atas terjemahan fixture: `revised` = teks diganti `text`
 * (draf AI disimpan di `ai_text`); status `ustadz_verified` untuk peran ustadz. Nama uji, bukan orang.
 */
export async function seedHumanReview(
  db: D1Db,
  r: {
    passage_id: number;
    revised: boolean;
    text?: string;
    role?: "ustadz" | "editor";
    shared?: boolean;
  },
): Promise<void> {
  const draft = AI_TRANSLATIONS[r.passage_id] ?? "";
  const role = r.role ?? "ustadz";
  await db.batch([
    db
      .prepare(
        "UPDATE translation SET text = ?, review_status = ? WHERE passage_id = ? AND lang = 'id'",
      )
      .bind(
        r.revised ? (r.text ?? draft) : draft,
        role === "ustadz" ? "ustadz_verified" : "reviewed",
        r.passage_id,
      ),
    db
      .prepare(
        `INSERT OR REPLACE INTO translation_review (passage_id, lang, revision_id, revised, reviewed_at,
           reviewer_name, reviewer_short, reviewer_role, reviewer_public, ai_text)
         VALUES (?, 'id', 7, ?, '2026-10-22T03:00:00.000Z', ?, ?, ?, ?, ?)`,
      )
      .bind(
        r.passage_id,
        r.revised ? 1 : 0,
        role === "ustadz" ? "Ust. Uji Lc." : "Editor Uji",
        role === "ustadz" ? "Ust. Uji" : "Editor Uji",
        role,
        r.shared === false ? 0 : 1,
        r.revised ? draft : null,
      ),
  ]);
}

/**
 * Intisari Kitab BUATAN untuk T_ROOT (X16, tes MCP `get_section_digest`): satu gagasan berjangkar ke
 * BODY_1 utuh, satu kutipan = BODY_1 utuh (sidik dihitung dari teks DB), satu pertanyaan. Teks AI
 * kalimat contoh. Idempoten: baris lama T_ROOT dihapus dulu.
 */
export async function seedDigest(db: D1Db): Promise<void> {
  const AI = "'model-uji', 'digest-book@1', '2026-10-24'";
  const sha = await textSha256(BODY_1);
  const del = (table: string) =>
    db.prepare(`DELETE FROM ${table} WHERE toc_node_id = ?`).bind(T_ROOT);
  await db.batch([
    ...["digest_question", "digest_quote", "digest_anchor", "digest_point", "digest_term"].map(del),
    del("audio_track"),
    del("digest"),
    db
      .prepare(
        `INSERT INTO digest (toc_node_id, lang, tier, basis, opening, abstract, closing,
           source_sha256, model, prompt_version, created_at)
         VALUES (?1, 'id', 'book', 'children', 'Pembuka contoh.', 'Abstrak contoh.',
           'Penutup contoh.', ?2, ${AI})`,
      )
      .bind(T_ROOT, "a".repeat(64)),
    db
      .prepare(
        `INSERT INTO digest_point (toc_node_id, lang, ord, kind, stance, title, body)
         VALUES (?1, 'id', 1, 'idea', 'author', 'Gagasan contoh', 'Isi gagasan contoh.')`,
      )
      .bind(T_ROOT),
    db
      .prepare(
        `INSERT INTO digest_anchor (toc_node_id, lang, point_ord, seq, passage_id, char_start, char_end)
         VALUES (?1, 'id', 1, 1, ?2, 0, ?3)`,
      )
      .bind(T_ROOT, PASSAGES.body1, BODY_1.length),
    db
      .prepare(
        `INSERT INTO digest_quote (toc_node_id, lang, ord, point_ord, passage_id, char_start,
           char_end, raw_sha256, kind, translation_source, translation, model, prompt_version,
           created_at)
         VALUES (?1, 'id', 1, 1, ?2, 0, ?3, ?4, 'text', 'digest', 'Terjemahan kutipan contoh.', ${AI})`,
      )
      .bind(T_ROOT, PASSAGES.body1, BODY_1.length, sha),
    db
      .prepare(
        `INSERT INTO digest_question (toc_node_id, lang, ord, point_ord, text)
         VALUES (?1, 'id', 1, 1, 'Pertanyaan contoh?')`,
      )
      .bind(T_ROOT),
  ]);
}
