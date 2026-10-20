// Fixture: baris korpus buatan (kata Arab karangan). Tanpa API: hanya penyusunan request batch.
import type { PageRow, PassageRow, TocNodeRow } from "@surau/db";
import { describe, expect, test } from "vite-plus/test";

import type { CorpusRows } from "../rows.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  budgetProblem,
  pendingRequests,
  pendingUsd,
  readAccepted,
  rebuild,
  retryModel,
  spentUsd,
  submittable,
  unresolved,
} from "./batch.ts";
import type { Accepted } from "./batch.ts";
import { parseReviews } from "./reviews.ts";
import {
  readBatches,
  readJsonl,
  writeBatches,
  writeJsonl,
  acceptedTranslation,
  failure,
} from "./store.ts";
import type { AcceptedSummary, AcceptedTranslation, BatchRecord, Failure } from "./store.ts";
import { buildWork } from "./work.ts";

const page = (seq: number): PageRow => ({
  id: 100_000 + seq,
  edition_id: 1,
  seq,
  juz: 1,
  page_no: seq,
  source_page_id: null,
});
const node = (seq: number, parent: number | null, ord: number, title: string): TocNodeRow => ({
  id: 100_000 + seq,
  edition_id: 1,
  parent_id: parent === null ? null : 100_000 + parent,
  ord,
  level: parent === null ? 1 : 2,
  title_ar: title,
  start_page_id: 100_001,
  source_title_id: null,
  patched: 0,
});
const passage = (seq: number, toc: number, text: string): PassageRow => ({
  id: 10_000_000 + seq,
  edition_id: 1,
  page_id: 100_000 + seq,
  toc_node_id: 100_000 + toc,
  kind: "body",
  ord: 1,
  text_raw: text,
});

// A (akar, tanpa paragraf sendiri) → B dan C (daun).
const rows = {
  page: [page(1), page(2)],
  toc_node: [node(1, null, 1, "كتاب"), node(2, 1, 1, "باب أ"), node(3, 1, 2, "باب ب")],
  passage: [passage(1, 2, "نص مصنوع أول"), passage(2, 3, "نص مصنوع ثان")],
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

function accepted(over: Partial<Accepted> = {}): Accepted {
  return { translations: new Map(), r1: new Map(), final: new Map(), failures: [], ...over };
}

function translation(passageId: number, sha: string): AcceptedTranslation {
  return {
    passage_id: passageId,
    lang: "id",
    text: "Terjemahan.",
    model: "claude-haiku-5-5",
    prompt_version: "translate-passage@2",
    created_at: "2026-10-17T00:00:00Z",
    source_sha256: sha,
    batch_id: "b",
    markers_missing: [],
    usage,
  };
}

function summary(
  customId: string,
  tocNodeId: number,
  lang: "id" | "en",
  sha: string,
): AcceptedSummary {
  return {
    custom_id: customId,
    toc_node_id: tocNodeId,
    lang,
    part: null,
    round: 1,
    text: `Ringkasan ${customId}.`,
    model: "claude-haiku-5-5",
    prompt_version: "summarize-section@2",
    created_at: "2026-10-17T00:00:00Z",
    source_sha256: sha,
    input_sha256: null,
    batch_id: "b",
    usage,
  };
}

/** Kegagalan untuk sumber saat ini (hash unit/potongan sekarang), kecuali `sha` diberikan. */
function fail(customId: string, reason: string, sha?: string): Failure {
  const id = Number(customId.split("-")[1]);
  const current =
    work.units.get(id)?.sourceSha256 ?? work.chunkById.get(customId)?.sourceSha256 ?? "";
  return {
    custom_id: customId,
    batch_id: "b",
    model: "claude-haiku-5-5",
    reason,
    details: [],
    output: null,
    at: "t",
    source_sha256: sha ?? current,
    usage: null,
  };
}

describe("request tertunda", () => {
  test("putaran 1: semua paragraf + potongan × 2 bahasa; yang lolos (hash sama) dan yang gagal dilewati", () => {
    const all = pendingRequests(work, accepted(), 1).map((r) => r.custom_id);
    expect(all).toEqual([
      "passage-10000001",
      "passage-10000002",
      "toc-100002-id",
      "toc-100002-en",
      "toc-100003-id",
      "toc-100003-en",
    ]);
    const u1 = work.units.get(10_000_001);
    const some = pendingRequests(
      work,
      accepted({
        translations: new Map([
          [10_000_001, translation(10_000_001, u1?.sourceSha256 ?? "")],
          // Hash lama → dikirim lagi.
          [10_000_002, translation(10_000_002, "0".repeat(64))],
        ]),
        failures: [fail("toc-100003-en", "invalid:language")],
      }),
      1,
    ).map((r) => r.custom_id);
    expect(some).toEqual(["passage-10000002", "toc-100002-id", "toc-100002-en", "toc-100003-id"]);
  });

  test("putaran 2 menunggu semua ringkasan putaran 1 subpohon, lalu memakai urutan baca", () => {
    expect(pendingRequests(work, accepted(), 2)).toEqual([]);
    const sha = (id: number) => work.nodeById.get(id)?.subtree[0]?.sourceSha256 ?? "";
    const r1 = new Map(
      [100_002, 100_003].flatMap((id) =>
        (["id", "en"] as const).map((lang) => {
          const cid = `toc-${id}-${lang}`;
          return [cid, summary(cid, id, lang, sha(id))] as const;
        }),
      ),
    );
    const r2 = pendingRequests(work, accepted({ r1 }), 2);
    expect(r2.map((r) => r.custom_id)).toEqual(["toc-100001-id-r2", "toc-100001-en-r2"]);
    const user = r2[0]?.params.messages[0]?.content;
    expect(user).toContain(
      "1. باب أ\nRingkasan toc-100002-id.\n\n2. باب ب\nRingkasan toc-100003-id.",
    );
    expect(r2[0]?.kind).toBe("summary-r2");
  });
});

describe("ulangan", () => {
  test("percobaan dihitung per custom_id; refusal ditandai; yang sudah lolos tidak diulang", () => {
    const u2 = work.units.get(10_000_002);
    const todo = unresolved(
      work,
      accepted({
        translations: new Map([[10_000_002, translation(10_000_002, u2?.sourceSha256 ?? "")]]),
        failures: [
          fail("passage-10000001", "invalid:placeholders"),
          fail("passage-10000001", "refusal"),
          fail("passage-10000002", "max_tokens"),
          fail("toc-100002-id", "errored:api_error"),
          // Gagal untuk sumber lama: tidak dihitung (unit dijadwalkan ulang oleh plan).
          fail("toc-100003-id", "invalid:language", "0".repeat(64)),
        ],
      }),
    );
    expect([...todo]).toEqual([
      ["passage-10000001", { attempts: 2, refusal: true, sonnet: 0, summary: false }],
      ["toc-100002-id", { attempts: 1, refusal: false, sonnet: 0, summary: true }],
    ]);
  });
});

describe("kirim", () => {
  test("hasil usang dikirim lagi; yang lolos/gagal untuk sumber sama dan yang sedang diproses tidak", () => {
    const plan = pendingRequests(work, accepted(), 1);
    const u1 = work.units.get(10_000_001);
    const u2 = work.units.get(10_000_002);
    const acc = accepted({
      translations: new Map([
        // Lolos untuk sumber sama → tidak dikirim.
        [10_000_001, translation(10_000_001, u1?.sourceSha256 ?? "")],
        // Lolos untuk sumber LAMA → dikirim lagi (dulu terlewat karena hanya dicek ID-nya).
        [10_000_002, translation(10_000_002, "0".repeat(64))],
      ]),
      failures: [fail("toc-100002-id", "invalid:language")],
    });
    const { ready, stale } = submittable(work, acc, new Set(["toc-100003-en"]), plan);
    expect(stale).toBe(0);
    expect(ready.map((r) => r.custom_id)).toEqual([
      "passage-10000002",
      "toc-100002-en",
      "toc-100003-id",
    ]);
    expect(u2).toBeDefined();
  });

  test("rencana yang sumbernya sudah berubah tidak dikirim (dihitung usang)", () => {
    const plan = pendingRequests(work, accepted(), 1).map((r) =>
      r.custom_id === "passage-10000001" ? { ...r, source_sha256: "0".repeat(64) } : r,
    );
    const { ready, stale } = submittable(work, accepted(), new Set(), plan);
    expect(stale).toBe(1);
    expect(ready.map((r) => r.custom_id)).not.toContain("passage-10000001");
  });
});

describe("model ulangan", () => {
  test("Haiku dulu, percobaan terakhir dan refusal ke Sonnet, menyerah sesudah Sonnet", () => {
    const t = { refusal: false, summary: false };
    expect(retryModel({ ...t, attempts: 1, sonnet: 0 })).toBe("claude-haiku-5-5");
    expect(retryModel({ ...t, attempts: 2, sonnet: 0 })).toBe("claude-sonnet-5-5");
    expect(retryModel({ ...t, attempts: 1, sonnet: 0, refusal: true })).toBe("claude-sonnet-5-5");
    // Tiga kali Haiku (sebelum aturan Sonnet) → masih satu kesempatan Sonnet.
    expect(retryModel({ ...t, attempts: 3, sonnet: 0 })).toBe("claude-sonnet-5-5");
    expect(retryModel({ ...t, attempts: 3, sonnet: 1 })).toBeNull();
    // Ringkasan: dua kesempatan Sonnet (menghalangi ringkasan induk bila gagal).
    expect(retryModel({ ...t, summary: true, attempts: 4, sonnet: 1 })).toBe("claude-sonnet-5-5");
    expect(retryModel({ ...t, summary: true, attempts: 5, sonnet: 2 })).toBeNull();
  });
});

const message = (text: string) => ({
  id: "msg",
  type: "message",
  role: "assistant",
  model: "claude-haiku-5-5",
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
const plan = pendingRequests(work, accepted(), 1).filter((r) => r.custom_id === "passage-10000001");
const record = (id: string, created: string): BatchRecord => ({
  name: id,
  id,
  kind: "translation",
  model: "claude-haiku-5-5",
  prompt_version: "translate-passage@2",
  requests: 1,
  created_at: created,
  ended_at: created,
  collected_at: created,
  usage: null,
  outcome: null,
});

describe("rebuild dari hasil mentah", () => {
  const u1 = work.units.get(10_000_001);
  test("gagal lalu lolos di batch berikutnya → lolos; hasil untuk sumber lama → stale; outcome tercatat", () => {
    const dir = mkdtempSync(join(tmpdir(), "surau-rebuild-"));
    const good =
      `Ini kalimat Indonesia buatan untuk pengujian yang cukup panjang ${"kata ".repeat(8)}`.trim();
    writeBatches(dir, [record("b1", "2026-10-17T01:00:00Z"), record("b2", "2026-10-17T02:00:00Z")]);
    for (const id of ["b1", "b2"]) writeJsonl(join(dir, "requests", `${id}.jsonl`), plan);
    // b1: keluaran berisi huruf Arab → ditolak; b2: keluaran sah → lolos.
    writeJsonl(join(dir, "results", "b1.jsonl"), [
      {
        custom_id: "passage-10000001",
        result: { type: "succeeded", message: message(`${good} نص`) },
      },
    ]);
    writeJsonl(join(dir, "results", "b2.jsonl"), [
      { custom_id: "passage-10000001", result: { type: "succeeded", message: message(good) } },
    ]);
    rebuild(dir, work);
    const t = readJsonl(join(dir, "translation.jsonl"), acceptedTranslation);
    expect(t.map((x) => [x.passage_id, x.batch_id, x.source_sha256])).toEqual([
      [10_000_001, "b2", u1?.sourceSha256],
    ]);
    expect(readJsonl(join(dir, "failures.jsonl"), failure).map((f) => f.reason)).toEqual([
      "invalid:arabic",
    ]);
    expect(readBatches(dir).map((b) => b.outcome)).toEqual([
      { accepted: 0, invalid: 1, failed: 0 },
      { accepted: 1, invalid: 0, failed: 0 },
    ]);
    // Sumber berubah sesudah request dibuat (hash rencana beda) → stale, tidak dimuat.
    writeJsonl(
      join(dir, "requests", "b2.jsonl"),
      plan.map((r) => ({ ...r, source_sha256: "0".repeat(64) })),
    );
    rebuild(dir, work);
    expect(readJsonl(join(dir, "translation.jsonl"), acceptedTranslation)).toEqual([]);
    expect(readJsonl(join(dir, "failures.jsonl"), failure).map((f) => f.reason)).toEqual([
      "invalid:arabic",
      "stale",
    ]);
  });
});

describe("rebuild: ringkasan putaran 2 usang bila masukannya berubah", () => {
  test("hasil putaran 2 dengan hash masukan lama dibuang sebagai stale_input (bukan percobaan)", () => {
    const dir = mkdtempSync(join(tmpdir(), "surau-r2-"));
    const node = work.nodeById.get(100_001);
    if (node === undefined) throw new Error("fixture");
    const chunkPlans = pendingRequests(work, accepted(), 1).filter((r) => r.kind === "summary-r1");
    const r2plan = {
      custom_id: "toc-100001-id-r2",
      kind: "summary-r2" as const,
      prompt_version: "summarize-section@2",
      source_sha256: node.sourceSha256,
      source_chars: 10,
      input_sha256: "0".repeat(64),
      params: chunkPlans[0]?.params ?? ({} as never),
    };
    const summaryText =
      "al-Ghazali menjelaskan bahwa ilmu yang benar menuntun kepada amal dan keikhlasan hati.";
    writeBatches(dir, [
      { ...record("s1", "2026-10-17T01:00:00Z"), kind: "summary-r1", requests: chunkPlans.length },
      { ...record("s2", "2026-10-17T02:00:00Z"), kind: "summary-r2" },
    ]);
    writeJsonl(join(dir, "requests", "s1.jsonl"), chunkPlans);
    writeJsonl(join(dir, "requests", "s2.jsonl"), [r2plan]);
    writeJsonl(
      join(dir, "results", "s1.jsonl"),
      chunkPlans.map((p) => ({
        custom_id: p.custom_id,
        result: {
          type: "succeeded",
          message: message(
            p.custom_id.endsWith("-en")
              ? summaryText.replace(
                  "al-Ghazali menjelaskan bahwa ilmu yang benar menuntun kepada amal dan keikhlasan hati.",
                  "al-Ghazali explains that the true knowledge leads to practice and sincerity of the heart.",
                )
              : summaryText,
          ),
        },
      })),
    );
    writeJsonl(join(dir, "results", "s2.jsonl"), [
      {
        custom_id: "toc-100001-id-r2",
        result: { type: "succeeded", message: message(summaryText) },
      },
    ]);
    rebuild(dir, work);
    const failures = readJsonl(join(dir, "failures.jsonl"), failure);
    expect(failures.map((f) => f.reason)).toEqual(["stale_input"]);
    // Tidak dihitung sebagai percobaan gagal untuk sumber saat ini.
    expect(unresolved(work, readAccepted(dir)).has("toc-100001-id-r2")).toBe(false);
  });
});

describe("rebuild: koreksi tinjauan (X02)", () => {
  const reviews = parseReviews({
    reviews: [
      {
        reviewer: "uji",
        date: "2026-10-17",
        basis: "tes",
        rejects_prompt: "translate-passage@2",
        entries: [{ passage_id: 10_000_001, verdict: "salah", reason: "satuan diganti" }],
      },
    ],
  });
  const good =
    `Ini kalimat Indonesia buatan untuk pengujian yang cukup panjang ${"kata ".repeat(8)}`.trim();
  const ok = (id: string) => [
    {
      custom_id: "passage-10000001",
      result: { type: "succeeded", message: message(`${good} ${id}`) },
    },
  ];

  test("hasil versi yang ditolak tidak dimuat; ulangan langsung Sonnet; hasil versi baru lolos", () => {
    const dir = mkdtempSync(join(tmpdir(), "surau-review-"));
    writeBatches(dir, [record("b1", "2026-10-17T01:00:00Z")]);
    writeJsonl(
      join(dir, "requests", "b1.jsonl"),
      plan.map((r) => ({ ...r, prompt_version: "translate-passage@2" })),
    );
    writeJsonl(join(dir, "results", "b1.jsonl"), ok("satu"));
    rebuild(dir, work, reviews);
    expect(readJsonl(join(dir, "translation.jsonl"), acceptedTranslation)).toEqual([]);
    const failures = readJsonl(join(dir, "failures.jsonl"), failure);
    expect(failures.map((f) => [f.reason, f.details[0]])).toEqual([
      ["review_rejected", "salah: satuan diganti (uji, 2026-10-17)"],
    ]);
    const state = unresolved(work, readAccepted(dir)).get("passage-10000001");
    expect(state).toEqual({
      attempts: 1,
      refusal: false,
      reviewed: true,
      sonnet: 0,
      summary: false,
    });
    expect(retryModel(state as NonNullable<typeof state>)).toBe("claude-sonnet-5-5");
    // Ulangan dengan prompt saat ini (bukan versi yang ditolak) → lolos.
    expect(plan[0]?.prompt_version).not.toBe("translate-passage@2");
    writeBatches(dir, [record("b1", "2026-10-17T01:00:00Z"), record("b2", "2026-10-17T02:00:00Z")]);
    writeJsonl(join(dir, "requests", "b2.jsonl"), plan);
    writeJsonl(join(dir, "results", "b2.jsonl"), ok("dua"));
    rebuild(dir, work, reviews);
    expect(
      readJsonl(join(dir, "translation.jsonl"), acceptedTranslation).map((t) => [
        t.batch_id,
        t.prompt_version,
      ]),
    ).toEqual([["b2", plan[0]?.prompt_version]]);
    expect(unresolved(work, readAccepted(dir)).has("passage-10000001")).toBe(false);
    // Tanpa koreksi pun hasil batch terbaru (b2) yang dipakai.
    rebuild(dir, work);
    expect(readJsonl(join(dir, "translation.jsonl"), acceptedTranslation)[0]?.batch_id).toBe("b2");
  });

  test("ulangan sesudah penolakan dihitung; penolakan versi prompt saat ini tidak diulang", () => {
    const dir = mkdtempSync(join(tmpdir(), "surau-review-"));
    writeBatches(dir, [record("b1", "2026-10-17T01:00:00Z"), record("b2", "2026-10-17T02:00:00Z")]);
    writeJsonl(
      join(dir, "requests", "b1.jsonl"),
      plan.map((r) => ({ ...r, prompt_version: "translate-passage@2" })),
    );
    writeJsonl(join(dir, "results", "b1.jsonl"), ok("satu"));
    writeJsonl(join(dir, "requests", "b2.jsonl"), plan);
    // b2 (ulangan Sonnet sesudah penolakan) gagal validasi: huruf Arab.
    writeJsonl(join(dir, "results", "b2.jsonl"), [
      {
        custom_id: "passage-10000001",
        result: { type: "succeeded", message: message(`${good} نص`) },
      },
    ]);
    rebuild(dir, work, reviews);
    const after = unresolved(work, readAccepted(dir)).get("passage-10000001");
    expect(after).toMatchObject({ attempts: 2, reviewed: true });
    // Peninjau juga menolak versi prompt SAAT INI: tidak diulang lagi (butuh prompt baru).
    const current = plan[0]?.prompt_version ?? "";
    const both = parseReviews({
      reviews: [
        {
          reviewer: "uji",
          date: "2026-10-17",
          basis: "tes",
          rejects_prompt: "translate-passage@2",
          entries: [{ passage_id: 10_000_001, verdict: "salah", reason: "satuan diganti" }],
        },
        {
          reviewer: "uji",
          date: "2026-10-18",
          basis: "tes",
          rejects_prompt: current,
          entries: [{ passage_id: 10_000_001, verdict: "kurang", reason: "masih keliru" }],
        },
      ],
    });
    writeJsonl(join(dir, "results", "b2.jsonl"), ok("dua"));
    rebuild(dir, work, both);
    expect(readJsonl(join(dir, "translation.jsonl"), acceptedTranslation)).toEqual([]);
    const stuck = unresolved(work, readAccepted(dir)).get("passage-10000001");
    expect(stuck?.needsNewPrompt).toBe(true);
    expect(retryModel(stuck as NonNullable<typeof stuck>)).toBeNull();
  });

  test("berkas koreksi: entri ganda per versi prompt ditolak", () => {
    const entry = { passage_id: 1, verdict: "kurang", reason: "x" };
    const one = { reviewer: "a", date: "2026-10-17", basis: "b", rejects_prompt: "p@1" };
    expect(() => parseReviews({ reviews: [{ ...one, entries: [entry, entry] }] })).toThrow(/ganda/);
    expect(
      parseReviews({
        reviews: [
          { ...one, entries: [entry] },
          { ...one, rejects_prompt: "p@2", entries: [entry] },
        ],
      }).get(1),
    ).toHaveLength(2);
    expect(() =>
      parseReviews({ reviews: [{ ...one, date: "17-10-2026", entries: [entry] }] }),
    ).toThrow(/date/);
  });
});

describe("pagu anggaran (#62)", () => {
  const record = (id: string, collected: boolean, costUsd: number | null): BatchRecord => ({
    name: `01-translation-${id}`,
    id,
    kind: "translation",
    model: "model-uji",
    prompt_version: "translate-passage@2",
    requests: 1,
    created_at: "2026-10-20T00:00:00Z",
    ended_at: collected ? "2026-10-20T01:00:00Z" : null,
    collected_at: collected ? "2026-10-20T01:00:00Z" : null,
    usage:
      costUsd === null
        ? null
        : {
            requests: 1,
            input_tokens: 0,
            output_tokens: 0,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
            costUsd,
          },
    outcome: null,
  });
  const setup = (estUsd: number | undefined) => {
    const dir = mkdtempSync(join(tmpdir(), "surau-pagu-"));
    const [plan] = pendingRequests(work, accepted(), 1);
    if (plan === undefined) throw new Error("rencana kosong");
    writeBatches(dir, [record("b-lama", true, 4), record("b-jalan", false, null)]);
    const { est_usd: _, ...bare } = plan;
    writeJsonl(join(dir, "requests", "b-jalan.jsonl"), [
      estUsd === undefined ? bare : { ...bare, est_usd: estUsd },
    ]);
    return dir;
  };

  test("batch yang belum di-collect ikut dihitung dengan perkiraannya", () => {
    const dir = setup(5);
    expect(spentUsd(dir)).toBe(4);
    expect(pendingUsd(dir)).toEqual({ usd: 5, unknown: 0 });
    // $4 terpakai + $5 masih diproses + $2 kiriman ini > pagu $10.
    expect(budgetProblem(dir, 2, true, 10)).toMatch(/Melebihi anggaran/);
    expect(budgetProblem(dir, 2, false, 10)).toMatch(/Melebihi anggaran/);
    expect(budgetProblem(dir, 1, true, 10)).toBeNull();
  });

  test("--confirm tanpa --budget ditolak; tanpa --confirm hanya ringkasan", () => {
    const dir = setup(5);
    expect(budgetProblem(dir, 1, true, undefined)).toMatch(/wajib bersama --budget/);
    expect(budgetProblem(dir, 1, false, undefined)).toBeNull();
  });

  test("batch terbuka tanpa perkiraan biaya → kirim ditolak sampai di-collect", () => {
    const dir = setup(undefined);
    expect(pendingUsd(dir)).toEqual({ usd: 0, unknown: 1 });
    expect(budgetProblem(dir, 1, true, 100)).toMatch(/tanpa perkiraan biaya/);
  });
});
