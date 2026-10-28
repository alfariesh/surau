// Tes batas pemakaian MCP (S16): gagal tertutup tanpa secret, kunci HMAC per tool tanpa IP mentah,
// batas global terpisah untuk search_text dan tool baca lain.
import { describe, expect, test } from "vite-plus/test";

import { clientIp, guardTool } from "./guard.ts";
import type { GuardEnv, Limiter } from "./guard.ts";

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

  test("tanpa secret IP_HMAC_KEY → not_configured (gagal tertutup), limiter tidak dipanggil", async () => {
    const { keys, limiter } = counting();
    const env: GuardEnv = {
      MCP_TOOL_LIMITER: limiter,
      MCP_READ_GLOBAL_LIMITER: limiter,
      MCP_SEARCH_LIMITER: limiter,
      MCP_SEARCH_GLOBAL_LIMITER: limiter,
      MCP_REDAKSI_LIMITER: limiter,
    };
    expect(await guardTool(env, req("203.0.113.9"), "read_page")).toBe("not_configured");
    expect(await guardTool({ ...env, IP_HMAC_KEY: "" }, req("203.0.113.9"), "read_page")).toBe(
      "not_configured",
    );
    expect(keys).toEqual([]);
  });

  test("kunci = HMAC(jaringan IP):tool tanpa IP mentah; batas global terpisah baca/cari", async () => {
    const tool = counting();
    const readGlobal = counting();
    const search = counting();
    const global = counting();
    const env: GuardEnv = {
      MCP_TOOL_LIMITER: tool.limiter,
      MCP_READ_GLOBAL_LIMITER: readGlobal.limiter,
      MCP_SEARCH_LIMITER: search.limiter,
      MCP_SEARCH_GLOBAL_LIMITER: global.limiter,
      MCP_REDAKSI_LIMITER: counting().limiter,
      IP_HMAC_KEY: "k",
    };
    expect(await guardTool(env, req("203.0.113.9"), "read_page")).toBe("ok");
    expect(await guardTool(env, req("203.0.113.9"), "search_text")).toBe("ok");
    expect(tool.keys[0]).toMatch(/^[0-9a-f]{32}:read_page$/);
    expect(search.keys[0]).toMatch(/^[0-9a-f]{32}:search_text$/);
    expect(readGlobal.keys).toEqual(["global"]);
    expect(global.keys).toEqual(["global"]);
    expect([...tool.keys, ...search.keys].join()).not.toContain("203.0.113.9");
    // IPv6 dalam satu /64 berbagi kunci.
    await guardTool(env, req("2001:db8:1:2::1"), "read_page");
    await guardTool(env, req("2001:db8:1:2:ffff::9"), "read_page");
    expect(tool.keys[1]).toBe(tool.keys[2]);
    expect(clientIp(undefined)).toBe("unknown");
  });

  test("/redaksi (X23): kunci berlingkup endpoint; tool redaksi di limiter sendiri; plafon global tetap satu", async () => {
    const tool = counting();
    const search = counting();
    const global = counting();
    const redaksi = counting();
    const env: GuardEnv = {
      MCP_TOOL_LIMITER: tool.limiter,
      MCP_READ_GLOBAL_LIMITER: counting().limiter,
      MCP_SEARCH_LIMITER: search.limiter,
      MCP_SEARCH_GLOBAL_LIMITER: global.limiter,
      MCP_REDAKSI_LIMITER: redaksi.limiter,
      IP_HMAC_KEY: "k",
    };
    expect(await guardTool(env, req("203.0.113.9"), "read_page", "redaksi")).toBe("ok");
    expect(await guardTool(env, req("203.0.113.9"), "search_text", "redaksi")).toBe("ok");
    expect(await guardTool(env, req("203.0.113.9"), "check_content_draft", "redaksi")).toBe("ok");
    expect(tool.keys[0]).toMatch(/^[0-9a-f]{32}:redaksi:read_page$/);
    expect(search.keys[0]).toMatch(/^[0-9a-f]{32}:redaksi:search_text$/);
    expect(global.keys).toEqual(["global"]);
    expect(redaksi.keys).toEqual([
      expect.stringMatching(/:redaksi:check_content_draft$/),
      "global",
    ]);
  });

  test("limiter per klien atau global habis → rate_limited", async () => {
    const no: Limiter = { limit: async () => ({ success: false }) };
    const yes: Limiter = { limit: async () => ({ success: true }) };
    const env: GuardEnv = {
      MCP_TOOL_LIMITER: no,
      MCP_READ_GLOBAL_LIMITER: yes,
      MCP_SEARCH_LIMITER: yes,
      MCP_SEARCH_GLOBAL_LIMITER: no,
      MCP_REDAKSI_LIMITER: no,
      IP_HMAC_KEY: "k",
    };
    expect(await guardTool(env, req("203.0.113.1"), "verify_quote")).toBe("rate_limited");
    expect(await guardTool(env, req("203.0.113.1"), "search_text")).toBe("rate_limited");
    const globalOut = { ...env, MCP_TOOL_LIMITER: yes, MCP_READ_GLOBAL_LIMITER: no };
    expect(await guardTool(globalOut, req("203.0.113.1"), "read_section")).toBe("rate_limited");
  });
});
