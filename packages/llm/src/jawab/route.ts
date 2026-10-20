// Panggilan routing Jawab (S19): Haiku memilih bagian daftar isi dan kata kunci pencarian. Prefix
// (prompt + daftar isi) sama untuk semua pertanyaan dan di-cache 1 jam. Keluaran JSON terstruktur
// boleh di sini karena request ini tanpa dokumen Citations (keduanya tidak bisa digabung).
import type {
  Message,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/messages";
import type { AnswerTocNode } from "@surau/core";
import { z } from "zod";

import { ANSWER_ROUTE_SCHEMA, ANSWER_ROUTE_V1 } from "../../prompts/answer-route-v1.ts";
import { MODELS } from "../client.ts";
import { messageText } from "../response.ts";

export const ROUTE_PROMPT = ANSWER_ROUTE_V1;
/** Ruang thinking (effort low) + JSON kecil. */
export const ROUTE_MAX_TOKENS = 2048;
export const ROUTE_MAX_SECTIONS = 4;
export const ROUTE_MAX_QUERIES = 4;
/** Batas `searchText` (InvalidQuery di atasnya). */
export const QUERY_MAX_CHARS = 200;

export interface Route {
  sections: number[];
  queries: string[];
  hadith: boolean;
}

/** Daftar isi sebagai teks: satu baris per node, indentasi per tingkat, urutan baca (pre-order). */
export function tocText(nodes: readonly AnswerTocNode[]): string {
  const children = new Map<number | null, AnswerTocNode[]>();
  for (const n of nodes) children.set(n.parent_id, [...(children.get(n.parent_id) ?? []), n]);
  const lines: string[] = [];
  const walk = (parent: number | null) => {
    for (const n of children.get(parent) ?? []) {
      lines.push(`${n.id} ${"  ".repeat(n.level - 1)}${n.title_ar} (j${n.juz} h${n.page_no})`);
      walk(n.id);
    }
  };
  walk(null);
  return lines.join("\n");
}

export function buildRouteRequest(toc: string, question: string): MessageCreateParamsNonStreaming {
  return {
    model: MODELS.haiku,
    max_tokens: ROUTE_MAX_TOKENS,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: ANSWER_ROUTE_SCHEMA },
    },
    system: [
      { type: "text", text: ROUTE_PROMPT.system },
      {
        type: "text",
        text: `<daftar_isi>\n${toc}\n</daftar_isi>`,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    messages: [{ role: "user", content: `<pertanyaan>${question}</pertanyaan>` }],
  };
}

const routeOutput = z.object({
  sections: z.array(z.number().int()),
  queries: z.array(z.string()),
  hadith: z.boolean(),
});

/**
 * Keluaran routing yang sudah dibersihkan: hanya ID bagian yang ada di daftar isi, kueri unik
 * yang tidak kosong dan ≤200 karakter. `null` bila keluaran tidak bisa dipakai (refusal,
 * terpotong, JSON rusak); pipeline lalu mencari dengan pertanyaan saja.
 */
export function parseRoute(message: Message, validIds: ReadonlySet<number>): Route | null {
  if (message.stop_reason !== "end_turn") return null;
  let raw: unknown;
  try {
    raw = JSON.parse(messageText(message));
  } catch {
    return null;
  }
  const parsed = routeOutput.safeParse(raw);
  if (!parsed.success) return null;
  const sections = [...new Set(parsed.data.sections.filter((id) => validIds.has(id)))].slice(
    0,
    ROUTE_MAX_SECTIONS,
  );
  const queries = [...new Set(parsed.data.queries.map((q) => q.trim()).filter((q) => q.length > 0))]
    .map((q) => q.slice(0, QUERY_MAX_CHARS))
    .slice(0, ROUTE_MAX_QUERIES);
  return { sections, queries, hadith: parsed.data.hadith };
}
