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
  longBody,
  longPassageId,
  seedAiText,
  seedCore,
  seedDigest,
  seedHumanReview,
  seedSearchIndex,
} from "../../../packages/core/test/fixture.ts";
import { TEST_SEARCH_LIMIT, TEST_TOOL_LIMIT } from "../test/limits.ts";

const db = env.CORPUS_DB;
const SITE = "https://surau.test";
const ENDPOINT = "https://mcp.surau.test/mcp";
const REDAKSI = "https://mcp.surau.test/redaksi";
const TOOLS = [
  "list_works",
  "get_table_of_contents",
  "read_page",
  "read_section",
  "search_text",
  "verify_quote",
  "get_hadith_takhrij",
  "get_section_digest",
];
const ERAS = ["modern", "legacy"] as const;
type Era = (typeof ERAS)[number];

beforeAll(async () => {
  await seedCore(db);
  await seedSearchIndex(db);
  await seedAiText(db);
  await seedDigest(db);
});

// Setiap klien memakai IP sendiri, supaya batas pemakaian satu tes tidak memengaruhi tes lain.
let ipSeq = 0;
const nextIp = () => `198.51.100.${++ipSeq}`;

async function connect(era: Era, ip = nextIp(), endpoint = ENDPOINT): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
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
  get_section_digest: { section_id: T_ROOT },
};

describe.each(ERAS)("era %s", (era) => {
  test("tools/list: 8 tool ASCII, anotasi read-only, outputSchema objek; instruksi server", async () => {
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
      const citations = [
        out.citation,
        ...collect(out.results, "label"),
        ...collect(out.digest, "label"),
      ].filter(Boolean);
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
  test("read_page: tinjauan manusia aditif (review_status + human_review), tanpa hash/email; klien lama tetap jalan", async () => {
    await seedHumanReview(db, {
      passage_id: PASSAGES.body1,
      revised: true,
      text: "Kesabaran adalah cahaya [bagi] penuntut ilmu (١) dan adab (٢).",
    });
    try {
      const client = await connect("legacy");
      const out = await ok(client, "read_page", { edition_id: ED, juz: 1, page_no: 1 });
      const json = JSON.stringify(out);
      expect(json).not.toMatch(/author_key|reviewer_key|ai_text|[\w.-]+@[\w-]+\.[a-z]{2}/u);
      const translation = z
        .object({ body: z.array(z.object({ translation: z.record(z.string(), z.unknown()) })) })
        .parse(out).body[0]?.translation;
      expect(translation).toMatchObject({
        label: "ai_translation",
        review_status: "ustadz_verified",
        human_review: {
          revised: true,
          reviewer_role: "ustadz",
          reviewer_name: "Ust. Uji Lc.",
          reviewer_short: "Ust. Uji",
        },
      });
      // Klien lama yang hanya mengenal field S16 (tanpa human_review) tetap bisa membaca hasilnya.
      const legacy = z.object({
        body: z.array(
          z.object({
            text_raw: z.string(),
            translation: z
              .object({
                label: z.literal("ai_translation"),
                review_status: z.string(),
                text: z.string(),
              })
              .nullable(),
          }),
        ),
      });
      expect(legacy.safeParse(out).success).toBe(true);
      await client.close();
    } finally {
      await seedAiText(db);
    }
  });

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

  test("get_section_digest (X16): kutipan = text_raw DB, label AI, permalink absolut; tanpa Intisari = null", async () => {
    const client = await connect("modern");
    const out = await ok(client, "get_section_digest", { section_id: T_ROOT });
    const digest = z
      .object({
        label: z.literal("ai_digest"),
        section: z.object({ permalink: z.string() }),
        points: z.array(z.object({ anchors: z.array(z.object({ passage_id: z.number() })) })),
        quotes: z.array(
          z.object({
            passage_id: z.number(),
            char_start: z.number(),
            char_end: z.number(),
            text_raw: z.string(),
          }),
        ),
      })
      .parse(out.digest);
    expect(digest.section.permalink).toBe(`${SITE}/kitab/uji/bab/${T_ROOT}`);
    expect(digest.points[0]?.anchors.map((a) => a.passage_id)).toEqual([PASSAGES.body1]);
    expect(digest.quotes).toHaveLength(1);
    for (const q of digest.quotes) {
      expect(q.text_raw).toBe((await rawText(q.passage_id)).slice(q.char_start, q.char_end));
    }
    const none = await ok(client, "get_section_digest", { section_id: T_LONG });
    expect(none.digest).toBeNull();
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

describe.each(ERAS)("kemampuan era %s", (era) => {
  test("tools.listChanged: false (daftar tool statis, tanpa aliran langganan sia-sia, #65)", async () => {
    const client = await connect(era);
    expect(client.getServerCapabilities()?.tools?.listChanged).toBe(false);
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

  // Perilaku milik SDK yang didokumentasikan README; upgrade SDK bisa mengubahnya diam-diam (#79).
  test("body bukan JSON → 400; Content-Type bukan JSON → 415; GET/DELETE /mcp → 405", async () => {
    expect((await post({}, "{bukan json")).status).toBe(400);
    expect((await post({ "Content-Type": "text/plain" }, init)).status).toBe(415);
    for (const method of ["GET", "DELETE"]) {
      const res = await exports.default.fetch(new Request(ENDPOINT, { method }));
      expect(res.status, method).toBe(405);
    }
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
      // Dari host permintaan (#75), bukan alamat produksi yang ditulis mati.
      mcp_endpoint: "https://mcp.surau.test/mcp",
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

// ── /redaksi (X22, ADR-123): 8 tool baca + 2 tool redaksi, instruksi sendiri ≤ 2.000 karakter ─────

const REDAKSI_TOOLS = [...TOOLS, "check_content_draft", "list_faedah_candidates"];
const SENT = "هذه جملة تجريبية لاختبار تقسيم الأقسام الطويلة ";

/** Draf Intisari Bab buatan untuk T_LONG (teks Indonesia contoh; kutipan = offset fixture). */
function draft(overrides: Record<string, unknown> = {}) {
  const isi =
    "Penulis menjelaskan bahwa ilmu menjadi dasar amal dan menuntun hati menuju kedekatan kepada Allah Swt. serta menjauhkan murid dari sifat sombong yang merusak niat belajar.";
  const point = (judul: string, dasar: number[], tanya: string) => ({
    judul,
    isi,
    sikap: "author",
    jenis: "idea",
    dasar,
    soal: { tanya, jawab: "Karena ilmu menyempurnakan manusia dan menuntun amalnya." },
  });
  const body = longBody(1, 1);
  return {
    format: "surau-konten/1",
    jenis: "intisari-bab",
    edition_id: ED,
    section_id: T_LONG,
    status: "draf",
    isi: {
      inti: "Menurut penulis, keutamaan sesuatu diukur dari kesempurnaannya, dan karena itu ilmu menempati derajat yang paling tinggi.",
      ringkasan:
        "Penulis membuka bab dengan menimbang apa yang membuat sesuatu disebut utama. Ia membedakan kelebihan yang menyempurnakan sesuatu dari kelebihan yang hanya menambah ukuran. Dari sana ia menyimpulkan bahwa ilmu utama pada dirinya sendiri dan menjadi jalan menuju kebahagiaan akhirat. Bagian akhir menempatkan pengajaran ilmu sesudah kenabian.",
      gagasan: [
        point(
          "Keutamaan diukur dari kesempurnaan, menurut penulis",
          [longPassageId(1, 1)],
          "Apa ukuran keutamaan sesuatu dalam bab ini?",
        ),
        point(
          "Menurut al-Ghazali, ilmu utama pada dirinya",
          [longPassageId(1, 2)],
          "Mengapa ilmu dicari karena dirinya sendiri?",
        ),
        point(
          "Al-Ghazali menempatkan pengajaran sesudah kenabian",
          [longPassageId(2, 1)],
          "Pekerjaan apa yang paling mulia sesudah kenabian?",
        ),
      ],
      kutipan: [
        {
          gagasan: 1,
          passage_id: longPassageId(1, 1),
          char_start: SENT.length * 9,
          char_end: body.indexOf(" (١)"),
          terjemahan: "Ini kalimat contoh untuk menguji pemotongan bagian yang panjang.",
        },
      ],
      istilah: [],
    },
    asal: {
      pembuat: "claude-desktop",
      model: "claude-opus-5-5",
      plugin: "surau-redaksi@0.1.0",
      skill: "intisari-bab@1",
      operator: "pemilik",
      dibuat: "2026-10-28T07:00:00+07:00",
    },
    ...overrides,
  };
}

const checkOut = z.object({
  ok: z.boolean(),
  errors: z.array(z.object({ code: z.string(), path: z.string() })),
  stamp: z.object({ aturan: z.string() }).nullable(),
});

describe.each(ERAS)("/redaksi era %s", (era) => {
  test("tools/list: 10 tool (8 publik + 2 redaksi), instruksi sendiri ≤ 2.000 karakter", async () => {
    const client = await connect(era, nextIp(), REDAKSI);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(REDAKSI_TOOLS);
    for (const tool of tools) expect(tool.annotations?.readOnlyHint).toBe(true);
    const instructions = client.getInstructions() ?? "";
    expect(instructions.length).toBeLessThanOrEqual(2_000);
    expect(instructions).toContain("check_content_draft");
    expect(client.getServerVersion()).toMatchObject({ name: "surau-redaksi" });
    await client.close();
    // /mcp publik tetap delapan tool.
    const pub = await connect(era);
    expect((await pub.listTools()).tools.map((t) => t.name)).toEqual(TOOLS);
    await pub.close();
  });

  test("check_content_draft: draf baik lolos dengan stamp; draf buruk = hasil biasa berisi error", async () => {
    const client = await connect(era, nextIp(), REDAKSI);
    const good = checkOut.parse(await ok(client, "check_content_draft", { draft: draft() }));
    expect(good.errors).toEqual([]);
    expect(good.ok).toBe(true);
    expect(good.stamp?.aturan).toBe("konten@1");
    const bad = draft();
    bad.isi.gagasan[0]!.isi = `${bad.isi.gagasan[0]!.isi} Ia menulis نص di sini.`;
    bad.isi.gagasan[1]!.dasar = [PASSAGES.body1];
    const out = checkOut.parse(await ok(client, "check_content_draft", { draft: bad }));
    expect(out.ok).toBe(false);
    expect(out.errors.map((e) => e.code)).toEqual(
      expect.arrayContaining(["arabic", "outside_section"]),
    );
    const broken = checkOut.parse(
      await ok(client, "check_content_draft", { draft: { format: "lain" } }),
    );
    expect(broken.errors.map((e) => e.code)).toContain("schema");
    // Draf tidak pernah digemakan kembali.
    expect(JSON.stringify(out)).not.toContain("نص");
    await client.close();
  });

  test("list_faedah_candidates: halaman berikutnya lewat next_offset, alasan berupa kode", async () => {
    const client = await connect(era, nextIp(), REDAKSI);
    const out = z
      .object({
        total: z.number(),
        next_offset: z.number().nullable(),
        candidates: z.array(z.object({ eligible: z.boolean(), reasons: z.array(z.string()) })),
      })
      .parse(
        await ok(client, "list_faedah_candidates", {
          section_id: T_LONG,
          include_ineligible: true,
          limit: 5,
        }),
      );
    expect(out.candidates).toHaveLength(5);
    expect(out.next_offset).toBe(5);
    expect(out.candidates.every((c) => !c.eligible && c.reasons.length > 0)).toBe(true);
    await client.close();
  });
});

describe("/redaksi: pengaman dan batas", () => {
  test("Origin asing → 403; GET → 405", async () => {
    const res = await exports.default.fetch(
      new Request(REDAKSI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Origin: "https://evil.example",
        },
        body: "{}",
      }),
    );
    expect(res.status).toBe(403);
    expect((await exports.default.fetch(new Request(REDAKSI, { method: "GET" }))).status).toBe(405);
  });

  test("ember per klien berlingkup endpoint: search_text habis di /redaksi, /mcp tetap dilayani", async () => {
    const ip = nextIp();
    const client = await connect("modern", ip, REDAKSI);
    const args = { query: "نص" };
    for (let i = 0; i < TEST_SEARCH_LIMIT; i++) await ok(client, "search_text", args);
    expect((await call(client, "search_text", args)).content[0]?.text).toMatch(/^rate_limited: /);
    await client.close();
    // Tool yang sama dari IP yang sama di /mcp memakai ember tanpa lingkup (tetap dilayani).
    const pub = await connect("modern", ip);
    await ok(pub, "search_text", args);
    await pub.close();
  });
});
