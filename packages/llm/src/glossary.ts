// Definisi glosarium (X15b, ADR-098): request lewat Messages API biasa (jumlahnya kecil, ±145
// istilah) dan validasinya. Istilah dan kuncinya data (`GLOSSARY_TERMS`); model hanya menulis
// definisi, yang disimpan di `glossary_term` beserta model, versi prompt, dan tanggalnya.
import type {
  Message,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";

import { GLOSSARY_GLOSS_SCHEMA, GLOSSARY_GLOSS_V1 } from "../prompts/glossary-gloss-v1.ts";
import { GLOSSARY_TERMS } from "../prompts/glossary-v2.ts";
import type { GlossaryEntry } from "../prompts/glossary-v2.ts";
import { MODELS } from "./client.ts";
import type { ModelId } from "./client.ts";
import { narrativeProblems } from "./digest.ts";
import { messageText } from "./response.ts";

export const GLOSSARY_GLOSS_PROMPT = GLOSSARY_GLOSS_V1;
export const GLOSSARY_GLOSS_MAX_TOKENS = 16_000;
/** Istilah per request (±60 token keluaran per definisi). */
export const GLOSSARY_GLOSS_GROUP = 80;
/** Panjang definisi yang diterima (kata); prompt meminta ≤ 40. */
export const GLOSSARY_GLOSS_WORDS: readonly [number, number] = [4, 50];

/** Entri yang perlu definisi (boleh dipilih Intisari), urut glosarium. */
export const glossaryTargets = (): GlossaryEntry[] => GLOSSARY_TERMS.filter((e) => e.term);

export function glossaryGlossUserText(entries: readonly GlossaryEntry[]): string {
  const data = entries.map((e) => ({
    kunci: e.key,
    sumber: e.source,
    istilah: e.label,
    padanan: e.note ?? "",
  }));
  return `<istilah>\n${JSON.stringify(data, null, 1)}\n</istilah>\nTulis definisi setiap istilah di <istilah>.`;
}

/** Sonnet 5.5 (seperti judul daftar isi, ADR-077): jumlahnya kecil dan definisi sering dilihat. */
export function buildGlossaryGlossRequest(
  entries: readonly GlossaryEntry[],
  model: ModelId = MODELS.sonnet,
): MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: GLOSSARY_GLOSS_MAX_TOKENS,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: GLOSSARY_GLOSS_SCHEMA },
    },
    system: [
      {
        type: "text",
        text: GLOSSARY_GLOSS_PROMPT.system,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    messages: [{ role: "user", content: glossaryGlossUserText(entries) }],
  };
}

const output = z.strictObject({
  definisi: z.array(z.strictObject({ kunci: z.string(), definisi: z.string() })),
});

/** Masalah satu definisi; kosong = diterima. */
export function glossProblems(text: string): string[] {
  const out = narrativeProblems(text);
  const n = text.trim().split(/\s+/u).filter(Boolean).length;
  if (n < GLOSSARY_GLOSS_WORDS[0] || n > GLOSSARY_GLOSS_WORDS[1]) out.push("length");
  return out;
}

export interface GlossaryGlossResult {
  accepted: Map<string, string>;
  rejected: Map<string, string>;
  problems: string[];
}

/** Nilai satu respons terhadap kunci yang diminta (pola `judgeTocTitles`). */
export function judgeGlossaryGlosses(
  message: Pick<Message, "content" | "stop_reason">,
  wanted: readonly string[],
): GlossaryGlossResult {
  const accepted = new Map<string, string>();
  const rejected = new Map<string, string>();
  const problems: string[] = [];
  const fail = (why: string) => {
    problems.push(why);
    for (const k of wanted) rejected.set(k, why);
    return { accepted, rejected, problems };
  };
  if (message.stop_reason !== "end_turn") return fail(`stop_reason ${message.stop_reason}`);
  let parsed: z.infer<typeof output>;
  try {
    parsed = output.parse(JSON.parse(messageText(message)));
  } catch {
    return fail("JSON tidak sesuai skema");
  }
  const want = new Set(wanted);
  const seen = new Map<string, number>();
  for (const e of parsed.definisi) seen.set(e.kunci, (seen.get(e.kunci) ?? 0) + 1);
  const foreign = [...seen.keys()].filter((k) => !want.has(k));
  if (foreign.length > 0) problems.push(`kunci asing: ${foreign.join(", ")}`);
  for (const e of parsed.definisi) {
    if (!want.has(e.kunci)) continue;
    if ((seen.get(e.kunci) ?? 0) > 1) {
      rejected.set(e.kunci, "kunci ganda");
      continue;
    }
    const p = glossProblems(e.definisi);
    if (p.length > 0) rejected.set(e.kunci, p.join(", "));
    else accepted.set(e.kunci, e.definisi.trim());
  }
  for (const k of wanted) {
    if (!accepted.has(k) && !rejected.has(k)) rejected.set(k, "tidak ada di keluaran");
  }
  return { accepted, rejected, problems };
}
