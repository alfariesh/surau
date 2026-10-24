// Tes definisi tool MCP (S16): pemadatan search_text dan pemetaan error (tanpa detail internal).
import type { SearchHit, SearchView } from "@surau/core";
import type { D1Db } from "@surau/db";
import { describe, expect, test, vi } from "vite-plus/test";
import { z } from "zod";

import type { GuardEnv, Limiter } from "./guard.ts";
import type { McpTool } from "./tools.ts";
import { MCP_HITS_PER_PAGE, TOOLS, compactSearch, mcpSearchView, runTool } from "./tools.ts";

function hit(id: number, score: number | null): SearchHit {
  const ai = {
    lang: "id",
    model: "m",
    prompt_version: "p@1",
    created_at: "2026-10-17",
    review_status: "ai_generated" as const,
    human_review: null,
    highlights: [{ char_start: 0, char_end: 1 }],
    snippet: { char_start: 0, char_end: 3, text: "abc" },
  };
  return {
    id,
    anchor: `p${id}`,
    kind: "body",
    ord: id,
    toc_node_id: 1,
    section: null,
    location: { juz: 1, page_no: 1, permalink: `/k/1/1#p${id}`, label: "K, j. 1, h. 1" },
    score,
    highlights: [{ char_start: 0, char_end: 2 }],
    snippet: { char_start: 0, char_end: 2, text: "نص" },
    matched_by: [{ path: "arabic", rank: id, all_terms: true }],
    translation: { label: "ai_translation", ...ai },
    summary: null,
    digest_point: null,
  };
}

describe("compactSearch", () => {
  test("≤3 paragraf skor tertinggi per halaman, urutan baca tetap; sorotan dan created_at dibuang", () => {
    const page = {
      citation: {
        source: {
          work: {
            slug: "k",
            title_ar: "ك",
            title_id: null,
            author: null,
            attribution_status: "authentic" as const,
          },
          edition: { id: 1, slug: "e", is_default: true, publisher: null, city: null },
          license: "CC BY-NC-SA 4.0",
          attribution: "A",
        },
        juz: 1,
        page_no: 1,
        permalink: "/k/1/1",
        label: "K, j. 1, h. 1",
      },
      score: 9,
      hit_count: 5,
      hits: [hit(1, 1), hit(2, 9), hit(3, 5), hit(4, 7), hit(5, 2)],
    };
    const view: SearchView = {
      query: "نص",
      terms: ["نص"],
      latin_terms: [],
      paths: ["arabic"],
      fusion: null,
      edition_id: null,
      section_id: null,
      ranked: true,
      warning: null,
      common_terms: [],
      total_pages: 1,
      total_hits: 5,
      limit: 5,
      offset: 0,
      results: [page],
    };
    const out = compactSearch(view);
    expect(mcpSearchView.parse(out)).toEqual(out);
    const [first] = out.results;
    expect(first?.hits.map((h) => h.id)).toEqual([2, 3, 4]);
    expect(first?.hits).toHaveLength(MCP_HITS_PER_PAGE);
    expect(first?.hits_omitted).toBe(2);
    expect(first?.hit_count).toBe(5);
    expect(first?.hits[0]).not.toHaveProperty("highlights");
    expect(first?.hits[0]?.translation).not.toHaveProperty("highlights");
    expect(first?.hits[0]?.translation).not.toHaveProperty("created_at");
    expect(first?.hits[0]?.translation).toMatchObject({ label: "ai_translation", model: "m" });
    // Tanpa peringkat (kata umum): paragraf pertama dalam urutan kitab.
    const unranked = compactSearch({
      ...view,
      ranked: false,
      results: [
        { ...page, score: null, hits: [hit(1, null), hit(2, null), hit(3, null), hit(4, null)] },
      ],
    });
    expect(unranked.results[0]?.hits.map((h) => h.id)).toEqual([1, 2, 3]);
  });
});

describe("runTool", () => {
  const yes: Limiter = { limit: async () => ({ success: true }) };
  const env: GuardEnv = {
    MCP_TOOL_LIMITER: yes,
    MCP_READ_GLOBAL_LIMITER: yes,
    MCP_SEARCH_LIMITER: yes,
    MCP_SEARCH_GLOBAL_LIMITER: yes,
    IP_HMAC_KEY: "k",
  };
  const tool = (name: string) => {
    const found = TOOLS.find((t) => t.name === name);
    if (found === undefined) throw new Error(name);
    return found;
  };

  test("telemetri sukses dan batas habis hanya memuat label statis, tanpa input/output/IP", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const run = vi.fn<McpTool["run"]>(async () => ({
      view: { private: "isi hasil rahasia" },
      sources: [],
    }));
    const deps = {
      env,
      db: {} as D1Db,
      request: new Request("https://surau.test/mcp", {
        headers: { "cf-connecting-ip": "192.0.2.42" },
      }),
      siteUrl: "https://surau.test",
    };
    try {
      // Skema longgar: tes ini tentang telemetri, bukan bentuk keluaran (lihat tes output_invalid).
      const loose = { ...tool("verify_quote"), run, outputSchema: z.looseObject({}) };
      const out = await runTool(loose, deps, {
        quote: "pertanyaan rahasia",
      } as never);
      expect(out.isError).not.toBe(true);
      const no: Limiter = { limit: async () => ({ success: false }) };
      const limited = await runTool(
        loose,
        { ...deps, env: { ...env, MCP_TOOL_LIMITER: no } },
        {} as never,
      );
      expect(limited.isError).toBe(true);
      expect(run).toHaveBeenCalledTimes(1);
      expect(log.mock.calls.map(([entry]) => entry)).toEqual([
        { event: "mcp_tool", tool: "verify_quote", outcome: "ok", duration_ms: expect.any(Number) },
        {
          event: "mcp_tool",
          tool: "verify_quote",
          outcome: "rate_limited",
          duration_ms: expect.any(Number),
        },
      ]);
      const all = JSON.stringify(log.mock.calls);
      for (const secret of ["pertanyaan", "isi hasil", "192.0.2.42"])
        expect(all).not.toContain(secret);
    } finally {
      log.mockRestore();
    }
  });

  test("keluaran yang tidak lolos outputSchema → internal_error, tercatat output_invalid (#74)", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const run = vi.fn<McpTool["run"]>(async () => ({ view: { bentuk: "bergeser" }, sources: [] }));
    try {
      const out = await runTool(
        { ...tool("verify_quote"), run },
        { env, db: {} as D1Db, request: undefined, siteUrl: "https://surau.test" },
        {} as never,
      );
      expect(out.isError).toBe(true);
      expect(JSON.stringify(out.content)).toContain("internal_error");
      expect(log.mock.calls.map(([entry]) => (entry as { outcome: string }).outcome)).toEqual([
        "output_invalid",
      ]);
    } finally {
      log.mockRestore();
    }
  });

  test("limiter melempar → internal_error dan satu event, tanpa bocor pesan error", async () => {
    const broken: Limiter = {
      limit: async () => {
        throw new Error("token rahasia");
      },
    };
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const out = await runTool(
        tool("verify_quote"),
        {
          env: { ...env, MCP_TOOL_LIMITER: broken },
          db: {} as D1Db,
          request: undefined,
          siteUrl: "https://surau.test",
        },
        {} as never,
      );
      expect(out).toMatchObject({
        isError: true,
        content: [{ text: "internal_error: Internal error. Try again later." }],
      });
      expect(info).toHaveBeenCalledTimes(1);
      expect(info.mock.calls[0]?.[0]).toMatchObject({
        event: "mcp_tool",
        outcome: "internal_error",
      });
      expect(JSON.stringify([out, info.mock.calls, error.mock.calls])).not.toContain(
        "token rahasia",
      );
    } finally {
      info.mockRestore();
      error.mockRestore();
    }
  });

  test("D1 gagal → internal_error tanpa detail; log hanya nama tool dan nama error", async () => {
    const secret = "detail internal: SELECT * FROM passage";
    const db = {
      prepare: () => {
        throw new TypeError(secret);
      },
      batch: () => Promise.reject(new TypeError(secret)),
    } as unknown as D1Db;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await runTool(
      tool("verify_quote"),
      { env, db, request: undefined, siteUrl: "https://surau.test" },
      { passage_id: 10_000_001, quote: "كلمة سرية" } as never,
    );
    expect(out).toEqual({
      content: [{ type: "text", text: "internal_error: Internal error. Try again later." }],
      isError: true,
    });
    expect(log).toHaveBeenCalledTimes(1);
    const logged = String(log.mock.calls[0]?.[0]);
    expect(JSON.parse(logged)).toEqual({
      event: "tool_error",
      tool: "verify_quote",
      error: "TypeError",
    });
    expect(logged).not.toContain("كلمة");
    log.mockRestore();
  });

  test("setiap tool: anotasi dan skema dibangun sekali; outputSchema memuat license", () => {
    expect(TOOLS.map((t) => t.name)).toHaveLength(8);
    for (const t of TOOLS) expect(Object.keys(t.outputSchema.shape)).toContain("license");
  });
});
