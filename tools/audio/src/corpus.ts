// Korpus sumber skrip audio (X17): D1 staging lewat getPlatformProxy remoteBindings (pola
// tools/eval/src/open-corpus.ts), hanya SELECT kecuali `audio_track` lewat `pnpm audio staging`
// (src/staging.ts). Alat audio memproses node satu per satu, jadi tidak
// perlu pembatas paralel seperti eval Jawab.
import { join } from "node:path";

import type { D1Db } from "@surau/db";

export interface OpenCorpus {
  db: D1Db;
  source: string;
  dispose: () => Promise<void>;
}

export async function openStagingCorpus(repo: string): Promise<OpenCorpus> {
  const { getPlatformProxy } = await import("wrangler");
  const proxy = await getPlatformProxy<{ CORPUS: D1Db }>({
    configPath: join(repo, "tools/audio/wrangler.jsonc"),
    remoteBindings: true,
  });
  return { db: proxy.env.CORPUS, source: "staging (remote)", dispose: proxy.dispose };
}
