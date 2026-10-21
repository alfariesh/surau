// Judul daftar isi Indonesia (X04 bagian B W8, ADR-077): unit judul = node daftar isi + subjudul
// kurasi pembaca (data/patches/<kitab>-subjudul.json, ADR-074), dibangun dari baris korpus SAAT INI
// supaya hasil yang usang (judul berubah) tidak dimuat. Dikirim per kelompok dalam urutan baca lewat
// Messages API biasa (Sonnet 5.5, prompt aktif `TOC_TITLE_PROMPT`) dengan pagu biaya; hasilnya di
// data/build/llm (git-ignored, JANGAN dihapus):
//   toc-title.jsonl        judul yang LOLOS validasi (satu baris per judul; baris terakhir menang)
//   toc-title-runs.jsonl   satu baris per request: id, usage, biaya, judul yang ditolak + alasannya
// Teks Arab judul hanya masukan prompt; yang tampil selalu disalin kode dari DB (teks-arab.md 1).
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type Anthropic from "@anthropic-ai/sdk";
import { subheadingPartText, subheadingTocTargets } from "@surau/core";
import type { SubheadingSpanEntry } from "@surau/core";
import { subheadingTranslationRow, tocTitleTranslationRow } from "@surau/db";
import type { SubheadingTranslationRow, TocTitleTranslationRow } from "@surau/db";
import {
  MODELS,
  TOC_TITLE_LANG,
  TOC_TITLE_MAX_TOKENS,
  TOC_TITLE_PROMPT,
  buildTocTitleRequest,
  checkTocTitle,
  costUsd,
  judgeTocTitles,
  ratesFor,
} from "@surau/llm";
import type { TocTitleItem } from "@surau/llm";
import { z } from "zod";

import type { CorpusRows } from "../rows.ts";
import { subheadingFile } from "../subheadings.ts";
import type { WorkConfig } from "../works/ihya.ts";
import { appendJsonl, readJsonl, storedUsage, usageSchema } from "./store.ts";

export const TITLES_FILE = "toc-title.jsonl";
export const TITLE_RUNS_FILE = "toc-title-runs.jsonl";
/** Judul per request: ±90 × ±40 token keluaran + thinking tetap di bawah TOC_TITLE_MAX_TOKENS. */
export const TITLE_GROUP_MAX = 90;

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

export interface TitleUnit extends TocTitleItem {
  target: "toc_node" | "passage";
  targetId: number;
  /** sha256 judul Arab yang dikirim (hasil usang bila judulnya berubah). */
  sourceSha256: string;
  /** Judul Arab leluhur (akar → induk), konteks kelompok. */
  path: string[];
}

export type SubheadingEntries = ReadonlyMap<number, SubheadingSpanEntry & { sha: string }>;

/** Daftar kurasi subjudul karya ini (kosong bila berkasnya tidak ada). */
export function readSubheadings(repo: string, config: WorkConfig): SubheadingEntries {
  const path = join(repo, config.subheadings);
  if (!existsSync(path)) return new Map();
  const file = subheadingFile.parse(JSON.parse(readFileSync(path, "utf8")));
  if (file.edition !== config.edition.id) return new Map();
  return new Map(Object.entries(file.entries).map(([k, v]) => [Number(k), v]));
}

/**
 * Unit judul dalam urutan baca: setiap node, lalu subjudul miliknya (urut halaman + `ord`), lalu
 * anak-anaknya. Subjudul hanya bila sidik `text_raw` semua paragrafnya cocok dengan daftar kurasi
 * (sama dengan web, `reader-toc.ts`); lanjutan judul berhenti di lanjutan pertama yang usang.
 */
export function titleUnits(
  rows: Pick<CorpusRows, "toc_node" | "passage" | "page" | "footnote_ref">,
  entries: SubheadingEntries,
  editionId: number,
): TitleUnit[] {
  const base = editionId * 10_000_000;
  const nodes = rows.toc_node.filter((n) => n.edition_id === editionId);
  const kids = new Map<number | null, typeof nodes>();
  for (const n of nodes) kids.set(n.parent_id, [...(kids.get(n.parent_id) ?? []), n]);
  for (const list of kids.values()) list.sort((a, b) => a.ord - b.ord || a.id - b.id);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const passages = new Map(rows.passage.map((p) => [p.id, p]));
  const pageSeq = new Map(rows.page.map((p) => [p.id, p.seq]));
  const markers = new Map<number, { char_start: number; char_end: number }[]>();
  for (const r of rows.footnote_ref) {
    markers.set(r.passage_id, [...(markers.get(r.passage_id) ?? []), r]);
  }
  const fresh = (seq: number) => {
    const p = passages.get(base + seq);
    const e = entries.get(seq);
    return p !== undefined && e !== undefined && sha256(p.text_raw).slice(0, 16) === e.sha;
  };

  const subsOf = new Map<number, { seq: number; title: string; page: number; ord: number }[]>();
  for (const target of subheadingTocTargets(entries)) {
    const head = passages.get(base + target.seq);
    if (head === undefined || head.kind !== "body" || head.toc_node_id === null) continue;
    if (!byId.has(head.toc_node_id) || !fresh(target.seq)) continue;
    const parts: string[] = [];
    for (const part of target.parts) {
      const p = passages.get(base + part.seq);
      if (p === undefined || !fresh(part.seq)) break;
      parts.push(subheadingPartText(p.text_raw, part, markers.get(p.id) ?? []));
    }
    const title = parts.filter((t) => t !== "").join(" ");
    if (title === "") continue;
    const list = subsOf.get(head.toc_node_id) ?? [];
    list.push({ seq: target.seq, title, page: pageSeq.get(head.page_id) ?? 0, ord: head.ord });
    subsOf.set(head.toc_node_id, list);
  }
  for (const list of subsOf.values()) list.sort((a, b) => a.page - b.page || a.ord - b.ord);

  const out: TitleUnit[] = [];
  const visit = (parent: number | null, path: string[]) => {
    for (const n of kids.get(parent) ?? []) {
      out.push({
        id: `n${n.id}`,
        parent: n.parent_id === null ? null : `n${n.parent_id}`,
        level: n.level,
        kind: "node",
        title: n.title_ar,
        target: "toc_node",
        targetId: n.id,
        sourceSha256: sha256(n.title_ar),
        path,
      });
      const inner = [...path, n.title_ar];
      for (const s of subsOf.get(n.id) ?? []) {
        out.push({
          id: `p${s.seq}`,
          parent: `n${n.id}`,
          level: n.level + 1,
          kind: "sub",
          title: s.title,
          target: "passage",
          targetId: base + s.seq,
          sourceSha256: sha256(s.title),
          path: inner,
        });
      }
      visit(n.id, inner);
    }
  };
  visit(null, []);
  return out;
}

export interface TitleGroup {
  /** Judul Arab leluhur unit pertama (konteks <jalur>). */
  path: string[];
  units: TitleUnit[];
}

/**
 * Kelompok request: unit berurutan, dipotong di batas kitab (node tingkat ≤ 2) bila kelompok sudah
 * penuh; satu kitab yang lebih besar dari `max` dipotong di mana saja. Induk di luar kelompok = null.
 */
export function titleGroups(units: readonly TitleUnit[], max = TITLE_GROUP_MAX): TitleGroup[] {
  const blocks: TitleUnit[][] = [];
  for (const u of units) {
    if (blocks.length === 0 || (u.kind === "node" && u.level <= 2)) blocks.push([]);
    blocks.at(-1)!.push(u);
  }
  const groups: TitleUnit[][] = [];
  for (const block of blocks) {
    for (let i = 0; i < block.length; i += max) {
      const piece = block.slice(i, i + max);
      const last = groups.at(-1);
      if (last !== undefined && last.length + piece.length <= max) last.push(...piece);
      else groups.push([...piece]);
    }
  }
  return groups.map((g) => {
    const keys = new Set(g.map((u) => u.id));
    return {
      path: g[0]?.path ?? [],
      units: g.map((u) => ({
        ...u,
        parent: u.parent !== null && keys.has(u.parent) ? u.parent : null,
      })),
    };
  });
}

/** Satu judul Indonesia yang lolos validasi (masukan ingest → toc_title_translation / subheading_translation). */
export const acceptedTitle = z.strictObject({
  key: z.string().regex(/^[np]\d+$/),
  target: z.enum(["toc_node", "passage"]),
  target_id: z.number().int().positive(),
  lang: z.literal("id"),
  text: z.string().min(1),
  model: z.string(),
  prompt_version: z.string(),
  created_at: z.string(),
  source_sha256: z.string().length(64),
});
export type AcceptedTitle = z.infer<typeof acceptedTitle>;

export const titleRun = z.strictObject({
  at: z.string(),
  model: z.string(),
  prompt_version: z.string(),
  request_id: z.string().nullable(),
  keys: z.array(z.string()),
  stop_reason: z.string().nullable(),
  usage: usageSchema,
  cost_usd: z.number().nonnegative(),
  accepted: z.number().int().nonnegative(),
  rejected: z.record(z.string(), z.string()),
  problems: z.array(z.string()),
});
export type TitleRun = z.infer<typeof titleRun>;

/** Hasil terakhir per kunci yang masih berlaku untuk unit saat ini (sidik + prompt aktif + lolos cek). */
export function currentTitles(
  units: readonly TitleUnit[],
  accepted: readonly AcceptedTitle[],
  promptVersion: string = TOC_TITLE_PROMPT.id,
): Map<string, AcceptedTitle> {
  const latest = new Map(accepted.map((a) => [a.key, a]));
  const out = new Map<string, AcceptedTitle>();
  for (const u of units) {
    const a = latest.get(u.id);
    if (
      a !== undefined &&
      a.target === u.target &&
      a.target_id === u.targetId &&
      a.source_sha256 === u.sourceSha256 &&
      a.prompt_version === promptVersion &&
      checkTocTitle(a.text).length === 0
    ) {
      out.set(u.id, a);
    }
  }
  return out;
}

export interface TitleRowsBuild {
  toc: TocTitleTranslationRow[];
  sub: SubheadingTranslationRow[];
  stats: { targets: number; tocTitles: number; subheadingTitles: number; missing: string[] };
}

/** Baris korpus judul Indonesia dari hasil yang masih berlaku (dipanggil `llmRows`). */
export function titleRows(units: readonly TitleUnit[], dir: string): TitleRowsBuild {
  const current = currentTitles(units, readJsonl(join(dir, TITLES_FILE), acceptedTitle));
  const toc: TocTitleTranslationRow[] = [];
  const sub: SubheadingTranslationRow[] = [];
  const missing: string[] = [];
  for (const u of units) {
    const a = current.get(u.id);
    if (a === undefined) {
      missing.push(u.id);
      continue;
    }
    const common = {
      lang: a.lang,
      text: a.text,
      model: a.model,
      prompt_version: a.prompt_version,
      created_at: a.created_at,
      review_status: "ai_generated" as const,
    };
    if (u.target === "toc_node")
      toc.push(tocTitleTranslationRow.parse({ toc_node_id: u.targetId, ...common }));
    else sub.push(subheadingTranslationRow.parse({ passage_id: u.targetId, ...common }));
  }
  toc.sort((a, b) => a.toc_node_id - b.toc_node_id);
  sub.sort((a, b) => a.passage_id - b.passage_id);
  return {
    toc,
    sub,
    stats: { targets: units.length, tocTitles: toc.length, subheadingTitles: sub.length, missing },
  };
}

export interface TitleRunOptions {
  confirm: boolean;
  /** Pagu total USD (termasuk biaya request sebelumnya di toc-title-runs.jsonl). */
  budget?: number;
  /** Putaran ulang untuk judul yang ditolak (bawaan 1). */
  retries?: number;
  /** Paling banyak request yang dikirim dalam satu pemanggilan (uji kecil sebelum semua). */
  maxRequests?: number;
  now?: () => Date;
  log?: (line: string) => void;
}

const fmt = (usd: number) => `US$${usd.toFixed(4)}`;

/**
 * `pnpm llm judul`: tanpa `confirm` hanya rencana (hitung token gratis + perkiraan biaya). Dengan
 * `confirm` + `budget`, kirim kelompok yang belum punya judul berlaku; sebelum setiap request,
 * biaya tercatat + biaya TERBURUK request itu (input × tarif tulis cache 1 jam + max_tokens × tarif
 * keluaran) tidak boleh melewati pagu. Mengembalikan jumlah judul yang masih belum ada.
 */
export async function runTitleJob(
  units: readonly TitleUnit[],
  dir: string,
  client: () => Anthropic,
  opts: TitleRunOptions,
): Promise<number> {
  const log = opts.log ?? ((l: string) => console.info(l));
  const now = opts.now ?? (() => new Date());
  const model = MODELS.sonnet;
  const rates = ratesFor(model, 0);
  const runs = readJsonl(join(dir, TITLE_RUNS_FILE), titleRun);
  let spent = runs.reduce((s, r) => s + r.cost_usd, 0);
  const pendingOf = () => {
    const current = currentTitles(units, readJsonl(join(dir, TITLES_FILE), acceptedTitle));
    return units.filter((u) => !current.has(u.id));
  };
  let pending = pendingOf();
  const nodes = units.filter((u) => u.kind === "node").length;
  log(
    `Judul: ${units.length} (node ${nodes}, subjudul ${units.length - nodes}); berlaku ${units.length - pending.length}; tertunda ${pending.length}. Biaya tercatat ${fmt(spent)} (${runs.length} request).`,
  );
  if (pending.length === 0) return 0;
  if (opts.confirm && opts.budget === undefined) {
    throw new Error("--confirm wajib bersama --budget (pagu total USD).");
  }

  const rounds = opts.confirm ? 1 + (opts.retries ?? 1) : 1;
  let sent = 0;
  for (let round = 0; round < rounds && pending.length > 0; round++) {
    const groups = titleGroups(pending);
    const plan = [];
    for (const g of groups) {
      const req = buildTocTitleRequest(g.path, g.units, model);
      const counted = await client().messages.countTokens({
        model: req.model,
        system: req.system,
        messages: req.messages,
        output_config: req.output_config,
      });
      const input = counted.input_tokens;
      const estimate = (input * rates.input + (g.units.length * 45 + 2500) * rates.output) / 1e6;
      const worst = (input * rates.cacheWrite1h + TOC_TITLE_MAX_TOKENS * rates.output) / 1e6;
      plan.push({ g, req, input, estimate, worst });
      log(
        `  kelompok ${plan.length}: ${g.units.length} judul (${g.units[0]!.id}…${g.units.at(-1)!.id}), input ${input} token, perkiraan ${fmt(estimate)}, terburuk ${fmt(worst)}`,
      );
    }
    const total = plan.reduce((s, p) => s + p.estimate, 0);
    log(`Perkiraan putaran ${round + 1}: ${fmt(total)} (${plan.length} request, ${model}).`);
    if (!opts.confirm) {
      log("Tanpa --confirm: tidak ada yang dikirim.");
      return pending.length;
    }
    for (const p of plan) {
      if (opts.maxRequests !== undefined && sent >= opts.maxRequests) {
        log(`Batas ${opts.maxRequests} request tercapai; sisanya menunggu pemanggilan berikutnya.`);
        return pendingOf().length;
      }
      if (spent + p.worst > opts.budget!) {
        log(
          `BERHENTI: tercatat ${fmt(spent)} + terburuk ${fmt(p.worst)} > pagu ${fmt(opts.budget!)}.`,
        );
        return pendingOf().length;
      }
      const at = now().toISOString();
      sent++;
      const res = await client().messages.create(p.req).withResponse();
      const msg = res.data;
      const cost = costUsd(model, msg.usage, { batch: false });
      spent += cost;
      const wanted = p.g.units.map((u) => u.id);
      const judged = judgeTocTitles(msg, wanted);
      const byKey = new Map(p.g.units.map((u) => [u.id, u]));
      appendJsonl(
        join(dir, TITLES_FILE),
        [...judged.accepted].map(([key, text]) => {
          const u = byKey.get(key)!;
          return acceptedTitle.parse({
            key,
            target: u.target,
            target_id: u.targetId,
            lang: TOC_TITLE_LANG,
            text,
            model: msg.model,
            prompt_version: TOC_TITLE_PROMPT.id,
            created_at: at,
            source_sha256: u.sourceSha256,
          });
        }),
      );
      appendJsonl(join(dir, TITLE_RUNS_FILE), [
        titleRun.parse({
          at,
          model: msg.model,
          prompt_version: TOC_TITLE_PROMPT.id,
          request_id: res.request_id ?? null,
          keys: wanted,
          stop_reason: msg.stop_reason,
          usage: storedUsage(msg.usage),
          cost_usd: cost,
          accepted: judged.accepted.size,
          rejected: Object.fromEntries(judged.rejected),
          problems: judged.problems,
        }),
      ]);
      log(
        `  terkirim: ${judged.accepted.size}/${wanted.length} lolos, ${msg.stop_reason}, ${msg.usage.input_tokens}+${msg.usage.output_tokens} token, ${fmt(cost)} (total ${fmt(spent)})${judged.problems.length > 0 ? `; ${judged.problems.join("; ")}` : ""}`,
      );
      for (const [k, why] of judged.rejected) log(`    ditolak ${k}: ${why}`);
    }
    pending = pendingOf();
  }
  log(`Selesai: tertunda ${pending.length}; biaya tercatat ${fmt(spent)}.`);
  return pending.length;
}
