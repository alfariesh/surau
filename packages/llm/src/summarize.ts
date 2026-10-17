// Request dan validasi ringkasan per bagian daftar isi (S13, prompt `summarize-section@1`), dua
// putaran: putaran 1 meringkas teks Arab (bertanda ayat) sebuah simpul atau potongannya; putaran 2
// meringkas simpul dari ringkasan putaran 1 di bawahnya (satu rub' ±450 ribu token, jauh di atas
// batas 100k).
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";

import { SUMMARIZE_SECTION_V1 } from "../prompts/summarize-section-v1.ts";
import { MAX_ARABIC_RUN_WORDS, hasMarkdown, hasPreamble, longestArabicRun } from "./check.ts";
import { MODELS } from "./client.ts";
import type { ModelId } from "./client.ts";
import type { SummaryLang } from "./custom-id.ts";

export const SUMMARY_PROMPT = SUMMARIZE_SECTION_V1;
export const SUMMARY_MAX_TOKENS = 16_000;

const LANG_NAME: Record<SummaryLang, string> = { id: "Indonesia", en: "Inggris" };

export interface SummaryChunkInput {
  tocNodeId: number;
  /** Jalur judul daftar isi (teks Arab dari DB). */
  heading: string;
  lang: SummaryLang;
  /** Potongan ke-`part` dari `parts`; `parts` = 1 bila simpul utuh dalam satu request. */
  part: number;
  parts: number;
  /** Paragraf badan bertanda ayat, masing-masing diawali penanda halaman `[jilid/halaman]`. */
  text: string;
}

export interface SummaryRound2Input {
  tocNodeId: number;
  heading: string;
  lang: SummaryLang;
  /** Ringkasan putaran 1 di bawah simpul ini, urut baca. */
  children: readonly { heading: string; summary: string }[];
}

function request(model: ModelId, user: string): MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: SUMMARY_MAX_TOKENS,
    output_config: { effort: "low" },
    system: [
      {
        type: "text",
        text: SUMMARY_PROMPT.system,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    messages: [{ role: "user", content: user }],
  };
}

export function summaryChunkUserText(input: SummaryChunkInput): string {
  const piece = input.parts > 1 ? ` (potongan ${input.part} dari ${input.parts})` : "";
  const what = input.parts > 1 ? "potongan bagian ini" : "bagian ini";
  return [
    `<bagian>${input.heading}${piece}</bagian>`,
    `<teks>\n${input.text}\n</teks>`,
    `Tulis ringkasan ${what} dalam bahasa ${LANG_NAME[input.lang]}.`,
  ].join("\n");
}

export function summaryRound2UserText(input: SummaryRound2Input): string {
  const list = input.children.map((c, i) => `${i + 1}. ${c.heading}\n${c.summary}`).join("\n\n");
  return [
    `<bagian>${input.heading}</bagian>`,
    `<ringkasan_subbagian>\n${list}\n</ringkasan_subbagian>`,
    `Tulis ringkasan seluruh bagian ini dalam bahasa ${LANG_NAME[input.lang]}.`,
  ].join("\n");
}

export function buildSummaryRequest(
  input: SummaryChunkInput,
  model: ModelId = MODELS.haiku,
): MessageCreateParamsNonStreaming {
  return request(model, summaryChunkUserText(input));
}

export function buildSummaryRound2Request(
  input: SummaryRound2Input,
  model: ModelId = MODELS.haiku,
): MessageCreateParamsNonStreaming {
  return request(model, summaryRound2UserText(input));
}

export type SummaryProblem =
  | "empty"
  | "too_short"
  | "too_long"
  | "placeholder"
  | "arabic"
  | "language"
  | "markdown"
  | "preamble";

export interface SummaryCheck {
  ok: boolean;
  problems: SummaryProblem[];
}

/** Panjang ringkasan yang wajar (karakter): 1 kalimat pendek sampai ±8 kalimat panjang. */
export const SUMMARY_LENGTH = { min: 60, max: 2_400 } as const;

// Kata fungsi yang hampir pasti muncul dalam beberapa kalimat bahasa itu; cek kasar salah bahasa.
const LANG_WORDS: Record<SummaryLang, RegExp> = {
  id: /\b(?:yang|dan|dengan|bahwa|dalam)\b/i,
  en: /\b(?:the|and|of|that|is)\b/i,
};

export function checkSummary(output: string, lang: SummaryLang): SummaryCheck {
  const text = output.trim();
  if (text === "") return { ok: false, problems: ["empty"] };
  const problems: SummaryProblem[] = [];
  if (text.length < SUMMARY_LENGTH.min) problems.push("too_short");
  if (text.length > SUMMARY_LENGTH.max) problems.push("too_long");
  if (text.includes("⟦") || /\bQS\s*\d/.test(text)) problems.push("placeholder");
  if (longestArabicRun(text) > MAX_ARABIC_RUN_WORDS) problems.push("arabic");
  if (
    !LANG_WORDS[lang].test(text) ||
    (lang === "en" && LANG_WORDS.id.test(text) && !/\bthe\b/i.test(text))
  )
    problems.push("language");
  if (hasMarkdown(text)) problems.push("markdown");
  if (hasPreamble(text)) problems.push("preamble");
  return { ok: problems.length === 0, problems };
}
