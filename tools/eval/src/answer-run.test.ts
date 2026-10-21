import type { EvalQuestion } from "@surau/core";
import type { D1Db, D1Statement } from "@surau/db";
import { JAWAB_PIPELINE_VERSION } from "@surau/llm";
import type { JawabResult } from "@surau/llm";
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, test } from "vite-plus/test";

import {
  FALLBACK_TEXT,
  canRun,
  questionCeilingUsd,
  runQuestions,
  toEvalAnswer,
} from "./answer-run.ts";
import { limitD1 } from "./open-corpus.ts";

function result(over: Partial<JawabResult> = {}): JawabResult {
  return {
    outcome: "answer",
    reason: null,
    text: "Menurut al-Ghazali dalam Ihya (j. 1, h. 55), kasih sayang guru.",
    blocks: [],
    citations: [
      {
        n: 1,
        passage_id: 10000629,
        char_start: 0,
        char_end: 50,
        kind: "body",
        label: "",
        permalink: "",
      },
    ],
    hadith: [],
    search: [{ passage_id: 10000001, char_start: 0, char_end: 20, label: "", permalink: "" }],
    model: "claude-haiku-5-5",
    prompt_version: "answer@5+answer-route@2",
    corpus_version: "ihya-uji",
    cost_usd: 0.003,
    latency_ms: 1000,
    usage: {
      requests: 2,
      input_tokens: 1,
      output_tokens: 1,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
      costUsd: 0.003,
    },
    diagnostics: {} as JawabResult["diagnostics"],
    ...over,
  };
}
const item = (id: string) => ({
  question: { id, pertanyaan: `Soal ${id}?` } as EvalQuestion,
  private: false,
});

describe("pagu eval", () => {
  test("biaya terburuk per soal + cadangan Sonnet per soal berjalan", () => {
    const c = questionCeilingUsd();
    expect(c.haiku).toBeGreaterThan(0.005);
    expect(c.haiku).toBeLessThan(0.02);
    expect(c.sonnetReserve).toBeGreaterThan(0.1);
    const per = c.haiku + c.sonnetReserve;
    expect(canRun(0, 0, per)).toBe(true);
    expect(canRun(0, 1, per * 1.5)).toBe(false);
    expect(canRun(0.01, 0, per)).toBe(false);
  });

  test("runner menunggu soal berjalan selesai alih-alih berhenti, dan galat satu soal tidak menghentikan run", async () => {
    const per = questionCeilingUsd().haiku + questionCeilingUsd().sonnetReserve;
    let active = 0;
    let maxActive = 0;
    const items = ["j001", "j002", "j003", "j004"].map(item);
    const out = await runQuestions({} as D1Db, {} as Anthropic, items, {
      budgetUsd: per * 2 + 0.05,
      concurrency: 4,
      run: async (q) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 5));
        active--;
        if (q.includes("j003")) throw new Error("D1 putus");
        return result();
      },
    });
    expect(maxActive).toBe(2);
    expect(out.outputs).toHaveLength(3);
    expect(out.failed).toBe(1);
    expect(out.skipped).toBe(0);
    // Soal gagal dihitung biaya terburuknya.
    expect(out.spent).toBeGreaterThanOrEqual(per);
  });

  test("pagu di bawah satu soal: tidak ada yang dijalankan", async () => {
    const out = await runQuestions({} as D1Db, {} as Anthropic, [item("j001")], {
      budgetUsd: 0.01,
      concurrency: 2,
      run: async () => result(),
    });
    expect(out.outputs).toHaveLength(0);
    expect(out.skipped).toBe(1);
  });
});

describe("hasil → kontrak eval", () => {
  test("jawaban: teks + sitasi; not_found = refused; fallback = teks baku + hasil Cari", () => {
    expect(toEvalAnswer(result())).toMatchObject({
      mode: "answer",
      refused: false,
      citations: [{ passage_id: 10000629 }],
      prompt_version: `answer@5+answer-route@2+pipeline@${JAWAB_PIPELINE_VERSION}`,
    });
    expect(
      toEvalAnswer(result({ outcome: "not_found", text: "Tidak ditemukan di kitab yang dicakup." }))
        .refused,
    ).toBe(true);
    const fb = toEvalAnswer(result({ outcome: "fallback", reason: "unverified", text: "" }));
    expect(fb.text).toBe(FALLBACK_TEXT);
    expect(fb.citations).toEqual([{ passage_id: 10000001, char_start: 0, char_end: 20 }]);
  });

  test("huruf Arab yang lolos ke teks dibuang sebelum masuk kontrak (Latin saja)", () => {
    const a = toEvalAnswer(result({ text: "Lafaz الصبر dibahas." }));
    expect(a.text).not.toMatch(/\p{Script=Arabic}/u);
  });
});

describe("limitD1", () => {
  test("kueri bersamaan dibatasi; bind dan batch diteruskan", async () => {
    let active = 0;
    let max = 0;
    const slow = async <T>(v: T) => {
      active++;
      max = Math.max(max, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return v;
    };
    const stmt = (q: string, bound: unknown[] = []): D1Statement => ({
      bind: (...v) => stmt(q, v),
      all: () => slow({ results: [{ q, bound }] }),
      first: () => slow({ q, bound }),
    });
    const received: D1Statement[][] = [];
    const db: D1Db = {
      prepare: (q) => stmt(q),
      batch: (list) => {
        received.push(list);
        return slow(list.map(() => ({ results: [] })));
      },
    };
    const limited = limitD1(db, 2);
    const limitedStatements = new WeakSet<D1Statement>();
    const prepare = limited.prepare.bind(limited);
    limited.prepare = (q) => {
      const st = prepare(q);
      limitedStatements.add(st);
      return st;
    };
    const runs = await Promise.all(
      Array.from({ length: 6 }, (_, i) => limited.prepare(`q${i}`).bind(i).all()),
    );
    expect(max).toBe(2);
    expect(runs[3]).toEqual({ results: [{ q: "q3", bound: [3] }] });
    expect(await limited.batch([limited.prepare("a"), limited.prepare("b")])).toHaveLength(2);
    // batch menerima statement asli (dibuka dari bungkusnya), bukan bungkus limitD1.
    const raws = received.at(-1) ?? [];
    expect(raws).toHaveLength(2);
    expect(raws.every((x) => !limitedStatements.has(x))).toBe(true);
  });
});
