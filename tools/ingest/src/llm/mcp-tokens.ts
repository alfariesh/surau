// S16 langkah 2 (kalibrasi ADR-033): ukur token Claude keluaran tool MCP Surau dengan
// `messages.countTokens` (gratis), atas Worker MCP yang sedang berjalan (lokal: `pnpm --filter
// @surau/mcp dev` → http://localhost:3006/mcp, D1 lokal). Yang diukur adalah teks `content` hasil
// tool, persis yang diterima klien. Laporan (angka saja, tanpa teks kitab): data/reports/mcp-token.md.
import { join } from "node:path";

import { MODELS } from "@surau/llm";
import { z } from "zod";

import { samplePages } from "../qa-sample.ts";
import type { LlmContext } from "./cli.ts";
import { mapPool } from "./pool.ts";
import { writeText } from "./store.ts";

export const MCP_TOKEN_SEED = 16;
/** Potongan read_section yang dibaca per bagian sampel (dari awal bagian). */
const CHUNKS_PER_SECTION = 4;
const SEARCH_QUERIES = ["الصبر", "الإخلاص", "sabar", "niat", "tobat", "adab murid kepada guru"];

const toolResponse = z.object({
  result: z.object({
    content: z.array(z.object({ type: z.literal("text"), text: z.string() })).min(1),
    structuredContent: z.record(z.string(), z.unknown()),
    isError: z.boolean().optional(),
  }),
});

async function callTool(url: string, name: string, args: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const body = await res.text();
  // Era legacy menjawab SSE (`data: {…}`), era modern JSON biasa.
  const data = body.split("\n").find((l) => l.startsWith("data: "));
  const parsed = toolResponse.safeParse(JSON.parse(data === undefined ? body : data.slice(6)));
  if (!parsed.success || parsed.data.result.isError === true) {
    throw new Error(`${name}: hasil tool gagal (${JSON.stringify(args)})`);
  }
  const [first] = parsed.data.result.content;
  return { text: first?.text ?? "", structured: parsed.data.result.structuredContent };
}

const tocNode = z.object({
  id: z.number(),
  level: z.number(),
  start: z.object({ juz: z.number(), page_no: z.number() }),
  get children() {
    return z.array(tocNode);
  },
});
type TocNode = z.infer<typeof tocNode>;

function flatten(nodes: readonly TocNode[]): TocNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

interface Measure {
  tool: string;
  chars: number;
  tokens: number;
}

interface SectionMeasure extends Measure {
  estimated: number;
  passageChars: number;
  passageTokens: number;
}

const quantile = (xs: readonly number[], q: number): number => {
  const s = xs.toSorted((a, b) => a - b);
  return s.length === 0 ? 0 : (s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] ?? 0);
};
const round2 = (x: number) => Math.round(x * 100) / 100;

export async function runMcpTokens(ctx: LlmContext, url: string, n: number): Promise<number> {
  const client = ctx.client();
  const count = async (content: string) =>
    (
      await client.messages.countTokens({
        model: MODELS.haiku,
        messages: [{ role: "user", content }],
      })
    ).input_tokens;
  // Overhead pembungkus pesan: pesan "." dihitung, lalu dikurangi (tanpa token titik itu sendiri).
  const base = (await count(".")) - 1;
  const tokensOf = async (text: string) => (await count(text)) - base;

  // Dari akar MCP hanya memberi 2 tingkat; tingkat 3 diambil per node akar.
  const roots = z
    .array(tocNode)
    .parse((await callTool(url, "get_table_of_contents", { edition_id: 1 })).structured.nodes);
  const nodes: TocNode[] = [];
  for (const root of roots) {
    const sub = await callTool(url, "get_table_of_contents", {
      edition_id: 1,
      node_id: root.id,
      depth: 3,
    });
    nodes.push(...flatten(z.array(tocNode).parse(sub.structured.nodes)));
  }
  const byId = new Map(nodes.map((x) => [x.id, x]));
  const sections = samplePages(
    nodes.filter((x) => x.level >= 2).map((x) => x.id),
    n,
    MCP_TOKEN_SEED,
  );

  const chunks: { text: string; structured: Record<string, unknown> }[] = [];
  for (const id of sections) {
    let cursor: string | null = null;
    for (let i = 0; i < CHUNKS_PER_SECTION; i++) {
      const args: Record<string, unknown> =
        cursor === null ? { section_id: id } : { section_id: id, cursor };
      const out = await callTool(url, "read_section", args);
      chunks.push(out);
      cursor = z.string().nullable().parse(out.structured.next_cursor);
      if (cursor === null) break;
    }
  }
  const sectionMeasures: SectionMeasure[] = await mapPool(chunks, 8, async (c) => {
    const passages = JSON.stringify(c.structured.passages);
    return {
      tool: "read_section",
      chars: c.text.length,
      tokens: await tokensOf(c.text),
      estimated: z.number().parse(c.structured.estimated_tokens),
      passageChars: passages.length,
      passageTokens: await tokensOf(passages),
    };
  });

  const pageStarts = sections.map((id) => byId.get(id)?.start).filter((s) => s !== undefined);
  const pageBody = z.object({
    body: z.array(z.object({ id: z.number(), text_raw: z.string() })),
  });
  const passageTools: Measure[] = [];
  const pages = await mapPool(pageStarts, 4, async (s) => {
    const out = await callTool(url, "read_page", { edition_id: 1, juz: s.juz, page_no: s.page_no });
    // Paragraf badan pertama halaman: takhrij-nya, dan verifikasi tiga kata pertamanya.
    const [first] = pageBody.parse(out.structured).body;
    if (first !== undefined) {
      const quote = first.text_raw.split(/\s+/).slice(0, 3).join(" ");
      for (const [tool, args] of [
        ["get_hadith_takhrij", { passage_id: first.id }],
        ["verify_quote", { passage_id: first.id, quote }],
      ] as const) {
        const r = await callTool(url, tool, args);
        passageTools.push({ tool, chars: r.text.length, tokens: await tokensOf(r.text) });
      }
    }
    return { tool: "read_page", chars: out.text.length, tokens: await tokensOf(out.text) };
  });
  const searches: Measure[] = [];
  for (const limit of [3, 5]) {
    for (const query of SEARCH_QUERIES) {
      const out = await callTool(url, "search_text", { query, limit });
      searches.push({
        tool: `search_text limit ${limit}`,
        chars: out.text.length,
        tokens: await tokensOf(out.text),
      });
    }
  }
  const others: Measure[] = [];
  for (const [tool, args] of [
    ["list_works", {}],
    ["get_table_of_contents", { edition_id: 1 }],
    ["get_table_of_contents", { edition_id: 1, node_id: roots[1]?.id ?? 0, depth: 3 }],
  ] as const) {
    const out = await callTool(url, tool, args);
    others.push({
      tool: `${tool} ${JSON.stringify(args)}`,
      chars: out.text.length,
      tokens: await tokensOf(out.text),
    });
  }

  const row = (name: string, ms: readonly Measure[]) =>
    `| ${name} | ${ms.length} | ${quantile(
      ms.map((m) => m.tokens),
      0.5,
    )} | ${quantile(
      ms.map((m) => m.tokens),
      0.95,
    )} | ${Math.max(...ms.map((m) => m.tokens))} | ${Math.max(...ms.map((m) => m.chars))} |`;
  const groups = new Map<string, Measure[]>();
  for (const m of [...sectionMeasures, ...pages, ...passageTools, ...searches, ...others]) {
    groups.set(m.tool, [...(groups.get(m.tool) ?? []), m]);
  }
  const charsPerToken = sectionMeasures.map((m) => m.passageChars / m.passageTokens);
  const ratio = sectionMeasures.map((m) => m.passageTokens / m.estimated);
  const lines = [
    "# Token keluaran tool MCP Surau (S16)",
    "",
    `Diukur ${new Date().toISOString().slice(0, 10)} dengan \`messages.countTokens\` (model \`${MODELS.haiku}\`, gratis) atas teks \`content\` hasil tool dari Worker MCP lokal (D1 lokal, korpus Ihya), \`pnpm llm mcp-tokens\`. Sampel: ${sections.length} bagian daftar isi acak (level ≥ 2, seed ${MCP_TOKEN_SEED}), ≤${CHUNKS_PER_SECTION} potongan \`read_section\` pertama per bagian, halaman awal bagian yang sama untuk \`read_page\`, dan ${SEARCH_QUERIES.length} kueri tetap. Overhead pembungkus pesan (${base} token) dikurangkan.`,
    "",
    "| Tool | n | Median token | p95 | Maks. | Maks. karakter |",
    "|---|---|---|---|---|---|",
    ...[...groups].map(([name, ms]) => row(name, ms)),
    "",
    "## Kalibrasi `readSection` (ADR-033)",
    "",
    "| Ukuran | Nilai |",
    "|---|---|",
    `| Potongan diukur | ${sectionMeasures.length} |`,
    `| \`estimated_tokens\` maks. (heuristik saat diukur) | ${Math.max(...sectionMeasures.map((m) => m.estimated))} |`,
    `| Token Claude \`passages\` / \`estimated_tokens\` (median · maks.) | ${round2(quantile(ratio, 0.5))} · ${round2(Math.max(...ratio))} |`,
    `| Karakter JSON \`passages\` per token Claude (median · p5 · min.) | ${round2(quantile(charsPerToken, 0.5))} · ${round2(quantile(charsPerToken, 0.05))} · ${round2(Math.min(...charsPerToken))} |`,
    `| Token Claude seluruh hasil (median · maks.) | ${quantile(
      sectionMeasures.map((m) => m.tokens),
      0.5,
    )} · ${Math.max(...sectionMeasures.map((m) => m.tokens))} |`,
    `| Overhead di luar \`passages\` (citation, node, ancestors, license; median) | ${quantile(
      sectionMeasures.map((m) => m.tokens - m.passageTokens),
      0.5,
    )} |`,
    "",
  ];
  writeText(join(ctx.repo, "data/reports/mcp-token.md"), lines.join("\n"));
  console.info(lines.join("\n"));
  return 0;
}
