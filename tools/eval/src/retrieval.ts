// `pnpm run eval:retrieval` (S15): jalankan setiap soal ke `searchText` atas D1 korpus, lalu
// tulis laporan Markdown ke evals/reports/. Tanpa LLM, hanya SELECT.
//
//   pnpm run eval:retrieval                 D1 lokal (salinan <root>/.wrangler/state/v3, ARSITEKTUR §7)
//   pnpm run eval:retrieval --remote        D1 staging lewat remote binding (CI; butuh token Cloudflare)
//   … --label baseline                      akhiran nama berkas laporan
//   … --gate                                keluar 2 bila set resmi belum lolos gerbang R2 (/rilis);
//                                           wajib ada soal privat kecuali --publik-saja
//   … --publik-saja                         tanpa soal privat (mis. CI yang tidak bisa mengunduhnya)
//   … --summary <berkas>                    tambahkan laporan ke berkas (mis. $GITHUB_STEP_SUMMARY)
//   … --no-write                            jangan tulis berkas laporan
//
// Soal publik: evals/retrieval/*.jsonl. Soal privat (holdout): evals/private/retrieval.jsonl bila
// ada (git-ignored; salinan di R2 `surau-evals`, lihat evals/README.md).
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { SEARCH_RESULT_VERSION, searchText } from "@surau/core";
import type { D1Db } from "@surau/db";

import { loadCorpusIndex, resolveGold } from "./corpus.ts";
import { mergeSets, parseJsonl } from "./dataset.ts";
import type { LoadedQuestion } from "./dataset.ts";
import { DEPTH, R2_MIN_OFFICIAL, aggregate, judge, passesR2Gate } from "./metrics.ts";
import { officialRuns, renderReport } from "./report.ts";
import type { QuestionRun } from "./report.ts";
import { resultPages, summarize } from "./view.ts";

const repo = resolve(import.meta.dirname, "../../..");

const PRIVATE_FILE = "evals/private/retrieval.jsonl";

function loadQuestions(opts: { publicOnly: boolean; gate: boolean }): LoadedQuestion[] {
  const dir = join(repo, "evals/retrieval");
  const pub = readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .toSorted()
    .flatMap((f) =>
      parseJsonl(readFileSync(join(dir, f), "utf8"), `evals/retrieval/${f}`, "publik"),
    );
  if (opts.publicOnly) return mergeSets(pub);
  const privFile = join(repo, PRIVATE_FILE);
  if (!existsSync(privFile)) {
    if (opts.gate) {
      throw new Error(
        `--gate butuh ${PRIVATE_FILE} (unduh dari R2, lihat evals/README.md), atau tambahkan --publik-saja`,
      );
    }
    return mergeSets(pub);
  }
  const priv = parseJsonl(readFileSync(privFile, "utf8"), PRIVATE_FILE, "privat");
  if (opts.gate && priv.length === 0) {
    throw new Error(`--gate butuh soal privat, tetapi ${PRIVATE_FILE} kosong`);
  }
  return mergeSets(pub, priv);
}

/** Commit kode; `-dirty` bila ada perubahan yang belum di-commit (laporan harus bisa diulang). */
function gitSha(): string {
  try {
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
    // Berkas baru yang belum di-commit (mis. soal JSONL) juga membuat laporan tidak bisa diulang.
    const dirty = git("status", "--porcelain") !== "";
    return `${git("rev-parse", "--short", "HEAD")}${dirty ? "-dirty" : ""}`;
  } catch {
    return "?";
  }
}

async function openCorpus(remote: boolean) {
  const { getPlatformProxy } = await import("wrangler");
  const configPath = join(repo, "tools/eval/wrangler.jsonc");
  if (remote) {
    const proxy = await getPlatformProxy<{ CORPUS: D1Db }>({ configPath, remoteBindings: true });
    return { db: proxy.env.CORPUS, source: "staging (remote)", dispose: proxy.dispose };
  }
  const state = join(repo, ".wrangler/state/v3");
  if (!existsSync(join(state, "d1"))) {
    throw new Error(
      "D1 lokal belum ada: jalankan `pnpm run db:migrate:local` lalu `pnpm corpus:load:local`.",
    );
  }
  // Salinan: proxy lain (pnpm dev) pada state yang sama bisa SQLITE_BUSY, dan eval tidak menulis.
  const tmp = mkdtempSync(join(tmpdir(), "surau-eval-"));
  cpSync(join(state, "d1"), join(tmp, "v3", "d1"), { recursive: true });
  const proxy = await getPlatformProxy<{ CORPUS: D1Db }>({
    configPath,
    remoteBindings: false,
    persist: { path: join(tmp, "v3") },
  });
  return {
    db: proxy.env.CORPUS,
    source: "lokal",
    dispose: async () => {
      await proxy.dispose();
      rmSync(tmp, { recursive: true, force: true });
    },
  };
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      remote: { type: "boolean", default: false },
      label: { type: "string" },
      gate: { type: "boolean", default: false },
      summary: { type: "string" },
      "no-write": { type: "boolean", default: false },
      "publik-saja": { type: "boolean", default: false },
    },
  });
  const questions = loadQuestions({ publicOnly: values["publik-saja"], gate: values.gate });
  const corpus = await openCorpus(values.remote);
  const runs: QuestionRun[] = [];
  let info;
  try {
    const index = await loadCorpusIndex(corpus.db);
    for (const question of questions) {
      const golds = resolveGold(index, question);
      const t0 = performance.now();
      const view = await searchText(corpus.db, question.kueri, { limit: DEPTH });
      const ms = Math.round(performance.now() - t0);
      // Tanpa peringkat (kueri Arab yang semua katanya umum): urutan kitab, `limit` = paragraf.
      // Tidak dinilai sebagai peringkat: dihitung gagal.
      const judged = judge(resultPages(view, index), golds);
      runs.push({
        question,
        judgement: view.ranked ? judged : { rank: null, foundAt10: 0 },
        unranked: !view.ranked,
        goldCount: golds.length,
        paths: view.paths,
        warning: view.warning,
        totalPages: view.total_pages,
        top: summarize(view),
        ms,
      });
    }
    info = {
      date: new Date().toISOString().slice(0, 10),
      source: corpus.source,
      meta: index.meta,
      gitSha: gitSha(),
      searchResultVersion: SEARCH_RESULT_VERSION,
      privateIncluded: questions.some((q) => q.set === "privat"),
    };
  } finally {
    await corpus.dispose();
  }

  const report = renderReport(info, runs);
  const all = aggregate(runs.map((r) => r.judgement.rank));
  const official = aggregate(officialRuns(runs).map((r) => r.judgement.rank));
  const fmt = (x: number) => `${(x * 100).toFixed(1)}%`;
  console.log(
    `eval retrieval (${info.source}, ${info.meta["corpus_version"]}): semua ${all.n} soal hit@1 ${fmt(all.hit1)} · hit@5 ${fmt(all.hit5)} · hit@10 ${fmt(all.hit10)} · MRR ${all.mrr.toFixed(3)}`,
  );
  console.log(
    official.n === 0
      ? "set resmi: belum ada soal disetujui (T-12)"
      : `set resmi ${official.n} soal (perlu ≥ ${R2_MIN_OFFICIAL}): hit@10 ${fmt(official.hit10)} → ${passesR2Gate(official) ? "LOLOS" : "BELUM LOLOS"} gerbang R2`,
  );
  if (!values["no-write"]) {
    const outDir = join(repo, "evals/reports");
    mkdirSync(outDir, { recursive: true });
    const suffix =
      values.label === undefined ? "" : `-${values.label.replace(/[^a-z0-9-]/giu, "-")}`;
    const file = join(
      outDir,
      `retrieval-${info.date}-${info.meta["corpus_version"] ?? "korpus"}${suffix}.md`,
    );
    writeFileSync(file, report);
    console.log(`laporan: ${file.slice(repo.length + 1)}`);
  }
  if (values.summary !== undefined) appendFileSync(values.summary, `${report}\n`);
  // 2 = berjalan tetapi di bawah gerbang; galat (pengecualian) keluar 1.
  return values.gate && !passesR2Gate(official) ? 2 : 0;
}

process.exitCode = await main();
