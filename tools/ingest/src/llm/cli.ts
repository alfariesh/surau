// CLI kerja LLM S13 (dari root: `pnpm llm <perintah>`). Semua perintah membaca baris korpus yang
// dibangun ulang dari sumber (drive Shamela, T-09), jadi unit kerjanya sama persis dengan yang dipakai
// ingest. Kunci API dibaca dari `.env` (T-11) hanya oleh perintah yang memanggil API; nilainya tidak
// pernah dicetak.
//   tokens [--n 200]          ukur token Arab Claude (count_tokens, gratis) → laporan + faktor
//   sample                    uji kecil lewat API biasa: 20 paragraf + 5 bagian (berbayar, ±$0,05)
//   plan [--round 1|2]        susun semua request + count_tokens (gratis) + estimasi biaya
//   submit --round 1|2 [--kind translation|summary-r1|summary-r2] [--limit N] [--confirm]
//                             kirim batch (berbayar; tanpa --confirm hanya ringkasan); bertahap
//                             dengan --kind/--limit
//   status                    status batch yang sudah dikirim
//   wait                      tunggu semua batch terbuka selesai (poll tiap menit)
//   collect                   unduh hasil batch yang selesai, validasi, simpan yang lolos
//   retry [--confirm]         kirim ulang yang gagal (refusal → Sonnet 5.5), maks. 3 percobaan
//   report                    tulis laporan data/reports/ihya-9472-terjemahan.md + sampel QA
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { createAnthropic } from "@surau/llm";
import type Anthropic from "@anthropic-ai/sdk";

import { expectedRows } from "../pipeline.ts";
import type { PipelinePaths } from "../pipeline.ts";
import { QURAN_EXPECT, QURAN_FILES } from "../quran/source.ts";
import type { CorpusRows } from "../rows.ts";
import { IHYA } from "../works/ihya.ts";
import { runCollect, runPlan, runRetry, runStatus, runSubmit, runWait } from "./batch.ts";
import { runReport } from "./report.ts";
import { runSample } from "./sample.ts";
import { batchKind } from "./store.ts";
import { runTokens } from "./tokens.ts";

const repo = resolve(import.meta.dirname, "../../../..");

export interface LlmContext {
  repo: string;
  rows: () => CorpusRows;
  client: () => Anthropic;
}

function context(shamelaArg: string | undefined): LlmContext {
  let rows: CorpusRows | null = null;
  let client: Anthropic | null = null;
  return {
    repo,
    rows: () => {
      if (rows !== null) return rows;
      const shamela = resolve(
        shamelaArg ?? process.env.SURAU_SHAMELA_ROOT ?? "/Volumes/Elfariesh/database",
      );
      if (!existsSync(join(shamela, "book"))) {
        throw new Error(`Data Shamela tidak ditemukan di ${shamela}. Pasang drive Shamela (T-09).`);
      }
      const paths: PipelinePaths = {
        repo,
        shamela,
        openiti: join(repo, "data/raw/openiti"),
        build: join(repo, "data/build"),
        migrations: join(repo, "packages/db/migrations/corpus"),
        quran: { root: join(repo, "data/raw"), files: QURAN_FILES, expect: QURAN_EXPECT },
      };
      rows = expectedRows(IHYA, paths);
      return rows;
    },
    client: () => {
      if (client !== null) return client;
      const env = join(repo, ".env");
      if (!existsSync(env))
        throw new Error("File .env tidak ada. Kerjakan T-11 (kunci surau-dev).");
      process.loadEnvFile(env);
      const key = process.env.ANTHROPIC_API_KEY;
      if (key === undefined || key === "") {
        throw new Error(".env tidak memuat ANTHROPIC_API_KEY. Ulangi langkah 3 T-11.");
      }
      client = createAnthropic(key);
      return client;
    },
  };
}

async function main(argv: string[]): Promise<number> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      shamela: { type: "string" },
      n: { type: "string" },
      round: { type: "string" },
      kind: { type: "string" },
      limit: { type: "string" },
      confirm: { type: "boolean", default: false },
    },
  });
  const ctx = context(values.shamela);
  const round = values.round === "2" ? 2 : 1;
  switch (positionals[0]) {
    case "tokens":
      return runTokens(ctx, Number(values.n ?? 200));
    case "sample":
      return runSample(ctx);
    case "plan":
      return runPlan(ctx, round);
    case "submit": {
      const kind = batchKind.optional().parse(values.kind);
      const limit = values.limit === undefined ? undefined : Number(values.limit);
      if (limit !== undefined && !(Number.isInteger(limit) && limit > 0)) {
        throw new Error(`--limit bukan bilangan bulat positif: ${values.limit}`);
      }
      return runSubmit(ctx, round, values.confirm, {
        ...(kind === undefined ? {} : { kind }),
        ...(limit === undefined ? {} : { limit }),
      });
    }
    case "wait":
      return runWait(ctx);
    case "status":
      return runStatus(ctx);
    case "collect":
      return runCollect(ctx);
    case "retry":
      return runRetry(ctx, values.confirm);
    case "report":
      return runReport(ctx);
    default:
      console.error(
        "Pakai: pnpm llm tokens|sample|plan|submit|status|wait|collect|retry|report [--round 1|2] [--kind …] [--limit N] [--confirm]",
      );
      return 2;
  }
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
