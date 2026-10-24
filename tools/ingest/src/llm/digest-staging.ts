// Korpus staging untuk pilot Intisari (X15b, ADR-098). Data T-28 (drive Shamela, data/raw,
// data/build/llm) tidak ada di mesin agen, jadi pilot membaca `surau-corpus-staging` lewat binding D1
// remote (`getPlatformProxy`, pola tools/eval/src/open-corpus.ts) HANYA dengan SELECT: pembungkus
// `selectOnly` menolak pernyataan lain. Pemuatan hasil pilot ke staging (langkah 9) terpisah dan
// eksplisit: migrasi korpus + baris Intisari node pilot saja, bukan ingest penuh (X15c).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { readDigest } from "@surau/core";
import {
  D1_MAX_PARAMS,
  chunk,
  corpusTables,
  footnoteRefRow,
  pageRow,
  passageAyahRefRow,
  passageRow,
  placeholders,
  summaryRow,
  tocNodeRow,
  tocTitleTranslationRow,
  translationRow,
} from "@surau/db";
import type { D1Db, D1Statement, SummaryRow, TranslationRow } from "@surau/db";
import type { z } from "zod";

import { isProtected, protectedCorpora, stagingCorpus as stagingBinding } from "../corpus.ts";
import { STAGING, applyMigrations, executeFile } from "../d1.ts";
import { insertStatements, sqlLiteral } from "../sql.ts";
import { digestRows } from "./digest-attach.ts";
import type { DigestBuild } from "./digest-attach.ts";
import type { DigestCorpus, DigestPlan } from "./digest-units.ts";

export const STAGING_CONFIG = "tools/ingest/wrangler.staging.jsonc";

/** Baris staging untuk Intisari + terjemahan/ringkasan (kutipan satu paragraf, QA). */
export type StagingRows = DigestCorpus & {
  translation: TranslationRow[];
  summary: SummaryRow[];
  meta: Record<string, string>;
};

/** Pembungkus D1 yang hanya mengizinkan SELECT (staging dibaca pilot, tidak pernah ditulis di sini). */
export function selectOnly(db: D1Db): D1Db {
  const check = (q: string) => {
    if (!/^\s*(?:SELECT|WITH)\b/iu.test(q) || /;\s*\S/u.test(q)) {
      throw new Error(`hanya SELECT yang boleh ke staging: ${q.slice(0, 60)}`);
    }
  };
  const original = new WeakMap<D1Statement, D1Statement>();
  const wrap = (stmt: D1Statement): D1Statement => {
    const wrapped: D1Statement = {
      bind: (...values) => wrap(stmt.bind(...values)),
      all: () => stmt.all(),
      first: () => stmt.first(),
    };
    original.set(wrapped, stmt);
    return wrapped;
  };
  return {
    prepare: (q) => {
      check(q);
      return wrap(db.prepare(q));
    },
    batch: (stmts) => db.batch(stmts.map((s) => original.get(s) ?? s)),
  };
}

export async function openStaging(
  repo: string,
): Promise<{ db: D1Db; dispose: () => Promise<void> }> {
  const { getPlatformProxy } = await import("wrangler");
  const proxy = await getPlatformProxy<{ CORPUS: D1Db }>({
    configPath: join(repo, STAGING_CONFIG),
    remoteBindings: true,
  });
  return { db: selectOnly(proxy.env.CORPUS), dispose: proxy.dispose };
}

const columns = (schema: { shape: Record<string, unknown> }) =>
  Object.keys(schema.shape).join(", ");

async function selectIn<T>(
  db: D1Db,
  schema: z.ZodType<T> & { shape: Record<string, unknown> },
  sql: (marks: string) => string,
  ids: readonly number[],
  extra: (string | number)[] = [],
): Promise<T[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const stmts = chunk(unique, D1_MAX_PARAMS - extra.length).map((list) =>
    db.prepare(sql(placeholders(list.length))).bind(...list, ...extra),
  );
  const results = await db.batch(stmts);
  return results.flatMap((r) => r.results.map((row) => schema.parse(row)));
}

/**
 * Baris satu subpohon (`kitab`) dari staging: daftar isi lengkap (jalur judul), paragraf badan
 * subpohon + catatan kaki yang dirujuk, halaman, rujukan ayat, penanda, terjemahan dan ringkasan
 * Indonesia, judul Indonesia, dan meta.
 */
export async function stagingCorpus(db: D1Db, kitab: number): Promise<StagingRows> {
  const [meta, toc] = await db.batch([
    db.prepare("SELECT key, value FROM meta"),
    db.prepare(`SELECT ${columns(tocNodeRow)} FROM toc_node`),
  ]);
  const tocRows = (toc?.results ?? []).map((r) => tocNodeRow.parse(r));
  const kids = new Map<number, number[]>();
  for (const n of tocRows) {
    if (n.parent_id !== null) kids.set(n.parent_id, [...(kids.get(n.parent_id) ?? []), n.id]);
  }
  if (!tocRows.some((n) => n.id === kitab)) throw new Error(`node ${kitab} tidak ada di staging`);
  const subtree: number[] = [];
  const add = (id: number) => {
    subtree.push(id);
    for (const c of kids.get(id) ?? []) add(c);
  };
  add(kitab);
  const body = await selectIn(
    db,
    passageRow,
    (m) =>
      `SELECT ${columns(passageRow)} FROM passage WHERE kind = 'body' AND toc_node_id IN (${m})`,
    subtree,
  );
  const bodyIds = body.map((p) => p.id);
  const footnoteRefs = await selectIn(
    db,
    footnoteRefRow,
    (m) => `SELECT ${columns(footnoteRefRow)} FROM footnote_ref WHERE passage_id IN (${m})`,
    bodyIds,
  );
  const notes = await selectIn(
    db,
    passageRow,
    (m) => `SELECT ${columns(passageRow)} FROM passage WHERE id IN (${m})`,
    footnoteRefs.map((f) => f.footnote_passage_id),
  );
  const subNodes = tocRows.filter((n) => subtree.includes(n.id));
  const pages = await selectIn(
    db,
    pageRow,
    (m) => `SELECT ${columns(pageRow)} FROM page WHERE id IN (${m})`,
    [...body, ...notes].map((p) => p.page_id).concat(subNodes.map((n) => n.start_page_id)),
  );
  const ayah = await selectIn(
    db,
    passageAyahRefRow,
    (m) => `SELECT ${columns(passageAyahRefRow)} FROM passage_ayah_ref WHERE passage_id IN (${m})`,
    bodyIds,
  );
  const translation = await selectIn(
    db,
    translationRow,
    (m) =>
      `SELECT ${columns(translationRow)} FROM translation WHERE passage_id IN (${m}) AND lang = ?`,
    bodyIds,
    ["id"],
  );
  const titles = await selectIn(
    db,
    tocTitleTranslationRow,
    (m) =>
      `SELECT ${columns(tocTitleTranslationRow)} FROM toc_title_translation WHERE toc_node_id IN (${m}) AND lang = ?`,
    subtree,
    ["id"],
  );
  const summary = await selectIn(
    db,
    summaryRow,
    (m) => `SELECT ${columns(summaryRow)} FROM summary WHERE toc_node_id IN (${m}) AND lang = ?`,
    subtree,
    ["id"],
  );
  return {
    page: pages,
    toc_node: tocRows,
    passage: [...body, ...notes],
    footnote_ref: footnoteRefs,
    passage_ayah_ref: ayah,
    toc_title_translation: titles,
    translation,
    summary,
    meta: Object.fromEntries(
      (meta?.results ?? []).map((r) => {
        const row = r as { key: string; value: string };
        return [row.key, row.value];
      }),
    ),
  };
}

/** UPSERT satu tabel ber-PK (tanpa menghapus baris yang mungkin dirujuk tabel lain, mis. audio X17). */
function upsert(
  table: string,
  rows: readonly Record<string, string | number | null>[],
  key: readonly string[],
): string[] {
  if (rows.length === 0) return [];
  const cols = Object.keys(corpusTables[table as keyof typeof corpusTables].shape);
  const set = cols.filter((c) => !key.includes(c)).map((c) => `${c} = excluded.${c}`);
  return rows.map(
    (r) =>
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((c) => sqlLiteral(r[c] ?? null)).join(", ")}) ON CONFLICT (${key.join(", ")}) DO UPDATE SET ${set.join(", ")};\n`,
  );
}

const values = (table: keyof typeof corpusTables, rows: readonly object[]) => {
  const cols = Object.keys(corpusTables[table].shape);
  return insertStatements(
    table,
    cols,
    rows.map((r) => cols.map((c) => (r as Record<string, string | number | null>)[c] ?? null)),
  );
};

/**
 * SQL pemuatan Intisari pilot ke staging: idempoten untuk node yang dimuat (baris anak dihapus lalu
 * disisipkan ulang; `digest` dan `glossary_term` di-UPSERT), tanpa menyentuh tabel lain.
 */
export function pilotSql(build: DigestBuild): string {
  const nodes = build.digest.map((d) => d.toc_node_id);
  if (nodes.length === 0) return "";
  const list = nodes.join(", ");
  const out: string[] = [
    "-- Intisari pilot (X15b, ADR-098): baris node pilot saja, bukan ingest penuh (X15c).\n",
    ...nodes.map(
      (n) => `DELETE FROM digest_point_fts WHERE rowid BETWEEN ${n * 100} AND ${n * 100 + 99};\n`,
    ),
    ...["digest_term", "digest_question", "digest_quote", "digest_anchor", "digest_point"].map(
      (t) => `DELETE FROM ${t} WHERE lang = 'id' AND toc_node_id IN (${list});\n`,
    ),
    ...upsert("glossary_term", build.glossary_term, ["term_key", "lang"]),
    ...upsert("digest", build.digest, ["toc_node_id", "lang"]),
    ...values("digest_point", build.digest_point),
    ...values("digest_anchor", build.digest_anchor),
    ...values("digest_quote", build.digest_quote),
    ...values("digest_question", build.digest_question),
    ...values("digest_term", build.digest_term),
    ...insertStatements(
      "digest_point_fts",
      ["rowid", "terms"],
      build.fts.map((f) => [f.rowid, f.terms]),
    ),
  ];
  return out.join("");
}

export interface PilotLoad {
  build: DigestBuild;
  file: string | null;
}

/**
 * Muat Intisari pilot ke `surau-corpus-staging` (atas izin pemilik, `--confirm`): migrasi korpus
 * (0008 + 0009 bila belum), lalu SQL `pilotSql`, lalu smoke `readDigest` per node lewat SELECT.
 * Tanpa `confirm` hanya rencana. Ditolak bila staging tercatat sebagai korpus produksi.
 */
export async function loadPilotToStaging(
  repo: string,
  rows: StagingRows,
  plan: DigestPlan,
  dir: string,
  confirm: boolean,
): Promise<number> {
  const build = digestRows(rows, dir, { plan });
  if (build.problems.length > 0) {
    for (const p of build.problems) console.error(`Invarian gagal: ${p}`);
    return 1;
  }
  const s = build.stats;
  console.info(
    `Siap dimuat: ${s.loaded}/${s.targets} Intisari, ${s.points} gagasan, ${build.digest_anchor.length} jangkar, ${s.quotes} kutipan, ${build.digest_question.length} pertanyaan, ${build.digest_term.length} istilah, ${build.glossary_term.length} definisi glosarium, ${build.fts.length} baris indeks.`,
  );
  if (s.missing.length > 0)
    console.info(`Belum punya Intisari yang berlaku: ${s.missing.join(", ")}`);
  if (build.digest.length === 0) return 0;
  const sql = pilotSql(build);
  const file = join(dir, "staging", `pilot-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`);
  mkdirSync(join(dir, "staging"), { recursive: true });
  writeFileSync(file, sql);
  console.info(`SQL: ${file} (${Buffer.byteLength(sql, "utf8").toLocaleString("id-ID")} byte)`);
  if (!confirm) {
    console.info(
      "Belum dimuat. Menulis ke staging (migrasi korpus + baris pilot) hanya atas izin pemilik: tambahkan --confirm.",
    );
    return 0;
  }
  const guard = protectedCorpora();
  for (const note of guard.notes) console.warn(`Peringatan: ${note}`);
  if (isProtected(guard, stagingBinding())) {
    console.error("surau-corpus-staging tercatat sebagai korpus produksi. Pemuatan ditolak.");
    return 1;
  }
  applyMigrations(STAGING);
  executeFile(STAGING, file);
  const { db, dispose } = await openStaging(repo);
  try {
    let ok = true;
    for (const d of build.digest) {
      const view = await readDigest(db, d.toc_node_id);
      const want = build.digest_point.filter((p) => p.toc_node_id === d.toc_node_id).length;
      const good =
        view !== null && view.points.length === want && view.withheld_quotes.length === 0;
      ok &&= good;
      console.info(
        `  ${d.toc_node_id}: ${view === null ? "TIDAK TERBACA" : `${view.points.length}/${want} gagasan, ${view.quotes.length} kutipan, ditahan ${view.withheld_quotes.length}, ${view.reading_minutes} menit`}`,
      );
    }
    console.info(ok ? "Smoke readDigest staging: lolos." : "Smoke readDigest staging: GAGAL.");
    return ok ? 0 : 1;
  } finally {
    await dispose();
  }
}
