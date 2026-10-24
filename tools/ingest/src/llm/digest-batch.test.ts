// Alur Intisari ujung ke ujung tanpa API: request dari rencana, hasil batch tiruan (JSON yang menunjuk
// blok/ID), nilai ulang, lalu muat ke baris korpus beserta invarian build. Korpus buatan.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { TranslationRow } from "@surau/db";
import { DIGEST_SECTION_PROMPT, MODELS } from "@surau/llm";
import { describe, expect, test } from "vite-plus/test";

import { digestCorpus } from "../../test/digest-fixture.ts";
import type { PlannedRequest } from "./batch.ts";
import { digestRows, withDigestSummaries } from "./digest-attach.ts";
import {
  anchorsFromPoints,
  digestRetries,
  pendingDigestRequests,
  rebuildDigests,
  titlesOf,
} from "./digest-batch.ts";
import { readDigestStore, writeDigestStore } from "./digest-store.ts";
import { pilotSql } from "./digest-staging.ts";
import { digestPlan } from "./digest-units.ts";
import type { DigestCorpus, DigestPlan } from "./digest-units.ts";
import { readBatches, writeBatches, writeJsonl } from "./store.ts";

const words = (n: number) => Array.from({ length: n }, () => "kata").join(" ");
const ABSTRACT =
  "Al-Ghazali menjelaskan keutamaan ilmu dan para ulama dalam bagian ini, lalu menukil pendapat para sahabat tentang ilmu yang bermanfaat.";
const point = (title: string, dasar: string[], bodyWords = 40, sikap = "author") => ({
  judul: title,
  isi: `Al-Ghazali menjelaskan bahwa ilmu menjadi pokok pembahasan. ${words(bodyWords)}.`,
  sikap,
  jenis: "idea",
  dasar,
  pertanyaan: ["Menurut al-Ghazali, apa keutamaan ilmu itu?"],
});

const message = (out: unknown, model: string = MODELS.haiku) => ({
  id: "msg",
  type: "message",
  role: "assistant",
  model,
  content: [{ type: "text", text: JSON.stringify(out), citations: null }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: {
    input_tokens: 1000,
    output_tokens: 500,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_creation: null,
  },
});

let batchNo = 0;
/** Catat satu batch tiruan yang sudah dikumpulkan: request + hasil mentah. */
function fakeBatch(dir: string, reqs: readonly PlannedRequest[], outputs: Map<string, unknown>) {
  batchNo++;
  const id = `msgbatch_${batchNo}`;
  const at = `2026-10-24T10:0${batchNo}:00Z`;
  writeJsonl(join(dir, "requests", `${id}.jsonl`), reqs);
  writeJsonl(
    join(dir, "results", `${id}.jsonl`),
    reqs.map((r) => ({
      custom_id: r.custom_id,
      result: {
        type: "succeeded",
        message: message(outputs.get(r.custom_id), String(r.params.model)),
      },
    })),
  );
  writeBatches(dir, [
    ...readBatches(dir),
    {
      name: `${String(batchNo).padStart(2, "0")}-${reqs[0]?.kind ?? "digest-leaf"}`,
      id,
      kind: reqs[0]?.kind ?? "digest-leaf",
      model: String(reqs[0]?.params.model),
      prompt_version: reqs[0]?.prompt_version ?? "",
      requests: reqs.length,
      created_at: at,
      ended_at: at,
      collected_at: at,
      usage: null,
      outcome: null,
    },
  ]);
}

/** Keluaran leaf: gagasan berdasar blok bukan-judul pertama, satu kutipan bila ada blok yang layak. */
function leafOutput(plan: DigestPlan, customId: string) {
  const leaf = plan.leafById.get(customId)!;
  const body = leaf.blocks.filter((b) => !b.heading);
  const quotable = body.find((b) => !b.ayah && b.end - b.start >= 20 && b.end - b.start <= 400);
  const gagasan = Array.from({ length: leaf.points.min }, (_, i) =>
    point(`Al-Ghazali menjelaskan gagasan ${i + 1}`, [body[i % body.length]!.label]),
  );
  return {
    abstrak: ABSTRACT,
    gagasan,
    kutipan:
      quotable === undefined
        ? []
        : [
            {
              dari: quotable.label,
              sampai: quotable.label,
              gagasan: 1,
              terjemahan: "Ilmu adalah cahaya hati.",
            },
          ],
    istilah: ["ilmu"],
  };
}

function setup(rows: DigestCorpus = digestCorpus()) {
  const dir = mkdtempSync(join(tmpdir(), "surau-intisari-"));
  const plan = digestPlan(rows, { scope: 100_003, maxTokens: 150 });
  return { dir, plan, rows, titles: titlesOf(rows) };
}

function runLeaf(dir: string, plan: DigestPlan, rows: DigestCorpus) {
  const { requests } = pendingDigestRequests(plan, readDigestStore(dir), titlesOf(rows), "leaf");
  fakeBatch(
    dir,
    requests,
    new Map(requests.map((r) => [r.custom_id, leafOutput(plan, r.custom_id)])),
  );
  return rebuildDigests(dir, plan, rows);
}

describe("alur Intisari tanpa API", () => {
  test("leaf → merge → book: jangkar dan kutipan dihitung kode, asal terjemahan kutipan ikut", () => {
    const { dir, plan, rows, titles } = setup();
    expect(pendingDigestRequests(plan, readDigestStore(dir), titles, "merge").waiting).toEqual([
      { tocNodeId: 100_005, missing: ["dg-100005-id-p1", "dg-100005-id-p2"] },
    ]);
    const leaf = runLeaf(dir, plan, rows);
    expect(leaf.failures).toBe(0);
    const store = readDigestStore(dir);
    const bab1 = store.accepted.get("dg-100004-id")!;
    expect(bab1.points[0]?.anchors[0]?.passage_id).toBe(10_000_003);
    expect(bab1.quotes[0]).toMatchObject({
      passage_id: 10_000_003,
      origin: "dg-100004-id",
      kind: "text",
    });

    // Merge bab panjang dari dua potongannya.
    const merge = pendingDigestRequests(plan, store, titles, "merge");
    expect(merge.requests.map((r) => r.custom_id)).toEqual(["dg-100005-id-m"]);
    expect(merge.requests[0]?.digest?.sources).toEqual(["dg-100005-id-p1", "dg-100005-id-p2"]);
    const mergeOut = {
      abstrak: ABSTRACT,
      gagasan: [
        point("Al-Ghazali merangkum bab kedua", ["n5p1.g1", "n5p2.g1"]),
        point("Al-Ghazali menutup bab kedua", ["n5p2.g1"]),
      ],
      kutipan: [{ id: "n5p1.q1", gagasan: 1 }],
      istilah: ["ilmu"],
    };
    fakeBatch(dir, merge.requests, new Map([["dg-100005-id-m", mergeOut]]));
    expect(rebuildDigests(dir, plan, rows).failures).toBe(0);
    const bab2 = readDigestStore(dir).accepted.get("dg-100005-id-m")!;
    expect(bab2.points[0]?.anchors.map((a) => a.passage_id)).toEqual([10_000_004, 10_000_005]);
    expect(bab2.quotes[0]).toMatchObject({ origin: "dg-100005-id-p1", model: MODELS.haiku });

    // Kitab (Sonnet) + pembanding Haiku.
    const book = pendingDigestRequests(plan, readDigestStore(dir), titles, "book", {
      compare: true,
    });
    expect(book.requests.map((r) => [r.custom_id, r.params.model])).toEqual([
      ["dg-100003-id-b", MODELS.sonnet],
      ["dg-100003-id-bh", MODELS.haiku],
    ]);
    // Satu gagasan per gagasan sumber (minimum Intisari Kitab = gagasan sumber yang tersedia, ≤ 5).
    const user = book.requests[0]?.params.messages[0]?.content;
    const sourceIds =
      typeof user === "string"
        ? [...user.matchAll(/<gagasan id="([^"]+)"/gu)].map((m) => m[1]!)
        : [];
    const bookOut = {
      pembuka: `Kitab ini membuka pembahasan tentang ilmu menurut al-Ghazali. ${words(20)}.`,
      abstrak: ABSTRACT,
      gagasan: sourceIds.map((id, i) =>
        point(
          `Al-Ghazali menjelaskan gagasan kitab ${i + 1}`,
          i === 0 ? ["n4.g1", "n5.g1"] : [id],
          110,
        ),
      ),
      kutipan: [{ id: "n4.q1", gagasan: 1 }],
      istilah: ["ilmu", "ulama"],
      penutup: `Inti kitab ini menurut al-Ghazali adalah ilmu jalan akhirat. ${words(20)}.`,
    };
    fakeBatch(dir, book.requests, new Map(book.requests.map((r) => [r.custom_id, bookOut])));
    expect(rebuildDigests(dir, plan, rows).failures).toBe(0);
    const kitab = readDigestStore(dir).accepted.get("dg-100003-id-b")!;
    expect(kitab.quotes[0]).toMatchObject({ origin: "dg-100004-id", model: MODELS.haiku });
    expect(kitab.model).toBe(MODELS.sonnet);

    // Muat ke baris korpus: kutipan satu paragraf utuh memakai terjemahan paragraf bila ada.
    const translation: TranslationRow[] = [
      {
        passage_id: 10_000_003,
        lang: "id",
        text: "Terjemahan AI paragraf.",
        model: MODELS.haiku,
        prompt_version: "translate-passage@4",
        created_at: "2026-10-17",
        review_status: "ai_generated",
      },
    ];
    const build = digestRows({ ...rows, translation }, dir, { plan });
    expect(build.problems).toEqual([]);
    expect(build.digest.map((d) => [d.toc_node_id, d.tier, d.basis])).toEqual([
      [100_004, "section", "text"],
      [100_005, "section", "text"],
      [100_003, "book", "mixed"],
    ]);
    const quoteOf = (node: number) => build.digest_quote.find((q) => q.toc_node_id === node)!;
    expect(quoteOf(100_004)).toMatchObject({
      translation_source: "passage",
      translation: null,
      model: null,
    });
    expect(quoteOf(100_005)).toMatchObject({ translation_source: "digest", model: MODELS.haiku });
    // Kutipan anak di Intisari Kitab tetap berlabel asal leaf-nya, bukan Sonnet.
    expect(quoteOf(100_003)).toMatchObject({ translation_source: "passage" });
    expect(build.fts).toHaveLength(build.digest_point.length);
    expect(build.fts[0]?.rowid).toBe(100_003 * 100 + 1);
    expect(build.digest_term).toEqual([]); // tanpa definisi glosarium, istilah tidak dimuat
    expect(build.stats.termsWithoutGloss).toBeGreaterThan(0);
    expect(build.summary.map((s) => s.toc_node_id)).toEqual([100_004, 100_005, 100_003]);
    const merged = withDigestSummaries(
      [
        {
          toc_node_id: 100_004,
          lang: "id",
          text: "lama",
          model: "m",
          prompt_version: "summarize-section@2",
          created_at: "x",
          review_status: "ai_generated",
        },
        {
          toc_node_id: 100_004,
          lang: "en",
          text: "old",
          model: "m",
          prompt_version: "summarize-section@2",
          created_at: "x",
          review_status: "ai_generated",
        },
      ],
      build.summary,
    );
    expect(
      merged.filter((s) => s.toc_node_id === 100_004).map((s) => [s.lang, s.prompt_version]),
    ).toEqual([
      ["en", "summarize-section@2"],
      ["id", DIGEST_SECTION_PROMPT.id],
    ]);
    expect(pilotSql(build)).toContain("ON CONFLICT (toc_node_id, lang) DO UPDATE SET");
  });

  test("sidik kutipan basi = invarian build gagal; teks berubah = hasil basi, induk ikut basi", () => {
    const { dir, plan, rows } = setup();
    runLeaf(dir, plan, rows);
    const store = readDigestStore(dir);
    const rec = store.accepted.get("dg-100004-id")!;
    store.accepted.set("dg-100004-id", {
      ...rec,
      quotes: rec.quotes.map((q) => ({ ...q, raw_sha256: "0".repeat(64) })),
    });
    writeDigestStore(dir, store);
    const broken = digestRows({ ...rows, translation: [] }, dir, { plan });
    expect(broken.problems).toEqual(["100004: kutipan 1 tidak cocok sidik"]);

    // Teks bab pertama berubah: hasil leaf-nya basi (rejudge), node itu tidak dimuat.
    const changed = digestCorpus({ 3: "نص تجريبي آخر تماما. ".repeat(9).trim() });
    const plan2 = digestPlan(changed, { scope: 100_003, maxTokens: 150 });
    rebuildDigests(dir, plan2, changed);
    const after = readDigestStore(dir);
    expect(after.accepted.has("dg-100004-id")).toBe(false);
    expect(after.failures.find((f) => f.custom_id === "dg-100004-id")?.reason).toBe("stale");
    // Hasil basi bukan percobaan: tidak diulang lewat retry, tetapi dijadwalkan ulang oleh plan.
    expect(digestRetries(plan2, after, titlesOf(changed), new Set()).requests).toEqual([]);
    expect(
      pendingDigestRequests(plan2, after, titlesOf(changed), "leaf").requests.map(
        (r) => r.custom_id,
      ),
    ).toContain("dg-100004-id");
  });

  test("respons cacat dicatat gagal lalu diulang; percobaan terakhir ke Sonnet", () => {
    const { dir, plan, rows } = setup();
    const { requests } = pendingDigestRequests(plan, readDigestStore(dir), titlesOf(rows), "leaf");
    const outputs = new Map<string, unknown>(
      requests.map((r) => [r.custom_id, leafOutput(plan, r.custom_id)]),
    );
    outputs.set("dg-100004-id", { abstrak: "pendek" });
    fakeBatch(dir, requests, outputs);
    rebuildDigests(dir, plan, rows);
    const once = digestRetries(plan, readDigestStore(dir), titlesOf(rows), new Set());
    expect(once.requests.map((r) => [r.custom_id, r.params.model])).toEqual([
      ["dg-100004-id", MODELS.haiku],
    ]);
    fakeBatch(dir, once.requests, new Map([["dg-100004-id", { abstrak: "pendek" }]]));
    rebuildDigests(dir, plan, rows);
    const twice = digestRetries(plan, readDigestStore(dir), titlesOf(rows), new Set());
    expect(twice.requests.map((r) => r.params.model)).toEqual([MODELS.sonnet]);
  });

  test("jangkar gabungan bergiliran per gagasan sumber, tanpa duplikat, maks. 9", () => {
    const a = (p: number, s: number) => ({ passage_id: p, char_start: s, char_end: s + 10 });
    const lists = [
      [a(1, 0), a(1, 20), a(1, 40)],
      [a(2, 0), a(1, 0)],
      Array.from({ length: 9 }, (_, i) => a(3, i * 20)),
    ];
    const out = anchorsFromPoints(lists);
    expect(out).toHaveLength(9);
    expect(out.slice(0, 3)).toEqual([a(1, 0), a(2, 0), a(3, 0)]);
  });
});
