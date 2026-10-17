// Uji ujung-ke-ujung pemuatan hasil batch LLM ke korpus (S13) dengan kitab dan mushaf BUATAN
// (test/fixture.ts, test/quran-fixture.ts). Terjemahan di sini kalimat karangan, bukan keluaran model.
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { contentLength } from "@surau/llm";
import { describe, expect, test } from "vite-plus/test";

import { llmRows } from "../src/llm/attach.ts";
import { writeJsonl } from "../src/llm/store.ts";
import type { AcceptedSummary, AcceptedTranslation } from "../src/llm/store.ts";
import { buildWork, chunkCustomId, round2InputSha } from "../src/llm/work.ts";
import type { TranslationUnit } from "../src/llm/units.ts";
import { expectedRows, runIngest } from "../src/pipeline.ts";
import { createFixture } from "./fixture.ts";

const env = { SOURCE_DATE_EPOCH: "1760000000" };
const usage = {
  input_tokens: 10,
  output_tokens: 20,
  cache_read_input_tokens: null,
  cache_creation_input_tokens: null,
  cache_creation: null,
};

/** Terjemahan karangan yang lolos validasi: panjang wajar, semua placeholder dan penanda ada. */
function fakeTranslation(u: TranslationUnit): string {
  const target = Math.max(40, contentLength(u.masked.text) * 2);
  let text = "";
  while (text.length < target) text += "Ini kalimat Indonesia buatan untuk pengujian. ";
  const placeholders = u.masked.slots.map((s) => s.placeholder).join(" ");
  const markers = u.markers.map((m) => `(${m})`).join(" ");
  return `${text}${placeholders} ${markers}`.trim();
}

function translationLine(
  u: TranslationUnit,
  text: string,
  sha = u.sourceSha256,
): AcceptedTranslation {
  return {
    passage_id: u.passageId,
    lang: "id",
    text,
    model: "claude-haiku-5-5",
    prompt_version: "translate-passage@2",
    created_at: "2026-10-17T00:00:00Z",
    source_sha256: sha,
    batch_id: "msgbatch_uji",
    markers_missing: [],
    usage,
  };
}

function setup() {
  const { config, paths } = createFixture();
  // Ingest pertama tanpa hasil LLM: membuat peta ID, supaya expectedRows bisa dipakai.
  expect(runIngest(config, paths, { env }).output).toBeDefined();
  const rows = expectedRows(config, paths, env);
  const work = buildWork(rows);
  const llm = mkdtempSync(join(tmpdir(), "surau-llm-"));
  mkdirSync(llm, { recursive: true });
  return { config, paths, rows, work, llm };
}

describe("hasil LLM → tabel translation/summary", () => {
  test("terjemahan dan ringkasan yang sah dimuat; usang dan tidak sah ditolak", () => {
    const { config, paths, work, llm } = setup();
    const units = [...work.units.values()];
    const withAyah = units.find((u) => u.masked.slots.length > 0);
    expect(withAyah, "fixture punya paragraf badan berisi ayat").toBeDefined();
    const [stale, broken, ...ok] = units.filter((u) => u !== withAyah);
    if (withAyah === undefined || stale === undefined || broken === undefined)
      throw new Error("fixture");
    writeJsonl(join(llm, "translation.jsonl"), [
      translationLine(withAyah, fakeTranslation(withAyah)),
      ...ok.map((u) => translationLine(u, fakeTranslation(u))),
      // Hash sumber lama: teks/rujukan berubah sesudah batch → tidak dimuat.
      translationLine(stale, fakeTranslation(stale), "0".repeat(64)),
      // Lolos saat dikumpulkan tetapi kini placeholder-nya tidak cocok → tidak dimuat.
      translationLine(broken, `${fakeTranslation(broken)} ⟦QS 1:1⟧`),
    ]);
    const text = {
      id: "al-Ghazali menjelaskan bahwa ilmu yang benar menuntun kepada amal dan keikhlasan.",
      en: "al-Ghazali explains that the true knowledge leads to practice and sincerity of the heart.",
    };
    const base = {
      model: "claude-haiku-5-5",
      prompt_version: "summarize-section@2",
      created_at: "2026-10-17T00:00:00Z",
      batch_id: "msgbatch_uji",
      usage,
    };
    // Ringkasan putaran 1 semua potongan (masukan putaran 2).
    const r1: AcceptedSummary[] = work.chunks.flatMap((c) =>
      (["id", "en"] as const).map((lang) => ({
        ...base,
        custom_id: chunkCustomId(c, lang),
        toc_node_id: c.tocNodeId,
        lang,
        part: c.final ? null : c.part,
        round: 1 as const,
        text: text[lang],
        source_sha256: c.sourceSha256,
        input_sha256: null,
      })),
    );
    writeJsonl(join(llm, "summary-r1.jsonl"), r1);
    const r1Map = new Map(r1.map((s) => [s.custom_id, s]));
    const summaries: AcceptedSummary[] = work.nodes.flatMap((n) =>
      (["id", "en"] as const).map((lang) => ({
        ...base,
        custom_id: `toc-${n.tocNodeId}-${lang}${n.round2 ? "-r2" : ""}`,
        toc_node_id: n.tocNodeId,
        lang,
        part: null,
        round: n.round2 ? (2 as const) : (1 as const),
        text: text[lang],
        source_sha256: n.round2 ? n.sourceSha256 : (n.subtree[0]?.sourceSha256 ?? ""),
        input_sha256: n.round2 ? round2InputSha(n, lang, r1Map) : null,
      })),
    );
    expect(
      summaries.some((s) => s.round === 2),
      "fixture punya simpul putaran 2",
    ).toBe(true);
    writeJsonl(join(llm, "summary.jsonl"), summaries);

    const r = runIngest(config, { ...paths, llm }, { env });
    expect(r.validation.invariants.filter((i) => !i.ok)).toEqual([]);
    const ayahCheck = r.validation.invariants.find((i) => i.name.includes("Kemenag"));
    expect(ayahCheck).toMatchObject({ ok: true });
    expect(ayahCheck?.detail).toMatch(/^1 terjemahan berisi ayat; 0 bermasalah/);
    expect(r.output?.counts.translation).toBe(units.length - 2);
    expect(r.output?.counts.summary).toBe(work.nodes.length * 2);

    const db = new DatabaseSync(r.output?.sqlite ?? "", { readOnly: true });
    const row = db
      .prepare(
        "SELECT text, model, prompt_version, review_status FROM translation WHERE passage_id = ?",
      )
      .get(withAyah.passageId) as Record<string, string>;
    // Placeholder ayat tetap di translation.text (S12): terjemahannya Kemenag saat tampil.
    expect(row.text).toContain(withAyah.masked.slots[0]?.placeholder ?? "?");
    expect(row).toMatchObject({
      model: "claude-haiku-5-5",
      prompt_version: "translate-passage@2",
      review_status: "ai_generated",
    });
    const missing = db
      .prepare("SELECT COUNT(*) AS n FROM translation WHERE passage_id IN (?, ?)")
      .get(stale.passageId, broken.passageId) as { n: number };
    expect(missing.n).toBe(0);
    db.close();
  });

  test("ringkasan putaran 2 dari masukan putaran 1 yang sudah berubah tidak dimuat", () => {
    const { rows, work, llm } = setup();
    const n = work.nodes.find((x) => x.round2);
    if (n === undefined) throw new Error("fixture tanpa simpul putaran 2");
    const r1: AcceptedSummary[] = n.subtree.map((c) => ({
      custom_id: chunkCustomId(c, "id"),
      toc_node_id: c.tocNodeId,
      lang: "id",
      part: c.final ? null : c.part,
      round: 1,
      text: "al-Ghazali menjelaskan bahwa ilmu yang benar menuntun kepada amal dan keikhlasan.",
      model: "claude-haiku-5-5",
      prompt_version: "summarize-section@2",
      created_at: "t",
      source_sha256: c.sourceSha256,
      input_sha256: null,
      batch_id: "b",
      usage,
    }));
    writeJsonl(join(llm, "summary-r1.jsonl"), r1);
    const r2 = (input: string | null): AcceptedSummary => ({
      ...(r1[0] as AcceptedSummary),
      custom_id: `toc-${n.tocNodeId}-id-r2`,
      toc_node_id: n.tocNodeId,
      part: null,
      round: 2,
      source_sha256: n.sourceSha256,
      input_sha256: input,
    });
    writeJsonl(join(llm, "summary.jsonl"), [r2("0".repeat(64))]);
    expect(llmRows(rows, llm).stats).toMatchObject({ summaries: 0, staleSummaries: 1 });
    writeJsonl(join(llm, "summary.jsonl"), [
      r2(round2InputSha(n, "id", new Map(r1.map((s) => [s.custom_id, s])))),
    ]);
    expect(llmRows(rows, llm).stats).toMatchObject({ summaries: 1, staleSummaries: 0 });
  });

  test("cakupan di bawah harapan → ingest gagal", () => {
    const { config, paths, llm } = setup();
    const r = runIngest(
      { ...config, expect: { ...config.expect, llmCoverage: 0.99 } },
      { ...paths, llm },
      { env },
    );
    expect(r.output).toBeUndefined();
    expect(r.validation.invariants.filter((i) => !i.ok).map((i) => i.name)).toEqual([
      "Terjemahan AI: cakupan paragraf badan ≥ 99%",
      "Ringkasan AI: cakupan bagian × 2 bahasa ≥ 99%",
    ]);
  });

  test("terjemahan Kemenag yang hilang untuk ayat yang dirujuk tertangkap pemeriksaan ayat", () => {
    const { rows, work, llm } = setup();
    const u = [...work.units.values()].find((x) => x.masked.slots.length > 0);
    if (u === undefined) throw new Error("fixture");
    writeJsonl(join(llm, "translation.jsonl"), [translationLine(u, fakeTranslation(u))]);
    const ref = u.masked.slots[0]?.ref;
    const without = {
      ...rows,
      quran_translation: rows.quran_translation.filter(
        (t) =>
          !(t.surah === ref?.surah && t.ayah === ref?.ayah_from && t.source_id === "kemenag-id"),
      ),
    };
    const { stats } = llmRows(without, llm);
    expect(stats.translations).toBe(1);
    expect(stats.ayahProblems).toHaveLength(1);
  });
});
