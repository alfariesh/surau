// `pnpm llm intisari <perintah>` (X15b, ADR-098). Sumber korpus: build lokal dari drive Shamela
// (T-28, bawaan) atau `--from staging` (SELECT saja; wajib `--kitab`). Perintah:
//   plan --stage leaf|merge|book [--banding]   susun request tertunda + count_tokens (gratis)
//   submit --stage … [--limit N] --budget USD --confirm   kirim batch (berbayar, izin pemilik)
//   status · wait · reconcile [--id BATCH]     status batch / tunggu / pulihkan kiriman terputus
//   collect · rejudge                          unduh + nilai ulang hasil (gratis)
//   retry --budget USD --confirm               ulangi yang gagal (Haiku → Sonnet 5.5)
//   report                                     laporan + halaman QA pemilik (T-31)
//   muat-staging [--confirm]                   muat Intisari pilot ke surau-corpus-staging
// `--banding`: Intisari Kitab juga dibuat Haiku 5.5 sebagai pembanding (pilot).
import { z } from "zod";

import { IHYA } from "../works/ihya.ts";
import type { LlmContext } from "./cli.ts";
import {
  runDigestCollect,
  runDigestPlan,
  runDigestReconcile,
  runDigestRejudge,
  runDigestRetry,
  runDigestStatus,
  runDigestSubmit,
  runDigestWait,
} from "./digest-batch.ts";
import type { DigestContext } from "./digest-batch.ts";
import { runDigestReport } from "./digest-report.ts";
import { loadPilotToStaging, openStaging, stagingCorpus } from "./digest-staging.ts";
import type { StagingRows } from "./digest-staging.ts";
import { digestDir } from "./digest-store.ts";
import { digestPlan } from "./digest-units.ts";
import { readSubheadings } from "./titles.ts";

export interface IntisariArgs {
  command: string | undefined;
  from: string | undefined;
  kitab: string | undefined;
  stage: string | undefined;
  lang: string | undefined;
  budget: string | undefined;
  limit: string | undefined;
  id: string | undefined;
  confirm: boolean;
  compare: boolean;
}

export const INTISARI_USAGE =
  "Pakai: pnpm llm intisari plan|submit|status|wait|collect|rejudge|retry|reconcile|report|muat-staging [--from staging --kitab <toc_node_id>] [--stage leaf|merge|book] [--banding] [--lang id] [--limit N] [--budget USD] [--confirm]";

export async function runIntisari(ctx: LlmContext, args: IntisariArgs): Promise<number> {
  // Validasi di batas CLI (KONVENSI): nilai salah ditolak, bukan diam-diam diganti.
  const from = z.enum(["staging"]).optional().parse(args.from);
  const kitab = z.coerce.number().int().positive().optional().parse(args.kitab);
  z.literal("id").default("id").parse(args.lang);
  if (from === "staging" && kitab === undefined) {
    throw new Error("--from staging wajib bersama --kitab <toc_node_id> (pilot satu kitab).");
  }
  let loaded: ReturnType<DigestContext["load"]> | null = null;
  const subheadings = readSubheadings(ctx.repo, IHYA);
  const load: DigestContext["load"] = () => {
    loaded ??= (async () => {
      if (from === "staging" && kitab !== undefined) {
        const { db, dispose } = await openStaging(ctx.repo);
        try {
          const rows = await stagingCorpus(db, kitab);
          return {
            rows,
            plan: digestPlan(rows, { scope: kitab, subheadings }),
            source: `staging ${rows.meta.corpus_version ?? "?"} (SELECT)`,
          };
        } finally {
          await dispose();
        }
      }
      const rows = ctx.rows();
      return {
        rows,
        plan: digestPlan(rows, { ...(kitab === undefined ? {} : { scope: kitab }), subheadings }),
        source: "build lokal (drive Shamela, T-28)",
      };
    })();
    return loaded;
  };
  const dctx: DigestContext = { dir: digestDir(ctx.repo), load, client: ctx.client };
  const stage = () => z.enum(["leaf", "merge", "book"]).parse(args.stage);
  const budget = z.coerce.number().positive().max(5).optional().parse(args.budget);
  const limit = z.coerce.number().int().positive().optional().parse(args.limit);
  switch (args.command) {
    case "plan":
      return runDigestPlan(dctx, stage(), { compare: args.compare });
    case "submit":
      return runDigestSubmit(dctx, stage(), args.confirm, {
        compare: args.compare,
        ...(budget === undefined ? {} : { budget }),
        ...(limit === undefined ? {} : { limit }),
      });
    case "status":
      return runDigestStatus(dctx);
    case "wait":
      return runDigestWait(dctx);
    case "reconcile":
      return runDigestReconcile(dctx, args.id);
    case "collect":
      return runDigestCollect(dctx);
    case "rejudge":
      return runDigestRejudge(dctx);
    case "retry":
      return runDigestRetry(dctx, args.confirm, budget === undefined ? {} : { budget });
    case "report":
      return runDigestReport(dctx, ctx.repo);
    case "muat-staging": {
      if (from !== "staging")
        throw new Error("muat-staging hanya untuk --from staging --kitab <id>.");
      const { rows, plan } = await load();
      return loadPilotToStaging(ctx.repo, rows as StagingRows, plan, dctx.dir, args.confirm);
    }
    default:
      console.error(INTISARI_USAGE);
      return 2;
  }
}
