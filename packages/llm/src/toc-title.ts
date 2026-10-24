// Request dan validasi judul daftar isi Indonesia (X04 bagian B W8, prompt aktif `translate-toc-title@2`).
// Satu request = satu kelompok judul dalam urutan baca (node daftar isi + subjudul kurasi), lewat
// Messages API biasa (bukan batch: jumlahnya kecil dan hasilnya langsung dipakai). Judul Arab hanya
// data masukan; keluaran ditolak bila memuat huruf Arab (teks-arab.md aturan 1).
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";

import { TOC_TITLE_SCHEMA } from "../prompts/toc-title-schema.ts";
import { TRANSLATE_TOC_TITLE_V2 } from "../prompts/translate-toc-title-v2.ts";
import { hasArabicLetters, hasMarkdown } from "./check.ts";
import { MODELS } from "./client.ts";
import type { ModelId } from "./client.ts";
import { messageText } from "./response.ts";
import type { Message } from "@anthropic-ai/sdk/resources/messages";

export const TOC_TITLE_PROMPT = TRANSLATE_TOC_TITLE_V2;
export const TOC_TITLE_LANG = "id";
/** Ruang thinking (effort low) + ±90 judul × ±40 token JSON. */
export const TOC_TITLE_MAX_TOKENS = 12_000;
/**
 * Judul Indonesia terpanjang yang diterima (karakter). Prompt meminta ≤ 220, tetapi terjemahan utuh
 * judul Arab terpanjang Ihya (±156 huruf) bisa ±250: batas ini pengaman keluaran rusak, bukan gaya.
 */
export const TOC_TITLE_MAX_CHARS = 320;

export interface TocTitleItem {
  /** Kunci stabil: `n<toc_node.id>` atau `p<seq paragraf subjudul>`. */
  id: string;
  /** Kunci induk di kelompok yang sama, atau null. */
  parent: string | null;
  level: number;
  kind: "node" | "sub";
  /** Judul Arab dari DB (data masukan, tidak pernah ditampilkan dari keluaran model). */
  title: string;
}

export function tocTitleUserText(path: readonly string[], items: readonly TocTitleItem[]): string {
  const data = items.map((i) => ({
    id: i.id,
    induk: i.parent,
    tingkat: i.level,
    jenis: i.kind === "node" ? "node" : "subjudul",
    judul: i.title,
  }));
  return [
    `<jalur>\n${path.join("\n")}\n</jalur>`,
    `<judul>\n${JSON.stringify(data, null, 1)}\n</judul>`,
    "Terjemahkan setiap judul di <judul> ke bahasa Indonesia.",
  ].join("\n");
}

/**
 * Parameter request (ADR-013: effort eksplisit, tanpa temperature/prefill). Sonnet 5.5 (pemilik,
 * jawaban desain X04 no. 5): judul paling sering dilihat dan jumlahnya kecil.
 */
export function buildTocTitleRequest(
  path: readonly string[],
  items: readonly TocTitleItem[],
  model: ModelId = MODELS.sonnet,
): MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: TOC_TITLE_MAX_TOKENS,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: TOC_TITLE_SCHEMA },
    },
    system: [
      {
        type: "text",
        text: TOC_TITLE_PROMPT.system,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    messages: [{ role: "user", content: tocTitleUserText(path, items) }],
  };
}

export type TocTitleProblem =
  | "empty"
  | "arabic"
  | "too_long"
  | "newline"
  | "markdown"
  | "quote"
  | "trailing_period";

/** Masalah satu judul Indonesia; kosong = diterima. Teks disimpan apa adanya (sesudah trim). */
export function checkTocTitle(text: string): TocTitleProblem[] {
  const t = text.trim();
  if (t === "") return ["empty"];
  const problems: TocTitleProblem[] = [];
  if (hasArabicLetters(t)) problems.push("arabic");
  if (t.length > TOC_TITLE_MAX_CHARS) problems.push("too_long");
  if (/[\r\n]/.test(t)) problems.push("newline");
  if (hasMarkdown(t) || /[*_`#]/.test(t)) problems.push("markdown");
  if (/["“”«»]/.test(t)) problems.push("quote");
  if (/[.。]$/.test(t) && !/\b(?:saw|swt|ra|as)\.$/i.test(t)) problems.push("trailing_period");
  return problems;
}

const output = z.strictObject({
  judul: z.array(z.strictObject({ id: z.string(), indonesia: z.string() })),
});

export interface TocTitleResult {
  /** Judul yang lolos, per id yang diminta. */
  accepted: Map<string, string>;
  /** id yang diminta tetapi gagal (tidak ada, ganda, atau tidak lolos cek), dengan alasannya. */
  rejected: Map<string, string>;
  /** Masalah tingkat respons (berhenti tidak normal, JSON rusak, id asing). */
  problems: string[];
}

/** Nilai satu respons terhadap id yang diminta. Respons `max_tokens`/refusal = semua gagal. */
export function judgeTocTitles(
  message: Pick<Message, "content" | "stop_reason">,
  wanted: readonly string[],
): TocTitleResult {
  const accepted = new Map<string, string>();
  const rejected = new Map<string, string>();
  const problems: string[] = [];
  const fail = (why: string) => {
    problems.push(why);
    for (const id of wanted) rejected.set(id, why);
    return { accepted, rejected, problems };
  };
  // Panduan Sonnet 5.5: structured output yang berhenti di max_tokens dianggap gagal walau JSON sah.
  if (message.stop_reason !== "end_turn") return fail(`stop_reason ${message.stop_reason}`);
  let parsed: z.infer<typeof output>;
  try {
    parsed = output.parse(JSON.parse(messageText(message)));
  } catch {
    return fail("JSON tidak sesuai skema");
  }
  const want = new Set(wanted);
  const seen = new Map<string, number>();
  for (const e of parsed.judul) seen.set(e.id, (seen.get(e.id) ?? 0) + 1);
  const foreign = [...seen.keys()].filter((id) => !want.has(id));
  if (foreign.length > 0) problems.push(`id asing: ${foreign.join(", ")}`);
  for (const e of parsed.judul) {
    if (!want.has(e.id)) continue;
    if ((seen.get(e.id) ?? 0) > 1) {
      rejected.set(e.id, "id ganda");
      continue;
    }
    const p = checkTocTitle(e.indonesia);
    if (p.length > 0) rejected.set(e.id, p.join(", "));
    else accepted.set(e.id, e.indonesia.trim());
  }
  for (const id of wanted) {
    if (!accepted.has(id) && !rejected.has(id)) rejected.set(id, "tidak ada di keluaran");
  }
  return { accepted, rejected, problems };
}
