import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, test } from "vite-plus/test";

import { readJsonl } from "./store.ts";
import {
  TITLES_FILE,
  TITLE_RUNS_FILE,
  acceptedTitle,
  runTitleJob,
  titleGroups,
  titleRun,
  titleUnits,
} from "./titles.ts";
import type { SubheadingEntries, TitleUnit } from "./titles.ts";

// Judul Arab buatan (bukan teks kitab), ditulis dengan escape.
const AR = (n: number) => `باب ${"ف".repeat(n)}`;
const sha16 = (t: string) => createHash("sha256").update(t).digest("hex").slice(0, 16);
const BASE = 10_000_000;

function rows() {
  const node = (id: number, parent: number | null, level: number, ord: number) => ({
    id,
    edition_id: 1,
    parent_id: parent,
    ord,
    level,
    title_ar: AR(id - 100_000),
    start_page_id: 100_001,
    source_title_id: null,
    patched: 0 as const,
  });
  const passage = (seq: number, node: number, ord: number, text: string, page = 100_001) => ({
    id: BASE + seq,
    edition_id: 1,
    page_id: page,
    toc_node_id: node,
    kind: "body" as const,
    ord,
    text_raw: text,
  });
  return {
    toc_node: [
      node(100_001, null, 1, 1),
      node(100_002, 100_001, 2, 1),
      node(100_003, 100_002, 3, 1),
    ],
    passage: [
      passage(5, 100_002, 3, "بيان ب"),
      passage(4, 100_002, 2, "بيان ا"),
      passage(6, 100_002, 4, "بيان ج"),
    ],
    page: [{ id: 100_001, edition_id: 1, seq: 1, juz: 1, page_no: 1, source_page_id: 1 }],
    footnote_ref: [],
  };
}

describe("titleUnits", () => {
  test("urutan baca: node, subjudul miliknya (urut halaman + ord), lalu anak; sidik usang dilewati", () => {
    const r = rows();
    const entries: SubheadingEntries = new Map([
      [4, { kind: "heading" as const, sha: sha16(r.passage[1]!.text_raw) }],
      [5, { kind: "heading" as const, sha: sha16(r.passage[0]!.text_raw) }],
      [6, { kind: "heading" as const, sha: "0".repeat(16) }],
    ]);
    const units = titleUnits(r, entries, 1);
    expect(units.map((u) => [u.id, u.parent, u.level, u.kind])).toEqual([
      ["n100001", null, 1, "node"],
      ["n100002", "n100001", 2, "node"],
      ["p4", "n100002", 3, "sub"],
      ["p5", "n100002", 3, "sub"],
      ["n100003", "n100002", 3, "node"],
    ]);
    const p4 = units[2]!;
    expect(p4).toMatchObject({
      target: "passage",
      targetId: BASE + 4,
      title: r.passage[1]!.text_raw,
    });
    expect(p4.path).toEqual([AR(1), AR(2)]);
    expect(p4.sourceSha256).toBe(createHash("sha256").update(p4.title).digest("hex"));
  });
});

describe("titleGroups", () => {
  const unit = (id: string, level: number, kind: "node" | "sub" = "node"): TitleUnit => ({
    id,
    parent: null,
    level,
    kind,
    title: AR(1),
    target: kind === "node" ? "toc_node" : "passage",
    targetId: 1,
    sourceSha256: "0".repeat(64),
    path: [],
  });

  test("dipotong di batas kitab bila penuh; kitab yang terlalu besar dipotong di mana saja", () => {
    const units = [
      unit("n1", 1),
      unit("n2", 2),
      unit("n3", 3),
      unit("n4", 2),
      unit("p5", 3, "sub"),
      unit("p6", 3, "sub"),
      unit("p7", 3, "sub"),
    ];
    const groups = titleGroups(units, 3);
    expect(groups.map((g) => g.units.map((u) => u.id))).toEqual([
      ["n1", "n2", "n3"],
      ["n4", "p5", "p6"],
      ["p7"],
    ]);
  });
});

describe("runTitleJob", () => {
  const units = (): TitleUnit[] => titleUnits(rows(), new Map(), 1);
  function fakeClient(reply: (ids: string[]) => string, stop = "end_turn") {
    const calls: string[][] = [];
    const client = {
      messages: {
        countTokens: async () => ({ input_tokens: 4000 }),
        create: (req: { messages: { content: string }[] }) => {
          const data = JSON.parse(
            req.messages[0]!.content.split("<judul>\n")[1]!.split("\n</judul>")[0]!,
          ) as { id: string }[];
          const ids = data.map((d) => d.id);
          calls.push(ids);
          const message = {
            model: "claude-sonnet-5-5",
            stop_reason: stop,
            content: [{ type: "text", text: reply(ids) }],
            usage: { input_tokens: 4000, output_tokens: 1000 },
          };
          return { withResponse: async () => ({ data: message, request_id: "req_uji" }) };
        },
      },
    };
    return { client: () => client as unknown as Anthropic, calls };
  }
  const titlesFor = (ids: string[]) =>
    JSON.stringify({ judul: ids.map((id) => ({ id, indonesia: `Judul ${id}` })) });

  test("tanpa confirm: hanya rencana (hitung token), tidak ada yang dikirim atau ditulis", async () => {
    const dir = mkdtempSync(join(tmpdir(), "surau-judul-"));
    const fake = fakeClient(titlesFor);
    const pending = await runTitleJob(units(), dir, fake.client, { confirm: false, log: () => {} });
    expect(pending).toBe(3);
    expect(fake.calls).toEqual([]);
    expect(readJsonl(join(dir, TITLES_FILE), acceptedTitle)).toEqual([]);
  });

  test("confirm tanpa budget ditolak; dengan budget: judul + catatan biaya ditulis, ulangan tidak mengirim lagi", async () => {
    const dir = mkdtempSync(join(tmpdir(), "surau-judul-"));
    const fake = fakeClient(titlesFor);
    await expect(runTitleJob(units(), dir, fake.client, { confirm: true })).rejects.toThrow(
      /--budget/,
    );
    const now = () => new Date("2026-10-21T10:00:00Z");
    const opts = { confirm: true, budget: 1, now, log: () => {} };
    expect(await runTitleJob(units(), dir, fake.client, opts)).toBe(0);
    const saved = readJsonl(join(dir, TITLES_FILE), acceptedTitle);
    expect(saved.map((a) => [a.key, a.text, a.prompt_version, a.created_at])).toEqual([
      ["n100001", "Judul n100001", "translate-toc-title@2", "2026-10-21T10:00:00.000Z"],
      ["n100002", "Judul n100002", "translate-toc-title@2", "2026-10-21T10:00:00.000Z"],
      ["n100003", "Judul n100003", "translate-toc-title@2", "2026-10-21T10:00:00.000Z"],
    ]);
    const runs = readJsonl(join(dir, TITLE_RUNS_FILE), titleRun);
    expect(runs).toHaveLength(1);
    // Sonnet 5.5: 4000 × $2/M + 1000 × $10/M = $0,018.
    expect(runs[0]!.cost_usd).toBeCloseTo(0.018, 6);
    expect(runs[0]!.request_id).toBe("req_uji");
    expect(await runTitleJob(units(), dir, fake.client, opts)).toBe(0);
    expect(fake.calls).toHaveLength(1);
  });

  test("pagu: berhenti sebelum request yang biaya terburuknya melewati pagu", async () => {
    const dir = mkdtempSync(join(tmpdir(), "surau-judul-"));
    const fake = fakeClient(titlesFor);
    // Terburuk: 4000 × $4/M + 12000 × $10/M = $0,136 > pagu $0,10.
    const pending = await runTitleJob(units(), dir, fake.client, {
      confirm: true,
      budget: 0.1,
      log: () => {},
    });
    expect(pending).toBe(3);
    expect(fake.calls).toEqual([]);
  });

  test("respons max_tokens: tidak ada judul diterima, biayanya tetap tercatat, diulang sekali", async () => {
    const dir = mkdtempSync(join(tmpdir(), "surau-judul-"));
    const fake = fakeClient(titlesFor, "max_tokens");
    const pending = await runTitleJob(units(), dir, fake.client, {
      confirm: true,
      budget: 1,
      log: () => {},
    });
    expect(pending).toBe(3);
    expect(fake.calls).toHaveLength(2);
    const runs = readFileSync(join(dir, TITLE_RUNS_FILE), "utf8").trim().split("\n");
    expect(runs).toHaveLength(2);
    expect(JSON.parse(runs[0]!).rejected).toMatchObject({ n100001: "stop_reason max_tokens" });
  });
});
