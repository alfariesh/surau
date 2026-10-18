// Tujuh tool MCP Surau (S16 langkah 4, ARSITEKTUR-TEKNIS §4, ADR-012): satu tool = satu core tool.
// Logika data seluruhnya di @surau/core; di sini hanya skema masukan/keluaran MCP, batas pemakaian,
// amplop (permalink absolut + lisensi), dan pemetaan error. Keluaran = bentuk core apa adanya,
// kecuali search_text yang dipadatkan untuk anggaran token (ADR-049). Skema dan definisi tool
// dibangun sekali per isolate; per permintaan hanya pendaftaran ke McpServer baru.
import type { McpServer } from "@modelcontextprotocol/server";
import {
  InvalidCitation,
  getHadithTakhrij,
  getHadithTakhrijInput,
  getToc,
  getTocInput,
  isCoreError,
  listWorks,
  pageView,
  quoteVerification,
  readPage,
  readPageInput,
  readSection,
  readSectionInput,
  searchHit,
  searchPage,
  searchSummary,
  searchText,
  searchTextInput,
  searchTranslation,
  searchView,
  sectionView,
  takhrijView,
  tocView,
  verifyQuote,
  verifyQuoteInput,
  workList,
} from "@surau/core";
import type { CitationSource, SearchHit, SearchView } from "@surau/core";
import type { D1Db } from "@surau/db";
import { z } from "zod";

import { absolutize, licenseBlock, licenseFor } from "./envelope.ts";
import { guardTool } from "./guard.ts";
import type { GuardEnv } from "./guard.ts";

/** Semua tool hanya membaca D1 sendiri (spec 2026-07-28: anotasi = petunjuk untuk klien). */
const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

// ── search_text yang dipadatkan (ADR-049) ────────────────────────────────────────────────────

/**
 * Batas MCP: ≤5 halaman per panggilan (core sampai 50; halaman berikutnya lewat `offset`) dan ≤3
 * paragraf terbaik per halaman, supaya satu hasil ≤ ±10 ribu token (data/reports/mcp-token.md).
 */
export const MCP_SEARCH_MAX_LIMIT = 5;
export const MCP_SEARCH_DEFAULT_LIMIT = 5;
export const MCP_HITS_PER_PAGE = 3;
export const MCP_TOC_MAX_DEPTH = 3;
/** Dari akar, kedalaman 3 = seluruh pohon Ihya (±24 ribu token, data/reports/mcp-token.md). */
export const MCP_TOC_ROOT_MAX_DEPTH = 2;

const aiExcerpt = { highlights: true, created_at: true } as const;

export const mcpSearchHit = searchHit
  .omit({ anchor: true, ord: true, toc_node_id: true, highlights: true })
  .extend({
    translation: searchTranslation
      .omit(aiExcerpt)
      .nullable()
      .describe("AI translation excerpt (Indonesian), labelled; null when the passage has none"),
    summary: searchSummary
      .omit(aiExcerpt)
      .nullable()
      .describe("AI summary excerpt of the section this passage starts, when the summary matched"),
  });
export type McpSearchHit = z.infer<typeof mcpSearchHit>;

export const mcpSearchView = searchView.extend({
  results: z
    .array(
      searchPage.extend({
        hits: z
          .array(mcpSearchHit)
          .describe(
            `Best matching passages on this page (at most ${MCP_HITS_PER_PAGE}), in reading order`,
          ),
        hits_omitted: z
          .number()
          .int()
          .nonnegative()
          .describe("Matching passages on this page not shown here; read_page shows the page"),
      }),
    )
    .describe("Printed pages, best first (or book order when unranked)"),
});
export type McpSearchView = z.infer<typeof mcpSearchView>;

function compactHit(hit: SearchHit): McpSearchHit {
  const {
    anchor: _a,
    ord: _o,
    toc_node_id: _t,
    highlights: _h,
    translation,
    summary,
    ...rest
  } = hit;
  const excerpt = <T extends { highlights: unknown; created_at: string }>(ai: T | null) => {
    if (ai === null) return null;
    const { highlights: _x, created_at: _c, ...kept } = ai;
    return kept;
  };
  return { ...rest, translation: excerpt(translation), summary: excerpt(summary) };
}

/** Pilih ≤3 paragraf skor tertinggi per halaman (urutan baca tetap), lalu padatkan. */
export function compactSearch(view: SearchView): McpSearchView {
  return {
    ...view,
    results: view.results.map((page) => {
      const best = page.hits
        .map((hit, i) => ({ hit, i }))
        .toSorted((a, b) => (b.hit.score ?? 0) - (a.hit.score ?? 0) || a.i - b.i)
        .slice(0, MCP_HITS_PER_PAGE)
        .toSorted((a, b) => a.i - b.i);
      return {
        ...page,
        hits: best.map(({ hit }) => compactHit(hit)),
        hits_omitted: page.hits.length - best.length,
      };
    }),
  };
}

// ── Definisi tool ────────────────────────────────────────────────────────────────────────────

type LicenseSource = Pick<CitationSource, "license" | "attribution">;

/** Definisi tool tanpa tipe generik (dibangun sekali per isolate oleh `defineTool`). */
export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodObject;
  /** Skema keluaran core + blok `license`. */
  outputSchema: z.ZodObject;
  /** Panggil core; `sources` = lisensi + atribusi sumber di hasil (edisi, ayat), untuk blok lisensi. */
  run: (args: never, db: D1Db) => Promise<{ view: unknown; sources: LicenseSource[] }>;
}

function defineTool<I extends z.ZodObject, O extends z.ZodObject>(def: {
  name: string;
  title: string;
  description: string;
  input: I;
  output: O;
  run: (args: z.output<I>, db: D1Db) => Promise<{ view: z.output<O>; sources: LicenseSource[] }>;
}): McpTool {
  return {
    name: def.name,
    title: def.title,
    description: def.description,
    inputSchema: def.input,
    outputSchema: def.output.extend({ license: licenseBlock }),
    run: def.run as McpTool["run"],
  };
}

const sourceOf = (view: { citation: { source: CitationSource } }) => [view.citation.source];

export const TOOLS: readonly McpTool[] = [
  defineTool({
    name: "list_works",
    title: "List works",
    description:
      "List the works and editions in Surau: titles, author, edition, volumes, license, attribution and permalink. Use edition_id with get_table_of_contents and read_page. · Daftar karya dan edisi di Surau beserta lisensi dan atribusinya.",
    input: z.strictObject({}),
    output: workList,
    run: async (_args, db) => {
      const view = await listWorks(db);
      return { view, sources: view.works.flatMap((w) => w.editions) };
    },
  }),

  defineTool({
    name: "get_table_of_contents",
    title: "Table of contents",
    description: `Table of contents of an edition as a tree. Each section has an id (use it with read_section, or as section_id in search_text), its Arabic title and where it starts (juz, page, permalink). Returns \`depth\` levels from the roots (default and max ${MCP_TOC_ROOT_MAX_DEPTH}, about 8,000 tokens) or from node_id (max ${MCP_TOC_MAX_DEPTH}); child_count shows children not returned. · Daftar isi edisi (pohon bab) dengan halaman awal setiap bagian.`,
    input: getTocInput.extend({
      depth: z
        .number()
        .int()
        .min(1)
        .max(MCP_TOC_MAX_DEPTH)
        .default(2)
        .describe("Levels to return, counting the starting level"),
    }),
    output: tocView,
    run: async (args, db) => {
      if (args.node_id === undefined && args.depth > MCP_TOC_ROOT_MAX_DEPTH) {
        throw new InvalidCitation(
          `Invalid depth: at most ${MCP_TOC_ROOT_MAX_DEPTH} from the roots; pass node_id to go deeper`,
        );
      }
      const view = await getToc(db, args.edition_id, { nodeId: args.node_id, depth: args.depth });
      return { view, sources: sourceOf(view) };
    },
  }),

  defineTool({
    name: "read_page",
    title: "Read a printed page",
    description:
      "Read one printed page: main-text passages and footnotes (takhrij) verbatim in Arabic, footnote marker links, Quran quotations with the full ayat (Tanzil text + official Kemenag Indonesian translation, each with its own license in quran.sources), labelled AI translations (Indonesian) per passage, AI summaries of sections starting there, and the previous/next page. A page is about 5,000–15,000 tokens. · Baca satu halaman cetak: teks Arab asli, catatan kaki takhrij, ayat dengan terjemahan Kemenag, dan terjemahan AI berlabel.",
    input: readPageInput,
    output: pageView,
    run: async (args, db) => {
      const view = await readPage(db, args.edition_id, args.juz, args.page_no);
      // Teks ayat (Tanzil) dan terjemahan Kemenag punya lisensi dan atribusi sendiri (ADR-040).
      return { view, sources: [...sourceOf(view), ...(view.quran?.sources ?? [])] };
    },
  }),

  defineTool({
    name: "read_section",
    title: "Read a section",
    description:
      "Read a table-of-contents section with its subsections in reading order, in chunks of at most about 6,000 tokens; pass next_cursor to continue (null at the end). Arabic text verbatim with footnotes, marker links and Quran references; no translations (read_page has them). · Baca satu bagian (bab) beserta sub-bagiannya, per potongan ≤ ±6 ribu token.",
    input: readSectionInput.omit({ node_id: true }).extend({
      section_id: readSectionInput.shape.node_id.describe(
        "Section id from get_table_of_contents or search_text",
      ),
    }),
    output: sectionView,
    run: async (args, db) => {
      const view = await readSection(db, args.section_id, args.cursor);
      return { view, sources: sourceOf(view) };
    },
  }),

  defineTool({
    name: "search_text",
    title: "Search the texts",
    description: `Search by Arabic words or an exact phrase (diacritics optional; attached prefixes matched) or by Indonesian words (matched in the labelled AI translations and summaries). Returns up to ${MCP_SEARCH_MAX_LIMIT} printed pages, best first (use offset for more), each with up to ${MCP_HITS_PER_PAGE} matching passages: a short verbatim Arabic snippet, an AI translation excerpt and the section; about 5,000–11,000 tokens. Use read_page or the permalink for the full text, and verify_quote before quoting. · Cari kata Arab atau Indonesia; hasil per halaman cetak dengan potongan teks Arab asli dan terjemahan AI berlabel.`,
    input: searchTextInput.extend({
      limit: z
        .number()
        .int()
        .min(1)
        .max(MCP_SEARCH_MAX_LIMIT)
        .default(MCP_SEARCH_DEFAULT_LIMIT)
        .describe("Pages to return (passages when the query has only very common words)"),
    }),
    output: mcpSearchView,
    run: async ({ query, ...opts }, db) => {
      const view = compactSearch(await searchText(db, query, opts));
      return { view, sources: view.results.map((r) => r.citation.source) };
    },
  }),

  defineTool({
    name: "verify_quote",
    title: "Verify a quotation",
    description:
      "Check that an Arabic quotation really occurs in a passage, ignoring diacritics and letter variants. Returns verified and match.text: the exact source text to quote, with its own diacritics. Use it before presenting any Arabic quotation; verified false means do not present it as a quote. · Verifikasi kutipan Arab terhadap teks sumber; hasilnya teks persis dari kitab.",
    input: verifyQuoteInput,
    output: quoteVerification,
    run: async (args, db) => {
      const view = await verifyQuote(db, args.passage_id, args.quote);
      return { view, sources: sourceOf(view) };
    },
  }),

  defineTool({
    name: "get_hadith_takhrij",
    title: "Hadith takhrij",
    description:
      "Get the takhrij (hadith sources and grading notes) linked to a passage: the footnotes referenced by its markers (١), verbatim; for Ihya these are al-'Iraqi's takhrij. status none means no takhrij is linked: the grading is unknown, never guess it. · Ambil takhrij (sumber dan derajat hadits) yang tertaut ke sebuah paragraf; tanpa takhrij berarti status belum diketahui.",
    input: getHadithTakhrijInput,
    output: takhrijView,
    run: async (args, db) => {
      const view = await getHadithTakhrij(db, args.passage_id);
      return { view, sources: sourceOf(view) };
    },
  }),
];

// ── Pendaftaran per permintaan ───────────────────────────────────────────────────────────────

/** Bahan satu permintaan: binding, request asli (untuk kunci batas), dan origin situs. */
export interface ToolDeps {
  env: GuardEnv;
  db: D1Db;
  request: Request | undefined;
  siteUrl: string;
}

/** Bagian `McpServer` yang dipakai di sini (memudahkan tes tanpa server sungguhan). */
export interface ToolRegistrar {
  registerTool: McpServer["registerTool"];
}

/**
 * `registerTool` dengan tipe sederhana. Overload SDK menurunkan tipe argumen callback dari skema
 * generik, yang tidak bisa disimpulkan TS untuk daftar tool heterogen; argumen tetap divalidasi SDK
 * dengan `inputSchema` sebelum callback dipanggil, dan keluaran dengan `outputSchema`.
 */
type RegisterTool = (
  name: string,
  config: {
    title: string;
    description: string;
    inputSchema: z.ZodObject;
    outputSchema: z.ZodObject;
    annotations: typeof READ_ONLY;
  },
  cb: (args: never) => Promise<ToolResult>,
) => unknown;

export interface ToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

function errorResult(code: string, message: string): ToolResult {
  return { content: [{ type: "text", text: `${code}: ${message}` }], isError: true };
}

const GUARD_MESSAGE = {
  rate_limited:
    "Too many requests for this tool from your network. Wait a minute and retry. · Terlalu banyak permintaan; coba lagi sebentar lagi.",
  unavailable:
    "The Surau MCP server is not fully configured yet. Try again later. · Server MCP Surau belum siap; coba lagi nanti.",
} as const;

/** Jalankan satu tool: batas pemakaian → core → amplop; error dipetakan tanpa detail internal. */
export async function runTool(tool: McpTool, deps: ToolDeps, args: never): Promise<ToolResult> {
  const started = performance.now();
  let outcome = "internal_error";
  try {
    const gate = await guardTool(deps.env, deps.request, tool.name);
    if (gate !== "ok") {
      outcome = gate;
      return errorResult(gate, GUARD_MESSAGE[gate]);
    }
    const { view, sources } = await tool.run(args, deps.db);
    const out = {
      ...(absolutize(view, deps.siteUrl) as Record<string, unknown>),
      license: licenseFor(deps.siteUrl, sources),
    };
    outcome = "ok";
    return { content: [{ type: "text", text: JSON.stringify(out) }], structuredContent: out };
  } catch (error) {
    // Error core = pesan publik berbahasa Inggris yang hanya menyebut alamat (packages/core
    // errors.ts). Error lain (D1 gagal) tanpa detail; log tanpa masukan pengguna (P-7).
    if (isCoreError(error)) {
      outcome = error.code;
      return errorResult(error.code, error.message);
    }
    console.error(
      JSON.stringify({
        event: "tool_error",
        tool: tool.name,
        error: error instanceof Error ? error.name : "unknown",
      }),
    );
    return errorResult("internal_error", "Internal error. Try again later.");
  } finally {
    // Objek terstruktur diindeks Workers Logs. Hanya label statis dan durasi: tanpa argumen,
    // hasil, alamat halaman, pesan error, IP, atau ID pengguna (P-7 belum diputuskan).
    console.info({
      event: "mcp_tool",
      tool: tool.name,
      outcome,
      duration_ms: Math.round(performance.now() - started),
    });
  }
}

/** Daftarkan ketujuh tool ke `server` untuk satu permintaan. */
export function registerTools(server: ToolRegistrar, deps: ToolDeps): void {
  const register = server.registerTool.bind(server) as RegisterTool;
  for (const tool of TOOLS) {
    register(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        annotations: READ_ONLY,
      },
      (args) => runTool(tool, deps, args),
    );
  }
}
