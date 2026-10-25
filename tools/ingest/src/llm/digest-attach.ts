// Memuat Intisari yang lolos (data/build/llm/intisari/digest.jsonl) ke baris korpus `digest*`,
// `glossary_term`, dan indeks `digest_point_fts` (X15b langkah 6, ADR-097, ADR-098). Setiap hasil dicek
// ulang terhadap rencana yang dibangun dari baris korpus SAAT INI (sidik berjenjang + sidik Intisari
// sumber); yang basi tidak dimuat. Invarian build (pelanggaran = build gagal):
//   - setiap kutipan cocok sidik `raw_sha256` dan tidak menyentuh rujukan ayat;
//   - sumber terjemahan `passage` hanya untuk kutipan satu paragraf utuh;
//   - setiap gagasan punya jangkar;
//   - terjemahan kutipan `digest` membawa asal model-nya sendiri (kutipan anak tetap berlabel
//     model/prompt leaf-nya walau dipilih Intisari induk);
//   - `digest_point_fts` hanya memuat gagasan yang tampil (tidak ditolak dan berjangkar);
//   - setiap `digest_term` punya `glossary_term`.
// Abstrak menggantikan `summary.text` (bahasa id) hanya bila lolos `checkSummary` (ADR-097 poin 4).
import { join } from "node:path";

import {
  digestAnchorRow,
  digestPointRow,
  digestQuestionRow,
  digestQuoteRow,
  digestRow,
  digestTermRow,
  glossaryTermRow,
  summaryRow,
} from "@surau/db";
import type {
  DigestAnchorRow,
  DigestPointRow,
  DigestQuestionRow,
  DigestQuoteRow,
  DigestRow,
  DigestTermRow,
  GlossaryTermRow,
  SummaryRow,
  TranslationRow,
} from "@surau/db";
import { DIGEST_LANG, GLOSSARY_TERMS, checkSummary, glossProblems } from "@surau/llm";

import { aiIndexText } from "../search-index.ts";
import type { LatinFtsRow } from "../search-index.ts";
import { Freshness, titlesOf } from "./digest-batch.ts";
import { GLOSSARY_FILE, acceptedGloss, readDigestStore } from "./digest-store.ts";
import type { AcceptedDigest, AcceptedGloss } from "./digest-store.ts";
import { digestPlan, quoteInspector } from "./digest-units.ts";
import type { DigestCorpus, DigestPlan, DigestPlanOptions } from "./digest-units.ts";
import { readJsonl } from "./store.ts";
import { sha256 } from "./units.ts";

export interface DigestStats {
  /** Node yang mestinya punya Intisari (rencana dalam cakupan). */
  targets: number;
  loaded: number;
  /** Tanpa hasil yang berlaku (belum dibuat, basi, atau gagal). */
  missing: number[];
  points: number;
  quotes: number;
  /** Kutipan satu paragraf utuh yang memakai terjemahan paragraf (label tinjauan ikut). */
  passageTranslations: number;
  /** Kutipan yang kini dilarang (takhrij berubah) dan tidak dimuat. */
  quotesWithheld: number;
  /** Istilah yang belum punya definisi glosarium (tidak dimuat). */
  termsWithoutGloss: number;
  glossary: number;
  /** Abstrak yang menggantikan ringkasan `summary-section@2`. */
  summaryOverrides: number;
  /** Abstrak yang tidak lolos `checkSummary` (ringkasan lama dipakai). */
  abstractsKept: number[];
}

export interface DigestBuild {
  glossary_term: GlossaryTermRow[];
  digest: DigestRow[];
  digest_point: DigestPointRow[];
  digest_anchor: DigestAnchorRow[];
  digest_quote: DigestQuoteRow[];
  digest_question: DigestQuestionRow[];
  digest_term: DigestTermRow[];
  /** Baris `digest_point_fts`: rowid = toc_node_id·100 + ord. */
  fts: LatinFtsRow[];
  /** Ringkasan bahasa id dari abstrak Intisari (menggantikan baris `summary` node itu). */
  summary: SummaryRow[];
  stats: DigestStats;
  /** Pelanggaran invarian build; tidak kosong = build gagal. */
  problems: string[];
}

export type DigestAttachRows = DigestCorpus & { translation: readonly TranslationRow[] };

/** sha256 satu entri glosarium (yang didefinisikan model): definisi usang bila entrinya berubah. */
export function glossEntrySha(e: {
  key: string;
  source: string;
  label: string;
  note?: string;
}): string {
  return sha256(JSON.stringify([e.key, e.source, e.label, e.note ?? ""]));
}

/** Definisi glosarium yang masih berlaku (entri sama, lolos validasi ulang), satu per kunci. */
export function glossaryRows(dir: string): GlossaryTermRow[] {
  const latest = new Map<string, AcceptedGloss>();
  for (const g of readJsonl(join(dir, GLOSSARY_FILE), acceptedGloss)) latest.set(g.term_key, g);
  const out: GlossaryTermRow[] = [];
  for (const e of GLOSSARY_TERMS) {
    const g = latest.get(e.key);
    if (g === undefined || !e.term) continue;
    if (g.source_sha256 !== glossEntrySha(e) || glossProblems(g.gloss).length > 0) continue;
    out.push(
      glossaryTermRow.parse({
        term_key: e.key,
        lang: g.lang,
        label: e.label,
        gloss: g.gloss,
        model: g.model,
        prompt_version: g.prompt_version,
        created_at: g.created_at,
        review_status: "ai_generated",
      }),
    );
  }
  return out;
}

const touches = (
  q: { passage_id: number; char_start: number; char_end: number },
  r: { passage_id: number; char_start: number; char_end: number },
) => r.passage_id === q.passage_id && q.char_start < r.char_end && r.char_start < q.char_end;

export function digestRows(
  rows: DigestAttachRows,
  dir: string,
  opts: DigestPlanOptions & { plan?: DigestPlan } = {},
): DigestBuild {
  const plan = opts.plan ?? digestPlan(rows, opts);
  const store = readDigestStore(dir);
  const fresh = new Freshness(plan, store.accepted, titlesOf(rows));
  const inspect = quoteInspector(rows);
  const passages = new Map(rows.passage.map((p) => [p.id, p]));
  const ayahRefs = rows.passage_ayah_ref;
  const translated = new Set(
    rows.translation
      .filter((t) => t.lang === DIGEST_LANG && t.review_status !== "rejected")
      .map((t) => t.passage_id),
  );
  const glossary = glossaryRows(dir);
  const glossed = new Set(glossary.map((g) => g.term_key));
  const out: DigestBuild = {
    glossary_term: glossary,
    digest: [],
    digest_point: [],
    digest_anchor: [],
    digest_quote: [],
    digest_question: [],
    digest_term: [],
    fts: [],
    summary: [],
    stats: {
      targets: plan.nodes.length,
      loaded: 0,
      missing: [],
      points: 0,
      quotes: 0,
      passageTranslations: 0,
      quotesWithheld: 0,
      termsWithoutGloss: 0,
      glossary: glossary.length,
      summaryOverrides: 0,
      abstractsKept: [],
    },
    problems: [],
  };
  const problem = (node: number, what: string) => out.problems.push(`${node}: ${what}`);

  for (const node of plan.nodes) {
    const rec: AcceptedDigest | null = fresh.record(node.customId);
    if (rec === null) {
      out.stats.missing.push(node.tocNodeId);
      continue;
    }
    const id = node.tocNodeId;
    const key = { toc_node_id: id, lang: DIGEST_LANG };
    out.digest.push(
      digestRow.parse({
        ...key,
        tier: node.tier,
        basis: node.basis,
        opening: rec.opening,
        abstract: rec.abstract,
        closing: rec.closing,
        source_sha256: node.sourceSha256,
        model: rec.model,
        prompt_version: rec.prompt_version,
        created_at: rec.created_at,
        review_status: "ai_generated",
      }),
    );
    let question = 0;
    for (const p of rec.points) {
      if (p.anchors.length === 0) problem(id, `gagasan ${p.ord} tanpa jangkar`);
      out.digest_point.push(
        digestPointRow.parse({
          ...key,
          ord: p.ord,
          kind: p.kind,
          stance: p.stance,
          title: p.title,
          body: p.body,
          review_status: "ai_generated",
        }),
      );
      p.anchors.forEach((a, i) => {
        if ((passages.get(a.passage_id)?.text_raw.length ?? -1) < a.char_end) {
          problem(id, `jangkar gagasan ${p.ord} di luar paragraf ${a.passage_id}`);
        }
        out.digest_anchor.push(
          digestAnchorRow.parse({ ...key, point_ord: p.ord, seq: i + 1, ...a }),
        );
      });
      for (const text of p.questions) {
        question++;
        out.digest_question.push(
          digestQuestionRow.parse({
            ...key,
            ord: question,
            point_ord: p.ord,
            text,
            review_status: "ai_generated",
          }),
        );
      }
      // Gagasan yang tampil saja (semua baris baru `ai_generated`; tanpa jangkar = tidak tampil).
      if (p.anchors.length > 0) {
        out.fts.push({ rowid: id * 100 + p.ord, terms: aiIndexText(`${p.title} ${p.body}`) });
      }
    }
    out.stats.points += rec.points.length;

    let ord = 0;
    for (const q of rec.quotes) {
      const passage = passages.get(q.passage_id);
      if (passage === undefined || passage.text_raw.length < q.char_end) {
        problem(id, `kutipan ${q.ord} di luar paragraf ${q.passage_id}`);
        continue;
      }
      if (sha256(passage.text_raw.slice(q.char_start, q.char_end)) !== q.raw_sha256) {
        problem(id, `kutipan ${q.ord} tidak cocok sidik`);
        continue;
      }
      if (ayahRefs.some((r) => touches(q, r))) {
        problem(id, `kutipan ${q.ord} menyentuh rujukan ayat`);
        continue;
      }
      const inspected = inspect({ passageId: q.passage_id, start: q.char_start, end: q.char_end });
      if (inspected.banned !== null) {
        out.stats.quotesWithheld++;
        continue;
      }
      const whole = q.char_start === 0 && q.char_end === passage.text_raw.length;
      const fromPassage = whole && translated.has(q.passage_id);
      if (fromPassage) out.stats.passageTranslations++;
      ord++;
      out.digest_quote.push(
        digestQuoteRow.parse({
          ...key,
          ord,
          point_ord: q.point_ord,
          passage_id: q.passage_id,
          char_start: q.char_start,
          char_end: q.char_end,
          raw_sha256: q.raw_sha256,
          kind: inspected.kind,
          translation_source: fromPassage ? "passage" : "digest",
          translation: fromPassage ? null : q.translation,
          model: fromPassage ? null : q.model,
          prompt_version: fromPassage ? null : q.prompt_version,
          created_at: fromPassage ? null : q.created_at,
          review_status: "ai_generated",
        }),
      );
    }
    out.stats.quotes += ord;

    let term = 0;
    for (const k of rec.terms) {
      if (!glossed.has(k)) {
        out.stats.termsWithoutGloss++;
        continue;
      }
      term++;
      out.digest_term.push(digestTermRow.parse({ ...key, ord: term, term_key: k }));
    }

    if (checkSummary(rec.abstract, DIGEST_LANG).ok) {
      out.summary.push(
        summaryRow.parse({
          ...key,
          text: rec.abstract,
          model: rec.model,
          prompt_version: rec.prompt_version,
          created_at: rec.created_at,
          review_status: "ai_generated",
        }),
      );
      out.stats.summaryOverrides++;
    } else out.stats.abstractsKept.push(id);
    out.stats.loaded++;
  }

  // Pemeriksaan ulang lintas baris (pengaman bila penyusunan di atas berubah).
  for (const q of out.digest_quote) {
    const whole =
      q.char_start === 0 && q.char_end === (passages.get(q.passage_id)?.text_raw.length ?? -1);
    if (q.translation_source === "passage" && !whole) {
      problem(q.toc_node_id, `kutipan ${q.ord}: sumber passage untuk bukan paragraf utuh`);
    }
    if (q.translation_source === "digest" && (q.model === null || q.prompt_version === null)) {
      problem(q.toc_node_id, `kutipan ${q.ord}: terjemahan tanpa asal model`);
    }
  }
  const anchored = new Set(out.digest_anchor.map((a) => `${a.toc_node_id}:${a.point_ord}`));
  const shown = out.digest_point.filter(
    (p) => p.review_status !== "rejected" && anchored.has(`${p.toc_node_id}:${p.ord}`),
  );
  if (shown.length !== out.fts.length) {
    out.problems.push(`digest_point_fts ${out.fts.length} baris, gagasan tampil ${shown.length}`);
  }
  for (const t of out.digest_term) {
    if (!glossed.has(t.term_key)) problem(t.toc_node_id, `istilah ${t.term_key} tanpa glosarium`);
  }
  out.fts.sort((a, b) => a.rowid - b.rowid);
  return out;
}

/** Ganti ringkasan bahasa id node yang punya abstrak Intisari yang lolos `checkSummary`. */
export function withDigestSummaries(
  summary: readonly SummaryRow[],
  overrides: readonly SummaryRow[],
): SummaryRow[] {
  const by = new Map(overrides.map((s) => [`${s.toc_node_id}-${s.lang}`, s]));
  const kept = summary.filter((s) => !by.has(`${s.toc_node_id}-${s.lang}`));
  return [...kept, ...overrides].toSorted(
    (a, b) => a.toc_node_id - b.toc_node_id || (a.lang < b.lang ? -1 : a.lang > b.lang ? 1 : 0),
  );
}

/** Ringkasan laporan validasi ingest. */
export function digestInvariant(build: DigestBuild): { name: string; ok: boolean; detail: string } {
  const s = build.stats;
  return {
    name: "Intisari: kutipan cocok sidik dan tanpa ayat, gagasan berjangkar, indeks hanya gagasan tampil (X15b)",
    ok: build.problems.length === 0,
    detail:
      build.problems.length > 0
        ? build.problems.slice(0, 20).join("; ")
        : `${s.loaded}/${s.targets} node, ${s.points} gagasan, ${s.quotes} kutipan (${s.passageTranslations} memakai terjemahan paragraf, ${s.quotesWithheld} ditahan), ${s.glossary} istilah glosarium, ${s.summaryOverrides} abstrak menggantikan ringkasan`,
  };
}
