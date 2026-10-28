// Tes terjemahan ulang terarah (X21, ADR-109) dengan baris korpus buatan: pemilihan paragraf,
// permintaan tertunda, model ulangan, dan hasil lama yang dipertahankan bila hasil baru gagal.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { PageRow, PassageRow, TocNodeRow } from "@surau/db";
import { TRANSLATE_PROMPT } from "@surau/llm";
import { describe, expect, test } from "vite-plus/test";

import type { CorpusRows } from "../rows.ts";
import { pendingRequests, rebuild, retryModel, submittable, unresolved } from "./batch.ts";
import type { Accepted } from "./batch.ts";
import { NO_RETRANSLATION, selectRetranslation, translationDone } from "./retranslate.ts";
import { acceptedTranslation, readJsonl, writeBatches, writeJsonl } from "./store.ts";
import type { AcceptedTranslation, BatchRecord, Failure } from "./store.ts";
import { buildWork } from "./work.ts";

const page = (seq: number, juz: number): PageRow => ({
  id: 100_000 + seq,
  edition_id: 1,
  seq,
  juz,
  page_no: seq,
  source_page_id: null,
});
const toc = (seq: number): TocNodeRow => ({
  id: 100_000 + seq,
  edition_id: 1,
  parent_id: null,
  ord: seq,
  level: 1,
  title_ar: "كتاب",
  start_page_id: 100_001,
  source_title_id: null,
  patched: 0,
});
const passage = (seq: number, pageSeq: number, text: string): PassageRow => ({
  id: 10_000_000 + seq,
  edition_id: 1,
  page_id: 100_000 + pageSeq,
  toc_node_id: 100_001,
  kind: "body",
  ord: seq,
  text_raw: text,
});

// 1: pendek (jilid 1) · 2: 120 huruf (jilid 1) · 3: 520 huruf (jilid 2)
const rows = {
  page: [page(1, 1), page(2, 2)],
  toc_node: [toc(1)],
  passage: [
    passage(1, 1, "نص قصير"),
    passage(2, 1, "كلمة ".repeat(24)),
    passage(3, 2, "كلمة ".repeat(104)),
  ],
  footnote_ref: [],
  passage_ayah_ref: [],
} as unknown as CorpusRows;
const work = buildWork(rows);
const usage = {
  input_tokens: 1,
  output_tokens: 1,
  cache_read_input_tokens: null,
  cache_creation_input_tokens: null,
  cache_creation: null,
};
const sha = (id: number) => work.units.get(id)?.sourceSha256 ?? "";
const old = (id: number, promptVersion = "translate-passage@2"): AcceptedTranslation => ({
  passage_id: id,
  lang: "id",
  text: "Terjemahan lama.",
  model: "claude-haiku-5-5",
  prompt_version: promptVersion,
  created_at: "2026-10-17T00:00:00Z",
  source_sha256: sha(id),
  batch_id: "b0",
  markers_missing: [],
  usage,
});
const accepted = (over: Partial<Accepted> = {}): Accepted => ({
  translations: new Map(),
  r1: new Map(),
  final: new Map(),
  failures: [],
  ...over,
});
const file = (over: Record<string, unknown> = {}) => ({
  entries: [
    {
      id: "x21",
      date: "2026-10-26",
      basis: "T-17 tahap 3 + uji X21",
      prompt: TRANSLATE_PROMPT.id,
      model: "claude-sonnet-5-5",
      min_chars: 100,
      ...over,
    },
  ],
});

describe("pemilihan paragraf", () => {
  test("menurut panjang teks Arab dan jilid", () => {
    const all = selectRetranslation(file(), rows);
    expect([...all.keys()]).toEqual([10_000_002, 10_000_003]);
    expect(all.get(10_000_002)).toEqual({
      entry: "x21",
      prompt: TRANSLATE_PROMPT.id,
      model: "claude-sonnet-5-5",
    });
    expect([...selectRetranslation(file({ min_chars: 500 }), rows).keys()]).toEqual([10_000_003]);
    expect([...selectRetranslation(file({ juz: [1] }), rows).keys()]).toEqual([10_000_002]);
    // `passages` membatasi ke ID tertentu (sisa X21).
    expect([
      ...selectRetranslation(file({ passages: [10_000_003, 10_000_001] }), rows).keys(),
    ]).toEqual([10_000_003]);
    expect(selectRetranslation(file({ passages: [10_000_001], min_chars: 0 }), rows).size).toBe(1);
  });

  test("translationDone: terjemahan lama dengan sumber sama belum selesai bila dipilih", () => {
    const target = selectRetranslation(file(), rows).get(10_000_002);
    expect(translationDone(old(10_000_002), sha(10_000_002), undefined)).toBe(true);
    expect(translationDone(old(10_000_002), sha(10_000_002), target)).toBe(false);
    expect(translationDone(old(10_000_002, TRANSLATE_PROMPT.id), sha(10_000_002), target)).toBe(
      true,
    );
    expect(translationDone(old(10_000_002), "0".repeat(64), undefined)).toBe(false);
    expect(translationDone(undefined, sha(10_000_002), undefined)).toBe(false);
  });
});

describe("request tertunda", () => {
  const targets = selectRetranslation(file(), rows);
  const acc = accepted({
    translations: new Map([1, 2, 3].map((id) => [10_000_000 + id, old(10_000_000 + id)])),
  });

  test("paragraf terpilih dikirim ulang ke Sonnet dengan prompt aktif; yang tidak terpilih tidak", () => {
    expect(pendingRequests(work, acc, 1).filter((r) => r.kind === "translation")).toEqual([]);
    const reqs = pendingRequests(work, acc, 1, targets).filter((r) => r.kind === "translation");
    expect(reqs.map((r) => [r.custom_id, r.params.model, r.prompt_version])).toEqual([
      ["passage-10000002", "claude-sonnet-5-5", TRANSLATE_PROMPT.id],
      ["passage-10000003", "claude-sonnet-5-5", TRANSLATE_PROMPT.id],
    ]);
    // Versi prompt tercatat = prompt yang benar-benar dikirim (aturan teks-arab 8).
    expect(reqs[0]?.params.system).toEqual([
      {
        type: "text",
        text: TRANSLATE_PROMPT.system,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ]);
  });

  test("hasil prompt tujuan yang sudah lolos tidak dikirim lagi; dasar paragraf baru tetap Haiku", () => {
    const done = accepted({
      translations: new Map([[10_000_002, old(10_000_002, TRANSLATE_PROMPT.id)]]),
    });
    const ids = (r: ReturnType<typeof pendingRequests>) =>
      r.filter((x) => x.kind === "translation").map((x) => x.custom_id);
    expect(ids(pendingRequests(work, done, 1, targets))).toEqual([
      "passage-10000001",
      "passage-10000003",
    ]);
    const fresh = pendingRequests(work, accepted(), 1).filter((r) => r.kind === "translation");
    expect(fresh.map((r) => r.params.model)).toEqual([
      "claude-haiku-5-5",
      "claude-haiku-5-5",
      "claude-haiku-5-5",
    ]);
  });

  test("paragraf yang sumbernya berubah atau pernah gagal langsung ke Sonnet", () => {
    const stale = accepted({
      translations: new Map([[10_000_001, { ...old(10_000_001), source_sha256: "0".repeat(64) }]]),
    });
    const first = pendingRequests(work, stale, 1).find((r) => r.custom_id === "passage-10000001");
    expect(first?.params.model).toBe("claude-sonnet-5-5");
  });

  test("submittable memakai aturan yang sama", () => {
    const planned = pendingRequests(work, acc, 1, targets).filter((r) => r.kind === "translation");
    expect(submittable(work, acc, new Set(), planned).ready).toEqual([]);
    expect(submittable(work, acc, new Set(), planned, targets).ready).toHaveLength(2);
    expect(
      submittable(work, acc, new Set(["passage-10000002"]), planned, targets).ready,
    ).toHaveLength(1);
  });
});

describe("ulangan terjemahan ulang", () => {
  const targets = selectRetranslation(file(), rows);
  const failure = (id: number, over: Partial<Failure> = {}): Failure => ({
    custom_id: `passage-${id}`,
    batch_id: "b1",
    model: "claude-sonnet-5-5",
    reason: "invalid:meta",
    details: [],
    output: null,
    at: "2026-10-26T00:00:00Z",
    source_sha256: sha(id),
    prompt_version: TRANSLATE_PROMPT.id,
    usage: null,
    ...over,
  });

  test("terjemahan lama dengan sumber sama tidak menyembunyikan kegagalan prompt tujuan", () => {
    const acc = accepted({
      translations: new Map([[10_000_002, old(10_000_002)]]),
      failures: [failure(10_000_002)],
    });
    expect(unresolved(work, acc).size).toBe(0);
    const todo = unresolved(work, acc, targets);
    expect(todo.get("passage-10000002")).toMatchObject({ attempts: 1, sonnetOnly: true });
  });

  test("selalu Sonnet; menyerah sesudah tiga percobaan (terjemahan lama tetap dimuat)", () => {
    const base = { refusal: false, summary: false, sonnetOnly: true };
    expect(retryModel({ ...base, attempts: 1, sonnet: 1 })).toBe("claude-sonnet-5-5");
    expect(retryModel({ ...base, attempts: 2, sonnet: 2 })).toBe("claude-sonnet-5-5");
    expect(retryModel({ ...base, attempts: 3, sonnet: 3 })).toBeNull();
  });
});

describe("rebuild: terjemahan lama dipertahankan sampai hasil baru lolos", () => {
  const message = (text: string) => ({
    id: "msg",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5-5",
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    stop_details: null,
    usage: {
      input_tokens: 1,
      output_tokens: 1,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
  });
  const record = (id: string, created: string, prompt: string): BatchRecord => ({
    name: id,
    id,
    kind: "translation",
    model: "mixed",
    prompt_version: prompt,
    requests: 1,
    created_at: created,
    ended_at: created,
    collected_at: created,
    usage: null,
    outcome: null,
  });

  test("hasil v2 lolos, lalu hasil v5 ditolak → v2 tetap; lalu v5 lolos → v5 menimpa", () => {
    const dir = mkdtempSync(join(tmpdir(), "surau-retranslate-"));
    const planned = (prompt: string) =>
      pendingRequests(work, accepted(), 1)
        .filter((r) => r.custom_id === "passage-10000002")
        .map((r) => ({ ...r, prompt_version: prompt }));
    const good =
      `Ini kalimat Indonesia buatan untuk pengujian yang cukup panjang ${"kata ".repeat(20)}`.trim();
    writeBatches(dir, [
      record("b1", "2026-10-17T01:00:00Z", "translate-passage@2"),
      record("b2", "2026-10-26T01:00:00Z", TRANSLATE_PROMPT.id),
    ]);
    writeJsonl(join(dir, "requests", "b1.jsonl"), planned("translate-passage@2"));
    writeJsonl(join(dir, "requests", "b2.jsonl"), planned(TRANSLATE_PROMPT.id));
    writeJsonl(join(dir, "results", "b1.jsonl"), [
      { custom_id: "passage-10000002", result: { type: "succeeded", message: message(good) } },
    ]);
    writeJsonl(join(dir, "results", "b2.jsonl"), [
      {
        custom_id: "passage-10000002",
        result: { type: "succeeded", message: message(`${good} نص`) },
      },
    ]);
    rebuild(dir, work);
    let t = readJsonl(join(dir, "translation.jsonl"), acceptedTranslation);
    expect(t.map((x) => [x.passage_id, x.prompt_version])).toEqual([
      [10_000_002, "translate-passage@2"],
    ]);
    // Hasil baru lolos di batch yang lebih baru → menimpa.
    writeJsonl(join(dir, "results", "b2.jsonl"), [
      { custom_id: "passage-10000002", result: { type: "succeeded", message: message(good) } },
    ]);
    rebuild(dir, work);
    t = readJsonl(join(dir, "translation.jsonl"), acceptedTranslation);
    expect(t.map((x) => [x.passage_id, x.prompt_version, x.model])).toEqual([
      [10_000_002, TRANSLATE_PROMPT.id, "claude-sonnet-5-5"],
    ]);
  });
});

test("tanpa berkas pilihan: tidak ada terjemahan ulang", () => {
  expect(NO_RETRANSLATION.size).toBe(0);
});

describe("rencana usang dan entri riwayat", () => {
  test("rencana dengan prompt atau model lain dari pilihan sekarang tidak terkirim (usang)", () => {
    const targets = selectRetranslation(file(), rows);
    const [fresh] = pendingRequests(work, accepted({ translations: new Map() }), 1, targets).filter(
      (r) => r.custom_id === "passage-10000002",
    );
    if (fresh === undefined) throw new Error("request uji tidak ada");
    const acc = accepted({ translations: new Map([[10_000_002, old(10_000_002)]]) });
    expect(submittable(work, acc, new Set(), [fresh], targets).ready).toHaveLength(1);
    // Rencana era S13: prompt v2.
    const v2 = { ...fresh, prompt_version: "translate-passage@2" };
    expect(submittable(work, acc, new Set(), [v2], targets)).toMatchObject({ ready: [], stale: 1 });
    // Model lain dari pilihan (Haiku, bukan Sonnet).
    const haiku = { ...fresh, params: { ...fresh.params, model: "claude-haiku-5-5" as const } };
    expect(submittable(work, acc, new Set(), [haiku], targets)).toMatchObject({
      ready: [],
      stale: 1,
    });
  });

  test("entri bukan prompt aktif dilewati; prompt tak dikenal ditolak", () => {
    const warn = console.warn;
    console.warn = () => {};
    try {
      expect(selectRetranslation(file({ prompt: "translate-passage@4" }), rows).size).toBe(0);
    } finally {
      console.warn = warn;
    }
    expect(() => selectRetranslation(file({ prompt: "translate-passage@99" }), rows)).toThrow(
      /tak dikenal/,
    );
  });
});
