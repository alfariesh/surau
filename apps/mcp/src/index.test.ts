// Tes integrasi Worker MCP (S16 langkah 7): Client v2 resmi memanggil `exports.default.fetch`
// in-process, di KEDUA era protokol (2026-07-28 modern, 2025-11-25 legacy), dengan D1 lokal berisi
// fixture buatan core (bukan teks kitab). Setiap teks Arab di hasil dicocokkan dengan DB.
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { env, exports } from "cloudflare:workers";
import { beforeAll, describe, expect, test } from "vite-plus/test";
import { z } from "zod";

import {
  BODY_1,
  ED,
  PASSAGES,
  T_LONG,
  T_ROOT,
  seedAiText,
  seedCore,
  seedSearchIndex,
} from "../../../packages/core/test/fixture.ts";
import { TEST_SEARCH_LIMIT, TEST_TOOL_LIMIT } from "../test/limits.ts";

const db = env.CORPUS_DB;
const SITE = "https://surau.test";
const ENDPOINT = "https://mcp.surau.test/mcp";
const TOOLS = [
  "list_works",
  "get_table_of_contents",
  "read_page",
  "read_section",
  "search_text",
  "verify_quote",
  "get_hadith_takhrij",
];
const ERAS = ["modern", "legacy"] as const;
type Era = (typeof ERAS)[number];

beforeAll(async () => {
  await seedCore(db);
  await seedSearchIndex(db);
  await seedAiText(db);
});

// Setiap klien memakai IP sendiri, supaya batas pemakaian satu tes tidak memengaruhi tes lain.
let ipSeq = 0;
const nextIp = () => `198.51.100.${++ipSeq}`;

async function connect(era: Era, ip = nextIp()): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(ENDPOINT), {
    fetch: async (url, init) => {
      const request = new Request(url, init);
      request.headers.set("cf-connecting-ip", ip);
      return exports.default.fetch(request);
    },
  });
  const client = new Client(
    { name: "tes-surau", version: "1.0.0" },
    era === "modern" ? { versionNegotiation: { mode: { pin: "2026-07-28" } } } : {},
  );
  await client.connect(transport);
  return client;
}

const textResult = z.object({
  content: z.array(z.object({ type: z.literal("text"), text: z.string() })).length(1),
  structuredContent: z.record(z.string(), z.unknown()).optional(),
  isError: z.boolean().optional(),
});

async function call(client: Client, name: string, args: Record<string, unknown>) {
  return textResult.parse(await client.callTool({ name, arguments: args }));
}

async function ok(client: Client, name: string, args: Record<string, unknown>) {
  const result = await call(client, name, args);
  expect(result.isError ?? false, `${name}: ${result.content[0]?.text}`).toBe(false);
  const structured = result.structuredContent;
  if (structured === undefined) throw new Error(`${name} tanpa structuredContent`);
  // Salinan teks = JSON hasil yang sama (spec: SHOULD, untuk klien lama).
  expect(JSON.parse(result.content[0]?.text ?? "")).toEqual(structured);
  return structured;
}

/** Semua nilai field `key` (string) di dalam objek bersarang. */
function collect(value: unknown, key: string): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => collect(v, key));
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([k, v]) =>
    k === key && typeof v === "string" ? [v] : collect(v, key),
  );
}

async function rawText(id: number): Promise<string> {
  const row = await db.prepare("SELECT text_raw FROM passage WHERE id = ?").bind(id).first();
  return z.object({ text_raw: z.string() }).parse(row).text_raw;
}

/** Argumen contoh untuk setiap tool (fixture). */
const SAMPLE_ARGS: Readonly<Record<string, Record<string, unknown>>> = {
  list_works: {},
  get_table_of_contents: { edition_id: ED },
  read_page: { edition_id: ED, juz: 1, page_no: 1 },
  read_section: { section_id: T_LONG },
  search_text: { query: "تجريبي" },
  verify_quote: { passage_id: PASSAGES.body1, quote: "نص تجريبي" },
  get_hadith_takhrij: { passage_id: PASSAGES.body1 },
};

describe.each(ERAS)("era %s", (era) => {
  test("tools/list: 7 tool ASCII, anotasi read-only, outputSchema objek; instruksi server", async () => {
    const client = await connect(era);
    expect(client.getProtocolEra()).toBe(era);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(TOOLS);
    for (const tool of tools) {
      expect(tool.name).toMatch(/^[a-z_]+$/);
      expect(tool.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      });
      expect(tool.outputSchema?.type).toBe("object");
      expect(tool.inputSchema.type).toBe("object");
      // Deskripsi dwibahasa: Inggris, lalu ringkasan Indonesia setelah " · ".
      expect(tool.description).toContain(" · ");
    }
    expect(client.getInstructions()).toContain("verify_quote");
    expect(client.getServerVersion()).toMatchObject({ name: "surau" });
    await client.close();
  });

  test("tools/call: setiap tool membawa license + attribution; hasil berteks membawa citation", async () => {
    const client = await connect(era);
    for (const name of TOOLS) {
      const out = await ok(client, name, SAMPLE_ARGS[name] ?? {});
      expect(out.license, name).toMatchObject({
        name: "CC BY-NC-SA 4.0",
        url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
        terms_url: `${SITE}/lisensi`,
      });
      expect(z.object({ attribution: z.string() }).parse(out.license).attribution, name).toContain(
        "Fixture buatan",
      );
      // list_works hanya metadata (core README): lisensi + atribusi ada di setiap edisi. Hasil
      // lain memuat sitasi: `citation` di akar, atau per halaman hasil (search_text).
      const citations = [out.citation, ...collect(out.results, "label")].filter(Boolean);
      expect(name === "list_works" || citations.length > 0, `${name} tanpa citation`).toBe(true);
      // Setiap permalink absolut ke situs.
      for (const link of collect(out, "permalink"))
        expect(link.startsWith(`${SITE}/`), name).toBe(true);
    }
    await client.close();
  });
});

describe("lisensi sumber ayat (ADR-040)", () => {
  test("read_page halaman berayat: blok license memuat lisensi + atribusi teks ayat dan terjemahan", async () => {
    const client = await connect("modern");
    const out = await ok(client, "read_page", { edition_id: ED, juz: 1, page_no: 2 });
    const license = z
      .object({ name: z.string(), url: z.string(), attribution: z.string() })
      .parse(out.license);
    expect(license.name).toContain("CC BY-NC-SA 4.0");
    expect(license.name).toContain("CC BY 3.0");
    expect(license.url).toBe(`${SITE}/lisensi`);
    expect(license.attribution).toContain("Atribusi teks uji");
    expect(license.attribution).toContain("Atribusi terjemahan uji");
    await client.close();
  });
});

describe("teks Arab = substring DB (kode menyalin, model menunjuk)", () => {
  test("read_page, read_section, get_hadith_takhrij: text_raw persis dari DB", async () => {
    const client = await connect("modern");
    for (const [name, args] of [
      ["read_page", SAMPLE_ARGS.read_page],
      ["read_section", SAMPLE_ARGS.read_section],
      ["get_hadith_takhrij", SAMPLE_ARGS.get_hadith_takhrij],
    ] as const) {
      const out = await ok(client, name, args ?? {});
      const passages = z.array(z.object({ id: z.number(), text_raw: z.string() })).parse(
        name === "get_hadith_takhrij"
          ? [
              out.passage,
              ...z
                .array(z.object({ footnote: z.unknown() }))
                .parse(out.takhrij)
                .map((t) => t.footnote),
            ]
          : name === "read_page"
            ? [
                ...z.array(z.unknown()).parse(out.body),
                ...z.array(z.unknown()).parse(out.footnotes),
              ]
            : out.passages,
      );
      expect(passages.length, name).toBeGreaterThan(0);
      for (const p of passages) expect(p.text_raw, `${name} ${p.id}`).toBe(await rawText(p.id));
    }
    await client.close();
  });

  test("search_text: snippet.text = text_raw.slice(char_start, char_end); ≤3 paragraf per halaman", async () => {
    const client = await connect("legacy");
    const out = await ok(client, "search_text", { query: "تجريبي" });
    const hits = z
      .array(
        z.object({
          hits: z.array(
            z.object({
              id: z.number(),
              snippet: z.object({ char_start: z.number(), char_end: z.number(), text: z.string() }),
            }),
          ),
          hits_omitted: z.number(),
        }),
      )
      .parse(out.results);
    expect(hits.length).toBeGreaterThan(0);
    for (const page of hits) {
      expect(page.hits.length).toBeLessThanOrEqual(3);
      for (const h of page.hits) {
        expect(h.snippet.text).toBe(
          (await rawText(h.id)).slice(h.snippet.char_start, h.snippet.char_end),
        );
      }
    }
    // Kueri Indonesia: terjemahan AI berlabel, tanpa field sorotan (dipadatkan, ADR-049).
    const id = await ok(client, "search_text", { query: "kesabaran" });
    const [first] = z
      .array(
        z.object({ hits: z.array(z.object({ translation: z.record(z.string(), z.unknown()) })) }),
      )
      .parse(id.results);
    expect(first?.hits[0]?.translation).toMatchObject({
      label: "ai_translation",
      review_status: "ai_generated",
    });
    expect(first?.hits[0]?.translation).not.toHaveProperty("highlights");
    await client.close();
  });

  test("verify_quote: match.text = substring DB; kutipan karangan → verified false", async () => {
    const client = await connect("modern");
    const yes = await ok(client, "verify_quote", {
      passage_id: PASSAGES.body1,
      quote: "نَصٌّ تَجْرِيبِيٌّ",
    });
    const match = z
      .object({ char_start: z.number(), char_end: z.number(), text: z.string() })
      .parse(yes.match);
    expect(yes.verified).toBe(true);
    expect(match.text).toBe(BODY_1.slice(match.char_start, match.char_end));
    const no = await ok(client, "verify_quote", {
      passage_id: PASSAGES.body1,
      quote: "قول لم يقله أحد",
    });
    expect(no).toMatchObject({ verified: false, match: null });
    await client.close();
  });
});

describe("error tool", () => {
  test("alamat tidak ada, kedalaman daftar isi dari akar > 2, masukan salah → isError tanpa detail internal", async () => {
    const client = await connect("modern");
    const missing = await call(client, "read_page", { edition_id: ED, juz: 9, page_no: 1 });
    expect(missing.isError).toBe(true);
    expect(missing.content[0]?.text).toBe("not_found: Page not found: juz 9, page 1");
    const deep = await call(client, "get_table_of_contents", { edition_id: ED, depth: 3 });
    expect(deep.content[0]?.text).toMatch(/^invalid_citation: .*node_id/);
    // Dari node tertentu kedalaman 3 boleh.
    await ok(client, "get_table_of_contents", { edition_id: ED, node_id: T_ROOT, depth: 3 });
    const bad = await call(client, "search_text", { query: "" });
    expect(bad.isError).toBe(true);
    const tooMany = await call(client, "search_text", { query: "نص", limit: 11 });
    expect(tooMany.isError).toBe(true);
    await client.close();
  });
});

describe("pengaman HTTP", () => {
  const post = (headers: Record<string, string>, body = "{}") =>
    exports.default.fetch(
      new Request(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          ...headers,
        },
        body,
      }),
    );
  const init = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "tes", version: "1" },
    },
  });

  test("Origin asing atau null → 403; Origin sendiri, localhost, atau tanpa Origin → dilayani", async () => {
    expect((await post({ Origin: "https://evil.example" }, init)).status).toBe(403);
    expect((await post({ Origin: "null" }, init)).status).toBe(403);
    expect((await post({ Origin: "https://surau.org" }, init)).status).toBe(200);
    expect((await post({ Origin: "http://localhost:6274" }, init)).status).toBe(200);
    expect((await post({}, init)).status).toBe(200);
  });

  test("body > 64 KiB → 413; path lain → 404; / → info JSON", async () => {
    const big = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "ping",
      params: { x: "a".repeat(70_000) },
    });
    expect((await post({}, big)).status).toBe(413);
    expect((await exports.default.fetch(new Request("https://mcp.surau.test/lain"))).status).toBe(
      404,
    );
    const info = await exports.default.fetch(new Request("https://mcp.surau.test/"));
    expect(info.status).toBe(200);
    expect(await info.json()).toMatchObject({
      mcp_endpoint: "https://mcp.surau.org/mcp",
      website: SITE,
    });
    // Host selain PUBLIC_HOST (Version URL workers.dev produksi) tidak dilayani sama sekali (#64).
    for (const url of [
      "https://1a2b3c4d-surau-mcp.contoh.workers.dev/mcp",
      "https://1a2b3c4d-surau-mcp.contoh.workers.dev/",
    ]) {
      const res = await exports.default.fetch(new Request(url, { method: "GET" }));
      expect(res.status).toBe(404);
    }
  });
});

describe("batas pemakaian (HMAC(IP):tool)", () => {
  test("tool baca: habis setelah batas per IP per tool; tool lain dan IP lain tetap dilayani", async () => {
    const ip = nextIp();
    const client = await connect("modern", ip);
    for (let i = 0; i < TEST_TOOL_LIMIT; i++) await ok(client, "list_works", {});
    const limited = await call(client, "list_works", {});
    expect(limited.isError).toBe(true);
    expect(limited.content[0]?.text).toMatch(/^rate_limited: /);
    // Kunci per tool: tool lain dari IP yang sama masih punya kuota.
    await ok(client, "read_page", SAMPLE_ARGS.read_page ?? {});
    await client.close();
    const other = await connect("legacy");
    await ok(other, "list_works", {});
    await other.close();
  });

  test("search_text: batas sendiri yang lebih ketat", async () => {
    const client = await connect("legacy");
    for (let i = 0; i < TEST_SEARCH_LIMIT; i++) await ok(client, "search_text", { query: "نص" });
    expect((await call(client, "search_text", { query: "نص" })).content[0]?.text).toMatch(
      /^rate_limited: /,
    );
    await client.close();
  });
});
