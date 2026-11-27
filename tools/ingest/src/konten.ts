// Impor konten turunan dari chat ke korpus (X24, ADR-125, ADR-145): unit `siap` Intisari Bab dan
// Intisari Kitab di `data/konten/` menjadi baris `digest*` + indeks `digest_point_fts`, menggantikan
// Intisari batch (X15b) bagian yang sama per `section_id` + `lang` (ADR-131). Teks Arab tidak pernah
// dibaca dari draf: kutipan = `passage_id` + offset, kode menghitung `raw_sha256` dari `text_raw`
// (teks-arab.md aturan 1 dan 11). Unit `ditarik` tidak dimuat dan dicatat di log koreksi publik.
//
// Dua tahap pemeriksaan:
//   - sinkron saat membangun baris (`contentDigestRows`): skema, bagian/paragraf ada di edisi ini,
//     kutipan di dalam paragraf dan tanpa rujukan ayat, jangkar ≤ 9 per gagasan;
//   - asinkron sesudah .sqlite ditulis (`contentGate`, dipanggil CLI): `readinessIssues` dan
//     `checkContentDraft` yang sama dengan MCP `/redaksi` dijalankan ulang pada korpus baru, dan sidik
//     sumber cap cek kode harus sama dengan sidik sumber saat ini. Galat = build gagal.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  CHAT_PROMPT_PREFIX,
  checkContentDraft,
  contentDraft,
  quoteInspector,
  readinessIssues,
  type ContentDraft,
  type QuoteCorpus,
} from "@surau/core";
import {
  digestAnchorRow,
  digestPointRow,
  digestQuestionRow,
  digestQuoteRow,
  digestRow,
  digestTermRow,
  summaryRow,
} from "@surau/db";
import type { DigestRow, PassageAyahRefRow, TocNodeRow } from "@surau/db";
import { checkSummary } from "@surau/llm";

import { aiIndexText } from "./search-index.ts";
import type { DigestBuild } from "./llm/digest-attach.ts";
import { sha256 } from "./llm/units.ts";
import { sqliteD1 } from "./sqlite-d1.ts";

/** Folder unit konten di repo (satu berkas per unit, ADR-125 butir 3). */
export const CONTENT_DIR = "data/konten";
/** Jenis yang menjadi baris Intisari; Faedah dan Jalur tampil lewat X25. */
export const DIGEST_CONTENT_KINDS = ["intisari-bab", "intisari-kitab"] as const;
/** Log koreksi publik: unit yang ditarik (tanpa teks kitab). */
export const WITHDRAWN_REPORT = "data/reports/konten-ditarik.md";

export interface ContentUnit {
  /** Jalur relatif repo, mis. `data/konten/intisari-bab/100007.json`. */
  file: string;
  draft: ContentDraft;
}

export interface ContentUnits {
  ready: ContentUnit[];
  withdrawn: ContentUnit[];
  /** Berkas yang gagal dibaca atau tidak sah: build gagal. */
  problems: string[];
}

/** Baca unit Intisari di `data/konten/` (semua edisi; disaring per kitab saat membangun baris). */
export function readContentUnits(repo: string): ContentUnits {
  const out: ContentUnits = { ready: [], withdrawn: [], problems: [] };
  for (const kind of DIGEST_CONTENT_KINDS) {
    const dir = join(repo, CONTENT_DIR, kind);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .toSorted()) {
      const file = `${CONTENT_DIR}/${kind}/${name}`;
      let parsed: ReturnType<typeof contentDraft.safeParse>;
      try {
        parsed = contentDraft.safeParse(JSON.parse(readFileSync(join(repo, file), "utf8")));
      } catch (error) {
        out.problems.push(`${file}: JSON tidak terbaca (${String(error)})`);
        continue;
      }
      if (!parsed.success) {
        out.problems.push(`${file}: ${parsed.error.issues[0]?.message ?? "skema tidak sah"}`);
        continue;
      }
      const d = parsed.data;
      if (d.jenis !== kind) {
        out.problems.push(`${file}: jenis ${d.jenis} di folder ${kind}`);
        continue;
      }
      if (d.status === "siap") out.ready.push({ file, draft: d });
      else if (d.status === "ditarik") out.withdrawn.push({ file, draft: d });
    }
  }
  // Satu unit siap per bagian dan bahasa: revisi menaikkan `versi` di berkas yang sama (ADR-131).
  const seen = new Map<string, string>();
  for (const u of out.ready) {
    const key = `${u.draft.section_id}:${u.draft.lang}`;
    const prev = seen.get(key);
    if (prev !== undefined) out.problems.push(`${u.file}: bagian ${key} sudah diisi ${prev}`);
    seen.set(key, u.file);
  }
  return out;
}

/** Unit milik satu edisi. */
export function unitsOf(units: ContentUnits, editionId: number): ContentUnits {
  const mine = (u: ContentUnit) => u.draft.edition_id === editionId;
  return {
    ready: units.ready.filter(mine),
    withdrawn: units.withdrawn.filter(mine),
    problems: [],
  };
}

export type ContentCorpus = QuoteCorpus & {
  toc_node: readonly TocNodeRow[];
  passage_ayah_ref: readonly PassageAyahRefRow[];
};

export interface ChatDigestStats {
  units: number;
  points: number;
  quotes: number;
  questions: number;
  /** Abstrak (ringkasan) yang menggantikan ringkasan bab. */
  summaryOverrides: number;
}

export type ChatDigestBuild = Omit<DigestBuild, "stats" | "glossary_term"> & {
  stats: ChatDigestStats;
};

const touches = (
  q: { passage_id: number; char_start: number; char_end: number },
  r: { passage_id: number; char_start: number; char_end: number },
) => r.passage_id === q.passage_id && q.char_start < r.char_end && r.char_start < q.char_end;

/**
 * Baris Intisari dari unit `siap` satu edisi (X24 langkah 2). `source_sha256` = sidik sumber di cap
 * cek kode; `contentGate` memastikan sidik itu masih sama dengan korpus baru.
 */
export function contentDigestRows(
  rows: ContentCorpus,
  units: readonly ContentUnit[],
): ChatDigestBuild {
  const inspect = quoteInspector(rows);
  const passages = new Map(rows.passage.map((p) => [p.id, p]));
  const nodes = new Set(rows.toc_node.map((n) => n.id));
  const out: ChatDigestBuild = {
    digest: [],
    digest_point: [],
    digest_anchor: [],
    digest_quote: [],
    digest_question: [],
    digest_term: [],
    fts: [],
    summary: [],
    stats: {
      units: 0,
      points: 0,
      quotes: 0,
      questions: 0,
      summaryOverrides: 0,
    },
    problems: [],
  };
  for (const { file, draft: d } of units) {
    const problem = (what: string) => out.problems.push(`${file}: ${what}`);
    if (d.jenis !== "intisari-bab" && d.jenis !== "intisari-kitab") continue;
    if (!nodes.has(d.section_id)) {
      problem(`bagian ${d.section_id} tidak ada di edisi ${d.edition_id}`);
      continue;
    }
    const stamp = d.periksa.kode;
    if (stamp === null || !stamp.lolos) {
      problem("tanpa cap cek kode yang lolos");
      continue;
    }
    const id = d.section_id;
    const key = { toc_node_id: id, lang: d.lang };
    const origin = {
      model: d.asal.model ?? "manusia",
      prompt_version: `${CHAT_PROMPT_PREFIX}${d.asal.skill}`,
      created_at: d.asal.dibuat,
    };
    const book = d.jenis === "intisari-kitab";
    const isi = d.isi;
    out.digest.push(
      digestRow.parse({
        ...key,
        tier: book ? "book" : "section",
        basis: book ? "mixed" : "text",
        opening: book ? d.isi.pembuka : null,
        abstract: isi.ringkasan,
        closing: book ? d.isi.penutup : null,
        source_sha256: stamp.sumber_sha256,
        ...origin,
        review_status: "ai_generated",
        lead: isi.inti,
      }),
    );
    isi.gagasan.forEach((g, i) => {
      const ord = i + 1;
      out.digest_point.push(
        digestPointRow.parse({
          ...key,
          ord,
          kind: g.jenis,
          stance: g.sikap,
          title: g.judul,
          body: g.isi,
          review_status: "ai_generated",
        }),
      );
      if (g.dasar.length > 9) problem(`gagasan ${ord}: lebih dari 9 dasar`);
      g.dasar.slice(0, 9).forEach((pid, s) => {
        const p = passages.get(pid);
        if (p === undefined) {
          problem(`gagasan ${ord}: paragraf dasar ${pid} tidak ada`);
          return;
        }
        // Jangkar = paragraf utuh (X24 langkah 2).
        out.digest_anchor.push(
          digestAnchorRow.parse({
            ...key,
            point_ord: ord,
            seq: s + 1,
            passage_id: pid,
            char_start: 0,
            char_end: p.text_raw.length,
          }),
        );
      });
      out.digest_question.push(
        digestQuestionRow.parse({
          ...key,
          ord,
          point_ord: ord,
          text: g.soal.tanya,
          review_status: "ai_generated",
          answer: g.soal.jawab,
        }),
      );
      out.fts.push({ rowid: id * 100 + ord, terms: aiIndexText(`${g.judul} ${g.isi}`) });
    });
    out.stats.points += isi.gagasan.length;
    out.stats.questions += isi.gagasan.length;

    isi.kutipan.forEach((q, i) => {
      const ord = i + 1;
      const p = passages.get(q.passage_id);
      if (p === undefined || q.char_end > p.text_raw.length || q.char_end <= q.char_start) {
        problem(`kutipan ${ord} di luar paragraf ${q.passage_id}`);
        return;
      }
      if (q.gagasan > isi.gagasan.length) problem(`kutipan ${ord}: gagasan ${q.gagasan} tidak ada`);
      if (rows.passage_ayah_ref.some((r) => touches(q, r))) {
        problem(`kutipan ${ord} menyentuh rujukan ayat`);
        return;
      }
      const inspected = inspect({ passageId: q.passage_id, start: q.char_start, end: q.char_end });
      if (inspected.banned !== null) {
        problem(`kutipan ${ord} dilarang (${inspected.banned})`);
        return;
      }
      out.digest_quote.push(
        digestQuoteRow.parse({
          ...key,
          ord,
          point_ord: q.gagasan,
          passage_id: q.passage_id,
          char_start: q.char_start,
          char_end: q.char_end,
          raw_sha256: sha256(p.text_raw.slice(q.char_start, q.char_end)),
          kind: inspected.kind,
          translation_source: "digest",
          translation: q.terjemahan,
          ...origin,
          review_status: "ai_generated",
        }),
      );
      out.stats.quotes++;
    });

    // Semua istilah dimuat; glosarium milik seluruh korpus, jadi kecocokannya diperiksa runIngest
    // sesudah baris semua kitab digabung (sama dengan `unknown_term` di gerbang, ADR-145).
    isi.istilah.forEach((k, i) => {
      out.digest_term.push(digestTermRow.parse({ ...key, ord: i + 1, term_key: k }));
    });

    if (checkSummary(isi.ringkasan, d.lang).ok) {
      out.summary.push(
        summaryRow.parse({ ...key, text: isi.ringkasan, ...origin, review_status: "ai_generated" }),
      );
      out.stats.summaryOverrides++;
    }
    out.stats.units++;
  }
  out.fts.sort((a, b) => a.rowid - b.rowid);
  return out;
}

/** Leluhur setiap node (induk, kakek, …) menurut `parent_id`. */
function ancestors(toc: readonly TocNodeRow[]): (id: number) => number[] {
  const parent = new Map(toc.map((n) => [n.id, n.parent_id]));
  return (id) => {
    const out: number[] = [];
    for (let p = parent.get(id) ?? null; p !== null; p = parent.get(p) ?? null) out.push(p);
    return out;
  };
}

export interface MergedDigest {
  build: DigestBuild;
  /** Intisari batch yang digantikan unit chat (bagian yang sama). */
  replaced: number[];
  /** Intisari batch induk yang dibangun dari anak yang diganti: basi, tidak dimuat (X24 langkah 4). */
  staleParents: number[];
}

/**
 * Gabungkan Intisari batch (boleh null) dengan Intisari chat: unit chat menggantikan batch per
 * `toc_node_id` + `lang`; Intisari batch induk (basis `children`/`mixed`) yang anaknya diganti ikut
 * dibuang, karena gagasannya bisa berasal dari gagasan anak yang ditarik. Intisari induk yang juga
 * unit chat tetap dipakai.
 */
export function mergeDigests(
  batch: DigestBuild | null,
  chat: ChatDigestBuild,
  toc: readonly TocNodeRow[],
): MergedDigest {
  const keyOf = (r: { toc_node_id: number; lang: string }) => `${r.toc_node_id}:${r.lang}`;
  const chatKeys = new Set(chat.digest.map(keyOf));
  const up = ancestors(toc);
  const staleKeys = new Set<string>();
  for (const d of chat.digest) for (const a of up(d.toc_node_id)) staleKeys.add(`${a}:${d.lang}`);
  const batchDigest: readonly DigestRow[] = batch?.digest ?? [];
  const replaced = batchDigest.filter((d) => chatKeys.has(keyOf(d))).map((d) => d.toc_node_id);
  const staleParents = batchDigest
    .filter((d) => !chatKeys.has(keyOf(d)) && staleKeys.has(keyOf(d)) && d.basis !== "text")
    .map((d) => d.toc_node_id);
  const drop = new Set([
    ...chatKeys,
    ...batchDigest
      .filter((d) => !chatKeys.has(keyOf(d)) && staleKeys.has(keyOf(d)) && d.basis !== "text")
      .map(keyOf),
  ]);
  const keep = <T extends { toc_node_id: number; lang: string }>(list: readonly T[] = []) =>
    list.filter((r) => !drop.has(keyOf(r)));
  const dropNodes = new Set([...replaced, ...staleParents]);
  const build: DigestBuild = {
    glossary_term: batch?.glossary_term ?? [],
    digest: [...keep(batch?.digest), ...chat.digest],
    digest_point: [...keep(batch?.digest_point), ...chat.digest_point],
    digest_anchor: [...keep(batch?.digest_anchor), ...chat.digest_anchor],
    digest_quote: [...keep(batch?.digest_quote), ...chat.digest_quote],
    digest_question: [...keep(batch?.digest_question), ...chat.digest_question],
    digest_term: [...keep(batch?.digest_term), ...chat.digest_term],
    fts: [
      ...(batch?.fts ?? []).filter((f) => !dropNodes.has(Math.floor(f.rowid / 100))),
      ...chat.fts,
    ].toSorted((a, b) => a.rowid - b.rowid),
    summary: [...keep(batch?.summary), ...chat.summary],
    stats: batch?.stats ?? {
      targets: 0,
      loaded: 0,
      missing: [],
      points: 0,
      quotes: 0,
      passageTranslations: 0,
      quotesWithheld: 0,
      termsWithoutGloss: 0,
      glossary: 0,
      summaryOverrides: 0,
      abstractsKept: [],
    },
    // Masalah chat dilaporkan `contentInvariant`, tidak digandakan di sini.
    problems: [...(batch?.problems ?? [])],
  };
  return { build, replaced, staleParents };
}

/** Ringkasan untuk laporan validasi ingest. */
export function contentInvariant(
  chat: ChatDigestBuild,
  merged: MergedDigest,
  withdrawn: number,
): { name: string; ok: boolean; detail: string } {
  const s = chat.stats;
  return {
    name: "Konten chat (X24): unit siap jadi Intisari, kutipan di dalam paragraf dan tanpa ayat, unit ditarik tidak dimuat",
    ok: chat.problems.length === 0,
    detail:
      chat.problems.length > 0
        ? chat.problems.slice(0, 20).join("; ")
        : `${s.units} unit, ${s.points} gagasan, ${s.quotes} kutipan, ${s.questions} soal berjawaban; ` +
          `menggantikan batch ${merged.replaced.length} (${merged.replaced.join(", ") || "–"}), ` +
          `induk batch basi dibuang ${merged.staleParents.length} (${merged.staleParents.join(", ") || "–"}); ` +
          `${withdrawn} unit ditarik`,
  };
}

/** Log koreksi publik (Markdown, tanpa teks kitab): unit yang ditarik beserta alasannya. */
export function withdrawnReport(withdrawn: readonly ContentUnit[]): string {
  const lines = [
    "# Konten yang ditarik",
    "",
    "Dibuat otomatis oleh `pnpm ingest` (X24, ADR-125). Unit berstatus `ditarik` di `data/konten/` tidak dimuat ke korpus dan tidak tampil di situs maupun MCP. Isi kitab tidak berubah; yang ditarik hanya konten turunan buatan AI.",
    "",
  ];
  if (withdrawn.length === 0) return [...lines, "Belum ada unit yang ditarik.", ""].join("\n");
  lines.push("| Berkas | Jenis | Bagian | Versi | Tanggal | Alasan |", "|---|---|---|---|---|---|");
  for (const { file, draft: d } of withdrawn.toSorted((a, b) => (a.file < b.file ? -1 : 1))) {
    const alasan = (d.tarik?.alasan ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
    lines.push(
      `| \`${file}\` | ${d.jenis} | ${d.section_id} | ${d.versi} | ${d.tarik?.tanggal ?? "–"} | ${alasan} |`,
    );
  }
  return [...lines, ""].join("\n");
}

/**
 * Gerbang build (X24 langkah 3), sesudah .sqlite ditulis: setiap unit siap yang dimuat diperiksa ulang
 * `readinessIssues` + `checkContentDraft` pada korpus baru, dan sidik sumbernya harus sama dengan cap
 * cek kode. Mengembalikan daftar masalah; kosong = lolos.
 */
export async function contentGate(
  sqlitePath: string,
  units: readonly ContentUnit[],
): Promise<string[]> {
  if (units.length === 0) return [];
  const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
  try {
    const db = sqliteD1(sqlite);
    const problems: string[] = [];
    for (const { file, draft } of units) {
      for (const i of await readinessIssues(draft)) problems.push(`${file}: ${i.code} (${i.path})`);
      const check = await checkContentDraft(db, draft);
      for (const e of check.errors) problems.push(`${file}: ${e.code} ${e.path}: ${e.message}`);
      const now = check.facts?.source_sha256;
      if (now !== undefined && now !== draft.periksa.kode?.sumber_sha256) {
        problems.push(
          `${file}: sumber berubah sesudah dicek (cap ${draft.periksa.kode?.sumber_sha256.slice(0, 12) ?? "–"}, kini ${now.slice(0, 12)}); cek ulang draf`,
        );
      }
    }
    return problems;
  } finally {
    sqlite.close();
  }
}
