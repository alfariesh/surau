// `pnpm llm glosarium` (X15b, ADR-098): definisi singkat istilah glosarium berkunci untuk
// `glossary_term`, lewat Messages API biasa (±145 istilah, dua request), pola `runTitleJob`: rencana +
// count_tokens gratis tanpa --confirm; dengan --confirm wajib --budget (pagu TOTAL buku biaya) dan
// berhenti sebelum request yang biaya terburuknya melewati pagu. Hasil di data/build/llm/intisari/.
import { join } from "node:path";

import type Anthropic from "@anthropic-ai/sdk";
import {
  GLOSSARY_GLOSS_GROUP,
  GLOSSARY_GLOSS_MAX_TOKENS,
  GLOSSARY_GLOSS_PROMPT,
  MODELS,
  buildGlossaryGlossRequest,
  costUsd,
  glossProblems,
  glossaryTargets,
  judgeGlossaryGlosses,
  ratesFor,
} from "@surau/llm";
import type { GlossaryEntry } from "@surau/llm";

import { glossEntrySha } from "./digest-attach.ts";
import { GLOSSARY_FILE, GLOSSARY_RUNS_FILE, acceptedGloss, glossaryRun } from "./digest-store.ts";
import { appendJsonl, readJsonl, storedUsage } from "./store.ts";

const fmt = (usd: number) => `US$${usd.toFixed(4)}`;

/** Istilah yang belum punya definisi berlaku (entri berubah = definisi usang). */
export function pendingGlosses(dir: string): GlossaryEntry[] {
  const latest = new Map(
    readJsonl(join(dir, GLOSSARY_FILE), acceptedGloss).map((g) => [g.term_key, g]),
  );
  return glossaryTargets().filter((e) => {
    const g = latest.get(e.key);
    return (
      g === undefined || g.source_sha256 !== glossEntrySha(e) || glossProblems(g.gloss).length > 0
    );
  });
}

export async function runGlossaryJob(
  dir: string,
  client: () => Anthropic,
  opts: { confirm: boolean; budget?: number; now?: () => Date },
): Promise<number> {
  const now = opts.now ?? (() => new Date());
  const model = MODELS.sonnet;
  const rates = ratesFor(model, 0);
  let spent = readJsonl(join(dir, GLOSSARY_RUNS_FILE), glossaryRun).reduce(
    (a, r) => a + r.cost_usd,
    0,
  );
  const pending = pendingGlosses(dir);
  console.info(
    `Glosarium: ${glossaryTargets().length} istilah, tertunda ${pending.length}. Biaya tercatat ${fmt(spent)}.`,
  );
  if (pending.length === 0) return 0;
  if (opts.confirm && opts.budget === undefined) {
    throw new Error("--confirm wajib bersama --budget (pagu total USD).");
  }
  const groups: GlossaryEntry[][] = [];
  for (let i = 0; i < pending.length; i += GLOSSARY_GLOSS_GROUP) {
    groups.push(pending.slice(i, i + GLOSSARY_GLOSS_GROUP));
  }
  const plan = [];
  for (const g of groups) {
    const req = buildGlossaryGlossRequest(g, model);
    const { input_tokens: input } = await client().messages.countTokens({
      model: req.model,
      system: req.system,
      messages: req.messages,
      ...(req.output_config === undefined ? {} : { output_config: req.output_config }),
    });
    const estimate = (input * rates.cacheWrite1h + (g.length * 80 + 1_500) * rates.output) / 1e6;
    const worst = (input * rates.cacheWrite1h + GLOSSARY_GLOSS_MAX_TOKENS * rates.output) / 1e6;
    plan.push({ g, req, input, estimate, worst });
    console.info(
      `  ${g.length} istilah (${g[0]?.key}…${g.at(-1)?.key}), input ${input} token, perkiraan ${fmt(estimate)}, terburuk ${fmt(worst)}`,
    );
  }
  console.info(
    `Perkiraan: ${fmt(plan.reduce((a, p) => a + p.estimate, 0))} (${plan.length} request, ${model}, API biasa).`,
  );
  if (!opts.confirm) {
    console.info("Tanpa --confirm: tidak ada yang dikirim.");
    return pending.length;
  }
  for (const p of plan) {
    if (spent + p.worst > (opts.budget ?? 0)) {
      console.info(
        `BERHENTI: tercatat ${fmt(spent)} + terburuk ${fmt(p.worst)} > pagu ${fmt(opts.budget ?? 0)}.`,
      );
      break;
    }
    const at = now().toISOString();
    const res = await client().messages.create(p.req).withResponse();
    const msg = res.data;
    const cost = costUsd(model, msg.usage, { batch: false });
    spent += cost;
    const wanted = p.g.map((e) => e.key);
    const judged = judgeGlossaryGlosses(msg, wanted);
    const byKey = new Map(p.g.map((e) => [e.key, e]));
    appendJsonl(
      join(dir, GLOSSARY_FILE),
      [...judged.accepted].map(([key, gloss]) => {
        const e = byKey.get(key);
        if (e === undefined) throw new Error(`kunci ${key} tidak diminta`);
        return acceptedGloss.parse({
          term_key: key,
          lang: "id",
          label: e.label,
          gloss,
          model: msg.model,
          prompt_version: GLOSSARY_GLOSS_PROMPT.id,
          created_at: at,
          source_sha256: glossEntrySha(e),
        });
      }),
    );
    appendJsonl(join(dir, GLOSSARY_RUNS_FILE), [
      glossaryRun.parse({
        at,
        model: msg.model,
        prompt_version: GLOSSARY_GLOSS_PROMPT.id,
        request_id: res.request_id ?? null,
        keys: wanted,
        stop_reason: msg.stop_reason,
        usage: storedUsage(msg.usage),
        cost_usd: cost,
        accepted: judged.accepted.size,
        rejected: Object.fromEntries(judged.rejected),
        problems: judged.problems,
      }),
    ]);
    console.info(
      `  terkirim: ${judged.accepted.size}/${wanted.length} lolos, ${msg.stop_reason}, ${msg.usage.input_tokens}+${msg.usage.output_tokens} token, ${fmt(cost)} (total ${fmt(spent)})`,
    );
    for (const [k, why] of judged.rejected) console.info(`    ditolak ${k}: ${why}`);
  }
  const left = pendingGlosses(dir).length;
  console.info(`Selesai: tertunda ${left}; biaya tercatat ${fmt(spent)}.`);
  return left;
}
