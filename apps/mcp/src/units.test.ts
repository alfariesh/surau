// Tes unit Worker MCP (S16): amplop (permalink absolut, lisensi), pemadatan search_text, dan
// pengaman batas pemakaian (gagal tertutup tanpa secret, kunci HMAC per tool tanpa IP mentah).
import type { SearchHit, SearchView } from "@surau/core";
import { describe, expect, test } from "vite-plus/test";

import { LICENSE_NOTICE, absolutize, licenseFor } from "./envelope.ts";
import { clientIp, guardTool } from "./guard.ts";
import type { GuardEnv, Limiter } from "./guard.ts";
import { MCP_HITS_PER_PAGE, compactSearch, mcpSearchView } from "./tools.ts";

describe("amplop", () => {
  test("absolutize: hanya field permalink berupa path; teks dan field lain tetap", () => {
    const value = {
      permalink: "/kitab/ihya/1/200",
      text_raw: "/bukan/permalink",
      nested: [{ permalink: "/kitab/ihya/bab/1", label: "x" }, { permalink: "https://a.b/c" }],
    };
    expect(absolutize(value, "https://surau.org")).toEqual({
      permalink: "https://surau.org/kitab/ihya/1/200",
      text_raw: "/bukan/permalink",
      nested: [
        { permalink: "https://surau.org/kitab/ihya/bab/1", label: "x" },
        { permalink: "https://a.b/c" },
      ],
    });
  });

  test("licenseFor: lisensi + atribusi edisi unik, Surau sebagai pengadaptasi", () => {
    const one = { license: "CC BY-NC-SA 4.0", attribution: "Teks: OpenITI" };
    expect(licenseFor("https://surau.org", [one, one])).toEqual({
      name: "CC BY-NC-SA 4.0",
      url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      terms_url: "https://surau.org/lisensi",
      attribution: "Teks: OpenITI; Adapted and published by Surau (https://surau.org)",
      notice: LICENSE_NOTICE,
    });
    // Hasil tanpa edisi (pencarian kosong) tetap membawa lisensi konten.
    expect(licenseFor("https://surau.org", []).name).toBe("CC BY-NC-SA 4.0");
    // Lisensi lain/campuran → halaman /lisensi sebagai URL.
    const mixed = licenseFor("https://surau.org", [one, { license: "X", attribution: "Y" }]);
    expect(mixed).toMatchObject({ name: "CC BY-NC-SA 4.0; X", url: "https://surau.org/lisensi" });
  });
});

function hit(id: number, score: number | null): SearchHit {
  const ai = {
    lang: "id",
    model: "m",
    prompt_version: "p@1",
    created_at: "2026-10-17",
    review_status: "ai_generated" as const,
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

describe("guardTool", () => {
  const counting = () => {
    const keys: string[] = [];
    const limiter: Limiter = {
      limit: async ({ key }) => {
        keys.push(key);
        return { success: true };
      },
    };
    return { keys, limiter };
  };
  const req = (ip?: string) =>
    new Request(
      "https://mcp.surau.org/mcp",
      ip === undefined ? {} : { headers: { "cf-connecting-ip": ip } },
    );

  test("tanpa secret IP_HMAC_KEY → unavailable (gagal tertutup), limiter tidak dipanggil", async () => {
    const { keys, limiter } = counting();
    const env: GuardEnv = {
      MCP_TOOL_LIMITER: limiter,
      MCP_SEARCH_LIMITER: limiter,
      MCP_SEARCH_GLOBAL_LIMITER: limiter,
    };
    expect(await guardTool(env, req("203.0.113.9"), "read_page")).toBe("unavailable");
    expect(await guardTool({ ...env, IP_HMAC_KEY: "" }, req("203.0.113.9"), "read_page")).toBe(
      "unavailable",
    );
    expect(keys).toEqual([]);
  });

  test("kunci = HMAC(jaringan IP):tool tanpa IP mentah; search_text juga batas global", async () => {
    const tool = counting();
    const search = counting();
    const global = counting();
    const env: GuardEnv = {
      MCP_TOOL_LIMITER: tool.limiter,
      MCP_SEARCH_LIMITER: search.limiter,
      MCP_SEARCH_GLOBAL_LIMITER: global.limiter,
      IP_HMAC_KEY: "k",
    };
    expect(await guardTool(env, req("203.0.113.9"), "read_page")).toBe("ok");
    expect(await guardTool(env, req("203.0.113.9"), "search_text")).toBe("ok");
    expect(tool.keys[0]).toMatch(/^[0-9a-f]{32}:read_page$/);
    expect(search.keys[0]).toMatch(/^[0-9a-f]{32}:search_text$/);
    expect(global.keys).toEqual(["global"]);
    expect([...tool.keys, ...search.keys].join()).not.toContain("203.0.113.9");
    // IPv6 dalam satu /64 berbagi kunci.
    await guardTool(env, req("2001:db8:1:2::1"), "read_page");
    await guardTool(env, req("2001:db8:1:2:ffff::9"), "read_page");
    expect(tool.keys[1]).toBe(tool.keys[2]);
    expect(clientIp(undefined)).toBe("unknown");
  });

  test("limiter habis → rate_limited", async () => {
    const no: Limiter = { limit: async () => ({ success: false }) };
    const yes: Limiter = { limit: async () => ({ success: true }) };
    const env = {
      MCP_TOOL_LIMITER: no,
      MCP_SEARCH_LIMITER: yes,
      MCP_SEARCH_GLOBAL_LIMITER: no,
      IP_HMAC_KEY: "k",
    };
    expect(await guardTool(env, req("203.0.113.1"), "verify_quote")).toBe("rate_limited");
    expect(await guardTool(env, req("203.0.113.1"), "search_text")).toBe("rate_limited");
  });
});
