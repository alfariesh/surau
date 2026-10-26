// `pnpm llm terjemah-ulang`: ringkasan pilihan terjemahan ulang terarah (X21), gratis (tanpa API).
import { llmDir } from "./store.ts";
import { readAccepted } from "./batch.ts";
import { RETRANSLATE_FILE, loadRetranslation, translationDone } from "./retranslate.ts";
import { buildWork } from "./work.ts";
import type { LlmContext } from "./cli.ts";

export function runRetranslateInfo(ctx: LlmContext): number {
  const rows = ctx.rows();
  const targets = loadRetranslation(ctx.repo, rows);
  if (targets.size === 0) {
    console.info(`Tidak ada pilihan terjemahan ulang (${RETRANSLATE_FILE}).`);
    return 0;
  }
  const work = buildWork(rows);
  const acc = readAccepted(llmDir(ctx.repo));
  const juzOf = new Map(rows.page.map((p) => [p.id, p.juz]));
  const pageOf = new Map(rows.passage.map((p) => [p.id, p.page_id]));
  const stat = new Map<number, { selected: number; done: number; none: number }>();
  for (const [id, target] of targets) {
    const juz = juzOf.get(pageOf.get(id) ?? 0) ?? 0;
    const s = stat.get(juz) ?? { selected: 0, done: 0, none: 0 };
    const sha = work.units.get(id)?.sourceSha256;
    s.selected++;
    if (sha === undefined) s.none++;
    else if (translationDone(acc.translations.get(id), sha, target)) s.done++;
    stat.set(juz, s);
  }
  console.info(`Pilihan terjemahan ulang (${RETRANSLATE_FILE}):`);
  for (const [juz, s] of [...stat].toSorted((a, b) => a[0] - b[0])) {
    console.info(
      `  jilid ${juz}: terpilih ${s.selected} · sudah prompt tujuan ${s.done} · belum ${s.selected - s.done - s.none}` +
        (s.none > 0 ? ` · bukan unit terjemahan ${s.none}` : ""),
    );
  }
  return 0;
}
