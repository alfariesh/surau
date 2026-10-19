import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { D1Db } from "@surau/db";

/** Eval membaca salinan state lokal atau staging; tidak pernah menulis korpus produksi. */
export async function openCorpus(repo: string, remote: boolean) {
  const { getPlatformProxy } = await import("wrangler");
  const configPath = join(repo, "tools/eval/wrangler.jsonc");
  if (remote) {
    const proxy = await getPlatformProxy<{ CORPUS: D1Db }>({ configPath, remoteBindings: true });
    return { db: proxy.env.CORPUS, source: "staging (remote)", dispose: proxy.dispose };
  }
  const state = join(repo, ".wrangler/state/v3/d1");
  if (!existsSync(state))
    throw new Error("D1 lokal belum ada; jalankan db:migrate:local dan corpus:load:local.");
  const tmp = mkdtempSync(join(tmpdir(), "surau-eval-"));
  try {
    cpSync(state, join(tmp, "v3/d1"), { recursive: true });
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
  } catch (error) {
    rmSync(tmp, { recursive: true, force: true });
    throw error;
  }
}
