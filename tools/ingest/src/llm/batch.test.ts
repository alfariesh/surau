// Fixture: baris korpus buatan (kata Arab karangan). Tanpa API: hanya penyusunan request batch.
import type { PageRow, PassageRow, TocNodeRow } from "@surau/db";
import { describe, expect, test } from "vite-plus/test";

import type { CorpusRows } from "../rows.ts";
import { pendingRequests, submittable, unresolved } from "./batch.ts";
import type { Accepted } from "./batch.ts";
import type { AcceptedSummary, AcceptedTranslation, Failure } from "./store.ts";
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
    arabic_warning: false,
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
      ["passage-10000001", { attempts: 2, refusal: true, sonnet: false }],
      ["toc-100002-id", { attempts: 1, refusal: false, sonnet: false }],
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
