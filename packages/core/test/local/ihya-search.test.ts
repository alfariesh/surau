// Tes regresi recall pencarian Arab (S11, langkah 7) terhadap Ihya di D1 lokal: 18 kueri riset
// (docs/riset/2026-10-15-pencarian-arab/queries.json). Gold dibangun ULANG dari DB lokal dengan
// definisi regex di file itu (bukan angka tersalin), lalu dibandingkan dengan halaman yang dikenai
// indeks FTS lewat ekspresi MATCH yang sama dengan searchText. Syarat: recall per kueri ≥ angka riset
// dan total halaman di luar gold ≤ 10 (riset: 6). Gold regex BUKAN penilaian relevansi manusia.
// Dilewati bila state D1 lokal tidak ada (CI), Ihya belum dimuat, atau korpus belum punya indeks
// (`pnpm ingest ihya && pnpm corpus:load:local`). State disalin ke folder sementara (ARSITEKTUR §7).
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type { D1Db } from "@surau/db";
import { buildFtsMatch, expandQueryToken, normalizeArabic, stemToken } from "@surau/text";
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";
import { z } from "zod";

import { Unavailable, searchText } from "../../src/index.ts";

const repo = resolve(import.meta.dirname, "../../../..");
const state = join(repo, ".wrangler/state/v3");
const hasState = existsSync(join(state, "d1"));

const queriesFile = z.object({
  queries: z.array(
    z.object({ id: z.string(), query: z.string(), gold_halaman: z.number(), recall: z.number() }),
  ),
});
const { queries } = queriesFile.parse(
  JSON.parse(
    readFileSync(join(repo, "docs/riset/2026-10-15-pencarian-arab/queries.json"), "utf8"),
  ) as unknown,
);

/** Batas total halaman di luar gold untuk 18 kueri (Selesai bila S11: maksimal ±10). */
const MAX_OUTSIDE_GOLD = 10;

// Definisi gold (queries.json `gold_definisi`): token cocok pola klitik setelah normalizeArabic.
const KUNYA = /^(?:[وف])?(?:ل)?(?:ابو|ابي|ابا)$/u;
const cliticPattern = (stem: string): RegExp =>
  new RegExp(`^(?:[وف])?(?:(?:[بكل])?(?:ال)?|لل)${stem}$`, "u");

/** Predikat per posisi token frasa gold untuk satu kueri (q05: kunyah lalu token persis). */
function goldMatchers(query: string): RegExp[] {
  const tokens = normalizeArabic(query).text.split(" ");
  const [first = "", ...rest] = tokens;
  if (rest.length > 0 && KUNYA.test(first)) {
    return [KUNYA, ...rest.map((t) => new RegExp(`^${t}$`, "u"))];
  }
  return tokens.map((t) => cliticPattern(stemToken(t)));
}

describe.skipIf(!hasState)("pencarian Ihya di D1 lokal (regresi recall 18 kueri riset)", () => {
  let db: D1Db;
  let dispose: (() => Promise<void>) | undefined;
  let tmp: string | undefined;
  let ready = false;
  /** Token ternormalisasi per halaman (gold dihitung per halaman, seperti riset). */
  const pageTokens = new Map<number, string[][]>();

  beforeAll(async () => {
    tmp = mkdtempSync(join(tmpdir(), "surau-core-search-"));
    cpSync(join(state, "d1"), join(tmp, "v3", "d1"), { recursive: true });
    const { getPlatformProxy } = await import("wrangler");
    const proxy = await getPlatformProxy<{ CORPUS: D1Db }>({
      configPath: join(repo, "packages/db/wrangler.jsonc"),
      remoteBindings: false,
      persist: { path: join(tmp, "v3") },
    });
    dispose = proxy.dispose;
    db = proxy.env.CORPUS;
    ready = await searchText(db, "الصبر").then(
      (v) => v.results.length > 0,
      (e: unknown) => {
        if (e instanceof Unavailable || (e instanceof Error && /no such table/.test(e.message))) {
          return false;
        }
        throw e;
      },
    );
    if (!ready) return;
    const row = z.object({ id: z.number(), page_id: z.number(), text_raw: z.string() });
    for (let from = 0; ; from += 5000) {
      const { results } = await db
        .prepare("SELECT id, page_id, text_raw FROM passage ORDER BY id LIMIT 5000 OFFSET ?")
        .bind(from)
        .all();
      for (const r of results.map((x) => row.parse(x))) {
        const list = pageTokens.get(r.page_id) ?? [];
        list.push(normalizeArabic(r.text_raw).text.split(" "));
        pageTokens.set(r.page_id, list);
      }
      if (results.length < 5000) break;
    }
  }, 120_000);

  afterAll(async () => {
    await dispose?.();
    if (tmp !== undefined) rmSync(tmp, { recursive: true, force: true });
  });

  function goldPages(query: string): Set<number> {
    const m = goldMatchers(query);
    const out = new Set<number>();
    for (const [page, paragraphs] of pageTokens) {
      const hit = paragraphs.some((toks) =>
        toks.some(
          (_, i) => i + m.length <= toks.length && m.every((re, k) => re.test(toks[i + k] ?? "")),
        ),
      );
      if (hit) out.add(page);
    }
    return out;
  }

  async function hitPages(query: string): Promise<Set<number>> {
    const { results } = await db
      .prepare(
        `SELECT DISTINCT p.page_id FROM passage_fts f JOIN passage p ON p.id = f.rowid
         WHERE passage_fts MATCH ?`,
      )
      .bind(buildFtsMatch(query) ?? "")
      .all();
    return new Set(results.map((r) => z.object({ page_id: z.number() }).parse(r).page_id));
  }

  test("recall per kueri ≥ angka riset; total hit di luar gold ≤ 10", async ({ skip }) => {
    skip(
      !ready,
      "Korpus lokal belum punya indeks pencarian (pnpm ingest ihya && pnpm corpus:load:local)",
    );
    const report: string[] = [];
    let outside = 0;
    for (const q of queries) {
      const gold = goldPages(q.query);
      const hits = await hitPages(q.query);
      const found = [...gold].filter((p) => hits.has(p)).length;
      const recall = gold.size === 0 ? 1 : found / gold.size;
      const extra = [...hits].filter((p) => !gold.has(p)).length;
      outside += extra;
      // searchText melaporkan jumlah halaman yang sama dengan himpunan hit FTS.
      const view = await searchText(db, q.query, { limit: 1 });
      // Kueri riset semuanya bermakna: tidak boleh turun ke mode kata umum (mis. karena ambang
      // `term_stat` atau aturan pengaman berubah).
      expect(view.ranked, q.id).toBe(true);
      expect(view.total_pages, q.id).toBe(hits.size);
      report.push(
        `${q.id} ${q.query}: gold ${gold.size} (riset ${q.gold_halaman}), hit ${hits.size}, recall ${recall.toFixed(3)}, luar gold ${extra}`,
      );
      expect(recall, `${q.id} ${q.query}`).toBeGreaterThanOrEqual(q.recall);
    }
    console.info(
      `Recall 18 kueri (gold dibangun ulang dari D1 lokal):\n${report.join("\n")}\nTotal di luar gold: ${outside}`,
    );
    expect(outside).toBeLessThanOrEqual(MAX_OUTSIDE_GOLD);
  }, 120_000);

  test("الصبر: halaman teratas di Kitab ash-Shabr (j. 4 h. 72), sorotan = teks sumber", async ({
    skip,
  }) => {
    skip(!ready, "Korpus lokal belum punya indeks pencarian");
    const view = await searchText(db, "الصبر", { limit: 5 });
    expect(view.results[0]?.citation).toMatchObject({ juz: 4, page_no: 72 });
    for (const hit of view.results.flatMap((p) => p.hits)) {
      const { results } = await db
        .prepare("SELECT text_raw FROM passage WHERE id = ?")
        .bind(hit.id)
        .all();
      const raw = z.object({ text_raw: z.string() }).parse(results[0]).text_raw;
      expect(hit.snippet.text).toBe(raw.slice(hit.snippet.char_start, hit.snippet.char_end));
      for (const h of hit.highlights) {
        const stem = stemToken(normalizeArabic(raw.slice(h.char_start, h.char_end)).text);
        expect(expandQueryToken("صبر")).toContain(stem);
      }
    }
  });

  test("الله: hanya kata sangat umum → peringatan dan hasil terbatas, bukan beban penuh", async ({
    skip,
  }) => {
    skip(!ready, "Korpus lokal belum punya indeks pencarian");
    const view = await searchText(db, "الله");
    expect(view).toMatchObject({ ranked: false, warning: "common_terms", total_pages: null });
    expect(view.common_terms[0]?.term).toBe("الله");
    expect(view.results.flatMap((p) => p.hits)).toHaveLength(20);
    // Celah awalan (temuan peninjau): الل + expand = "الل"* mengenai الله → tetap dijaga.
    const prefix = await searchText(db, "الل", { expand: true });
    expect(prefix).toMatchObject({ ranked: false, warning: "common_terms" });
    expect(prefix.common_terms.map((t) => t.term)).toContain("الله");
  });
});
