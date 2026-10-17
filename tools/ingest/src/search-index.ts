// Indeks pencarian Arab (S11, ADR-039): baris `passage_fts` dan statistik stem umum (`term_stat`).
// Bentuk normal + stem dihitung HANYA lewat @surau/text, identik dengan sisi kueri (`buildFtsMatch`).
// Yang diindeks hanya kolom stem (`sbody`/`sfoot`); `body`/`foot` diisi string kosong (ADR-039):
// kueri memakai filter kolom `{sbody sfoot}`, dan kolom normal menambah ±36% ukuran indeks tanpa
// dipakai. Mode "kata persis" kelak cukup membangun ulang indeks (versi korpus baru), tanpa migrasi.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { ayahPlaceholderPattern } from "@surau/core";
import { termStatRow } from "@surau/db";
import type { PassageRow, SummaryRow, TermStatRow, TranslationRow } from "@surau/db";
import { latinIndexText, normalizeArabic, stemText } from "@surau/text";

/** Satu baris `passage_fts`: rowid = `passage.id` (filter per edisi lewat rentang rowid). */
export interface FtsRow {
  rowid: number;
  body: string;
  foot: string;
  sbody: string;
  sfoot: string;
}

/** Kolom `passage_fts` dalam urutan migrasi (rowid lebih dulu). */
export const FTS_COLUMNS = ["rowid", "body", "foot", "sbody", "sfoot"] as const;

/**
 * Batas stem "sangat umum": muncul di lebih dari 10% paragraf (ADR-039; rencana awal ±5% ternyata
 * ikut menjaring kata bermakna seperti علم dan دنيا). Di Ihya: 39 stem (من, في, الله, قال, …).
 */
export const COMMON_TERM_RATIO = 0.1;

/** Baris indeks untuk setiap paragraf: stem dari `normalizeArabic(text_raw)`, kolom sesuai `kind`. */
export function ftsRows(passages: readonly PassageRow[]): FtsRow[] {
  return passages.map((p) => {
    const stem = stemText(normalizeArabic(p.text_raw).text);
    return {
      rowid: p.id,
      body: "",
      foot: "",
      sbody: p.kind === "body" ? stem : "",
      sfoot: p.kind === "foot" ? stem : "",
    };
  });
}

/**
 * Stem dengan df > `ratio` × jumlah paragraf, dihitung dari indeks FTS5 sungguhan (`fts5vocab`) di
 * DB sementara dengan migrasi korpus yang SAMA, supaya tokenisasinya persis tokenizer D1. df =
 * jumlah paragraf yang memuat stem di `sbody` atau `sfoot` (satu paragraf hanya mengisi salah satu,
 * jadi penjumlahan per kolom tidak menghitung ganda). Urut `term` (deterministik).
 */
export function termStats(
  rows: readonly FtsRow[],
  migrationsDir: string,
  ratio: number = COMMON_TERM_RATIO,
): TermStatRow[] {
  if (!(ratio > 0 && ratio < 1)) throw new RangeError(`rasio kata umum harus 0..1: ${ratio}`);
  if (rows.length === 0) return [];
  const db = new DatabaseSync(":memory:");
  try {
    const migrations = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const m of migrations) db.exec(readFileSync(join(migrationsDir, m), "utf8"));
    const insert = db.prepare(
      `INSERT INTO passage_fts (${FTS_COLUMNS.join(", ")}) VALUES (?, ?, ?, ?, ?)`,
    );
    db.exec("BEGIN");
    for (const r of rows) insert.run(r.rowid, r.body, r.foot, r.sbody, r.sfoot);
    db.exec("COMMIT");
    db.exec("CREATE VIRTUAL TABLE temp.fts_vocab USING fts5vocab(main, passage_fts, 'col')");
    return db
      .prepare(
        `SELECT term, sum(doc) AS df FROM temp.fts_vocab WHERE col IN ('sbody', 'sfoot')
         GROUP BY term HAVING sum(doc) > ? ORDER BY term`,
      )
      .all(ratio * rows.length)
      .map((r) => termStatRow.parse({ term: r.term, df: r.df }));
  } finally {
    db.close();
  }
}

/** Gabungkan segmen indeks menjadi satu b-tree setelah semua baris dimuat (kueri lebih hemat baca). */
export const FTS_OPTIMIZE_SQL = "INSERT INTO passage_fts (passage_fts) VALUES ('optimize');\n";

// ── Indeks Indonesia (S14, ADR-044) ──────────────────────────────────────────────────────────

/** Bahasa terjemahan/ringkasan yang diindeks `translation_fts`/`summary_fts`. */
export const LATIN_FTS_LANG = "id";

/** Satu baris `translation_fts` (rowid = passage_id) atau `summary_fts` (rowid = toc_node_id). */
export interface LatinFtsRow {
  rowid: number;
  terms: string;
}

export const LATIN_FTS_COLUMNS = ["rowid", "terms"] as const;

/**
 * Isi indeks satu teks AI: placeholder ayat `⟦QS s:a⟧` dibuang (terjemahan ayat = Kemenag, tidak
 * diindeks sebagai teks buatan model), lalu `latinIndexText` (@surau/text, sama dengan sisi kueri).
 */
export function aiIndexText(text: string): string {
  return latinIndexText(text.replace(ayahPlaceholderPattern(), " "));
}

/** Baris indeks Indonesia: hanya bahasa `id`, urut rowid (deterministik). */
export function latinFtsRows(
  translation: readonly TranslationRow[],
  summary: readonly SummaryRow[],
): { translation: LatinFtsRow[]; summary: LatinFtsRow[] } {
  const rows = <T>(items: readonly T[], id: (r: T) => number, text: (r: T) => string) =>
    items
      .map((r) => ({ rowid: id(r), terms: aiIndexText(text(r)) }))
      .sort((a, b) => a.rowid - b.rowid);
  return {
    translation: rows(
      translation.filter((t) => t.lang === LATIN_FTS_LANG),
      (t) => t.passage_id,
      (t) => t.text,
    ),
    summary: rows(
      summary.filter((s) => s.lang === LATIN_FTS_LANG),
      (s) => s.toc_node_id,
      (s) => s.text,
    ),
  };
}

/** `optimize` untuk satu indeks FTS (setelah semua barisnya dimuat). */
export function ftsOptimizeSql(table: string): string {
  return `INSERT INTO ${table} (${table}) VALUES ('optimize');\n`;
}
