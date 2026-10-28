// Plugin `surau-redaksi` (X22, ADR-123): struktur yang diterima Chat, Desktop, Cowork, dan Claude
// Code (docs plugin 2026-10-28), konektor ke /redaksi, dan contoh draf yang lolos cek luring.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { CONTENT_RULES } from "@surau/core";
import { describe, expect, test } from "vite-plus/test";
import { parse } from "yaml";
import { z } from "zod";

import { checkOffline } from "./cli.ts";

const repo = resolve(import.meta.dirname, "../../../..");
const root = join(repo, "plugins/surau-redaksi");
const json = (path: string) => JSON.parse(readFileSync(path, "utf8")) as unknown;

const manifest = z.object({
  name: z.literal("surau-redaksi"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/u),
  description: z.string().min(1),
  license: z.literal("Apache-2.0"),
});

describe("plugin surau-redaksi", () => {
  const plugin = manifest.parse(json(join(root, ".claude-plugin/plugin.json")));

  test("manifest, konektor /redaksi, dan marketplace di root repo", () => {
    expect(existsSync(join(root, "bin"))).toBe(false);
    expect(readdirSync(join(root, ".claude-plugin"))).toEqual(["plugin.json"]);
    expect(json(join(root, ".mcp.json"))).toEqual({
      mcpServers: { "surau-redaksi": { type: "http", url: "https://mcp.surau.org/redaksi" } },
    });
    const market = z
      .object({
        name: z.literal("surau"),
        plugins: z.array(z.object({ name: z.string(), source: z.string(), version: z.string() })),
      })
      .parse(json(join(repo, ".claude-plugin/marketplace.json")));
    expect(market.plugins).toEqual([
      expect.objectContaining({
        name: plugin.name,
        source: "./plugins/surau-redaksi",
        version: plugin.version,
      }),
    ]);
  });

  const skills = readdirSync(join(root, "skills")).sort();
  test.each(skills)("skill %s: frontmatter portabel, nama = folder, versi aturan sama", (skill) => {
    const text = readFileSync(join(root, "skills", skill, "SKILL.md"), "utf8");
    const front = /^---\n([\s\S]*?)\n---\n/u.exec(text)?.[1];
    expect(front).toBeDefined();
    const meta = z
      .strictObject({
        name: z.string(),
        description: z.string().min(1).max(1024),
        metadata: z.strictObject({ version: z.string(), rules: z.string() }),
      })
      .parse(parse(front ?? ""));
    expect(meta.name).toBe(skill);
    expect(meta.name).toMatch(/^[a-z0-9-]{1,64}$/u);
    expect(meta.name).not.toMatch(/claude|anthropic/u);
    expect(meta.metadata.rules).toBe(CONTENT_RULES);
    // Batas ukuran skill (docs: < 500 baris).
    expect(text.split("\n").length).toBeLessThan(500);
    // Tidak ada huruf Arab di instruksi (aturan: model tidak menulis Arab).
    expect(text).not.toMatch(/\p{Script=Arabic}/u);
  });

  const examples = skills.flatMap((skill) => {
    const path = join(root, "skills", skill, "references/contoh.json");
    return existsSync(path) ? [[skill, path] as const] : [];
  });
  test.each(examples)("contoh %s lolos cek luring", async (_skill, path) => {
    const r = await checkOffline(json(path));
    expect(r.errors).toEqual([]);
  });
});
